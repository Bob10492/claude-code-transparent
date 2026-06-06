---
title: Micro-UI Visual State Protocol
type: reference
description: "Use when agent-orchestra should increase user understanding bandwidth with disposable HTML/JSON Micro-UI cards, visual state streams, or future Flipbook-compatible structured outputs."
---

# Micro-UI Visual State Protocol

## Purpose

Micro-UI turns dense agent status, checkpoints, decisions, and verification results into compact structured visual units.

The goal is not to replace text.
The goal is to increase understanding bandwidth while preserving the existing `agent-orchestra` control model.

## Output Modes

Always keep a readable text summary.

Optional structured outputs:

- JSON state blocks
- static HTML specs
- checkpoint cards
- decision panels
- verification dashboards
- file change matrices
- risk boards
- execution timelines
- Flipbook-compatible step graphs

## Required JSON Fields

Every Micro-UI JSON component should include:

- `ui_protocol`
- `component_id`
- `component_type`
- `phase`
- `control_level`
- `status`
- `summary`
- `actions` when user input is needed
- `render_hints` when future Flipbook rendering is expected

## Micro-Control Rules

When user input is needed, prefer structured actions over vague prompts.

Rules:

- Every action must have a clear intent.
- Destructive actions must be marked as destructive.
- Approval actions must be explicit.
- Actions do not execute themselves; they represent user choices.

## Safety Rules

- Micro-UI must not hide facts, inference, or uncertainty.
- Micro-UI must not replace verification evidence.
- Micro-UI must not bypass checkpoints.
- Micro-UI must not auto-advance phases.
- HTML must be static and free of scripts.
- JSON must remain readable as plain text.
- If UI rendering fails, the text summary remains authoritative.

## Flipbook Data Contract

For future canvas or Flipbook views, include when possible:

- `step_id`
- `parent_id`
- `depends_on`
- `phase`
- `layer`
- `zoom_level`
- `artifact_refs`
- `evidence_refs`
- `render_hints`
