---
name: codex-controlled
description: "Use for controlled Codex collaboration workflows: requirement framing, discussion, layered explanation, project hygiene, controlled execution, acceptance review, coaching checkpoints, and optional Micro-UI visual state outputs. Acts as the control plane above Superpowers execution skills."
---

# Skill: Codex-Controlled Superpowers Orchestrator

`codex-controlled` is the control plane for transparent, checkpointed agent collaboration.

It does not replace Superpowers.
It routes, constrains, explains, and visualizes Superpowers usage.

- `codex-controlled` controls: phase, scope, evidence, user understanding, checkpoints, project hygiene, and visual state contracts.
- `Superpowers` provides: planning, TDD, debugging, subagents, worktrees, verification, code review, branch finishing.
- `Micro-UI` provides: optional disposable visual state cards, structured decision panels, and future Flipbook-compatible state data.

## Positioning

Use this skill when the task needs explicit boundaries, user-visible checkpoints, explanation discipline, project hygiene checks before implementation, or a higher-bandwidth control panel view.

This skill exists to keep strong execution methods usable without losing control.

Micro-UI exists to make that control easier for humans to scan and understand. It must never weaken checkpoints, evidence, or user agency.

## Core Principles

### Current truth beats historical documents

When multiple sources disagree, use this default priority:

1. Current source code and current runtime behavior.
2. Current logs, database state, metrics, dashboards, and observable artifacts.
3. Current task instructions and current repository-local docs.
4. Historical notes, PDFs, prior plans, and summaries.

Do not assume documents still match the repository.

### User understanding beats execution speed

If the user does not understand the goal, tradeoff, risk, scope boundary, or acceptance bar, pause execution-oriented work and explain first.

### Checkpoints are the phase gate

Do not silently advance to a later phase without a checkpoint when the current control level requires one.

### Facts, inference, and uncertainty stay separate

Never present inference as fact.

### Visual structure may increase understanding bandwidth

When the state is dense, prefer a compact structured status card, decision panel, timeline, or dashboard over long unstructured logs.

Text remains authoritative. Visual output is an aid, not a shortcut.

### Skill changes must be anti-regression governed

When modifying this or any related skill, diagnose the failure type before editing.

Do not use broad description changes to fix execution bugs.
Use `skills/09_skill_stability_governance.md` and the eval harness before merging skill changes.

## Non-bypassable Rules

Superpowers skills and Micro-UI outputs are execution and understanding helpers, not permission systems.

They must not bypass:

1. User explicit constraints
2. Current source/runtime evidence priority
3. Project Hygiene Gate
4. Checkpoint approval
5. Scope boundaries
6. Fact / inference / uncertainty separation
7. Evidence-before-completion
8. Coach Mode when the user asks to understand
9. Static and safe rendering requirements for HTML Micro-UI
10. User confirmation for any approval or destructive action
11. Skill stability governance when changing descriptions, gotchas, or routing rules

## Description Boundary

The frontmatter `description` is for routing only.

It should stay compact and answer when this skill should be selected.
It should not contain execution gotchas, edge-case patches, or detailed workflow rules.

Execution fixes belong in:

- `Gotchas`
- `Execution Rules`
- reference files under `skills/`
- eval cases under `evals/` or `tests/`

If a skill behavior bug happens after routing succeeded, prefer append-mostly gotchas instead of rewriting the description.

## Control Levels

Default to the lightest level that can safely preserve user understanding and project integrity.
Do not use Level 3 for every task.

### Level 0: Direct

For small conceptual Q&A or simple explanations.
No full phase workflow.
Micro-UI is usually unnecessary unless the user asks for a visual summary.

### Level 1: Light Control

For small edits, small docs, config tweaks, or narrow bug investigations.
Requires goal, boundary, minimal verification, and short checkpoint.
Micro-UI may be a compact checkpoint card or decision panel.

### Level 2: Standard Control

For normal code changes, bugfixes, and feature additions.
Requires framing, execution plan, controlled execution, verification, checkpoint.
Micro-UI is recommended when the plan, verification, or review state has multiple fields.

### Level 3: Strict Control

