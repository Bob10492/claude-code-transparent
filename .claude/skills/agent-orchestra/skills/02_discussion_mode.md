---
title: Discussion Mode
type: reference
description: "Use when the user is confused, disagrees with the framing, asks why, or needs decision alignment before agent-orchestra planning or execution may continue."
---

# Discussion Mode

## Purpose

Pause execution and align on decision points.

Discussion Mode protects user understanding and prevents the agent from turning uncertainty into implementation.

## Use When

- The user says they do not understand.
- The user disagrees with the proposed plan or scope.
- The user asks why a method, file boundary, UI, or architecture was selected.
- The current truth source is unclear.
- The task is expanding beyond the approved scope.

## Rules

- Suspend execution-oriented focused skills.
- Do not write code while the user is asking for understanding.
- Separate facts, inference, and uncertainty.
- End with explicit decision points.

## Output Shape

- Current disagreement or confusion
- What is known as fact
- What is inferred
- What remains uncertain
- Options and tradeoffs
- Recommended next checkpoint
