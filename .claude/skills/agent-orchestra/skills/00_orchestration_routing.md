---
title: Agent Orchestra Routing and Conflict Policy
type: reference
description: "Use to decide which focused engineering skill may be called in which phase, which Micro-UI visual state output may be emitted, and which agent-orchestra constraints remain non-bypassable."
---

# Agent Orchestra Routing and Conflict Policy

## Control Plane vs Execution Layer

`agent-orchestra` is the control plane.
Focused engineering skills are the execution capability layer.
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
4. Micro-UI may visualize a phase transition, but it must not silently advance phases.

## Focused Skill Routing Matrix

| Phase | Trigger | Focused skill | agent-orchestra constraint |
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

## Conflict Priority

1. User explicit instruction wins.
2. Safety, truthfulness, and current runtime evidence win.
3. `agent-orchestra` checkpoints win.
4. Project Hygiene Gate wins before implementation.
5. Data / Observability Hygiene wins for logs, metrics, ETL, dashboard, runner, scorer, gate, schema, experiment tasks.
6. Focused skills decide methodology only inside approved execution boundaries.
7. Micro-UI decides presentation only; it never changes authority, approval, evidence, or scope.
8. Speed, completeness, and visual polish never override user understanding.

## Execution Suspension Rules

Suspend planning or execution-oriented focused skills when:

- The user says they do not understand.
- The user disputes the framing or decision logic.
- The user asks why a method, architecture, or file boundary was selected.
- The current truth source is unclear.
- The Project Hygiene Gate has not passed.

Resume only after the decision points are understood and the current checkpoint permits execution.
