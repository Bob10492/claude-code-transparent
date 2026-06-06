# Always-on Control Kernel

This file is the source copy for the project-level `.claude/AGENTS.md` always-on triage rules.

The goal is not to load the full `agent-orchestra` workflow for every message.
The goal is to make the L0/L1/L2/L3 control-level decision always available.

## Core idea

For every user request, silently classify the task into one control level before responding.

- L0: answer directly.
- L1: apply light control principles.
- L2 or L3: invoke or follow the full `agent-orchestra` workflow.

## Deployment guidance

Prefer `.claude/AGENTS.md` or a global Codex instruction for the always-on kernel.
Keep this file as the detailed source and local documentation.

Do not make the full skill description say "use for every conversation". That broadens routing and can steal traffic from more specific skills.
