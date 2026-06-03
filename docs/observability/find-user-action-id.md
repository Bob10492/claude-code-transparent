# How to find a `user_action_id`

## Fastest path: local dashboard service

After generating semantic viewer outputs, run:

```bash
bun run observability:viewer
```

Then open:

```text
http://127.0.0.1:8765
```

The left sidebar shows two recent-action views:

- `Recent 5 DB Actions`: latest actions currently visible in DuckDB `user_actions`. If today's action is missing here, click `Refresh DB`.
- `Recent 5 User Actions`: latest actions that already have generated semantic viewer reports. If a DB action has no viewer yet, click `Generate`.

The search box searches indexed viewer reports, and the right side loads the matching semantic viewer. Prefix search is supported when the prefix uniquely identifies one action.

Useful local service routes:

- `/`: searchable dashboard.
- `/api/actions`: current indexed action list.
- `/api/db-actions`: latest DuckDB actions.
- `/api/refresh-db`: rebuild DuckDB from local observability events.
- `/api/generate-latest`: generate a viewer for the latest DuckDB action.
- `/api/generate/<user_action_id>`: generate a viewer for a specific action.
- `/view/<user_action_id_or_unique_prefix>`: open one action viewer.
- `/data/<user_action_id_or_unique_prefix>`: raw `semantic_viewer.data.json` for one action.
- `/files/<relative-path-under-report-root>`: read report files under the configured viewer root.

The default report root is `ObservrityTask/action-reports/deep`. Override it with:

```bash
bun run observability:viewer -- --root ObservrityTask/action-reports/deep --host 127.0.0.1 --port 8765
```

## Static dashboard compatibility path

The static HTML dashboard is still generated for compatibility. To refresh the recent-action card, run:

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
