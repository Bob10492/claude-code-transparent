# How to find a `user_action_id`

## Fastest path in the dashboard

After generating semantic viewer outputs, run:

```bash
bun run scripts/observability/patch_semantic_viewer_recent_actions.ts
```

Then open:

```text
ObservrityTask/action-reports/deep/semantic_viewer_app.html
```

The left sidebar will show the latest five indexed `user_action_id` values. Click into one of the read-only id fields, copy it, and paste it into the search box.

## Generate / refresh a viewer for the latest action

```bash
bun run scripts/observability/deep_explain_action.ts --latest
bun run scripts/observability/patch_semantic_viewer_recent_actions.ts
```

## Find recent action ids directly from DuckDB

From the repository root:

```bash
./tools/duckdb/duckdb.exe .observability/observability_v1.duckdb "select user_action_id, started_at, duration_ms, query_count, tool_call_count from user_actions order by started_at_ms desc limit 20;"
```

On Windows PowerShell, the same command is usually:

```powershell
.\tools\duckdb\duckdb.exe .observability\observability_v1.duckdb "select user_action_id, started_at, duration_ms, query_count, tool_call_count from user_actions order by started_at_ms desc limit 20;"
```

## Find an action around a rough time

```bash
./tools/duckdb/duckdb.exe .observability/observability_v1.duckdb "select user_action_id, started_at, duration_ms, query_count, tool_call_count from user_actions where started_at >= '2026-06-03 08:00:00' order by started_at_ms desc limit 20;"
```

## What counts as one user action?

A `user_action_id` represents one top-level user action in the main runtime. Under one action, there may be multiple queries, turns, tool calls, compactions, and subagents. The semantic viewer takes this one id and reconstructs the full observable workflow under it.
