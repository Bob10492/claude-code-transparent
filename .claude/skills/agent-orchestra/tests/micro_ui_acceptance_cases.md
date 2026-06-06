# Micro-UI Acceptance Test Cases for agent-orchestra

These documentation-level acceptance cases verify that Micro-UI increases understanding bandwidth without weakening `agent-orchestra` control guarantees.

## Regression Criteria

The Micro-UI upgrade is acceptable only if:

- Facts, inference, and uncertainty stay separate.
- Project Hygiene Gate still blocks unsafe implementation.
- Data / Observability Hygiene still blocks stale or polluted data work.
- Focused engineering skills remain subordinate to approved scope.
- Verification evidence is required before completion claims.
- Checkpoints remain user-visible and approval-gated.
- Coach Mode remains available when the user wants to understand.
- Micro-UI never becomes a permission system.

## Core Cases

1. L0 concept answer should not emit heavy Micro-UI.
2. L1 narrow bug investigation may emit a compact decision panel.
3. L3 observability/gate work must run General Project Hygiene and Data / Observability Hygiene.
4. Micro-UI checkpoint cannot replace verification evidence.
5. Static HTML must contain no scripts, inline handlers, external resources, or hidden destructive actions.
6. Decision panel actions must have explicit intents.
7. Flipbook-compatible graph must preserve step IDs, phases, and dependencies.
8. User confusion must suspend execution even when a visual card exists.
9. Code review feedback must not silently expand scope.
10. Finishing branch requires explicit user choice.
