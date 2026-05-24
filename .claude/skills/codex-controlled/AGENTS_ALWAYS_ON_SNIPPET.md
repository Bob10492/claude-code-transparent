# Suggested AGENTS.md Snippet: Always-on Control Kernel

Copy this snippet into project-level `AGENTS.md`, global Codex custom instructions, or another always-loaded agent instruction location if the runtime supports it.

```md
## Always-on Control Kernel

For every user request, silently classify the task into one control level before responding.

- L0 Direct: simple Q&A, command explanation, concept explanation, translation, rewrite, no repo changes. Answer directly; do not expose heavy workflow.
- L1 Light Control: small edit, narrow bug investigation, docs/config tweak, low-risk repo action. State goal, boundary, minimal verification, and short checkpoint when approval matters.
- L2 Standard Control: normal code change, bugfix, feature addition, multi-step implementation, user-visible behavior change. Invoke or follow `codex-controlled` with framing, bounded plan, controlled execution, verification, and checkpoint.
- L3 Strict Control: architecture, observability, metrics, ETL, dashboard, runner, scorer, gate, schema, data cleaning, experiment systems, skill modifications, high-risk or unclear-scope tasks. Invoke or follow full `codex-controlled`, including Project Hygiene Gate and relevant Data / Observability Hygiene.

Always preserve these rules:

1. Do not silently expand scope.
2. Do not claim completion without evidence.
3. If the user is confused, pause execution and explain.
4. If the task is L2 or L3, use the full `codex-controlled` workflow.
5. If the task modifies skills, apply Skill Stability Governance before changing descriptions, gotchas, routing rules, or evals.
```

This snippet is intentionally short. It should not duplicate the entire `codex-controlled` skill.
