# Always-on Control Kernel

This file defines the lightweight control-level triage that should be present before skill routing or full workflow expansion.

The goal is not to load the full `codex-controlled` workflow for every message.
The goal is to make the L0/L1/L2/L3 control-level decision always available.

## Core idea

For every user request, silently classify the task into one control level before responding.

- If the task is L0, answer directly.
- If the task is L1, apply light control principles.
- If the task is L2 or L3, invoke or follow the full `codex-controlled` workflow.

This kernel is intentionally short.
It should be placed in a project-level or global instruction location if the runtime supports one.

## Control Levels

### L0 Direct

Use for:

- simple Q&A
- command explanation
- conceptual explanation
- translation or rewrite
- no repository changes
- no multi-step execution
- no checkpoint requirement

Behavior:

- Answer directly.
- Do not expose heavy phase workflow.
- Do not emit Micro-UI unless the user asks for a visual summary.
- Do not route to full `codex-controlled` unless the user asks for coaching, checkpointing, or controlled workflow.

### L1 Light Control

Use for:

- small edits
- narrow bug investigation
- config or docs tweak
- low-risk repository action
- small local verification

Behavior:

- State goal and boundary.
- Keep non-goals explicit when there is scope risk.
- Use minimal verification.
- Produce a short checkpoint before continuing if user approval matters.
- Use full `codex-controlled` only if the task starts expanding.

### L2 Standard Control

Use for:

- normal code changes
- bugfixes
- feature additions
- multi-step implementation
- user-visible behavior changes
- tasks requiring execution evidence

Behavior:

- Invoke or follow `codex-controlled`.
- Use framing, bounded planning, controlled execution, verification, and checkpoint review.
- Call Superpowers execution skills only inside approved scope.

### L3 Strict Control

Use for:

- architecture changes
- observability work
- metrics, ETL, dashboards
- runners, scorers, gates, schemas
- data cleaning or experiment systems
- skill modifications
- high-risk or unclear-scope tasks

Behavior:

- Invoke or follow full `codex-controlled`.
- Run Project Hygiene Gate before implementation.
- Run Data / Observability Hygiene when relevant.
- Require evidence-based completion and explicit checkpoint approval.
- Use Micro-UI when it improves scanability of dense state.

## Always-on Rules

These rules apply even when the full skill is not loaded:

1. Do not silently expand scope.
2. Do not claim completion without evidence.
3. If the user is confused, pause execution and explain.
4. If repository state, generated artifacts, or truth sources are unclear, consider Project Hygiene before editing.
5. If the task is L2 or L3, invoke or follow full `codex-controlled`.
6. If the task is a skill change, apply Skill Stability Governance before editing descriptions, gotchas, or routing rules.

## Deployment guidance

Use this file as the source for always-on project or global instructions.

Suggested locations, depending on runtime support:

- project-level `AGENTS.md`
- global Codex custom instructions
- repository-specific agent instructions
- a startup/system prompt controlled by the user

Do not solve always-on behavior by making the full skill description say "use for every conversation".
That broadens routing and can steal traffic from more specific skills.

## Relationship to full codex-controlled

The kernel decides whether the request is L0/L1/L2/L3.
The full skill defines how to execute L1/L2/L3 safely when a visible workflow is needed.

In short:

- Always-on Kernel = lightweight triage
- Full `codex-controlled` = control-plane workflow
- Superpowers = local engineering methods
