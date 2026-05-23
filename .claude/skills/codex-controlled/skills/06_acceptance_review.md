---
title: Acceptance Review and Checkpoint
type: reference
description: Use after implementation to verify completion with evidence, incorporate code review, produce the checkpoint card, and optionally emit Micro-UI checkpoint state before any next phase.
---

# Skill: Acceptance Review and Checkpoint

## Purpose

Acceptance Review decides whether the current loop is actually complete.

`verification-before-completion` provides evidence.
`requesting-code-review` provides review.
The checkpoint card is still owned by `codex-controlled`.
Micro-UI may render the checkpoint, but it does not own the checkpoint.

## Inputs

- Changed files
- Intended goal
- Verification commands and their real outputs
- Review findings if review was requested
- Known gaps
- Remaining risks
- Optional Micro-UI or Flipbook state emitted during the loop

## Step 1: Verification evidence

Run `verification-before-completion` before any completion claim.

Rules:

- No real output means no completion claim.
- A failed required check means the loop is not complete.
- A guessed pass is still a fail.

## Step 2: Goal and scope review

Check:

- Did the work satisfy the stated goal?
- Did the implementation stay inside approved scope?
- Did any unapproved file changes happen?
- Did the work create new unexplained risk?
- Did any Micro-UI action imply approval that the user did not actually give?

## Step 3: Review input

Use `requesting-code-review` when the task benefits from explicit review.
Use `receiving-code-review` when review feedback arrives and must be interpreted without silently expanding scope.

Review informs the checkpoint.
Review does not replace the checkpoint.

## Step 4: Checkpoint card

Produce a checkpoint card that includes:

- Goal
- Actual completion
- Files changed
- Verification evidence
- Review result
- Remaining gaps
- Remaining risks
- Whether user approval is required before the next phase

If Micro-UI would help scanning, also emit a `checkpoint_card` JSON component following `skills/08_micro_ui_visual_state.md`.

## Hard Rules

- No checkpoint means the task is not complete.
- No user approval means do not continue.
- No real verification output means do not claim completion.
- If verification fails, return to Controlled Execution.
- Micro-UI buttons or intents are not approval unless the user explicitly selects or confirms them.
- Static HTML must not contain scripts and must not be the only record of checkpoint state.

## Checkpoint Template

```md
## Checkpoint

### Goal
...

### Actual Completion
...

### Files Changed
...

### Verification Evidence
- command:
- output summary:
- pass/fail:

### Review Result
...

### Remaining Gaps
...

### Remaining Risks
...

### Decision
- Complete for this checkpoint: yes / no
- Waiting for user approval: yes / no
```

## Optional Micro-UI Checkpoint JSON

```json
{
  "ui_protocol": "codex-controlled.micro_ui.v1",
  "component_id": "checkpoint-001",
  "component_type": "checkpoint_card",
  "phase": "Phase 7 Acceptance Review",
  "control_level": "Level 2",
  "status": "waiting_for_user",
  "summary": "Verification evidence is available; waiting for checkpoint approval.",
  "nodes": [
    {
      "id": "verification",
      "kind": "verification",
      "label": "Verification evidence",
      "status": "pass",
      "depends_on": []
    }
  ],
  "actions": [
    {
      "id": "approve-checkpoint",
      "label": "Approve checkpoint",
      "intent": "approve_current_checkpoint",
      "requires_user_confirmation": true
    },
    {
      "id": "explain-first",
      "label": "Explain before continuing",
      "intent": "enter_layered_explanation",
      "requires_user_confirmation": true
    }
  ],
  "render_hints": {
    "layout": "card",
    "density": "compact",
    "flipbook_axis": "phase"
  }
}
```