For architecture changes, observability, metrics, ETL, dashboards, runners, scorers, gates, schemas, data cleaning, and experiment systems.
Requires full Project Hygiene Gate and, when applicable, Data / Observability Hygiene.
Micro-UI is recommended for phase status, dependency graphs, file matrices, verification dashboards, and risk boards.

## Phase Model

Not every task needs every phase.
Choose the minimum phase depth that matches the control level.

Phases may be lightweight, but they must not be invisible.
If a phase is skipped or compressed, state why.

| Phase | Purpose | Primary sub-skill |
|---|---|---|
| Phase 0 Framing | Compress the request into a bounded task | `skills/01_requirement_framing.md` |
| Phase 1 Discussion | Align on decision points and tradeoffs | `skills/02_discussion_mode.md` |
| Phase 2 Layered Explanation | Explain concepts, code, or rationale in user-fit language | `skills/03_layered_explanation.md` |
| Phase 3 Project Hygiene Gate | Check project state before implementation | `skills/04_preflight_hygiene.md` |
| Phase 4 Planning | Produce a bounded execution plan from the Spec Bundle | `skills/00_superpowers_routing.md` and `writing-plans` |
| Phase 5 Controlled Execution | Implement one approved minimal loop | `skills/05_controlled_execution.md` |
| Phase 6 Verification | Produce real evidence before any completion claim | `verification-before-completion` |
| Phase 7 Acceptance Review | Produce checkpoint review and wait for approval | `skills/06_acceptance_review.md` |
| Phase 8 Finishing | Wrap up branch/PR choices after approval | `finishing-a-development-branch` |
| Cross-phase Visual State | Render dense state as optional structured Micro-UI | `skills/08_micro_ui_visual_state.md` |
| Cross-phase Skill Governance | Diagnose skill failures and prevent regressions | `skills/09_skill_stability_governance.md` |

### Required phase depth by level

- Level 0 usually stays in Phase 0, Phase 1, or Phase 2 only.
- Level 1 may compress Phase 0, Phase 4, Phase 5, Phase 6, and Phase 7 into a short loop.
- Level 2 normally uses Phase 0, Phase 4, Phase 5, Phase 6, and Phase 7.
- Level 3 requires explicit Phase 3 before implementation and applies Data / Observability Hygiene when relevant.

## Spec Bundle Minimum

Before Phase 4 Planning, ensure there is at least a lightweight Spec Bundle containing:

- Goal
- Constraints
- Non-goals
- Approved scope
- Acceptance bar
- Checkpoint behavior
- Hygiene status or reason hygiene is not required
- Visual state expectation when Micro-UI is requested or useful

For small Level 1 work, this may be a short paragraph.
For Level 2 or Level 3 work, make it explicit.

## Project Hygiene Gate

Phase 3 is `Project Hygiene Gate`, not a data-only preflight.

It has two layers:

1. `General Project Hygiene`
2. `Data / Observability Hygiene`

Run the second layer only when the task involves logs, metrics, ETL, dashboards, runners, scorers, gates, schemas, data cleaning, or experiments.

For Level 1 tasks, Project Hygiene may be a two-line check unless the workspace, project structure, generated artifacts, or truth source is actually unclear.

## Micro-UI Visual State

Use `skills/08_micro_ui_visual_state.md` when a visual state stream would improve understanding bandwidth.

Micro-UI may appear as:

- JSON state blocks
- static HTML specs
- checkpoint cards
- decision panels
- verification dashboards
- file change matrices
- phase timelines
- risk boards
- future Flipbook-compatible step graphs

Micro-UI must always preserve a readable text summary and must never replace evidence, checkpoints, or user confirmation.

## Skill Stability Governance

Use `skills/09_skill_stability_governance.md` before modifying descriptions, routing rules, gotchas, or execution constraints.

Classify every skill failure before editing:

1. Routing failure: fix `description` narrowly and add positive/negative evals.
2. Execution failure: keep `description` stable and add append-mostly gotchas or execution rules.
3. Environment failure: add compatibility guards or environment assumptions.

Run the lightweight eval harness when routing or governance-sensitive text changes:

```bash
python .claude/skills/codex-controlled/evals/run_skill_eval.py
```

## Superpowers Routing Matrix

