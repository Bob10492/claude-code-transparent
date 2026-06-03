import { describe, expect, test } from "bun:test"
import type {
  ActionRow,
  EvidenceRecord,
  QueryRow,
  SnapshotRecord,
  SubagentRow,
  TurnRow,
} from "../../scripts/observability/lib/deep_action_types"
import {
  buildSemanticViewerData,
  buildRequestWindowBlocks,
  planLaneColumns,
  renderSemanticViewerDirectoryAppHtml,
  renderSemanticViewerHtml,
} from "../../scripts/observability/lib/semantic_dialogue_viewer"

function requestSnapshot(messages: unknown[]): SnapshotRecord {
  return {
    snapshotRef: "request.json",
    category: "request",
    exists: true,
    absolutePath: "request.json",
    data: {
      messages,
    },
    warnings: [],
  }
}

function responseSnapshot(content: unknown[]): SnapshotRecord {
  return {
    snapshotRef: "response.json",
    category: "response",
    exists: true,
    absolutePath: "response.json",
    data: {
      assistantMessages: [
        {
          uuid: "assistant-response-1",
          message: {
            role: "assistant",
            content,
            usage: { input_tokens: 10, output_tokens: 5, cache_read_input_tokens: 0 },
          },
        },
      ],
    },
    warnings: [],
  }
}

describe("semantic dialogue viewer: request windows", () => {
  test("first turn anchors to the user_action message instead of replaying earlier history", () => {
    const snapshot = requestSnapshot([
      {
        type: "user",
        uuid: "older-user",
        message: { role: "user", content: "older request" },
      },
      {
        type: "assistant",
        uuid: "older-assistant",
        message: {
          role: "assistant",
          content: [{ type: "text", text: "older reply" }],
        },
      },
      {
        type: "user",
        uuid: "action-123",
        message: { role: "user", content: "push to origin" },
      },
    ])

    const blocks = buildRequestWindowBlocks({
      currentRequest: snapshot,
      previousRequest: null,
      userActionId: "action-123",
      querySource: "repl_main_thread",
      queryId: "q1",
      turnId: "turn-1",
    })

    expect(blocks).toHaveLength(1)
    expect(blocks[0]?.kind).toBe("user_message")
    expect(blocks[0]?.raw_text).toBe("push to origin")
    expect(blocks[0]?.role_label).toBe("User")
    expect(blocks[0]?.badges).toContain("token-bearing")
  })

  test("later turns preserve appended tool results and follow-up user messages", () => {
    const previous = requestSnapshot([
      {
        type: "user",
        uuid: "u1",
        message: { role: "user", content: "fix the script" },
      },
      {
        type: "assistant",
        uuid: "a1",
        message: {
          role: "assistant",
          content: [{ type: "tool_use", id: "call-1", name: "Bash", input: { command: "python run.py" } }],
        },
      },
    ])

    const current = requestSnapshot([
      {
        type: "user",
        uuid: "u1",
        message: { role: "user", content: "fix the script" },
      },
      {
        type: "assistant",
        uuid: "a1",
        message: {
          role: "assistant",
          content: [{ type: "tool_use", id: "call-1", name: "Bash", input: { command: "python run.py" } }],
        },
      },
      {
        type: "user",
        uuid: "tool-result-1",
        message: {
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: "call-1",
              content: "Traceback: file missing",
            },
          ],
        },
        toolUseResult: {
          stdout: "",
          stderr: "Traceback: file missing",
        },
      },
      {
        type: "user",
        uuid: "u2",
        message: { role: "user", content: "try replacing the input path" },
      },
    ])

    const blocks = buildRequestWindowBlocks({
      currentRequest: current,
      previousRequest: previous,
      userActionId: "action-123",
      querySource: "repl_main_thread",
      queryId: "q1",
      turnId: "turn-2",
    })

    expect(blocks).toHaveLength(2)
    expect(blocks[0]?.kind).toBe("tool_result")
    expect(blocks[0]?.raw_text).toContain("Traceback: file missing")
    expect(blocks[0]?.badges).toContain("feeds next prompt")
    expect(blocks[1]?.kind).toBe("user_message")
    expect(blocks[1]?.raw_text).toBe("try replacing the input path")
  })

  test("subagent request windows label user messages as internal prompts", () => {
    const snapshot = requestSnapshot([
      {
        type: "user",
        uuid: "internal-u1",
        message: { role: "user", content: "Summarize the repository state for the parent agent" },
      },
    ])

    const blocks = buildRequestWindowBlocks({
      currentRequest: snapshot,
      previousRequest: null,
      userActionId: "action-123",
      querySource: "subagent",
      queryId: "child-q",
      turnId: "turn-1",
    })

    expect(blocks[0]?.title).toBe("Internal user prompt")
    expect(blocks[0]?.role_label).toBe("Internal user prompt")
    expect(blocks[0]?.badges).toContain("internal prompt")
  })

  test("response snapshots preserve assistant text then assistant tool use ordering", () => {
    const action: ActionRow = {
      user_action_id: "action-123",
      event_date: "2026-05-12",
      started_at: "2026-05-12T00:00:00.000Z",
      started_at_ms: 1000,
      ended_at: "2026-05-12T00:01:00.000Z",
      ended_at_ms: 61000,
      duration_ms: 60000,
      query_count: 1,
      subagent_count: 0,
      tool_call_count: 1,
      total_prompt_input_tokens: 10,
      total_billed_tokens: 15,
      main_thread_total_prompt_input_tokens: 10,
      subagent_total_prompt_input_tokens: 0,
    }
    const queries: QueryRow[] = [
      {
        query_id: "main-q",
        user_action_id: "action-123",
        query_source: "repl_main_thread",
        subagent_id: null,
        subagent_reason: null,
        subagent_trigger_kind: null,
        subagent_trigger_detail: null,
        agent_name: "main",
        source_group: "main",
        started_at: "2026-05-12T00:00:00.000Z",
        started_at_ms: 1000,
        ended_at: "2026-05-12T00:01:00.000Z",
        ended_at_ms: 61000,
        duration_ms: 60000,
        turn_count: 1,
        query_max_loop_iter: 1,
        tool_call_count: 1,
        terminal_reason: "completed",
        strict_is_complete: true,
        inferred_is_complete: true,
      },
    ]
    const turns: TurnRow[] = [
      {
        query_id: "main-q",
        turn_id: "turn-1",
        agent_name: "main",
        query_source: "repl_main_thread",
        started_at: "2026-05-12T00:00:00.000Z",
        started_at_ms: 1000,
        ended_at: "2026-05-12T00:01:00.000Z",
        ended_at_ms: 61000,
        duration_ms: 60000,
        loop_iter_start: 1,
        loop_iter_end: 1,
        tool_call_count: 1,
        stop_reason: "tool_use",
        transition_out: null,
        termination_reason: null,
        strict_is_closed: true,
        inferred_is_closed: true,
      },
    ]
    const turnSnapshotsByKey = new Map([
      [
        "main-q|turn-1",
        {
          requestSnapshots: [
            requestSnapshot([
              {
                type: "user",
                uuid: "action-123",
                message: { role: "user", content: "inspect files" },
              },
            ]),
          ],
          responseSnapshots: [
            responseSnapshot([
              { type: "text", text: "I will inspect the repository first." },
              { type: "tool_use", id: "tool-1", name: "Bash", input: { command: "rg TODO" } },
            ]),
          ],
          relatedSnapshots: [],
          afterTurnSnapshots: [],
        },
      ],
    ])

    const viewer = buildSemanticViewerData({
      action,
      queries,
      turns,
      subagents: [],
      tools: [],
      phases: [],
      artifacts: [],
      evidence: [],
      turnSnapshotsByKey,
      selectedBy: "explicit_user_action_id",
      terminalReason: "completed",
    })

    const dialogue = viewer.details["turn_main-q_turn-1"]?.dialogue ?? []
    expect(dialogue.map(block => block.kind)).toEqual(["user_message", "assistant_reply", "assistant_tool_use"])
    expect(dialogue[1]?.raw_text).toBe("I will inspect the repository first.")
    expect(dialogue[2]?.tool_call_id).toBe("tool-1")
    expect(dialogue[2]?.badges).toContain("Bash")
  })
})

