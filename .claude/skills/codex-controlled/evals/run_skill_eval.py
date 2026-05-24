#!/usr/bin/env python3
"""Lightweight documentation-level eval harness for codex-controlled skill changes.

This harness is intentionally deterministic and dependency-free.
It does not call an LLM. Instead, it checks whether eval cases have enough
explicit signals to make routing expectations auditable during skill edits.

Usage:
    python .claude/skills/codex-controlled/evals/run_skill_eval.py
    python .claude/skills/codex-controlled/evals/run_skill_eval.py --cases path/to/cases.json

Exit codes:
    0 = all static eval checks pass
    1 = one or more eval checks fail
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[4]
DEFAULT_CASES = Path(__file__).with_name("codex_controlled_eval_cases.json")
SKILL_ROOT = Path(__file__).resolve().parents[1]

CODEX_CONTROLLED_SIGNALS = {
    "checkpoint",
    "approval",
    "scope",
    "boundary",
    "control",
    "hygiene",
    "project hygiene",
    "micro-ui",
    "visual state",
    "structured json",
    "do not proceed",
    "do not auto-continue",
    "pause execution",
    "evidence",
}

NEIGHBOR_SIGNALS = {
    "test-driven-development": {"tdd", "test-driven", "test driven"},
    "systematic-debugging": {"debug", "root cause", "stack trace", "failing test"},
    "finishing-a-development-branch": {"finish", "branch", "pr", "merge"},
    "layered-explanation": {"explain", "plain language", "terms table", "understand"},
    "coach-mode": {"teach", "learn", "how to read", "verification dashboard"},
}

REQUIRED_MAIN_SECTIONS = [
    "Non-bypassable Rules",
    "Control Levels",
    "Project Hygiene Gate",
    "Micro-UI Visual State",
    "Conflict Priority",
]

REQUIRED_GOVERNANCE_SECTIONS = [
    "Description vs Execution Rules",
    "The Three Surgical Knives",
    "Standard Change Checklist",
    "Append-Mostly Policy",
    "Eval Policy",
]


@dataclass
class EvalFailure:
    case_id: str
    message: str


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip().lower())


def has_any(text: str, needles: set[str]) -> bool:
    haystack = normalize(text)
    return any(needle in haystack for needle in needles)


def check_case(case: dict[str, Any]) -> list[EvalFailure]:
    failures: list[EvalFailure] = []
    case_id = case.get("id", "<missing-id>")
    kind = case.get("kind")
    prompt = case.get("prompt", "")
    expected = case.get("expected_skill")

    if not case_id or case_id == "<missing-id>":
        failures.append(EvalFailure(case_id, "case is missing id"))
    if kind not in {"positive", "negative", "neighbor", "environment"}:
        failures.append(EvalFailure(case_id, f"unsupported kind: {kind!r}"))
    if not prompt:
        failures.append(EvalFailure(case_id, "case is missing prompt"))
    if "reason" not in case or not case["reason"]:
        failures.append(EvalFailure(case_id, "case is missing reason"))

    if kind == "positive":
        if expected != "codex-controlled":
            failures.append(EvalFailure(case_id, "positive cases must expect codex-controlled"))
        if not has_any(prompt, CODEX_CONTROLLED_SIGNALS):
            failures.append(EvalFailure(case_id, "positive codex-controlled case lacks explicit control-plane signal"))

    if kind == "negative":
        if expected == "codex-controlled":
            failures.append(EvalFailure(case_id, "negative case must not expect codex-controlled"))
        if has_any(prompt, {"checkpoint", "approval", "hygiene", "micro-ui", "do not proceed"}):
            failures.append(EvalFailure(case_id, "negative case contains strong codex-controlled routing signal"))
        if expected in NEIGHBOR_SIGNALS and not has_any(prompt, NEIGHBOR_SIGNALS[expected]):
            failures.append(EvalFailure(case_id, f"negative neighbor case lacks expected signal for {expected}"))

    if kind == "neighbor":
        if expected not in NEIGHBOR_SIGNALS:
            failures.append(EvalFailure(case_id, f"neighbor expected_skill not recognized: {expected!r}"))
        elif not has_any(prompt, NEIGHBOR_SIGNALS[expected]):
            failures.append(EvalFailure(case_id, f"neighbor case lacks signal for {expected}"))

    if kind == "environment":
        if not has_any(prompt, {"unavailable", "limitation", "do not claim completion", "tool"}):
            failures.append(EvalFailure(case_id, "environment case lacks environment-change signal"))

    return failures


def check_required_docs() -> list[EvalFailure]:
    failures: list[EvalFailure] = []
    main = SKILL_ROOT / "SKILL.md"
    governance = SKILL_ROOT / "skills" / "09_skill_stability_governance.md"
    micro_ui = SKILL_ROOT / "skills" / "08_micro_ui_visual_state.md"

    for path in [main, governance, micro_ui]:
        if not path.exists():
            failures.append(EvalFailure("docs", f"missing required file: {path}"))

    if main.exists():
        text = main.read_text(encoding="utf-8")
        for section in REQUIRED_MAIN_SECTIONS:
            if section not in text:
                failures.append(EvalFailure("docs", f"main SKILL.md missing section: {section}"))

    if governance.exists():
        text = governance.read_text(encoding="utf-8")
        for section in REQUIRED_GOVERNANCE_SECTIONS:
            if section not in text:
                failures.append(EvalFailure("docs", f"governance doc missing section: {section}"))

    if micro_ui.exists():
        text = micro_ui.read_text(encoding="utf-8")
        for forbidden in ["<script", "onclick=", "onload="]:
            if forbidden in text.lower():
                failures.append(EvalFailure("docs", f"micro-ui doc includes unsafe HTML pattern: {forbidden}"))

    return failures


def run(cases_path: Path) -> int:
    payload = load_json(cases_path)
    failures: list[EvalFailure] = []

    cases = payload.get("cases", [])
    if not isinstance(cases, list) or not cases:
        failures.append(EvalFailure("suite", "cases must be a non-empty list"))
    else:
        ids = set()
        for case in cases:
            if case.get("id") in ids:
                failures.append(EvalFailure(case.get("id", "<missing-id>"), "duplicate case id"))
            ids.add(case.get("id"))
            failures.extend(check_case(case))

    kinds = {case.get("kind") for case in cases if isinstance(case, dict)}
    for required in {"positive", "negative", "neighbor", "environment"}:
        if required not in kinds:
            failures.append(EvalFailure("suite", f"missing {required} cases"))

    failures.extend(check_required_docs())

    if failures:
        print("Skill eval FAILED", file=sys.stderr)
        for failure in failures:
            print(f"- [{failure.case_id}] {failure.message}", file=sys.stderr)
        return 1

    print(f"Skill eval passed: {len(cases)} cases checked")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cases", type=Path, default=DEFAULT_CASES)
    args = parser.parse_args()
    return run(args.cases)


if __name__ == "__main__":
    raise SystemExit(main())
