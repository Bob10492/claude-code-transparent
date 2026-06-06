---
name: agent-orchestra
description: "Use when an agent or Codex task needs controlled execution, repository changes, L1-L3 control workflow, scope boundaries, checkpoints, user approval, project hygiene, evidence-based completion, Micro-UI visual state, or skill stability governance. Do not use for pure L0 direct answers unless the user asks for coaching, explanation, or a controlled workflow."
---

# Skill: Agent Orchestra

`agent-orchestra` is the control plane for transparent, checkpointed agent collaboration.

It does not replace focused engineering skills.
It routes, constrains, explains, and visualizes their usage.

- `agent-orchestra` controls: phase, scope, evidence, user understanding, checkpoints, project hygiene, visual state contracts, and skill-governance safety.
- Focused engineering skills provide: brainstorming, planning, TDD, debugging, worktrees, subagents, verification, review, and finishing.
- Micro-UI provides: optional disposable visual state cards, structured decision panels, and future Flipbook-compatible state data.

## Positioning

Use this skill when the task needs explicit boundaries, user-visible checkpoints, explanation discipline, project hygiene checks before implementation, skill stability governance, or a higher-bandwidth control panel view.

This skill exists to keep strong execution methods usable without losing control.

## Always-on Kernel vs Full Skill

The L0/L1/L2/L3 control-level triage should be treated as always-on agent behavior.

The full `agent-orchestra` skill should be invoked or followed when the always-on triage result requires a visible control workflow, checkpoints, hygiene, Micro-UI, skill governance, or multi-step execution.

In short:

- Always-on Kernel = lightweight control-level triage for every request.
- Full `agent-orchestra` = expanded control-plane workflow for L1/L2/L3 tasks that need visible control.
- Focused skills = local engineering methods called inside approved boundaries.

See `ALWAYS_ON_KERNEL.md` for the portable always-on kernel and `AGENTS_ALWAYS_ON_SNIPPET.md` for a snippet that can be copied into project-level or global agent instructions.

Do not solve always-on behavior by making this full skill claim every conversation in its description. That broadens routing and can steal traffic from more specific skills.

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

Focused engineering skills and Micro-UI outputs are execution and understanding helpers, not permission systems.

They must not bypass:

1. User explicit constraints.
2. Current source/runtime evidence priority.
3. Project Hygiene Gate.
4. Checkpoint approval.
5. Scope boundaries.
6. Fact / inference / uncertainty separation.
7. Evidence-before-completion.
8. Coach Mode when the user asks to understand.
9. Static and safe rendering requirements for HTML Micro-UI.
10. User confirmation for any approval or destructive action.
11. Skill stability governance when changing descriptions, gotchas, or routing rules.

## Description Boundary

The frontmatter `description` is for routing only.

It should stay compact and answer when this full skill should be selected.
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

For architecture changes, observability, metrics, ETL, dashboards, runners, scorers, gates, schemas, data cleaning, experiment systems, skill modifications, or high-risk tasks.
Requires full Project Hygiene Gate and, when applicable, Data / Observability Hygiene.
Micro-UI is recommended for phase status, dependency graphs, file matrices, verification dashboards, and risk boards.

## Phase Model

Not every task needs every phase.
Choose the minimum phase depth that matches the control level.

Phases may be lightweight, but they must not be invisible.
If a phase is skipped or compressed, state why.

| Phase | Purpose | Primary reference |
|---|---|---|
| Phase 0 Framing | Compress the request into a bounded task | `skills/01_requirement_framing.md` |
| Phase 1 Discussion | Align on decision points and tradeoffs | `skills/02_discussion_mode.md` |
| Phase 2 Layered Explanation | Explain concepts, code, UI, or rationale in user-fit language | `skills/03_layered_explanation.md` |
| Phase 3 Project Hygiene Gate | Check project state before implementation | `skills/04_preflight_hygiene.md` |
| Phase 4 Planning | Produce a bounded execution plan from the Spec Bundle | `skills/00_orchestration_routing.md` and `writing-plans` |
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
python .claude/skills/agent-orchestra/evals/run_skill_eval.py
```

## Routing Rules

- Apply `.claude/AGENTS.md` or `ALWAYS_ON_KERNEL.md` before deciding whether the full workflow is needed when the runtime supports always-loaded instructions.
- Use `skills/01_requirement_framing.md` to compress goals, boundaries, non-goals, and control level.
- Use `brainstorming` only for design exploration. Its output must flow back into the Spec Bundle before planning or execution.
- If the user expresses confusion, disagreement, or asks why, suspend execution-oriented skills and use `skills/02_discussion_mode.md` or `skills/03_layered_explanation.md`.
- Use `skills/04_preflight_hygiene.md` before implementation when project state, structure, generated artifacts, truth sources, or blast radius may be unclear.
- Use `skills/05_controlled_execution.md` to define approved scope, allowed files, forbidden files, minimum closed loop, stop conditions, and evidence requirements.
- Use `verification-before-completion` before any completion claim.
- Use `skills/06_acceptance_review.md` to produce the checkpoint card. No checkpoint means the task is not complete.
- Use `skills/07_coach_mode.md` whenever the user wants to understand commands, verification, review logic, or why a specific focused skill was selected.
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
