# Semantic Viewer readability and execution-flow fix plan

## Goal

Clicking any workflow node should let the reader inspect the exact agent actions in a smooth top-to-bottom order. The drawer should make it obvious which blocks are user/internal prompts, carried context, assistant output, assistant tool use, and tool results.

## User-visible problems confirmed

1. **Lane/node overlap at first render**
   - The graph content starts with a fixed horizontal offset, so the center lane is not reliably centered in the viewport.
   - Lane headers and nodes share narrow fixed widths, and the initial pan position can make nodes feel clipped or hidden by surrounding UI.

2. **Overview query identity truncation**
   - The overview metric grid uses four small columns inside a narrow drawer.
   - Long query identifiers such as `repl_main_thread` or full query ids are forced into a metric card, so their semantic ownership is not readable.

3. **Dialogue blocks are faithful but not readable enough**
   - Current roles exist, but the drawer does not sufficiently explain the difference between:
     - `Assistant context carried into this turn`
     - fresh `Assistant` response
     - `Assistant tool use`
     - `Tool result`
     - `User` vs internal subagent prompt
   - Token-bearing / prompt-affecting blocks are not explicitly marked.

4. **Subagent fork layout is semantically weak**
   - A child query should visually start from the parent turn that launched it.
   - The graph should not make subagents look like they only expand at the end of the main lane.
   - Return / merge-back edges should only be rendered when a later parent turn consumes or resumes after the child query completes.

5. **Artifacts tab is unnecessary in the node drawer**
   - The drawer should focus on Overview, Dialogue, Tools, Evidence, and Risk.
   - Artifacts can remain in exported data, but should not occupy primary drawer navigation.

## Semantics to document in UI

### What is a turn?
A `turn` is one observed query-loop iteration for a given query / agent lane. In practice, it is the unit where the model receives a request snapshot, may emit assistant text/tool use, may receive tool results, and then either continues, stops, compacts, or launches children. It is not the whole user action; it is one loop step inside one query.

### Why are some nodes directly linked while others are dashed / separated?
- Solid sequential edges mean the same query/agent lane moved from one turn to the next.
- Dashed fork edges mean a child query/subagent lane was spawned from a parent turn.
- Dashed return edges mean the child completed and a later parent turn is the best observed merge/resume point.

### What does “carried into this turn” mean?
It is not necessarily a new assistant reply in that turn. It is conversation context included in the request snapshot for this turn. For subagents, it may be injected context/prompt material. The fresh model output for this turn is the later `Assistant` block extracted from the response snapshot.

## Proposed source changes

Primary file: `scripts/observability/lib/semantic_dialogue_viewer.ts`

1. **Drawer tabs**
   - Remove the `Artifacts` tab from the rendered drawer tab row.
   - Keep artifact fields in `SemanticNodeDetail` for data compatibility.

2. **Overview layout**
   - Use a separate `.inspector-grid` with two columns in the drawer.
   - Add a `Full query identity` raw block under the metrics.
   - Ensure `.metric .value`, `.inspector-sub`, table cells, and raw blocks use `overflow-wrap:anywhere`.

3. **Dialogue role affordances**
   - Make block role badges visible in the title row.
   - Add token/prompt-affecting badges:
     - `token-bearing` for user, assistant, assistant tool use
     - `feeds next prompt` for tool result
   - Rename request-side assistant blocks to `Assistant context carried into this turn`.
   - Rename user blocks inside child lanes to `Internal user prompt`.

4. **Assistant tool use ordering**
   - Extract `tool_use` blocks directly from `assistantMessages[].message.content` in response snapshots.
   - Keep the fallback `toolUseBlocks` extraction only for tool uses not already emitted by id.
   - This preserves top-to-bottom order: assistant text -> tool use -> tool result on the next request window.

5. **Fork/return anchoring**
   - Prefer explicit Agent/Task tool calls whose `subagent_id` matches the child query.
   - Fallback to spawn time only when explicit tool anchor is unavailable.
   - Position child lane first turn relative to the parent node y-position rather than using only global chronological row order.
   - Draw return only when `findReturnTurnAnchor` finds a later parent turn.

6. **Initial viewport**
   - Compute `actionX` and center the graph content on the action/main lane after layout.
   - Reset zoom should recenter instead of returning to a hard-coded offset.

## Acceptance checklist

- Opening the viewer centers the main action/main thread without lane-header/node overlap.
- Clicking a node shows a drawer where full query identity is readable.
- Dialogue reads top-to-bottom with visually distinct user, assistant context, assistant output, tool use, and tool result blocks.
- Assistant tool calls are visible in dialogue, not only in the Tools tab.
- Token-bearing/prompt-affecting blocks are explicitly marked.
- Subagent fork edges start at the parent turn that spawned them.
- Return/merge edges are only shown when a later parent turn exists.
- The Artifacts tab is no longer shown in the node drawer.

## Implementation audit

Current status: implemented and covered by `tests/integration/semantic-dialogue-viewer.test.ts`.

- Centering / overlap: `renderSemanticViewerHtml()` computes the main lane center and `recenterViewport()` is used on first render and reset.
- Full query identity: `SemanticNodeDetail.overview.query_identity` is rendered as a wrapping raw block under Overview metrics.
- Dialogue readability: dialogue blocks carry `role_label` and `badges`; the drawer renders visible role badges for user, internal prompts, assistant context, assistant output, assistant tool use, and tool result.
- Assistant tool use ordering: response snapshots are read from `assistantMessages[].message.content` in order; fallback `toolUseBlocks` are emitted only when not already emitted by id.
- Prompt influence markings: user/assistant/tool-use blocks are marked `token-bearing`; tool results are marked `feeds next prompt`.
- Fork/return semantics: parent anchors prefer explicit `Agent`/`Task` tool calls with matching `subagent_id`, then fall back to spawn-time anchoring; return edges require `findReturnTurnAnchor()` to find a later parent turn.
- Drawer scope: the Artifacts tab is removed from primary navigation, while artifact data remains in `SemanticNodeDetail`.
- UI documentation: the searchable dashboard now explains what a turn is, how solid/fork/return edges should be read, and what carried assistant context means.

## Notes

A previous direct attempt to replace the large generated HTML/TS file was blocked by the platform safety filter because the file embeds a full HTML/JavaScript template. The safest implementation path is to apply the above as a normal local git patch in the repository and run:

```bash
bun x biome lint scripts/observability/lib/semantic_dialogue_viewer.ts
bun run typecheck
bun run scripts/observability/deep_explain_action.ts --user-action-id <sample-action-id>
```