describe("semantic dialogue viewer: html shell", () => {
  test("renders graph shell and inspector tabs", () => {
    const html = renderSemanticViewerHtml({
      action: {
        user_action_id: "action-123",
        selected_by: "explicit_user_action_id",
        duration_ms: 1200,
        query_count: 1,
        subagent_count: 0,
        tool_call_count: 1,
        total_billed_tokens: 42,
        terminal_reason: "completed",
        warning: null,
      },
      lanes: [],
      nodes: [],
      edges: [],
      details: {},
    })

    expect(html).toContain("semantic-viewer-app")
    expect(html).toContain("data-tab=\"dialogue\"")
    expect(html).not.toContain("data-tab=\"artifacts\"")
    expect(html).toContain("Action Semantic Viewer")
    expect(html).toContain("graph-viewport")
    expect(html).toContain("pointerdown")
    expect(html).toContain("wheel")
    expect(html).toContain("inspector-drawer")
    expect(html).toContain("drawer-open")
    expect(html).toContain("branch-source")
    expect(html).toContain("arrow-fork")
    expect(html).toContain("marker-end")
    expect(html).toContain("overflow-wrap: anywhere")
    expect(html).toContain("tone-0")
    expect(html).toContain("tone-1")
    expect(html).toContain("clear-focus")
    expect(html).toContain("focus-active")
    expect(html).toContain(".dialogue-block.role-user")
    expect(html).toContain(".dialogue-block.role-assistant")
    expect(html).toContain(".dialogue-block.role-tool-result")
    expect(html).toContain("Full Query Identity")
    expect(html).toContain("role-badge")
    expect(html).toContain("prompt-badge")
    expect(html).toContain("recenterViewport")
  })

  test("renders directory app with action id lookup input", () => {
    const html = renderSemanticViewerDirectoryAppHtml([
      {
        user_action_id: "12345678-aaaa-bbbb-cccc-1234567890ab",
        output_dir_name: "user_action_12345678",
        relative_viewer_path: "user_action_12345678/semantic_viewer.html",
        selected_by: "explicit_user_action_id",
        terminal_reason: "completed",
        generated_at: "2026-05-12T00:00:00.000Z",
        query_count: 2,
        tool_call_count: 8,
      },
    ])

    expect(html).toContain("action-id-input")
    expect(html).toContain("Load Action")
    expect(html).toContain("semantic-viewer-frame")
    expect(html).toContain("12345678-aaaa-bbbb-cccc-1234567890ab")
    expect(html).toContain("Recent 5 User Actions")
    expect(html).toContain("recent-action-id")
    expect(html).toContain("recent-action-open")
    expect(html).toContain("A turn is one observed query-loop iteration")
    expect(html).toContain("dashed fork edges")
    expect(html).toContain("Assistant context carried into this turn")
    expect(html).toContain("viewer-stack")
    expect(html).toContain("app-layout")
    expect(html).toContain("app-sidebar")
    expect(html).toContain("app-main")
  })
})

