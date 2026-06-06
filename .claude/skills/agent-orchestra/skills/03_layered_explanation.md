---
title: Layered Explanation
type: reference
description: "Use when agent-orchestra must explain complex code, architecture, documents, schemas, runners, scorers, gates, design choices, or Micro-UI state in layered language."
---

# Layered Explanation

## Purpose

Explain complex implementation or design in layers that match the user's understanding.

## Use When

- The user asks what something means.
- The user asks why a design, file, command, or focused skill was chosen.
- The user needs to understand a checkpoint, Micro-UI card, dashboard, schema, runner, scorer, or gate.

## Layers

1. One-sentence result.
2. Plain-language explanation.
3. Terms table.
4. Structure or flow.
5. Design choice and alternatives.
6. Visual state interpretation when Micro-UI exists.

## Rules

- Do not use new jargon to explain old jargon.
- Do not hide uncertainty in polished summaries.
- Do not treat a UI action as approval unless the user selects or confirms it.
- If the user asks for explanation, pause execution until key decision points are understood.
