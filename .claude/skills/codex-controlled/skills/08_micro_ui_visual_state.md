---
title: Micro-UI Visual State Protocol
type: reference
description: Use when codex-controlled should increase user understanding bandwidth with disposable HTML/JSON micro-UI cards, visual state streams, or future Flipbook-compatible structured outputs.
---

# Skill: Micro-UI Visual State Protocol

## Purpose

Micro-UI Visual State turns dense agent status, checkpoints, decisions, and verification results into compact structured visual units.

The goal is not to replace text.
The goal is to increase understanding bandwidth while preserving the existing `codex-controlled` control model.

Use Micro-UI when visual structure would help the user understand faster than paragraphs.

## Design Philosophy

### Disposable Micro-UI

A disposable micro-UI is a temporary visual component generated for the current task only.

Examples:

- checkpoint card
- decision button group
- risk heatmap
- execution timeline
- file change matrix
- verification dashboard
- branch choice card
- plan dependency graph

It is not a permanent application component.
It is a task-local understanding aid.

### HTML Specs

HTML is allowed as a rendering target because it is:

- structured
- widely portable
- visually expressive
- easy for frontends to sandbox or transform

However, HTML output must be safe, static, and optional.

### Flipbook Compatibility

A Flipbook-compatible output is a structured visual record that can later be rendered as cards, pages, canvases, timelines, or zoomable views.

The skill should emit stable IDs, dependencies, phase labels, and render hints so future frontends can arrange the work visually.

### Generative UI Boundary

The agent may generate UI-shaped artifacts, but the UI does not replace user approval.

A button-like option is a structured intent, not permission to continue unless the user actually selects or confirms it.

## When to Use

Use Micro-UI output when:

- A phase checkpoint has multiple status fields.
- The user must choose between clear branches.
- A task has multiple files, risks, dependencies, or verification results.
- The agent needs to show progress across phases.
- A discussion includes several tradeoffs.
- A review result would be easier to scan as a status board.
- The user asks for higher-level visualization or a control panel view.

Do not use Micro-UI when:

- The answer is a short conceptual response.
- Text is clearer than a visual component.
- The UI would hide uncertainty.
- The output environment cannot safely render HTML and no JSON fallback is provided.

## Output Modes

A Micro-UI response may include three layers.

### 1. Human-readable summary

Always include a brief text summary.

The user must understand the state even if the UI cannot render.

### 2. JSON state block

Use JSON when the state may be consumed by a control panel or Flipbook renderer.

```json
{
  "ui_protocol": "codex-controlled.micro_ui.v1",
  "component_id": "checkpoint-001",
  "component_type": "checkpoint_card",
  "phase": "Phase 7 Acceptance Review",
  "control_level": "Level 2",
  "status": "waiting_for_user",
  "summary": "Implementation verified; waiting for approval before finishing.",
  "nodes": [
    {
      "id": "verify-typecheck",
      "kind": "verification",
      "label": "Typecheck",
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
      "id": "request-explanation",
      "label": "Explain this first",
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

### 3. Optional static HTML

Use HTML only as a renderable companion to JSON, not as the only source of truth.

```html
<section data-ui-protocol="codex-controlled.micro_ui.v1" data-component-type="checkpoint_card">
  <h3>Checkpoint</h3>
  <dl>
    <dt>Status</dt><dd>Waiting for user approval</dd>
    <dt>Verification</dt><dd>Typecheck PASS, Tests PASS</dd>
  </dl>
  <button data-intent="approve_current_checkpoint">Approve checkpoint</button>
  <button data-intent="enter_layered_explanation">Explain first</button>
</section>
```

## Required Fields for JSON Components

Every JSON component must include:

- `ui_protocol`
- `component_id`
- `component_type`
- `phase`
- `control_level`
- `status`
- `summary`
- `actions` when user input is needed
- `render_hints` when future Flipbook rendering is expected

## Component Types

### `phase_status_board`

Use to show where the task is in the phase model.

Fields should include:

- phase list
- current phase
- completed phases
- blocked phases
- next allowed phase

### `decision_panel`

Use when the user must choose between branches.

Actions must use explicit intents, such as:

- `approve_current_checkpoint`
- `revise_scope`
- `enter_discussion_mode`
- `enter_layered_explanation`
- `run_project_hygiene_gate`
- `stop_execution`

### `execution_timeline`

Use to show ordered steps, dependencies, and stop conditions.

Each step should have:

- `id`
- `label`
- `phase`
- `status`
- `depends_on`
- `evidence_ref` when available

### `verification_dashboard`

Use to show command evidence.

Each check should have:

- command
- output summary
- pass/fail/blocked
- evidence status

### `file_change_matrix`

Use when a task touches multiple files.

Each row should show:

- file path
- allowed/planned/unplanned/forbidden
- change purpose
- risk
- verification coverage

### `risk_board`

Use when tradeoffs or unresolved risks matter.

Each risk should show:

- risk id
- severity
- source: fact / inference / uncertainty
- mitigation
- owner: agent / user / future work

## Micro-Control Rules

When user input is needed, prefer structured actions over vague prompts.

Bad:

```md
What do you want to do next?
```

Better:

```json
{
  "component_type": "decision_panel",
  "actions": [
    {"id": "a", "label": "Approve current scope", "intent": "approve_current_scope", "requires_user_confirmation": true},
    {"id": "b", "label": "Revise file boundary", "intent": "revise_file_boundary", "requires_user_confirmation": true},
    {"id": "c", "label": "Explain before execution", "intent": "enter_layered_explanation", "requires_user_confirmation": true}
  ]
}
```

Rules:

- Every action must have a clear intent.
- Destructive actions must be marked as destructive.
- Approval actions must be explicit.
- Actions do not execute themselves; they represent user choices.

## Safety and Stability Rules

- Micro-UI must not hide facts, inference, or uncertainty.
- Micro-UI must not replace verification evidence.
- Micro-UI must not bypass checkpoints.
- Micro-UI must not auto-advance phases.
- HTML must be static and free of scripts.
- JSON must remain readable as plain text.
- If UI rendering fails, the text summary remains authoritative.

## Flipbook Data Contract

For future canvas or Flipbook views, include these fields when possible:

```json
{
  "step_id": "phase5-debug-root-cause",
  "parent_id": "phase5-controlled-execution",
  "depends_on": ["phase4-plan"],
  "phase": "Phase 5 Controlled Execution",
  "layer": "debugging",
  "zoom_level": "detail",
  "artifact_refs": [],
  "evidence_refs": [],
  "render_hints": {
    "layout": "timeline_card",
    "flipbook_axis": "dependency",
    "preferred_width": "medium"
  }
}
```

## Exit Criteria

A Micro-UI output is acceptable only if:

- The user can still understand the answer without UI rendering.
- The component has clear phase, status, and intent fields.
- Any requested user action is explicit.
- It preserves checkpoint and evidence rules.
- It can be represented as static JSON and optionally static HTML.
