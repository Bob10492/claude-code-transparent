---
title: Coach Mode
type: reference
description: Use when the user should understand commands, verification, report reading, failure diagnosis, visual state cards, and why a specific engineering method was selected.
---

# Skill: Coach Mode

## Purpose

Coach Mode teaches the user how to reason about the work, not just how to repeat commands.

It can explain:

- project commands
- verification commands
- how to read reports or artifacts
- how to read Micro-UI cards or JSON state
- how to diagnose failures
- why a specific Superpowers skill was selected
- why a meta-helper such as `using-superpowers` did or did not change the execution path
- why a Micro-UI component was or was not emitted

## When to use

Use this mode when:

- The user asks to understand what is happening.
- The user wants to learn how to verify or debug.
- A checkpoint needs explanation, not just reporting.
- The user wants the rationale behind a chosen engineering method.
- The user wants to understand a visual state card, decision panel, verification dashboard, or Flipbook-style state object.

## Required structure

### Current capability being taught

```md
This round teaches:
1. ...
2. ...
```

### Command, method, or UI breakdown

```md
Command / method / UI component:
...

What it does:
...

What success looks like:
...

What to inspect if it fails or seems unclear:
...
```

### Minimum verification checklist

```md
- [ ] ...
- [ ] ...
```

### Observation points

```md
Pay attention to:
1. ...
2. ...
```

### Failure path

```md
If it fails, check in this order:
1. ...
2. ...
3. ...
```

## Explain why a Superpowers skill was chosen

Coach Mode can explain not only project commands, but also why a specific Superpowers skill was selected.

Example:

Why `systematic-debugging` was selected this round:

- Because the current issue is abnormal behavior.
- A direct fix would be guess-repair.
- We need root cause evidence before changing code.

## Explain why Micro-UI was chosen

Coach Mode can also explain why a Micro-UI component was selected.

Example:

Why a `verification_dashboard` was selected this round:

- Because there are multiple verification checks.
- A compact visual status helps you scan PASS / FAIL / BLOCKED quickly.
- The dashboard does not replace command evidence; it only summarizes it.

When teaching Micro-UI, always explain:

- Which fields are authoritative
- Which actions require user confirmation
- What the fallback text summary means
- Why the visual component cannot bypass checkpoint approval

## Coaching Levels

### Level 1

Provide the full command, method, or UI explanation, the success signal, and the failure path.

### Level 2

Provide the target and partial command / method / UI interpretation, then let the user fill in part of it.

### Level 3

Ask the user to propose the command, verification path, or UI interpretation first, then review it.

### Level 4

Ask the user to present their own acceptance judgment first, then test whether the evidence supports it.
