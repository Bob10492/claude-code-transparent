---
title: Superpowers Routing and Conflict Policy
type: reference
description: Use to decide which Superpowers skill may be called in which phase, which Micro-UI visual state output may be emitted, and which codex-controlled constraints remain non-bypassable.
---

# Skill: Superpowers Routing and Conflict Policy

## Control Plane vs Execution Layer

`codex-controlled` is the control plane.
Superpowers is the execution capability layer.
Micro-UI is the optional visual state layer.

The control plane decides whether execution may proceed.
The execution layer decides how approved work is performed.
The visual state layer decides how dense state can be shown without changing authority.

## Phase Transition Rules

Phases may be lightweight, but they must not be invisible.

Rules:

1. Always state the current phase by name when moving the task forward.
2. If a phase is skipped or compressed, state why.
3. Do not imply a silent phase jump.
4. `using-superpowers` may recommend a skill, but `codex-controlled` decides whether the recommendation is allowed in the current phase.
5. Micro-UI may visualize a phase transition, but it must not silently advance phases.

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

## Micro-UI Routing Matrix

| Phase / Context | Suggested component | Constraint |
|---|---|---|
| Phase 0 Framing | `decision_panel` or `phase_status_board` | Must show goal, non-goals, control level, and next allowed phase |
| Phase 3 Project Hygiene | `risk_board` or `file_change_matrix` | Must separate General Project Hygiene from Data / Observability Hygiene |
| Phase 4 Planning | `execution_timeline` | Must include step IDs, dependencies, file boundaries, and stop conditions |
| Phase 5 Execution | `execution_timeline` or `file_change_matrix` | Must not hide unplanned file changes or root-cause uncertainty |
| Phase 6 Verification | `verification_dashboard` | Must include real command output summaries; no output means no pass |
| Phase 7 Acceptance Review | `checkpoint_card` or `decision_panel` | Must expose user approval as explicit action; no auto-advance |
| Phase 8 Finishing | `decision_panel` | Must show merge/PR/hold/cleanup as separate explicit choices |
| Cross-phase dense state | `phase_status_board` or Flipbook-compatible graph | Must include IDs, dependencies, phase labels, and render hints |

See also `skills/08_micro_ui_visual_state.md`.

## Supporting Superpowers mappings

| Context | Superpowers skill | codex-controlled constraint |
|---|---|---|
| Phase 5 plan-following execution | executing-plans | Execution order does not expand approved scope, file boundaries, or stop conditions |
| Phase 7 review feedback intake | receiving-code-review | Review feedback is input, not automatic permission for new changes |
| Cross-phase skill selection help | using-superpowers | Meta-guidance does not bypass control levels, hygiene gates, checkpoints, or evidence rules; `codex-controlled` still decides whether the recommendation is allowed in the current phase |

## Conflict Priority

When `codex-controlled`, Superpowers, and Micro-UI rules overlap or conflict:

1. User explicit instruction wins.
2. Safety, truthfulness, and current runtime evidence win.
3. `codex-controlled` checkpoints win.
4. Project Hygiene Gate wins before implementation.
5. Data / Observability Hygiene wins for logs, metrics, ETL, dashboard, runner, scorer, gate, schema, experiment tasks.
6. Superpowers decides methodology only inside approved execution boundaries.
7. Micro-UI decides presentation only; it never changes authority, approval, evidence, or scope.
8. Speed, completeness, and visual polish never override user understanding.

## Execution Suspension Rules

Suspend planning or execution-oriented Superpowers skills when:

- The user says they do not understand.
- The user disputes the framing or decision logic.
- The user asks why a method, architecture, or file boundary was selected.
- The current truth source is unclear.
- The Project Hygiene Gate has not passed.

Resume only after the decision points are understood and the current checkpoint permits execution.

Micro-UI may be used during suspension to show a decision panel, explanation map, or risk board, but it must not continue execution on behalf of the user.
