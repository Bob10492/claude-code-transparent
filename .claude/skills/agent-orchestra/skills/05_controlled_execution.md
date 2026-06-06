---
title: Controlled Execution
type: reference
description: "Use after agent-orchestra has an approved scope, file boundary, stop conditions, and evidence requirements for one minimal implementation loop."
---

# Controlled Execution

## Purpose

Execute one approved, bounded loop without scope drift.

Focused engineering skills may perform the method, but `agent-orchestra` owns:

- approved scope
- allowed files
- forbidden files
- minimum closed loop
- stop conditions
- evidence requirements

## Entry Requirements

Before execution, ensure:

- Goal and non-goals are stated.
- User has approved the current scope when approval is required.
- Project Hygiene Gate is passed or explicitly not required.
- Verification target is known.
- Stop conditions are stated.

## Execution Rules

- Only modify planned files.
- Pause before touching unplanned or forbidden files.
- Do not guess-fix before root cause evidence.
- Do not claim completion without verification output.
- If user understanding falls behind a decision, pause and explain.

## Stop Conditions

Stop and ask for confirmation when:

- The task crosses approved scope.
- A new file boundary is needed.
- Root cause remains unclear.
- Hygiene assumptions are wrong.
- Verification cannot be run.
- User asks why or says they do not understand.