describe("semantic dialogue viewer: graph ordering", () => {
  test("anchors background subqueries to the preceding turn instead of the action root", () => {
    const action: ActionRow = {
      user_action_id: "action-123",
      event_date: "2026-05-12",
      started_at: "2026-05-12T00:00:00.000Z",
      started_at_ms: 1000,
      ended_at: "2026-05-12T00:10:00.000Z",
      ended_at_ms: 10000,
      duration_ms: 9000,
      query_count: 2,
      subagent_count: 1,
      tool_call_count: 0,
      total_prompt_input_tokens: 10,
      total_billed_tokens: 20,
      main_thread_total_prompt_input_tokens: 10,
      subagent_total_prompt_input_tokens: 0,
    }
    const queries: QueryRow[] = [
      {
        query_id: "main-q",
        user_action_id: "action-123",
        query_source: "repl_main_thread",
        subagent_id: null,
        subagent_reason: null,
        subagent_trigger_kind: null,
        subagent_trigger_detail: null,
        agent_name: "main",
        source_group: null,
        started_at: "2026-05-12T00:00:00.000Z",
        started_at_ms: 1000,
        ended_at: "2026-05-12T00:02:00.000Z",
        ended_at_ms: 5000,
        duration_ms: 4000,
        turn_count: 2,
        query_max_loop_iter: 2,
        tool_call_count: 0,
        terminal_reason: "completed",
        strict_is_complete: true,
        inferred_is_complete: true,
      },
      {
        query_id: "bg-q",
        user_action_id: "action-123",
        query_source: "extract_memories",
        subagent_id: "sub-1",
        subagent_reason: "extract_memories",
        subagent_trigger_kind: "stop_hook_background",
        subagent_trigger_detail: "post_turn_background_extraction",
        agent_name: "memory",
        source_group: null,
        started_at: "2026-05-12T00:01:41.000Z",
        started_at_ms: 4100,
        ended_at: "2026-05-12T00:02:30.000Z",
        ended_at_ms: 7000,
        duration_ms: 2900,
        turn_count: 1,
        query_max_loop_iter: 1,
        tool_call_count: 0,
        terminal_reason: "completed",
        strict_is_complete: true,
        inferred_is_complete: true,
      },
    ]
    const turns: TurnRow[] = [
      {
        query_id: "main-q",
        turn_id: "turn-1",
        agent_name: "main",
        query_source: "repl_main_thread",
        started_at: "2026-05-12T00:00:00.000Z",
        started_at_ms: 1000,
        ended_at: "2026-05-12T00:01:00.000Z",
        ended_at_ms: 3000,
        duration_ms: 2000,
        loop_iter_start: 1,
        loop_iter_end: 1,
        tool_call_count: 0,
        stop_reason: null,
        transition_out: "next_turn",
        termination_reason: null,
        strict_is_closed: true,
        inferred_is_closed: true,
      },
      {
        query_id: "main-q",
        turn_id: "turn-2",
        agent_name: "main",
        query_source: "repl_main_thread",
        started_at: "2026-05-12T00:01:00.100Z",
        started_at_ms: 3001,
        ended_at: "2026-05-12T00:01:40.000Z",
        ended_at_ms: 4000,
        duration_ms: 999,
        loop_iter_start: 2,
        loop_iter_end: 2,
        tool_call_count: 0,
        stop_reason: null,
        transition_out: null,
        termination_reason: "completed",
        strict_is_closed: true,
        inferred_is_closed: true,
      },
      {
        query_id: "bg-q",
        turn_id: "turn-1",
        agent_name: "memory",
        query_source: "extract_memories",
        started_at: "2026-05-12T00:01:41.000Z",
        started_at_ms: 4100,
        ended_at: "2026-05-12T00:02:10.000Z",
        ended_at_ms: 6100,
        duration_ms: 2000,
        loop_iter_start: 1,
        loop_iter_end: 1,
        tool_call_count: 0,
        stop_reason: null,
        transition_out: null,
        termination_reason: "completed",
        strict_is_closed: true,
        inferred_is_closed: true,
      },
    ]
    const subagents: SubagentRow[] = [
      {
        subagent_id: "sub-1",
        query_id: "bg-q",
        subagent_type: "extract_memories",
        subagent_reason: "extract_memories",
        subagent_trigger_kind: "stop_hook_background",
        subagent_trigger_detail: "post_turn_background_extraction",
        query_source: "extract_memories",
        agent_name: "memory",
        source_group: null,
        spawned_at: "2026-05-12T00:01:40.100Z",
        spawned_at_ms: 4010,
        completed_at: "2026-05-12T00:02:30.000Z",
        completed_at_ms: 7000,
        duration_ms: 2990,
      },
    ]
    const viewer = buildSemanticViewerData({
      action,
      queries,
      turns,
      subagents,
      tools: [],
      phases: [],
      artifacts: [],
      evidence: [] as EvidenceRecord[],
      turnSnapshotsByKey: new Map(),
      selectedBy: "explicit_user_action_id",
      terminalReason: "completed",
    })

    const forkEdge = viewer.edges.find(edge => edge.edge_type === "fork")
    expect(forkEdge?.from).toBe("turn_main-q_turn-2")
    expect(forkEdge?.to).toBe("turn_bg-q_turn-1")
    expect(viewer.nodes.find(node => node.node_id === "turn_main-q_turn-2")?.badges).toContain("loop:2")
    expect(viewer.nodes.find(node => node.node_id === "turn_bg-q_turn-1")?.badges).toContain("subagent:extract_memories")
  })

  test("prefers the overlapping active turn as the fork parent when background work starts before turn close", () => {
    const action: ActionRow = {
      user_action_id: "action-123",
      event_date: "2026-05-12",
      started_at: "2026-05-12T00:00:00.000Z",
      started_at_ms: 1000,
      ended_at: "2026-05-12T00:10:00.000Z",
      ended_at_ms: 10000,
      duration_ms: 9000,
      query_count: 2,
      subagent_count: 1,
      tool_call_count: 0,
      total_prompt_input_tokens: 10,
      total_billed_tokens: 20,
      main_thread_total_prompt_input_tokens: 10,
      subagent_total_prompt_input_tokens: 0,
    }
    const queries: QueryRow[] = [
      {
        query_id: "main-q",
        user_action_id: "action-123",
        query_source: "repl_main_thread",
        subagent_id: null,
        subagent_reason: null,
        subagent_trigger_kind: null,
        subagent_trigger_detail: null,
        agent_name: "main",
        source_group: null,
        started_at: "2026-05-12T00:00:00.000Z",
        started_at_ms: 1000,
        ended_at: "2026-05-12T00:02:00.000Z",
        ended_at_ms: 6000,
        duration_ms: 5000,
        turn_count: 2,
        query_max_loop_iter: 2,
        tool_call_count: 0,
        terminal_reason: "completed",
        strict_is_complete: true,
        inferred_is_complete: true,
      },
      {
        query_id: "bg-q",
        user_action_id: "action-123",
        query_source: "compact",
        subagent_id: "sub-2",
        subagent_reason: "compact",
        subagent_trigger_kind: "compaction_flow",
        subagent_trigger_detail: "prompt_cache_sharing_compact",
        agent_name: "compact",
        source_group: null,
        started_at: "2026-05-12T00:01:40.000Z",
        started_at_ms: 5000,
        ended_at: "2026-05-12T00:02:10.000Z",
        ended_at_ms: 7000,
        duration_ms: 2000,
        turn_count: 1,
        query_max_loop_iter: 1,
        tool_call_count: 0,
        terminal_reason: "completed",
        strict_is_complete: true,
        inferred_is_complete: true,
      },
    ]
    const turns: TurnRow[] = [
      {
        query_id: "main-q",
        turn_id: "turn-1",
        agent_name: "main",
        query_source: "repl_main_thread",
        started_at: "2026-05-12T00:00:00.000Z",
        started_at_ms: 1000,
        ended_at: "2026-05-12T00:01:00.000Z",
        ended_at_ms: 3000,
        duration_ms: 2000,
        loop_iter_start: 1,
        loop_iter_end: 1,
        tool_call_count: 0,
        stop_reason: null,
        transition_out: "next_turn",
        termination_reason: null,
        strict_is_closed: true,
        inferred_is_closed: true,
      },
      {
        query_id: "main-q",
        turn_id: "turn-2",
        agent_name: "main",
        query_source: "repl_main_thread",
        started_at: "2026-05-12T00:01:00.100Z",
        started_at_ms: 3001,
        ended_at: "2026-05-12T00:01:45.000Z",
        ended_at_ms: 5500,
        duration_ms: 2499,
        loop_iter_start: 2,
        loop_iter_end: 2,
        tool_call_count: 0,
        stop_reason: null,
        transition_out: null,
        termination_reason: "completed",
        strict_is_closed: true,
        inferred_is_closed: true,
      },
      {
        query_id: "bg-q",
        turn_id: "turn-1",
        agent_name: "compact",
        query_source: "compact",
        started_at: "2026-05-12T00:01:40.000Z",
        started_at_ms: 5000,
        ended_at: "2026-05-12T00:02:10.000Z",
        ended_at_ms: 7000,
        duration_ms: 2000,
        loop_iter_start: 1,
        loop_iter_end: 1,
        tool_call_count: 0,
        stop_reason: null,
        transition_out: null,
        termination_reason: "completed",
        strict_is_closed: true,
        inferred_is_closed: true,
      },
    ]
    const subagents: SubagentRow[] = [
      {
        subagent_id: "sub-2",
        query_id: "bg-q",
        subagent_type: "compact",
        subagent_reason: "compact",
        subagent_trigger_kind: "compaction_flow",
        subagent_trigger_detail: "prompt_cache_sharing_compact",
        query_source: "compact",
        agent_name: "compact",
        source_group: null,
        spawned_at: "2026-05-12T00:01:41.000Z",
        spawned_at_ms: 5100,
        completed_at: "2026-05-12T00:02:10.000Z",
        completed_at_ms: 7000,
        duration_ms: 1900,
      },
    ]
    const viewer = buildSemanticViewerData({
      action,
      queries,
      turns,
      subagents,
      tools: [],
      phases: [],
      artifacts: [],
      evidence: [] as EvidenceRecord[],
      turnSnapshotsByKey: new Map(),
      selectedBy: "explicit_user_action_id",
      terminalReason: "completed",
    })

    const forkEdge = viewer.edges.find(edge => edge.edge_type === "fork")
    expect(forkEdge?.from).toBe("turn_main-q_turn-2")
  })

  test("keeps sibling stop-hook background queries attached to the main thread turn", () => {
    const action: ActionRow = {
      user_action_id: "action-123",
      event_date: "2026-05-12",
      started_at: "2026-05-12T00:00:00.000Z",
      started_at_ms: 1000,
      ended_at: "2026-05-12T00:10:00.000Z",
      ended_at_ms: 10000,
      duration_ms: 9000,
      query_count: 3,
      subagent_count: 2,
      tool_call_count: 0,
      total_prompt_input_tokens: 10,
      total_billed_tokens: 20,
      main_thread_total_prompt_input_tokens: 10,
      subagent_total_prompt_input_tokens: 0,
    }
    const queries: QueryRow[] = [
      {
        query_id: "main-q",
        user_action_id: "action-123",
        query_source: "repl_main_thread",
        subagent_id: null,
        subagent_reason: null,
        subagent_trigger_kind: null,
        subagent_trigger_detail: null,
        agent_name: "main",
        source_group: null,
        started_at: "2026-05-12T00:00:00.000Z",
        started_at_ms: 1000,
        ended_at: "2026-05-12T00:02:00.000Z",
        ended_at_ms: 6000,
        duration_ms: 5000,
        turn_count: 2,
        query_max_loop_iter: 2,
        tool_call_count: 0,
        terminal_reason: "completed",
        strict_is_complete: true,
        inferred_is_complete: true,
      },
      {
        query_id: "suggest-q",
        user_action_id: "action-123",
        query_source: "prompt_suggestion",
        subagent_id: "sub-a",
        subagent_reason: "prompt_suggestion",
        subagent_trigger_kind: "stop_hook_background",
        subagent_trigger_detail: "suggestion_generation_allowed",
        agent_name: "prompt_suggestion",
        source_group: null,
        started_at: "2026-05-12T00:01:41.000Z",
        started_at_ms: 5100,
        ended_at: "2026-05-12T00:02:30.000Z",
        ended_at_ms: 7000,
        duration_ms: 1900,
        turn_count: 1,
        query_max_loop_iter: 1,
        tool_call_count: 0,
        terminal_reason: "completed",
        strict_is_complete: true,
        inferred_is_complete: true,
      },
      {
        query_id: "memory-q",
        user_action_id: "action-123",
        query_source: "extract_memories",
        subagent_id: "sub-b",
        subagent_reason: "extract_memories",
        subagent_trigger_kind: "stop_hook_background",
        subagent_trigger_detail: "post_turn_background_extraction",
        agent_name: "extract_memories",
        source_group: null,
        started_at: "2026-05-12T00:01:41.500Z",
        started_at_ms: 5150,
        ended_at: "2026-05-12T00:03:00.000Z",
        ended_at_ms: 8000,
        duration_ms: 2850,
        turn_count: 1,
        query_max_loop_iter: 1,
        tool_call_count: 0,
        terminal_reason: "completed",
        strict_is_complete: true,
        inferred_is_complete: true,
      },
    ]
    const turns: TurnRow[] = [
      {
        query_id: "main-q",
        turn_id: "turn-1",
        agent_name: "main",
        query_source: "repl_main_thread",
        started_at: "2026-05-12T00:00:00.000Z",
        started_at_ms: 1000,
        ended_at: "2026-05-12T00:01:00.000Z",
        ended_at_ms: 3000,
        duration_ms: 2000,
        loop_iter_start: 1,
        loop_iter_end: 1,
        tool_call_count: 0,
        stop_reason: null,
        transition_out: "next_turn",
        termination_reason: null,
        strict_is_closed: true,
        inferred_is_closed: true,
      },
      {
        query_id: "main-q",
        turn_id: "turn-2",
        agent_name: "main",
        query_source: "repl_main_thread",
        started_at: "2026-05-12T00:01:00.100Z",
        started_at_ms: 3001,
        ended_at: "2026-05-12T00:01:50.000Z",
        ended_at_ms: 5600,
        duration_ms: 2599,
        loop_iter_start: 2,
        loop_iter_end: 2,
        tool_call_count: 0,
        stop_reason: null,
        transition_out: null,
        termination_reason: "completed",
        strict_is_closed: true,
        inferred_is_closed: true,
      },
      {
        query_id: "suggest-q",
        turn_id: "turn-1",
        agent_name: "prompt_suggestion",
        query_source: "prompt_suggestion",
        started_at: "2026-05-12T00:01:41.000Z",
        started_at_ms: 5100,
        ended_at: "2026-05-12T00:02:30.000Z",
        ended_at_ms: 7000,
        duration_ms: 1900,
        loop_iter_start: 1,
        loop_iter_end: 1,
        tool_call_count: 0,
        stop_reason: null,
        transition_out: null,
        termination_reason: "completed",
        strict_is_closed: true,
        inferred_is_closed: true,
      },
      {
        query_id: "memory-q",
        turn_id: "turn-1",
        agent_name: "extract_memories",
        query_source: "extract_memories",
        started_at: "2026-05-12T00:01:41.500Z",
        started_at_ms: 5150,
        ended_at: "2026-05-12T00:03:00.000Z",
        ended_at_ms: 8000,
        duration_ms: 2850,
        loop_iter_start: 1,
        loop_iter_end: 1,
        tool_call_count: 0,
        stop_reason: null,
        transition_out: null,
        termination_reason: "completed",
        strict_is_closed: true,
        inferred_is_closed: true,
      },
    ]
    const subagents: SubagentRow[] = [
      {
        subagent_id: "sub-a",
        query_id: "suggest-q",
        subagent_type: "prompt_suggestion",
        subagent_reason: "prompt_suggestion",
        subagent_trigger_kind: "stop_hook_background",
        subagent_trigger_detail: "suggestion_generation_allowed",
        query_source: "prompt_suggestion",
        agent_name: "prompt_suggestion",
        source_group: null,
        spawned_at: "2026-05-12T00:01:40.900Z",
        spawned_at_ms: 5090,
        completed_at: "2026-05-12T00:02:30.000Z",
        completed_at_ms: 7000,
        duration_ms: 1910,
      },
      {
        subagent_id: "sub-b",
        query_id: "memory-q",
        subagent_type: "extract_memories",
        subagent_reason: "extract_memories",
        subagent_trigger_kind: "stop_hook_background",
        subagent_trigger_detail: "post_turn_background_extraction",
        query_source: "extract_memories",
        agent_name: "extract_memories",
        source_group: null,
        spawned_at: "2026-05-12T00:01:41.100Z",
        spawned_at_ms: 5110,
        completed_at: "2026-05-12T00:03:00.000Z",
        completed_at_ms: 8000,
        duration_ms: 2890,
      },
    ]
    const viewer = buildSemanticViewerData({
      action,
      queries,
      turns,
      subagents,
      tools: [],
      phases: [],
      artifacts: [],
      evidence: [] as EvidenceRecord[],
      turnSnapshotsByKey: new Map(),
      selectedBy: "explicit_user_action_id",
      terminalReason: "completed",
    })

    const suggestionFork = viewer.edges.find(edge => edge.to === "turn_suggest-q_turn-1")
    const memoryFork = viewer.edges.find(edge => edge.to === "turn_memory-q_turn-1")
    expect(suggestionFork?.from).toBe("turn_main-q_turn-2")
    expect(memoryFork?.from).toBe("turn_main-q_turn-2")
  })

  test("keeps query mode visible in turn node titles", () => {
    const action: ActionRow = {
      user_action_id: "action-123",
      event_date: "2026-05-12",
      started_at: "2026-05-12T00:00:00.000Z",
      started_at_ms: 1000,
      ended_at: "2026-05-12T00:02:00.000Z",
      ended_at_ms: 6000,
      duration_ms: 5000,
      query_count: 1,
      subagent_count: 0,
      tool_call_count: 0,
      total_prompt_input_tokens: 10,
      total_billed_tokens: 20,
      main_thread_total_prompt_input_tokens: 10,
      subagent_total_prompt_input_tokens: 0,
    }
    const queries: QueryRow[] = [
      {
        query_id: "main-q",
        user_action_id: "action-123",
        query_source: "repl_main_thread",
        subagent_id: null,
        subagent_reason: null,
        subagent_trigger_kind: null,
        subagent_trigger_detail: null,
        agent_name: "main",
        source_group: null,
        started_at: "2026-05-12T00:00:00.000Z",
        started_at_ms: 1000,
        ended_at: "2026-05-12T00:02:00.000Z",
        ended_at_ms: 6000,
        duration_ms: 5000,
        turn_count: 1,
        query_max_loop_iter: 1,
        tool_call_count: 0,
        terminal_reason: "completed",
        strict_is_complete: true,
        inferred_is_complete: true,
      },
    ]
    const turns: TurnRow[] = [
      {
        query_id: "main-q",
        turn_id: "turn-1",
        agent_name: "main",
        query_source: "repl_main_thread",
        started_at: "2026-05-12T00:00:00.000Z",
        started_at_ms: 1000,
        ended_at: "2026-05-12T00:01:00.000Z",
        ended_at_ms: 3000,
        duration_ms: 2000,
        loop_iter_start: 1,
        loop_iter_end: 1,
        tool_call_count: 0,
        stop_reason: null,
        transition_out: null,
        termination_reason: "completed",
        strict_is_closed: true,
        inferred_is_closed: true,
      },
    ]

    const viewer = buildSemanticViewerData({
      action,
      queries,
      turns,
      subagents: [],
      tools: [],
      phases: [],
      artifacts: [],
      evidence: [] as EvidenceRecord[],
      turnSnapshotsByKey: new Map(),
      selectedBy: "explicit_user_action_id",
      terminalReason: "completed",
    })

    expect(viewer.nodes.find(node => node.node_id === "turn_main-q_turn-1")?.title).toContain("repl_main_thread")
  })

  test("marks fork source nodes with a visible fork badge", () => {
    const action: ActionRow = {
      user_action_id: "action-123",
      event_date: "2026-05-12",
      started_at: "2026-05-12T00:00:00.000Z",
      started_at_ms: 1000,
      ended_at: "2026-05-12T00:10:00.000Z",
      ended_at_ms: 10000,
      duration_ms: 9000,
      query_count: 3,
      subagent_count: 2,
      tool_call_count: 0,
      total_prompt_input_tokens: 10,
      total_billed_tokens: 20,
      main_thread_total_prompt_input_tokens: 10,
      subagent_total_prompt_input_tokens: 0,
    }
    const queries: QueryRow[] = [
      {
        query_id: "main-q",
        user_action_id: "action-123",
        query_source: "repl_main_thread",
        subagent_id: null,
        subagent_reason: null,
        subagent_trigger_kind: null,
        subagent_trigger_detail: null,
        agent_name: "main",
        source_group: null,
        started_at: "2026-05-12T00:00:00.000Z",
        started_at_ms: 1000,
        ended_at: "2026-05-12T00:02:00.000Z",
        ended_at_ms: 6000,
        duration_ms: 5000,
        turn_count: 2,
        query_max_loop_iter: 2,
        tool_call_count: 0,
        terminal_reason: "completed",
        strict_is_complete: true,
        inferred_is_complete: true,
      },
      {
        query_id: "suggest-q",
        user_action_id: "action-123",
        query_source: "prompt_suggestion",
        subagent_id: "sub-a",
        subagent_reason: "prompt_suggestion",
        subagent_trigger_kind: "stop_hook_background",
        subagent_trigger_detail: "suggestion_generation_allowed",
        agent_name: "prompt_suggestion",
        source_group: null,
        started_at: "2026-05-12T00:01:41.000Z",
        started_at_ms: 5100,
        ended_at: "2026-05-12T00:02:30.000Z",
        ended_at_ms: 7000,
        duration_ms: 1900,
        turn_count: 1,
        query_max_loop_iter: 1,
        tool_call_count: 0,
        terminal_reason: "completed",
        strict_is_complete: true,
        inferred_is_complete: true,
      },
      {
        query_id: "memory-q",
        user_action_id: "action-123",
        query_source: "extract_memories",
        subagent_id: "sub-b",
        subagent_reason: "extract_memories",
        subagent_trigger_kind: "stop_hook_background",
        subagent_trigger_detail: "post_turn_background_extraction",
        agent_name: "extract_memories",
        source_group: null,
        started_at: "2026-05-12T00:01:41.500Z",
        started_at_ms: 5150,
        ended_at: "2026-05-12T00:03:00.000Z",
        ended_at_ms: 8000,
        duration_ms: 2850,
        turn_count: 1,
        query_max_loop_iter: 1,
        tool_call_count: 0,
        terminal_reason: "completed",
        strict_is_complete: true,
        inferred_is_complete: true,
      },
    ]
    const turns: TurnRow[] = [
      {
        query_id: "main-q",
        turn_id: "turn-1",
        agent_name: "main",
        query_source: "repl_main_thread",
        started_at: "2026-05-12T00:00:00.000Z",
        started_at_ms: 1000,
        ended_at: "2026-05-12T00:01:00.000Z",
        ended_at_ms: 3000,
        duration_ms: 2000,
        loop_iter_start: 1,
        loop_iter_end: 1,
        tool_call_count: 0,
        stop_reason: null,
        transition_out: "next_turn",
        termination_reason: null,
        strict_is_closed: true,
        inferred_is_closed: true,
      },
      {
        query_id: "main-q",
        turn_id: "turn-2",
        agent_name: "main",
        query_source: "repl_main_thread",
        started_at: "2026-05-12T00:01:00.100Z",
        started_at_ms: 3001,
        ended_at: "2026-05-12T00:01:50.000Z",
        ended_at_ms: 5600,
        duration_ms: 2599,
        loop_iter_start: 2,
        loop_iter_end: 2,
        tool_call_count: 0,
        stop_reason: null,
        transition_out: null,
        termination_reason: "completed",
        strict_is_closed: true,
        inferred_is_closed: true,
      },
      {
        query_id: "suggest-q",
        turn_id: "turn-1",
        agent_name: "prompt_suggestion",
        query_source: "prompt_suggestion",
        started_at: "2026-05-12T00:01:41.000Z",
        started_at_ms: 5100,
        ended_at: "2026-05-12T00:02:30.000Z",
        ended_at_ms: 7000,
        duration_ms: 1900,
        loop_iter_start: 1,
        loop_iter_end: 1,
        tool_call_count: 0,
        stop_reason: null,
        transition_out: null,
        termination_reason: "completed",
        strict_is_closed: true,
        inferred_is_closed: true,
      },
      {
        query_id: "memory-q",
        turn_id: "turn-1",
        agent_name: "extract_memories",
        query_source: "extract_memories",
        started_at: "2026-05-12T00:01:41.500Z",
        started_at_ms: 5150,
        ended_at: "2026-05-12T00:03:00.000Z",
        ended_at_ms: 8000,
        duration_ms: 2850,
        loop_iter_start: 1,
        loop_iter_end: 1,
        tool_call_count: 0,
        stop_reason: null,
        transition_out: null,
        termination_reason: "completed",
        strict_is_closed: true,
        inferred_is_closed: true,
      },
    ]
    const subagents: SubagentRow[] = [
      {
        subagent_id: "sub-a",
        query_id: "suggest-q",
        subagent_type: "prompt_suggestion",
        subagent_reason: "prompt_suggestion",
        subagent_trigger_kind: "stop_hook_background",
        subagent_trigger_detail: "suggestion_generation_allowed",
        query_source: "prompt_suggestion",
        agent_name: "prompt_suggestion",
        source_group: null,
        spawned_at: "2026-05-12T00:01:40.900Z",
        spawned_at_ms: 5090,
        completed_at: "2026-05-12T00:02:30.000Z",
        completed_at_ms: 7000,
        duration_ms: 1910,
      },
      {
        subagent_id: "sub-b",
        query_id: "memory-q",
        subagent_type: "extract_memories",
        subagent_reason: "extract_memories",
        subagent_trigger_kind: "stop_hook_background",
        subagent_trigger_detail: "post_turn_background_extraction",
        query_source: "extract_memories",
        agent_name: "extract_memories",
        source_group: null,
        spawned_at: "2026-05-12T00:01:41.100Z",
        spawned_at_ms: 5110,
        completed_at: "2026-05-12T00:03:00.000Z",
        completed_at_ms: 8000,
        duration_ms: 2890,
      },
    ]

    const viewer = buildSemanticViewerData({
      action,
      queries,
      turns,
      subagents,
      tools: [],
      phases: [],
      artifacts: [],
      evidence: [] as EvidenceRecord[],
      turnSnapshotsByKey: new Map(),
      selectedBy: "explicit_user_action_id",
      terminalReason: "completed",
    })

    expect(viewer.nodes.find(node => node.node_id === "turn_main-q_turn-2")?.badges).toContain("fork:2")
  })

  test("adds a return edge when child query hands results back to a later parent turn", () => {
    const action: ActionRow = {
      user_action_id: "action-123",
      event_date: "2026-05-12",
      started_at: "2026-05-12T00:00:00.000Z",
      started_at_ms: 1000,
      ended_at: "2026-05-12T00:10:00.000Z",
      ended_at_ms: 10000,
      duration_ms: 9000,
      query_count: 2,
      subagent_count: 1,
      tool_call_count: 0,
      total_prompt_input_tokens: 10,
      total_billed_tokens: 20,
      main_thread_total_prompt_input_tokens: 10,
      subagent_total_prompt_input_tokens: 0,
    }
    const queries: QueryRow[] = [
      {
        query_id: "main-q",
        user_action_id: "action-123",
        query_source: "repl_main_thread",
        subagent_id: null,
        subagent_reason: null,
        subagent_trigger_kind: null,
        subagent_trigger_detail: null,
        agent_name: "main",
        source_group: null,
        started_at: "2026-05-12T00:00:00.000Z",
        started_at_ms: 1000,
        ended_at: "2026-05-12T00:04:00.000Z",
        ended_at_ms: 9000,
        duration_ms: 8000,
        turn_count: 3,
        query_max_loop_iter: 3,
        tool_call_count: 0,
        terminal_reason: "completed",
        strict_is_complete: true,
        inferred_is_complete: true,
      },
      {
        query_id: "child-q",
        user_action_id: "action-123",
        query_source: "prompt_suggestion",
        subagent_id: "sub-a",
        subagent_reason: "prompt_suggestion",
        subagent_trigger_kind: "stop_hook_background",
        subagent_trigger_detail: "suggestion_generation_allowed",
        agent_name: "prompt_suggestion",
        source_group: null,
        started_at: "2026-05-12T00:01:41.000Z",
        started_at_ms: 5100,
        ended_at: "2026-05-12T00:02:10.000Z",
        ended_at_ms: 6100,
        duration_ms: 1000,
        turn_count: 1,
        query_max_loop_iter: 1,
        tool_call_count: 0,
        terminal_reason: "completed",
        strict_is_complete: true,
        inferred_is_complete: true,
      },
    ]
    const turns: TurnRow[] = [
      {
        query_id: "main-q",
        turn_id: "turn-1",
        agent_name: "main",
        query_source: "repl_main_thread",
        started_at: "2026-05-12T00:00:00.000Z",
        started_at_ms: 1000,
        ended_at: "2026-05-12T00:01:00.000Z",
        ended_at_ms: 3000,
        duration_ms: 2000,
        loop_iter_start: 1,
        loop_iter_end: 1,
        tool_call_count: 0,
        stop_reason: null,
        transition_out: "next_turn",
        termination_reason: null,
        strict_is_closed: true,
        inferred_is_closed: true,
      },
      {
        query_id: "main-q",
        turn_id: "turn-2",
        agent_name: "main",
        query_source: "repl_main_thread",
        started_at: "2026-05-12T00:01:00.100Z",
        started_at_ms: 3001,
        ended_at: "2026-05-12T00:01:50.000Z",
        ended_at_ms: 5600,
        duration_ms: 2599,
        loop_iter_start: 2,
        loop_iter_end: 2,
        tool_call_count: 0,
        stop_reason: null,
        transition_out: "next_turn",
        termination_reason: null,
        strict_is_closed: true,
        inferred_is_closed: true,
      },
      {
        query_id: "child-q",
        turn_id: "turn-1",
        agent_name: "prompt_suggestion",
        query_source: "prompt_suggestion",
        started_at: "2026-05-12T00:01:41.000Z",
        started_at_ms: 5100,
        ended_at: "2026-05-12T00:02:10.000Z",
        ended_at_ms: 6100,
        duration_ms: 1000,
        loop_iter_start: 1,
        loop_iter_end: 1,
        tool_call_count: 0,
        stop_reason: null,
        transition_out: null,
        termination_reason: "completed",
        strict_is_closed: true,
        inferred_is_closed: true,
      },
      {
        query_id: "main-q",
        turn_id: "turn-3",
        agent_name: "main",
        query_source: "repl_main_thread",
        started_at: "2026-05-12T00:02:20.000Z",
        started_at_ms: 6200,
        ended_at: "2026-05-12T00:03:00.000Z",
        ended_at_ms: 8000,
        duration_ms: 1800,
        loop_iter_start: 3,
        loop_iter_end: 3,
        tool_call_count: 0,
        stop_reason: null,
        transition_out: null,
        termination_reason: "completed",
        strict_is_closed: true,
        inferred_is_closed: true,
      },
    ]
    const subagents: SubagentRow[] = [
      {
        subagent_id: "sub-a",
        query_id: "child-q",
        subagent_type: "prompt_suggestion",
        subagent_reason: "prompt_suggestion",
        subagent_trigger_kind: "stop_hook_background",
        subagent_trigger_detail: "suggestion_generation_allowed",
        query_source: "prompt_suggestion",
        agent_name: "prompt_suggestion",
        source_group: null,
        spawned_at: "2026-05-12T00:01:40.900Z",
        spawned_at_ms: 5090,
        completed_at: "2026-05-12T00:02:10.000Z",
        completed_at_ms: 6100,
        duration_ms: 1010,
      },
    ]

    const viewer = buildSemanticViewerData({
      action,
      queries,
      turns,
      subagents,
      tools: [],
      phases: [],
      artifacts: [],
      evidence: [] as EvidenceRecord[],
      turnSnapshotsByKey: new Map(),
      selectedBy: "explicit_user_action_id",
      terminalReason: "completed",
    })

    const returnEdge = viewer.edges.find(edge => edge.edge_type === "return")
    expect(returnEdge?.from).toBe("turn_child-q_turn-1")
    expect(returnEdge?.to).toBe("turn_main-q_turn-3")
  })

  test("keeps main thread centered and branches side lanes outward", () => {
    const viewer: SemanticViewerData = {
      action: {
        user_action_id: "action-123",
        selected_by: "explicit_user_action_id",
        duration_ms: 1200,
        query_count: 4,
        subagent_count: 3,
        tool_call_count: 0,
        total_billed_tokens: 42,
        terminal_reason: "completed",
        warning: null,
      },
      lanes: [
        {
          lane_id: "lane_main",
          query_id: "main-q",
          label: "Query repl_main_thread | main-q",
          query_source: "repl_main_thread",
          agent_name: "main",
          turn_count: 2,
          tool_call_count: 0,
          duration_ms: 10,
          terminal_reason: "completed",
        },
        {
          lane_id: "lane_suggest",
          query_id: "suggest-q",
          label: "Query prompt_suggestion | suggest-q",
          query_source: "prompt_suggestion",
          agent_name: "prompt_suggestion",
          turn_count: 1,
          tool_call_count: 0,
          duration_ms: 5,
          terminal_reason: "completed",
        },
        {
          lane_id: "lane_memory",
          query_id: "memory-q",
          label: "Query extract_memories | memory-q",
          query_source: "extract_memories",
          agent_name: "extract_memories",
          turn_count: 2,
          tool_call_count: 0,
          duration_ms: 7,
          terminal_reason: "completed",
        },
        {
          lane_id: "lane_compact",
          query_id: "compact-q",
          label: "Query compact | compact-q",
          query_source: "compact",
          agent_name: "compact",
          turn_count: 1,
          tool_call_count: 0,
          duration_ms: 2,
          terminal_reason: "completed",
        },
      ],
      nodes: [
        {
          node_id: "turn_main-q_turn-1",
          node_type: "turn",
          title: "repl_main_thread / turn-1",
          lane_id: "lane_main",
          query_id: "main-q",
          turn_id: "turn-1",
          agent_name: "main",
          started_at: "2026-05-12T00:00:00.000Z",
          ended_at: "2026-05-12T00:01:00.000Z",
          phase_ids: [],
          tool_call_ids: [],
          artifact_paths: [],
          evidence_refs: [],
          summary_observed: "",
          summary_interpretation: "",
          badges: [],
          metrics: { duration_ms: 1, prompt_tokens: null, output_tokens: null, billed_tokens: null, cache_read_tokens: null, tool_call_count: 0, subagent_spawn_count: 0, compact_event_count: 0 },
        },
        {
          node_id: "turn_main-q_turn-2",
          node_type: "turn",
          title: "repl_main_thread / turn-2",
          lane_id: "lane_main",
          query_id: "main-q",
          turn_id: "turn-2",
          agent_name: "main",
          started_at: "2026-05-12T00:02:00.000Z",
          ended_at: "2026-05-12T00:03:00.000Z",
          phase_ids: [],
          tool_call_ids: [],
          artifact_paths: [],
          evidence_refs: [],
          summary_observed: "",
          summary_interpretation: "",
          badges: [],
          metrics: { duration_ms: 1, prompt_tokens: null, output_tokens: null, billed_tokens: null, cache_read_tokens: null, tool_call_count: 0, subagent_spawn_count: 0, compact_event_count: 0 },
        },
        {
          node_id: "turn_suggest-q_turn-1",
          node_type: "turn",
          title: "prompt_suggestion / turn-1",
          lane_id: "lane_suggest",
          query_id: "suggest-q",
          turn_id: "turn-1",
          agent_name: "prompt_suggestion",
          started_at: "2026-05-12T00:02:01.000Z",
          ended_at: "2026-05-12T00:02:30.000Z",
          phase_ids: [],
          tool_call_ids: [],
          artifact_paths: [],
          evidence_refs: [],
          summary_observed: "",
          summary_interpretation: "",
          badges: [],
          metrics: { duration_ms: 1, prompt_tokens: null, output_tokens: null, billed_tokens: null, cache_read_tokens: null, tool_call_count: 0, subagent_spawn_count: 0, compact_event_count: 0 },
        },
        {
          node_id: "turn_memory-q_turn-1",
          node_type: "turn",
          title: "extract_memories / turn-1",
          lane_id: "lane_memory",
          query_id: "memory-q",
          turn_id: "turn-1",
          agent_name: "extract_memories",
          started_at: "2026-05-12T00:02:02.000Z",
          ended_at: "2026-05-12T00:02:40.000Z",
          phase_ids: [],
          tool_call_ids: [],
          artifact_paths: [],
          evidence_refs: [],
          summary_observed: "",
          summary_interpretation: "",
          badges: [],
          metrics: { duration_ms: 1, prompt_tokens: null, output_tokens: null, billed_tokens: null, cache_read_tokens: null, tool_call_count: 0, subagent_spawn_count: 0, compact_event_count: 0 },
        },
        {
          node_id: "turn_memory-q_turn-2",
          node_type: "turn",
          title: "extract_memories / turn-2",
          lane_id: "lane_memory",
          query_id: "memory-q",
          turn_id: "turn-2",
          agent_name: "extract_memories",
          started_at: "2026-05-12T00:02:50.000Z",
          ended_at: "2026-05-12T00:03:10.000Z",
          phase_ids: [],
          tool_call_ids: [],
          artifact_paths: [],
          evidence_refs: [],
          summary_observed: "",
          summary_interpretation: "",
          badges: [],
          metrics: { duration_ms: 1, prompt_tokens: null, output_tokens: null, billed_tokens: null, cache_read_tokens: null, tool_call_count: 0, subagent_spawn_count: 0, compact_event_count: 0 },
        },
        {
          node_id: "turn_compact-q_turn-1",
          node_type: "turn",
          title: "compact / turn-1",
          lane_id: "lane_compact",
          query_id: "compact-q",
          turn_id: "turn-1",
          agent_name: "compact",
          started_at: "2026-05-12T00:03:11.000Z",
          ended_at: "2026-05-12T00:03:30.000Z",
          phase_ids: [],
          tool_call_ids: [],
          artifact_paths: [],
          evidence_refs: [],
          summary_observed: "",
          summary_interpretation: "",
          badges: [],
          metrics: { duration_ms: 1, prompt_tokens: null, output_tokens: null, billed_tokens: null, cache_read_tokens: null, tool_call_count: 0, subagent_spawn_count: 0, compact_event_count: 0 },
        },
      ],
      edges: [
        { edge_id: "e1", from: "action_root", to: "turn_main-q_turn-1", edge_type: "sequential", label: "repl_main_thread" },
        { edge_id: "e2", from: "turn_main-q_turn-1", to: "turn_main-q_turn-2", edge_type: "sequential", label: "next" },
        { edge_id: "e3", from: "turn_main-q_turn-2", to: "turn_suggest-q_turn-1", edge_type: "fork", label: "prompt_suggestion" },
        { edge_id: "e4", from: "turn_main-q_turn-2", to: "turn_memory-q_turn-1", edge_type: "fork", label: "extract_memories" },
        { edge_id: "e5", from: "turn_memory-q_turn-1", to: "turn_memory-q_turn-2", edge_type: "sequential", label: "next" },
        { edge_id: "e6", from: "turn_memory-q_turn-2", to: "turn_compact-q_turn-1", edge_type: "fork", label: "compact" },
      ],
      details: {},
    }

    const plan = planLaneColumns(viewer)

    expect(plan.lane_main).toBe(0)
    expect(plan.lane_suggest).toBe(-1)
    expect(plan.lane_memory).toBe(1)
    expect(plan.lane_compact).toBe(2)
  })
})
