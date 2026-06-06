---
title: Acceptance Review and Checkpoint
type: reference
description: "Use after agent-orchestra execution to verify completion with evidence, incorporate review, produce the checkpoint card, and wait before any next phase."
---

# Acceptance Review and Checkpoint

## Purpose

Acceptance Review decides whether the current loop is actually complete.

Verification provides evidence.
Code review provides review.
The checkpoint is owned by `agent-orchestra`.
Micro-UI may render the checkpoint, but it does not own approval.

## Required Checks

- Did the work satisfy the stated goal?
- Did it stay inside approved scope?
- Were any unapproved files changed?
- Are verification commands and outputs recorded?
- Are remaining gaps and risks explicit?
- Is user approval required before continuing?

## Hard Rules

- No checkpoint means the task is not complete.
- No user approval means do not continue when approval is required.
- No real verification output means do not claim completion.
- If verification fails, return to Controlled Execution.
- Micro-UI buttons or intents are not approval unless the user explicitly selects or confirms them.

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
