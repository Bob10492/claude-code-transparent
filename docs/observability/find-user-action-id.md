# Local Semantic Action Dashboard

This page explains how to find a `user_action_id`, refresh the local observability database, generate a semantic viewer, and read the draggable drill-down dashboard.

## Fastest Path

Start the local service:

```bash
bun run observability:viewer
```

Open:

```text
http://127.0.0.1:8765
```

Recommended flow:

1. Click `Refresh DB` if today's action is missing.
2. Check `Recent 5 DB Actions`.
3. Click `Generate` for a DB action that has no viewer yet.
4. Click `Open`, or search by full / unique-prefix `user_action_id`.
5. Read the graph from the centered main thread downward.
6. Click any node to open the right-side drill-down drawer.

## What The Sidebar Shows

The left sidebar has three jobs:

- Search existing semantic viewers by `user_action_id`.
- Show recent raw DB actions from DuckDB.
- Show recent generated viewer actions from the local report directory.

`Recent 5 DB Actions` comes directly from DuckDB table `user_actions`.

If a fresh task does not appear here, the local database has not been refreshed from event logs yet. Click `Refresh DB`.

`Recent 5 User Actions` comes from `ObservrityTask/action-reports/deep/semantic_viewer_index.json`.

If an action appears in DB but not in this section, it exists as facts but has not yet been rendered into a semantic viewer. Click `Generate`.

## Service Routes

| Route | Method | Meaning |
| --- | --- | --- |
| `/` | `GET` | Searchable dashboard home |
| `/api/actions` | `GET` | Generated semantic viewer index |
| `/api/db-actions` | `GET` | Latest actions visible in DuckDB |
| `/api/refresh-db` | `POST` | Rebuild DuckDB from local observability events |
| `/api/generate-latest` | `POST` | Generate viewer for the latest DB action |
| `/api/generate/<user_action_id>` | `POST` | Generate viewer for a specific action |
| `/view/<user_action_id_or_unique_prefix>` | `GET` | Open one action viewer |
| `/data/<user_action_id_or_unique_prefix>` | `GET` | Return `semantic_viewer.data.json` |
| `/files/<relative-path>` | `GET` | Serve files under the configured report root |

Default report root:

```text
ObservrityTask/action-reports/deep
```

Override host, port, or root:

```bash
bun run observability:viewer -- --root ObservrityTask/action-reports/deep --host 127.0.0.1 --port 8765
```

## How To Read The Graph

The graph is intended to preserve execution order first.

- Main thread nodes are centered and flow top to bottom.
- Child query / subagent lanes branch to the left or right.
- Solid edges mean normal continuation.
- Dashed fork edges mean a child lane was started from a parent turn.
- Dashed return edges mean the child result appears to flow back into a later parent turn.
- `fork:N` marks nodes that started one or more child branches.

Clicking a node opens a right-side drawer. The drawer is the real debugging surface.

## How To Read The Drawer

Use this order:

1. `Overview`: identify query, turn, timing, tool counts, and risk summary.
2. `Dialogue`: inspect what user / assistant / tool result / tool use content was present around the node.
3. `Tools`: inspect actual tool names, commands, file paths, input summaries, output summaries, and problem/fix signals.
4. `Evidence`: inspect snapshot and evidence refs.
5. `Risk`: inspect inferred edges, fallback matching, truncation, and other reliability caveats.

Dialogue role labels:

- `User`: main-thread user message, or an internal prompt inside child query lanes.
- `Assistant`: assistant text output.
- `Assistant context carried into this turn`: previous assistant content included in this request window.
- `Assistant tool use`: the assistant requested a tool call.
- `Tool result`: the result returned by a tool and fed into later model context.

The dialogue view is not a full raw API payload dump. It intentionally omits fixed system prompts. It also does not rewrite the conversation into a nicer summary. Displayed content must remain faithful to the observed runtime data.

## Generate A Viewer Manually

Use an explicit action id:

```bash
bun run scripts/observability/deep_explain_action.ts --user-action-id <USER_ACTION_ID>
```

Use the latest action:

```bash
bun run scripts/observability/deep_explain_action.ts --latest
```

Prefer explicit ids for complex validation. `--latest` can accidentally select an observability self-run action, such as a previous explain / viewer generation command.

## Refresh DuckDB Manually

If the dashboard does not show today's action, run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\observability\rebuild_observability_db.ps1 -Quiet
```

Then reload:

```text
http://127.0.0.1:8765
```

The dashboard `Refresh DB` button runs the same local refresh path through the service API.

## Find Recent Action Ids Directly

Windows:

```powershell
.\tools\duckdb\duckdb.exe .observability\observability_v1.duckdb "select user_action_id, started_at, duration_ms, query_count, tool_call_count from user_actions order by started_at_ms desc limit 20;"
```

macOS / Linux style:

```bash
./tools/duckdb/duckdb.exe .observability/observability_v1.duckdb "select user_action_id, started_at, duration_ms, query_count, tool_call_count from user_actions order by started_at_ms desc limit 20;"
```

Find actions around a rough time:

```sql
select
  user_action_id,
  started_at,
  duration_ms,
  query_count,
  tool_call_count
from user_actions
where started_at >= '2026-06-03 08:00:00'
order by started_at_ms desc
limit 20;
```

## What Counts As One User Action?

A `user_action_id` represents one top-level user action in the main runtime.

Under one action, there may be:

- multiple queries
- multiple turns
- subagents
- compact queries
- tool calls
- generated files
- snapshot evidence
- model responses
- tool results

The semantic viewer reconstructs the observable workflow under that one id.

## Troubleshooting

If today's Excel / data-processing action is missing:

- First check `Recent 5 DB Actions`.
- If it is missing there, refresh DuckDB.
- If it appears in DB but has no `Open` button, generate a viewer for it.
- If search does not find it, use the full `user_action_id`, not only a non-unique prefix.
- If `--latest` opens a trivial action with only one Bash command, it is probably an observability self-run action. Use an explicit id.

If the graph looks too small:

- Use mouse wheel / zoom controls.
- Drag the canvas.
- Start from the centered main thread.
- Click branch source nodes and use focus mode to reduce clutter.

If the dialogue has many assistant blocks:

- Read from top to bottom inside the selected node.
- `Assistant context carried into this turn` is carried context, not necessarily new generation.
- The last `Assistant` block near a child query often contains the actual child query result.
- `Tool result` blocks are important because they explain what the next assistant response could see.
