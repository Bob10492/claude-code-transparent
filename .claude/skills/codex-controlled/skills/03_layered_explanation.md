---
title: Layered Explanation
type: reference
description: Use when Codex must explain complex code, architecture, documents, schemas, runners, scorers, gates, design choices, or Micro-UI state in layered language.
---

# Skill: Layered Explanation

## Purpose

Layered Explanation turns complex implementation or design into user-fit understanding.
It prevents "explanation by summary" and prevents execution from outrunning comprehension.

It can also explain why a Micro-UI card, decision panel, dashboard, or Flipbook-compatible state object was generated.

## When to use

Use this mode when:

- The user says they are confused.
- The user asks why something is designed this way.
- The task introduces unfamiliar terminology, architecture, schema, runner, scorer, gate, or workflow.
- A checkpoint requires more than a short summary.
- The user wants to understand why a specific Superpowers skill was selected or not selected.
- The user wants to understand what a Micro-UI component means or how to act on it.

## Execution Suspension Rule

If the user expresses confusion, disagreement, or asks why, suspend execution-oriented Superpowers skills.
Do not continue planning or execution until the user understands the key decision points.

Micro-UI may be used to clarify the state, but it must not hide the explanation or advance execution.

## Explanation Layers

### Layer 1: One-sentence result

Explain what changed or what is being proposed in one sentence.

### Layer 2: Plain-language explanation

Explain the idea without assuming project-specific jargon.

### Layer 3: Terms table

| Term | Plain meaning | Concrete meaning in this project | Reference |
|---|---|---|---|
| ... | ... | ... | ... |

### Layer 4: Structure or flow

If code or architecture is involved, explain:

- Which files or modules matter
- How control or data flows through them
- Why the split exists

If Micro-UI is involved, explain:

- Which component is being rendered
- Which fields are authoritative
- Which actions require user confirmation
- What remains plain-text evidence

### Layer 5: Design choice

Explain:

- Alternatives considered
- Why the current choice won
- What tradeoff it accepts
- What would invalidate the decision

### Layer 6: Visual state explanation

Use when a Micro-UI or Flipbook-compatible state object is present.

Explain:

- What the component is trying to make easier to scan
- Which phase it represents
- Which state is fact, inference, or uncertainty
- Which user actions are available
- Why the visual state does not replace checkpoint approval

## Prohibited Behavior

Do not:

- Assume the user understood because an implementation exists
- Hide uncertainty inside polished summaries
- Use new jargon to explain old jargon
- Delay all explanation until after implementation
- Use visual polish to hide missing evidence
- Treat a UI action as approval unless the user selects or confirms it

## Exit Criteria

The explanation is sufficient only when the user can reasonably answer:

- What changed or will change
- Why this approach was chosen
- Where the change lives
- What risk remains
- How to verify it
- If Micro-UI is present, what each available action means