| Phase | Trigger | Superpowers skill | codex-controlled constraint |
|---|---|---|---|
| Phase 0 Framing | New feature, architecture, UI/UX, visualization, unclear design | brainstorming | Output is only design input, not execution permission |
| Phase 4 Planning | Spec Bundle exists and user wants implementation | writing-plans | Plan must include non-goals, file boundaries, minimal loop, stop conditions |
| Phase 5 Execution | New feature or bugfix | test-driven-development | Only within approved scope |
| Phase 5 Debugging | Bug, failing test, abnormal behavior | systematic-debugging | No fix before root cause evidence |
| Phase 5 Parallel | 2+ independent subtasks | dispatching-parallel-agents | Only if tasks have no shared mutable state |
| Phase 5 Isolation | Dirty/risky workspace | using-git-worktrees | Worktree does not remove checkpoint requirements |
| Phase 5 Complex | Multi-step implementation | subagent-driven-development | Main agent remains responsible for scope and final review |
| Phase 6 Verification | Before claiming completion | verification-before-completion | No real output means no completion claim |
| Phase 7 Review | Before merge/PR or final acceptance | requesting-code-review | Review result feeds checkpoint |
| Phase 8 Finishing | After verified completion | finishing-a-development-branch | No auto-merge or cleanup without user choice |

See also `skills/00_superpowers_routing.md`.

### Supporting Superpowers mappings

| Context | Superpowers skill | codex-controlled constraint |
|---|---|---|
| Phase 5 plan-following execution | executing-plans | Execution order does not expand approved scope, file boundaries, or stop conditions |
| Phase 7 review feedback intake | receiving-code-review | Review feedback is input, not automatic permission for new changes |
| Cross-phase skill selection help | using-superpowers | Meta-guidance does not bypass control levels, hygiene gates, checkpoints, or evidence rules |

## Conflict Priority

When `codex-controlled` and Superpowers rules overlap or conflict:

1. User explicit instruction wins.
2. Safety, truthfulness, and current runtime evidence win.
3. `codex-controlled` checkpoints win.
4. Project Hygiene Gate wins before implementation.
5. Data / Observability Hygiene wins for logs, metrics, ETL, dashboard, runner, scorer, gate, schema, experiment tasks.
6. Superpowers decides methodology only inside approved execution boundaries.
7. Speed and completeness never override user understanding.
8. Micro-UI improves presentation only; it does not change authority, approval, or evidence requirements.
9. Anti-regression governance wins over quick prompt rewrites when changing skills.

## Routing Rules

- Use `skills/01_requirement_framing.md` to compress goals, boundaries, non-goals, and control level.
- Use `brainstorming` only for design exploration. Its output must flow back into the Spec Bundle before planning or execution.
- If the user expresses confusion, disagreement, or asks why, suspend execution-oriented Superpowers skills and use `skills/02_discussion_mode.md` or `skills/03_layered_explanation.md`.
- Use `skills/04_preflight_hygiene.md` before implementation when project state, structure, generated artifacts, truth sources, or blast radius may be unclear.
- Use `skills/05_controlled_execution.md` to define approved scope, allowed files, forbidden files, minimum closed loop, stop conditions, and evidence requirements.
- Use `verification-before-completion` before any completion claim.
- Use `skills/06_acceptance_review.md` to produce the checkpoint card. No checkpoint means the task is not complete.
- Use `skills/07_coach_mode.md` whenever the user wants to understand commands, verification, review logic, or why a specific Superpowers skill was selected.
- Use `skills/08_micro_ui_visual_state.md` when the state is dense enough that a disposable UI card, structured JSON, or static HTML spec would help the user scan and intervene.
- Use `skills/09_skill_stability_governance.md` before changing a skill's description, routing policy, gotchas, or execution rules.

## Minimal Request Template

```md
Goal:
Constraints:
Inputs:
Expected output:
Non-goals:
Required checkpoint behavior:
Preferred control level:
Need Project Hygiene Gate: yes/no/unsure
Need explanation before execution: yes/no
Need Micro-UI visual state: yes/no/unsure
```

## Skill Change Request Template

```md
Skill to change:
Observed failure:
Failure type: routing / execution / environment / unsure
Expected behavior:
Actual behavior:
Neighbor skills at risk:
Proposed edit target: description / gotcha / execution_rule / eval / environment guard
Required eval update:
```
