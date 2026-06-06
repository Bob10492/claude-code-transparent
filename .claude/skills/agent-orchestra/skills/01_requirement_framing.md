---
title: Requirement Framing
type: reference
description: "Use when agent-orchestra must compress a user request into a bounded goal, constraints, non-goals, expected output, control level, and checkpoint behavior before planning or execution."
---

# Requirement Framing

## Purpose

Turn an ambiguous or broad request into an execution-safe frame.

## Required Output

- Goal
- Constraints
- Inputs
- Expected output
- Non-goals
- Approved scope
- Suggested control level: L0 / L1 / L2 / L3
- Whether Project Hygiene Gate is needed
- Whether Micro-UI visual state is useful
- Checkpoint behavior

## Rules

- Do not write code during framing.
- If the request is unclear, ask focused questions or enter Discussion Mode.
- If the task is L2 or L3, produce a lightweight Spec Bundle before planning.
- If the task touches skills, route through Skill Stability Governance.
