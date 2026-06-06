# Agent Instructions: Always-on Control Kernel

This file is intentionally short and visible.
It is the project-level always-on control kernel for agent work.

For every user request, silently classify the task before responding:

## L0 Direct

Simple Q&A, command explanation, conceptual explanation, translation, rewrite, no repository changes.

Behavior:
- Answer directly.
- Do not expose heavy workflow.
- Do not load the full `agent-orchestra` workflow unless the user asks for coaching, explanation, checkpointing, or controlled execution.

## L1 Light Control

Small edit, narrow bug investigation, docs/config tweak, low-risk repository action.

Behavior:
- State goal and boundary.
- Keep non-goals explicit when there is scope risk.
- Use minimal verification.
- Use a short checkpoint when approval matters.

## L2 Standard Control

Normal code change, bugfix, feature addition, multi-step implementation, user-visible behavior change.

Behavior:
- Invoke or follow `agent-orchestra`.
- Use framing, bounded planning, controlled execution, verification, and checkpoint review.
- Call focused engineering skills only inside approved scope.

## L3 Strict Control

Architecture changes, observability work, metrics, ETL, dashboards, runners, scorers, gates, schemas, data cleaning, experiment systems, skill modifications, or high-risk tasks.

Behavior:
- Invoke or follow full `agent-orchestra`.
- Run Project Hygiene Gate before implementation.
- Run Data / Observability Hygiene when relevant.
- Require evidence-based completion and explicit checkpoint approval.
- Use Micro-UI when it improves scanability of dense state.

## Always-on Rules

1. Do not silently expand scope.
2. Do not claim completion without evidence.
3. If the user is confused, pause execution and explain.
4. If repository state, generated artifacts, or truth sources are unclear, consider Project Hygiene before editing.
5. If the task is L2 or L3, invoke or follow full `agent-orchestra`.
6. If the task modifies skills, apply Skill Stability Governance before editing descriptions, gotchas, routing rules, or evals.

This file should remain thin. The full workflow lives in `.claude/skills/agent-orchestra/`.