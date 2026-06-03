import type {
  ActionRow,
  ArtifactRecord,
  DialogueBlock,
  EvidenceRecord,
  JsonValue,
  PhaseRecord,
  QueryRow,
  RichToolCall,
  SelectionMode,
  SemanticEdge,
  SemanticLane,
  SemanticNode,
  SemanticNodeDetail,
  SemanticViewerRecentDbAction,
  SemanticViewerData,
  SemanticViewerIndexEntry,
  SnapshotRecord,
  SubagentRow,
  TurnRow,
  TurnSnapshotBundle,
} from "./deep_action_types"

type RequestWindowParams = {
  currentRequest: SnapshotRecord | null
  previousRequest: SnapshotRecord | null
  userActionId: string
  querySource: string | null
  queryId: string
  turnId: string
}

type RequestMessageEntry = {
  message_uuid: string | null
  type: string
  subtype: string | null
  timestamp: string | null
  role: string
  is_meta: boolean
  text_content: string
  tool_use_id: string | null
  tool_name: string | null
  has_tool_result: boolean
  match_key: string
}

type UsageSummary = {
  prompt_tokens: number | null
  output_tokens: number | null
  billed_tokens: number | null
  cache_read_tokens: number | null
}

type TurnAnchor = {
  query_id: string
  turn_id: string
  started_at_ms: number
  ended_at_ms: number
}

function asRecord(value: JsonValue | null | undefined): Record<string, JsonValue> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  return value as Record<string, JsonValue>
}

function asArray(value: JsonValue | null | undefined): JsonValue[] {
  return Array.isArray(value) ? value : []
}

function shortId(value: string | null | undefined): string {
  if (!value) return "unknown"
  return value.length <= 8 ? value : value.slice(0, 8)
}

function squash(value: string, maxLength = 240): { excerpt: string; truncated: boolean } {
  const normalized = value.replace(/\r\n/g, "\n").trim()
  if (normalized.length <= maxLength) {
    return { excerpt: normalized, truncated: false }
  }
  return { excerpt: `${normalized.slice(0, maxLength - 3)}...`, truncated: true }
}

function stringify(value: JsonValue | null | undefined): string {
  if (value === null || value === undefined) return ""
  if (typeof value === "string") return value
  return JSON.stringify(value, null, 2)
}

function blockText(value: JsonValue | null | undefined): string {
  const record = asRecord(value)
  if (!record) return stringify(value)
  if (typeof record.text === "string") return record.text
  if (record.type === "tool_use") {
    const name = typeof record.name === "string" ? record.name : "tool_use"
    return `${name}\n${JSON.stringify(record.input ?? {}, null, 2)}`
  }
  if (record.type === "tool_result") {
    const content = record.content
    if (typeof content === "string") return content
    if (Array.isArray(content)) {
      return content.map(item => blockText(item)).filter(Boolean).join("\n")
    }
    return stringify(content)
  }
  return stringify(value)
}

function extractRequestEntries(snapshot: SnapshotRecord | null): RequestMessageEntry[] {
  const data = asRecord(snapshot?.data ?? null)
  const messages = asArray(data?.messages)
  return messages.map((message, index) => {
    const record = asRecord(message)
    const messageRecord = asRecord(record?.message as JsonValue)
    const content = messageRecord?.content
    const contentArray = asArray(content)
    const toolResultBlock = contentArray.find(item => asRecord(item)?.type === "tool_result")
    const toolResultRecord = asRecord(toolResultBlock)
    const toolResultText =
      toolResultRecord && toolResultRecord.type === "tool_result"
        ? blockText(toolResultRecord.content)
        : ""
    const assistantText = contentArray
      .filter(item => {
        const itemRecord = asRecord(item)
        return itemRecord?.type === "text"
      })
      .map(item => blockText(item))
      .filter(Boolean)
      .join("\n")
    const textContent =
      typeof content === "string"
        ? content
        : toolResultText || assistantText || contentArray.map(item => blockText(item)).filter(Boolean).join("\n")
    const messageUuid = typeof record?.uuid === "string" ? record.uuid : `message-${index}`
    return {
      message_uuid: messageUuid,
      type: typeof record?.type === "string" ? record.type : "unknown",
      subtype: typeof record?.subtype === "string" ? record.subtype : null,
      timestamp: typeof record?.timestamp === "string" ? record.timestamp : null,
      role: typeof messageRecord?.role === "string" ? messageRecord.role : typeof record?.type === "string" ? record.type : "unknown",
      is_meta: record?.isMeta === true,
      text_content: textContent,
      tool_use_id: typeof toolResultRecord?.tool_use_id === "string" ? toolResultRecord.tool_use_id : null,
      tool_name: typeof asRecord(contentArray.find(item => asRecord(item)?.type === "tool_use"))?.name === "string"
        ? (asRecord(contentArray.find(item => asRecord(item)?.type === "tool_use"))?.name as string)
        : null,
      has_tool_result: Boolean(toolResultRecord),
      match_key: typeof record?.uuid === "string" ? record.uuid : `${record?.type ?? "unknown"}:${textContent.slice(0, 120)}`,
    }
  })
}

function trailingConversationWindow(entries: RequestMessageEntry[]): RequestMessageEntry[] {
  const visible = entries.filter(entry => !entry.is_meta && entry.type !== "system")
  return visible.slice(Math.max(0, visible.length - 6))
}

function entryToDialogueBlocks(entry: RequestMessageEntry, params: RequestWindowParams, index: number): DialogueBlock[] {
  if (!entry.text_content.trim()) return []
  const nodeId = `turn_${params.queryId}_${params.turnId}`
  const base = {
    node_id: nodeId,
    query_id: params.queryId,
    turn_id: params.turnId,
    snapshot_ref: params.currentRequest?.snapshotRef ?? null,
    message_uuid: entry.message_uuid,
    evidence_ref: params.currentRequest?.snapshotRef ?? null,
    warnings: [] as string[],
  }

  if (entry.has_tool_result) {
    const squashed = squash(entry.text_content, 320)
    return [
      {
        dialogue_block_id: `${nodeId}_request_${index}`,
        role: "tool_result",
        kind: "tool_result",
        title: `Tool result${entry.tool_use_id ? ` (${entry.tool_use_id})` : ""}`,
        role_label: "Tool result",
        badges: ["feeds next prompt"],
        raw_text: entry.text_content,
        excerpt: squashed.excerpt,
        truncated: squashed.truncated,
        tool_call_id: entry.tool_use_id,
        ...base,
      },
    ]
  }

  if (entry.type === "assistant" && entry.role === "assistant") {
    const squashed = squash(entry.text_content, 320)
    return [
      {
        dialogue_block_id: `${nodeId}_request_${index}`,
        role: "assistant",
        kind: "assistant_reply",
        title: "Assistant context carried into this turn",
        role_label: "Assistant context",
        badges: ["token-bearing", "carried context"],
        raw_text: entry.text_content,
        excerpt: squashed.excerpt,
        truncated: squashed.truncated,
        tool_call_id: null,
        ...base,
      },
    ]
  }

  if (entry.type === "user" && entry.role === "user") {
    const squashed = squash(entry.text_content, 320)
    const isMainThread = params.querySource === "repl_main_thread"
    return [
      {
        dialogue_block_id: `${nodeId}_request_${index}`,
        role: "user",
        kind: "user_message",
        title: isMainThread ? "User" : "Internal user prompt",
        role_label: isMainThread ? "User" : "Internal user prompt",
        badges: isMainThread ? ["token-bearing"] : ["token-bearing", "internal prompt"],
        raw_text: entry.text_content,
        excerpt: squashed.excerpt,
        truncated: squashed.truncated,
        tool_call_id: null,
        ...base,
      },
    ]
  }

  return []
}

export function buildRequestWindowBlocks(params: RequestWindowParams): DialogueBlock[] {
  const currentEntries = extractRequestEntries(params.currentRequest)
  if (currentEntries.length === 0) return []

  let windowEntries: RequestMessageEntry[] = []
  if (params.previousRequest) {
    const previousEntries = extractRequestEntries(params.previousRequest)
    const anchor = previousEntries.at(-1)?.match_key
    if (anchor) {
      let anchorIndex = -1
      for (let index = currentEntries.length - 1; index >= 0; index -= 1) {
        if (currentEntries[index]?.match_key === anchor) {
          anchorIndex = index
          break
        }
      }
      if (anchorIndex >= 0) {
        windowEntries = currentEntries.slice(anchorIndex + 1)
      }
    }
    if (windowEntries.length === 0) {
      let prefixLength = 0
      while (
        prefixLength < previousEntries.length &&
        prefixLength < currentEntries.length &&
        previousEntries[prefixLength]?.match_key === currentEntries[prefixLength]?.match_key
      ) {
        prefixLength += 1
      }
      windowEntries = currentEntries.slice(prefixLength)
    }
  } else if (params.querySource === "repl_main_thread") {
    const actionIndex = currentEntries.findIndex(entry => entry.message_uuid === params.userActionId)
    windowEntries = actionIndex >= 0 ? currentEntries.slice(actionIndex) : trailingConversationWindow(currentEntries)
  } else {
    windowEntries = trailingConversationWindow(currentEntries)
  }

  return windowEntries.flatMap((entry, index) => entryToDialogueBlocks(entry, params, index))
}

function extractAssistantResponseBlocks(params: {
  responseSnapshot: SnapshotRecord | null
  queryId: string
  turnId: string
}): DialogueBlock[] {
  const snapshot = params.responseSnapshot
  const data = asRecord(snapshot?.data ?? null)
  if (!data) return []
  const nodeId = `turn_${params.queryId}_${params.turnId}`
  const blocks: DialogueBlock[] = []
  const emittedToolUseIds = new Set<string>()
  let blockIndex = 0

  for (const assistantMessage of asArray(data.assistantMessages)) {
    const record = asRecord(assistantMessage)
    const messageRecord = asRecord(record?.message as JsonValue)
    for (const content of asArray(messageRecord?.content)) {
      const contentRecord = asRecord(content)
      if (!contentRecord) continue
      if (contentRecord.type === "text" && typeof contentRecord.text === "string") {
        const squashed = squash(contentRecord.text, 320)
        blocks.push({
          dialogue_block_id: `${nodeId}_response_${blockIndex}`,
          node_id: nodeId,
          role: "assistant",
          kind: "assistant_reply",
          title: "Assistant output",
          role_label: "Assistant",
          badges: ["token-bearing"],
          raw_text: contentRecord.text,
          excerpt: squashed.excerpt,
          truncated: squashed.truncated,
          query_id: params.queryId,
          turn_id: params.turnId,
          snapshot_ref: snapshot?.snapshotRef ?? null,
          message_uuid: typeof record?.uuid === "string" ? record.uuid : null,
          tool_call_id: null,
          evidence_ref: snapshot?.snapshotRef ?? null,
          warnings: [],
        })
        blockIndex += 1
        continue
      }
      if (contentRecord.type === "tool_use" && typeof contentRecord.name === "string") {
        const rawText = `${contentRecord.name}\n${JSON.stringify(contentRecord.input ?? {}, null, 2)}`
        const squashed = squash(rawText, 320)
        const toolCallId = typeof contentRecord.id === "string" ? contentRecord.id : null
        if (toolCallId) emittedToolUseIds.add(toolCallId)
        blocks.push({
          dialogue_block_id: `${nodeId}_response_${blockIndex}`,
          node_id: nodeId,
          role: "tool_use",
          kind: "assistant_tool_use",
          title: `Assistant tool use: ${contentRecord.name}`,
          role_label: "Assistant tool use",
          badges: ["token-bearing", contentRecord.name],
          raw_text: rawText,
          excerpt: squashed.excerpt,
          truncated: squashed.truncated,
          query_id: params.queryId,
          turn_id: params.turnId,
          snapshot_ref: snapshot?.snapshotRef ?? null,
          message_uuid: typeof record?.uuid === "string" ? record.uuid : null,
          tool_call_id: toolCallId,
          evidence_ref: snapshot?.snapshotRef ?? null,
          warnings: [],
        })
        blockIndex += 1
      }
    }
  }

  for (const toolUseBlock of asArray(data.toolUseBlocks)) {
    const record = asRecord(toolUseBlock)
    if (!record || typeof record.name !== "string") continue
    const toolCallId = typeof record.id === "string" ? record.id : null
    if (toolCallId && emittedToolUseIds.has(toolCallId)) continue
    const rawText = `${record.name}\n${JSON.stringify(record.input ?? {}, null, 2)}`
    const squashed = squash(rawText, 320)
    blocks.push({
      dialogue_block_id: `${nodeId}_response_${blockIndex}`,
      node_id: nodeId,
      role: "tool_use",
      kind: "assistant_tool_use",
      title: `Assistant tool use: ${record.name}`,
      role_label: "Assistant tool use",
      badges: ["token-bearing", record.name],
      raw_text: rawText,
      excerpt: squashed.excerpt,
      truncated: squashed.truncated,
      query_id: params.queryId,
      turn_id: params.turnId,
      snapshot_ref: snapshot?.snapshotRef ?? null,
      message_uuid: null,
      tool_call_id: toolCallId,
      evidence_ref: snapshot?.snapshotRef ?? null,
      warnings: [],
    })
    blockIndex += 1
  }

  return blocks
}

function extractUsage(snapshot: SnapshotRecord | null): UsageSummary {
  const data = asRecord(snapshot?.data ?? null)
  const assistantMessages = asArray(data?.assistantMessages)
  const usageRecords = assistantMessages
    .map(message => asRecord(asRecord(message)?.message as JsonValue))
    .map(message => asRecord(message?.usage as JsonValue))
    .filter((usage): usage is Record<string, JsonValue> => Boolean(usage))
  let promptTokens = 0
  let outputTokens = 0
  let cacheReadTokens = 0
  let found = false
  for (const usage of usageRecords) {
    if (typeof usage.input_tokens === "number") {
      promptTokens += usage.input_tokens
      found = true
    }
    if (typeof usage.output_tokens === "number") {
      outputTokens += usage.output_tokens
      found = true
    }
    if (typeof usage.cache_read_input_tokens === "number") {
      cacheReadTokens += usage.cache_read_input_tokens
      found = true
    }
  }
  return {
    prompt_tokens: found ? promptTokens : null,
    output_tokens: found ? outputTokens : null,
    billed_tokens: found ? promptTokens + outputTokens : null,
    cache_read_tokens: found ? cacheReadTokens : null,
  }
}

function turnEndedAtMs(turn: TurnRow): number {
  return turn.ended_at_ms ?? turn.started_at_ms
}

function turnStartedAtMs(turn: TurnRow): number {
  return turn.started_at_ms
}

function selectAnchorTurn(turns: TurnRow[], spawnMs: number, queryId: string): TurnAnchor | null {
  const overlappingTurn = [...turns]
    .filter(
      turn =>
        turn.query_id !== queryId &&
        turnStartedAtMs(turn) <= spawnMs &&
        turnEndedAtMs(turn) >= spawnMs,
    )
    .sort((left, right) => turnStartedAtMs(right) - turnStartedAtMs(left))
    .at(0)
  if (overlappingTurn) {
    return {
      query_id: overlappingTurn.query_id,
      turn_id: overlappingTurn.turn_id,
      started_at_ms: overlappingTurn.started_at_ms,
      ended_at_ms: turnEndedAtMs(overlappingTurn),
    }
  }

  const priorTurn = [...turns]
    .filter(turn => turn.query_id !== queryId && turnEndedAtMs(turn) <= spawnMs)
    .sort((left, right) => turnEndedAtMs(right) - turnEndedAtMs(left))
    .at(0)
  if (priorTurn) {
    return {
      query_id: priorTurn.query_id,
      turn_id: priorTurn.turn_id,
      started_at_ms: priorTurn.started_at_ms,
      ended_at_ms: turnEndedAtMs(priorTurn),
    }
  }

  const latestStartedTurn = [...turns]
    .filter(turn => turn.query_id !== queryId && turnStartedAtMs(turn) <= spawnMs)
    .sort((left, right) => turnStartedAtMs(right) - turnStartedAtMs(left))
    .at(0)

  return latestStartedTurn
    ? {
        query_id: latestStartedTurn.query_id,
        turn_id: latestStartedTurn.turn_id,
        started_at_ms: latestStartedTurn.started_at_ms,
        ended_at_ms: turnEndedAtMs(latestStartedTurn),
      }
    : null
}

function findParentTurnAnchor(params: {
  query: QueryRow
  queries: QueryRow[]
  subagents: SubagentRow[]
  tools: RichToolCall[]
  turns: TurnRow[]
}): TurnAnchor | null {
  if (!params.query.subagent_id) return null

  const explicitAgentTool = params.tools
    .filter(
      tool =>
        (tool.tool_name === "Agent" || tool.tool_name === "Task") &&
        tool.subagent_id === params.query.subagent_id &&
        tool.query_id &&
        tool.turn_id,
    )
    .sort((left, right) => Date.parse(left.detected_at ?? left.completed_at ?? new Date(0).toISOString()) - Date.parse(right.detected_at ?? right.completed_at ?? new Date(0).toISOString()))
    .at(0)

  if (explicitAgentTool?.query_id && explicitAgentTool.turn_id) {
    const matchingTurn = params.turns.find(
      turn => turn.query_id === explicitAgentTool.query_id && turn.turn_id === explicitAgentTool.turn_id,
    )
    if (matchingTurn) {
      return {
        query_id: matchingTurn.query_id,
        turn_id: matchingTurn.turn_id,
        started_at_ms: matchingTurn.started_at_ms,
        ended_at_ms: turnEndedAtMs(matchingTurn),
      }
    }
  }

  const subagent = params.subagents.find(item => item.subagent_id === params.query.subagent_id)
  const spawnMs = subagent?.spawned_at_ms ?? params.query.started_at_ms
  if (!spawnMs) return null

  const queryById = new Map(params.queries.map(query => [query.query_id, query]))
  const siblingSafeTurns =
    params.query.subagent_trigger_kind === "stop_hook_background"
      ? params.turns.filter(turn => {
          if (turn.query_id === params.query.query_id) return false
          const parentQuery = queryById.get(turn.query_id)
          return Boolean(parentQuery && !parentQuery.subagent_id)
        })
      : params.turns

  const siblingSafeAnchor = selectAnchorTurn(siblingSafeTurns, spawnMs, params.query.query_id)
  if (siblingSafeAnchor) return siblingSafeAnchor

  return selectAnchorTurn(params.turns, spawnMs, params.query.query_id)
}

function findReturnTurnAnchor(params: {
  query: QueryRow
  parentAnchor: TurnAnchor | null
  turns: TurnRow[]
}): TurnAnchor | null {
  if (!params.parentAnchor) return null
  const childLastEndedAtMs = Math.max(
    params.query.ended_at_ms ?? 0,
    ...params.turns
      .filter(turn => turn.query_id === params.query.query_id)
      .map(turn => turnEndedAtMs(turn)),
  )
  if (!childLastEndedAtMs) return null

  const parentTurns = params.turns
    .filter(turn => turn.query_id === params.parentAnchor!.query_id)
    .sort((left, right) => turnStartedAtMs(left) - turnStartedAtMs(right))

  const nextParentTurn = parentTurns.find(
    turn =>
      turn.turn_id !== params.parentAnchor!.turn_id &&
      turnStartedAtMs(turn) >= childLastEndedAtMs,
  )
  if (!nextParentTurn) return null

  return {
    query_id: nextParentTurn.query_id,
    turn_id: nextParentTurn.turn_id,
    started_at_ms: nextParentTurn.started_at_ms,
    ended_at_ms: turnEndedAtMs(nextParentTurn),
  }
}

function isSelfRunAction(tools: RichToolCall[], toolCallCount: number): boolean {
  if (toolCallCount > 3) return false
  const bashCommands = tools.filter(tool => tool.tool_name === "Bash").map(tool => tool.command_or_path.toLowerCase())
  return bashCommands.length === 1 && bashCommands[0]!.includes("explain_action")
}

function buildNodeDetail(params: {
  node: SemanticNode
  queryLabel: string
  queryIdentity: string
  phaseReason: string
  phaseAction: string
  phaseResult: string
  dialogue: DialogueBlock[]
  tools: RichToolCall[]
  artifacts: ArtifactRecord[]
  evidence: EvidenceRecord[]
}): SemanticNodeDetail {
  const riskFlags = [
    ...new Set(
      params.tools.flatMap(tool => [
        ...tool.warnings,
        ...(tool.detected_problem ? [`problem:${tool.detected_problem}`] : []),
        ...(tool.detected_fix_signal ? [`fix:${tool.detected_fix_signal}`] : []),
      ]),
    ),
  ]
  return {
    node_id: params.node.node_id,
    overview: {
      title: params.node.title,
      query_label: params.queryLabel,
      query_identity: params.queryIdentity,
      turn_label: params.node.turn_id ?? "-",
      reason: params.phaseReason,
      action: params.phaseAction,
      result: params.phaseResult,
      metrics: params.node.metrics,
    },
    dialogue: params.dialogue,
    tools: params.tools,
    artifacts: params.artifacts,
    evidence: params.evidence,
    risk_flags: riskFlags,
  }
}

export function buildSemanticViewerData(params: {
  action: ActionRow
  queries: QueryRow[]
  turns: TurnRow[]
  subagents: SubagentRow[]
  tools: RichToolCall[]
  phases: PhaseRecord[]
  artifacts: ArtifactRecord[]
  evidence: EvidenceRecord[]
  turnSnapshotsByKey: Map<string, TurnSnapshotBundle>
  selectedBy: SelectionMode
  terminalReason: string
}): SemanticViewerData {
  const selfRun = isSelfRunAction(params.tools, params.action.tool_call_count)
  const actionWarning =
    params.selectedBy === "latest"
      ? "Latest action may be an observability/debug command action. For complex DAG validation, prefer explicit -UserActionId."
      : selfRun
        ? "This appears to be an observability self-run action, not a target complex task."
        : null

  const lanes: SemanticLane[] = params.queries.map(query => ({
    lane_id: `lane_${query.query_id}`,
    query_id: query.query_id,
    label: `Query ${query.query_source ?? "query"} | ${shortId(query.query_id)}`,
    query_source: query.query_source,
    agent_name: query.agent_name,
    turn_count: query.turn_count,
    tool_call_count: query.tool_call_count,
    duration_ms: query.duration_ms,
    terminal_reason: query.terminal_reason,
  }))

  const nodes: SemanticNode[] = []
  const details: Record<string, SemanticNodeDetail> = {}
  const edges: SemanticEdge[] = []
  const evidenceByRef = new Map(params.evidence.map(item => [item.snapshot_ref, item]))
  const toolsByTurn = new Map<string, RichToolCall[]>()
  for (const tool of params.tools) {
    const key = `${tool.query_id ?? "unknown"}|${tool.turn_id ?? "unknown"}`
    const list = toolsByTurn.get(key) ?? []
    list.push(tool)
    toolsByTurn.set(key, list)
  }

  const phaseByTurn = new Map<string, PhaseRecord[]>()
  for (const phase of params.phases) {
    for (const turnId of phase.turn_ids) {
      for (const queryId of phase.query_ids) {
        const key = `${queryId}|${turnId}`
        const list = phaseByTurn.get(key) ?? []
        list.push(phase)
        phaseByTurn.set(key, list)
      }
    }
  }

  const turnsByQuery = new Map<string, TurnRow[]>()
  for (const turn of params.turns) {
    const list = turnsByQuery.get(turn.query_id) ?? []
    list.push(turn)
    turnsByQuery.set(turn.query_id, list)
  }
  for (const turns of turnsByQuery.values()) {
    turns.sort((left, right) => left.started_at_ms - right.started_at_ms)
  }
  nodes.push({
    node_id: "action_root",
    node_type: "action",
    title: `Action ${shortId(params.action.user_action_id)}`,
    lane_id: "action",
    query_id: null,
    turn_id: null,
    agent_name: null,
    started_at: params.action.started_at,
    ended_at: params.action.ended_at,
    phase_ids: params.phases.map(phase => phase.phase_id),
    tool_call_ids: params.tools.map(tool => tool.tool_call_id),
    artifact_paths: params.artifacts.map(artifact => artifact.artifact_path),
    evidence_refs: params.evidence.map(item => item.snapshot_ref),
    summary_observed: `${params.action.query_count} queries, ${params.action.tool_call_count} tools, ${params.action.total_billed_tokens} billed tokens`,
    summary_interpretation: "",
    badges: [params.selectedBy, ...(actionWarning ? ["warning"] : [])],
    metrics: {
      duration_ms: params.action.duration_ms,
      prompt_tokens: params.action.total_prompt_input_tokens,
      output_tokens: null,
      billed_tokens: params.action.total_billed_tokens,
      cache_read_tokens: null,
      tool_call_count: params.action.tool_call_count,
      subagent_spawn_count: params.action.subagent_count,
      compact_event_count: 0,
    },
  })

  details.action_root = {
    node_id: "action_root",
    overview: {
      title: `Action ${params.action.user_action_id}`,
      query_label: `${params.action.query_count} queries`,
      query_identity: params.action.user_action_id,
      turn_label: "-",
      reason: params.selectedBy,
      action: actionWarning ?? "semantic dialogue viewer generated from V1 facts",
      result: params.terminalReason,
      metrics: nodes[0]!.metrics,
    },
    dialogue: [],
    tools: [],
    artifacts: params.artifacts.slice(0, 20),
    evidence: params.evidence.slice(0, 20),
    risk_flags: actionWarning ? [actionWarning] : [],
  }

  for (const query of params.queries) {
    const queryTurns = turnsByQuery.get(query.query_id) ?? []
    let previousRequest: SnapshotRecord | null = null
    for (const turn of queryTurns) {
      const nodeId = `turn_${query.query_id}_${turn.turn_id}`
      const turnKey = `${turn.query_id}|${turn.turn_id}`
      const bundle = params.turnSnapshotsByKey.get(turnKey)
      const currentRequest = bundle?.requestSnapshots.at(-1) ?? null
      const currentResponse = bundle?.responseSnapshots.at(-1) ?? null
      const requestBlocks = buildRequestWindowBlocks({
        currentRequest,
        previousRequest,
        userActionId: params.action.user_action_id,
        querySource: query.query_source,
        queryId: query.query_id,
        turnId: turn.turn_id,
      })
      const responseBlocks = extractAssistantResponseBlocks({
        responseSnapshot: currentResponse,
        queryId: query.query_id,
        turnId: turn.turn_id,
      })
      previousRequest = currentRequest

      const turnTools = toolsByTurn.get(turnKey) ?? []
      const turnPhases = phaseByTurn.get(turnKey) ?? []
      const phaseReason = [...new Set(turnPhases.map(phase => phase.reason_summary).filter(Boolean))].join(" | ")
      const phaseAction = [...new Set(turnPhases.map(phase => phase.action_summary).filter(Boolean))].join(" | ")
      const phaseResult = [...new Set(turnPhases.map(phase => phase.result_summary).filter(Boolean))].join(" | ")
      const artifactPaths = [...new Set(turnTools.flatMap(tool => [...tool.produced_files, ...tool.result_files]))]
      const nodeEvidenceRefs = [...new Set(turnTools.flatMap(tool => tool.evidence_refs))]
      const nodeArtifacts = params.artifacts.filter(artifact =>
        artifact.phase_ids.some(phaseId => turnPhases.some(phase => phase.phase_id === phaseId)) ||
        artifact.modified_by_tool_call_ids.some(toolId => turnTools.some(tool => tool.tool_call_id === toolId)) ||
        turnTools.some(tool => tool.produced_files.includes(artifact.artifact_path)),
      )
      const nodeEvidence = nodeEvidenceRefs
        .map(ref => evidenceByRef.get(ref))
        .filter((item): item is EvidenceRecord => Boolean(item))
      const usage = extractUsage(currentResponse)
      const compactEventCount =
        bundle?.relatedSnapshots.filter(snapshot =>
          /compact|history_snip|context_collapse|microcompact/iu.test(snapshot.snapshotRef),
        ).length ?? 0
      const badges = [
        ...(query.query_source ? [`query:${query.query_source}`] : []),
        ...(turn.loop_iter_start && turn.loop_iter_start > 1 ? [`loop:${turn.loop_iter_start}`] : []),
        ...(query.subagent_id ? [`subagent:${query.query_source ?? "child"}`] : []),
        ...(turnTools.some(tool => tool.tool_name === "Agent") ? ["subagent"] : []),
        ...(compactEventCount > 0 ? [`compact:${compactEventCount}`] : []),
        ...(turnTools.some(tool => tool.detected_problem) ? ["problem"] : []),
      ]
      const node: SemanticNode = {
        node_id: nodeId,
        node_type: "turn",
        title: `${query.query_source ?? shortId(query.query_id)} / ${turn.turn_id}`,
        lane_id: `lane_${query.query_id}`,
        query_id: query.query_id,
        turn_id: turn.turn_id,
        agent_name: turn.agent_name,
        started_at: turn.started_at,
        ended_at: turn.ended_at,
        phase_ids: turnPhases.map(phase => phase.phase_id),
        tool_call_ids: turnTools.map(tool => tool.tool_call_id),
        artifact_paths: artifactPaths,
        evidence_refs: nodeEvidenceRefs,
        summary_observed:
          phaseAction ||
          turnTools.map(tool => `${tool.tool_name}${tool.command_or_path ? ` ${tool.command_or_path}` : ""}`).join(" | ") ||
          "turn activity captured in dialogue and tools",
        summary_interpretation: "",
        badges,
        metrics: {
          duration_ms: turn.duration_ms,
          prompt_tokens: usage.prompt_tokens,
          output_tokens: usage.output_tokens,
          billed_tokens: usage.billed_tokens,
          cache_read_tokens: usage.cache_read_tokens,
          tool_call_count: turnTools.length,
          subagent_spawn_count: turnTools.filter(tool => tool.tool_name === "Agent").length,
          compact_event_count: compactEventCount,
        },
      }
      nodes.push(node)
      details[nodeId] = buildNodeDetail({
        node,
        queryLabel: query.query_source ?? shortId(query.query_id),
        queryIdentity: [
          `query_id=${query.query_id}`,
          query.query_source ? `source=${query.query_source}` : null,
          query.subagent_id ? `subagent_id=${query.subagent_id}` : null,
          query.subagent_reason ? `reason=${query.subagent_reason}` : null,
        ]
          .filter(Boolean)
          .join(" | "),
        phaseReason,
        phaseAction,
        phaseResult,
        dialogue: [...requestBlocks, ...responseBlocks],
        tools: turnTools,
        artifacts: nodeArtifacts,
        evidence: nodeEvidence,
      })
    }
  }

  for (const query of params.queries) {
    const queryTurns = turnsByQuery.get(query.query_id) ?? []
    if (queryTurns.length > 0 && !query.subagent_id) {
      edges.push({
        edge_id: `edge_action_${query.query_id}`,
        from: "action_root",
        to: `turn_${query.query_id}_${queryTurns[0]!.turn_id}`,
        edge_type: "sequential",
        label: query.query_source ?? "query",
      })
    }
    for (let index = 1; index < queryTurns.length; index += 1) {
      const previous = queryTurns[index - 1]!
      const current = queryTurns[index]!
      edges.push({
        edge_id: `edge_${query.query_id}_${index}`,
        from: `turn_${query.query_id}_${previous.turn_id}`,
        to: `turn_${query.query_id}_${current.turn_id}`,
        edge_type: "sequential",
        label: "next",
      })
    }
  }

  for (const query of params.queries) {
    if (!query.subagent_id) continue
    const childTurns = turnsByQuery.get(query.query_id) ?? []
    if (childTurns.length === 0) continue
    const parentAnchor = findParentTurnAnchor({
      query,
      queries: params.queries,
      subagents: params.subagents,
      tools: params.tools,
      turns: params.turns,
    })
    edges.push({
      edge_id: `fork_${query.query_id}`,
      from: parentAnchor ? `turn_${parentAnchor.query_id}_${parentAnchor.turn_id}` : "action_root",
      to: `turn_${query.query_id}_${childTurns[0]!.turn_id}`,
      edge_type: "fork",
      label: query.subagent_reason ? squash(query.subagent_reason, 80).excerpt : "subagent",
    })
    const returnAnchor = findReturnTurnAnchor({
      query,
      parentAnchor,
      turns: params.turns,
    })
    if (returnAnchor) {
      const childLastTurn = [...childTurns].sort((left, right) => turnEndedAtMs(right) - turnEndedAtMs(left))[0]!
      edges.push({
        edge_id: `return_${query.query_id}`,
        from: `turn_${query.query_id}_${childLastTurn.turn_id}`,
        to: `turn_${returnAnchor.query_id}_${returnAnchor.turn_id}`,
        edge_type: "return",
        label: "return",
      })
    }
  }

  const outgoingForkCounts = new Map<string, number>()
  for (const edge of edges) {
    if (edge.edge_type !== "fork") continue
    outgoingForkCounts.set(edge.from, (outgoingForkCounts.get(edge.from) ?? 0) + 1)
  }
  for (const node of nodes) {
    const forkCount = outgoingForkCounts.get(node.node_id) ?? 0
    if (forkCount > 0) {
      node.badges = [...node.badges, `fork:${forkCount}`]
    }
  }

  return {
    action: {
      user_action_id: params.action.user_action_id,
      selected_by: params.selectedBy,
      duration_ms: params.action.duration_ms,
      query_count: params.action.query_count,
      subagent_count: params.action.subagent_count,
      tool_call_count: params.action.tool_call_count,
      total_billed_tokens: params.action.total_billed_tokens,
      terminal_reason: params.terminalReason,
      warning: actionWarning,
    },
    lanes,
    nodes,
    edges,
    details,
  }
}

function laneFirstStartedAt(data: SemanticViewerData, laneId: string): number {
  return data.nodes
    .filter(node => node.lane_id === laneId && node.node_type === "turn")
    .map(node => (node.started_at ? Date.parse(node.started_at) : Number.MAX_SAFE_INTEGER))
    .sort((left, right) => left - right)[0] ?? Number.MAX_SAFE_INTEGER
}

export function planLaneColumns(data: SemanticViewerData): Record<string, number> {
  const plan: Record<string, number> = {}
  if (!data.lanes.length) return plan

  const nodeById = new Map(data.nodes.map(node => [node.node_id, node]))
  const mainLaneId =
    data.lanes.find(lane => lane.query_source === "repl_main_thread")?.lane_id ??
    data.lanes[0]!.lane_id
  plan[mainLaneId] = 0

  const childLanesByParent = new Map<string, string[]>()
  const parentLaneByChild = new Map<string, string>()
  for (const edge of data.edges) {
    if (edge.edge_type !== "fork") continue
    const fromLaneId = nodeById.get(edge.from)?.lane_id
    const toLaneId = nodeById.get(edge.to)?.lane_id
    if (!fromLaneId || !toLaneId || fromLaneId === toLaneId) continue
    if (!parentLaneByChild.has(toLaneId)) {
      parentLaneByChild.set(toLaneId, fromLaneId)
      const list = childLanesByParent.get(fromLaneId) ?? []
      if (!list.includes(toLaneId)) list.push(toLaneId)
      childLanesByParent.set(fromLaneId, list)
    }
  }

  const sortLaneIds = (laneIds: string[]): string[] =>
    [...laneIds].sort((left, right) => laneFirstStartedAt(data, left) - laneFirstStartedAt(data, right))

  const assignChildren = (parentLaneId: string): void => {
    const children = sortLaneIds(childLanesByParent.get(parentLaneId) ?? []).filter(childLaneId => plan[childLaneId] === undefined)
    if (!children.length) return
    const parentColumn = plan[parentLaneId] ?? 0
    if (parentColumn === 0) {
      let leftDepth = 1
      let rightDepth = 1
      children.forEach((childLaneId, index) => {
        if (index % 2 === 0) {
          plan[childLaneId] = -leftDepth
          leftDepth += 1
        } else {
          plan[childLaneId] = rightDepth
          rightDepth += 1
        }
      })
    } else {
      const direction = parentColumn < 0 ? -1 : 1
      let depth = 1
      children.forEach(childLaneId => {
        plan[childLaneId] = parentColumn + direction * depth
        depth += 1
      })
    }
    children.forEach(assignChildren)
  }

  assignChildren(mainLaneId)

  const remaining = sortLaneIds(data.lanes.map(lane => lane.lane_id).filter(laneId => plan[laneId] === undefined))
  for (const laneId of remaining) {
    const parentLaneId = parentLaneByChild.get(laneId)
    if (parentLaneId && plan[parentLaneId] !== undefined) {
      const parentColumn = plan[parentLaneId]!
      const direction = parentColumn < 0 ? -1 : parentColumn > 0 ? 1 : 1
      const usedColumns = new Set(Object.values(plan))
      let candidate = parentColumn + direction
      while (usedColumns.has(candidate)) candidate += direction
      plan[laneId] = candidate
      assignChildren(laneId)
      continue
    }
    const usedColumns = Object.values(plan)
    const maxPositive = usedColumns.filter(value => value >= 0).sort((left, right) => right - left)[0] ?? 0
    plan[laneId] = maxPositive + 1
    assignChildren(laneId)
  }

  return plan
}

function safeJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e")
}

function shellStyle(): string {
  return `
    :root {
      --bg: #f4f1ea;
      --panel: #fffaf2;
      --ink: #1f1c17;
      --muted: #6f665d;
      --line: #d3c3ad;
      --accent: #b75d2d;
      --accent-soft: #f2ddcf;
      --warn: #ab3a1c;
      --fork: #2f6f94;
      --return: #3a7d44;
      --shadow: 0 10px 24px rgba(42, 25, 10, 0.08);
      font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
    }
    * { box-sizing: border-box; }
    body { margin: 0; background: linear-gradient(180deg, #f5f1ea, #eee6dc); color: var(--ink); }
    #semantic-viewer-app { min-height: 100vh; position: relative; }
    .graph-pane { padding: 18px 18px 24px; }
    .summary-card, .lane-card, .inspector-card, .app-card, .viewer-frame-card { background: var(--panel); border: 1px solid var(--line); border-radius: 16px; box-shadow: var(--shadow); }
    .summary-card, .app-card { padding: 16px; margin-bottom: 16px; }
    .summary-grid, .inspector-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin-top: 12px; }
    .inspector-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .metric { background: #fff; border: 1px solid var(--line); border-radius: 12px; padding: 10px; }
    .metric .label { font-size: 12px; color: var(--muted); }
    .metric .value { font-size: 16px; font-weight: 600; margin-top: 4px; overflow-wrap: anywhere; word-break: break-word; }
    .warning { margin-top: 12px; color: var(--warn); font-size: 13px; }
    .graph-viewport { position: relative; min-height: calc(100vh - 180px); background: rgba(255,255,255,0.42); border-radius: 16px; border: 1px solid var(--line); overflow: hidden; cursor: grab; }
    .graph-viewport.dragging { cursor: grabbing; }
    .graph-content { position: absolute; inset: 0 auto auto 0; transform-origin: 0 0; will-change: transform; }
    .graph-shell { position: relative; min-height: 900px; }
    .graph-toolbar { display: flex; gap: 8px; align-items: center; margin-bottom: 10px; }
    .toolbar-button, .app-button { border: 1px solid var(--line); background: #fff; border-radius: 999px; padding: 6px 12px; cursor: pointer; font-size: 12px; }
    .toolbar-button:hover, .app-button:hover { border-color: var(--accent); }
    .lane-header { position: absolute; top: 14px; width: 300px; margin-left: -150px; text-align: center; font-size: 12px; color: var(--muted); border-top: 4px solid var(--lane-accent, var(--line)); padding-top: 6px; overflow-wrap: anywhere; word-break: break-word; }
    .node { position: absolute; width: 300px; transform: translateX(-150px); border-radius: 14px; border: 1px solid var(--line); border-left: 5px solid var(--lane-accent, var(--line)); background: #fff; box-shadow: var(--shadow); padding: 12px 14px; text-align: left; cursor: pointer; }
    .node:hover { border-color: var(--accent); }
    .node.selected { outline: 2px solid var(--accent); }
    .node.branch-source { border-color: var(--fork); box-shadow: 0 0 0 3px rgba(47,111,148,0.14), var(--shadow); }
    .node.dimmed { opacity: 0.22; }
    .node.in-focus { opacity: 1; }
    .node .title { font-weight: 600; font-size: 14px; line-height: 1.35; overflow-wrap: anywhere; word-break: break-word; }
    .node .summary { font-size: 12px; color: var(--muted); margin-top: 6px; line-height: 1.45; overflow-wrap: anywhere; word-break: break-word; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
    .node .badge-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
    .badge { background: var(--accent-soft); color: var(--accent); border-radius: 999px; padding: 2px 8px; font-size: 11px; }
    .badge.warn { background: #f6d7cf; color: var(--warn); }
    .tone-0 { --lane-accent: #b75d2d; background: linear-gradient(180deg, #fff, #fff8f2); }
    .tone-1 { --lane-accent: #2f6f94; background: linear-gradient(180deg, #fff, #f3f9fd); }
    .tone-2 { --lane-accent: #3a7d44; background: linear-gradient(180deg, #fff, #f4fbf4); }
    .tone-3 { --lane-accent: #8b5fbf; background: linear-gradient(180deg, #fff, #faf5ff); }
    .tone-4 { --lane-accent: #9b6b1a; background: linear-gradient(180deg, #fff, #fff8ef); }
    .tone-5 { --lane-accent: #a33c54; background: linear-gradient(180deg, #fff, #fff4f7); }
    .inspector-drawer { position: fixed; top: 0; right: 0; width: min(460px, 92vw); height: 100vh; transform: translateX(104%); transition: transform 160ms ease; z-index: 20; padding: 16px; background: rgba(245, 241, 234, 0.66); backdrop-filter: blur(12px); }
    .inspector-drawer.drawer-open { transform: translateX(0); }
    .inspector-card { padding: 16px; height: 100%; overflow: auto; }
    .inspector-header h2 { margin: 0; font-size: 20px; }
    .inspector-sub { color: var(--muted); font-size: 13px; margin-top: 4px; overflow-wrap: anywhere; word-break: break-word; }
    .drawer-close { margin-left: auto; border: 1px solid var(--line); background: #fff; border-radius: 999px; padding: 6px 12px; cursor: pointer; font-size: 12px; }
    .tab-row { display: flex; gap: 8px; flex-wrap: wrap; margin: 14px 0; }
    .tab { border: 1px solid var(--line); background: #fff; border-radius: 999px; padding: 6px 12px; cursor: pointer; font-size: 12px; }
    .tab.active { background: var(--accent); color: #fff; border-color: var(--accent); }
    .section-title { font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; margin: 12px 0 8px; }
    .dialogue-block { border: 1px solid var(--line); border-radius: 12px; background: #fff; padding: 10px; margin-bottom: 10px; }
    .dialogue-block.role-user { background: #f4fbff; border-color: #9cc6e1; }
    .dialogue-block.role-assistant { background: #fff8f1; border-color: #e5c8a4; }
    .dialogue-block.role-tool-result { background: #f4fbf4; border-color: #9fcea8; }
    .dialogue-block.role-tool-use { background: #faf5ff; border-color: #ccb2ef; }
    .dialogue-block .block-title { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 12px; color: var(--muted); margin-bottom: 6px; }
    .role-badge { border-radius: 999px; padding: 2px 8px; font-size: 11px; font-weight: 700; color: #fff; background: var(--muted); }
    .role-user .role-badge { background: #2374a6; }
    .role-assistant .role-badge { background: #b75d2d; }
    .role-tool-result .role-badge { background: #3a7d44; }
    .role-tool-use .role-badge { background: #7b56b3; }
    .prompt-badge { border-radius: 999px; border: 1px solid var(--line); background: #fff; color: var(--muted); padding: 2px 7px; font-size: 11px; }
    .prompt-badge.important { border-color: var(--accent); color: var(--accent); background: var(--accent-soft); }
    .dialogue-block pre, .raw { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; word-break: break-word; font: 12px/1.45 Consolas, "SFMono-Regular", monospace; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border-bottom: 1px solid var(--line); padding: 8px 6px; text-align: left; vertical-align: top; overflow-wrap: anywhere; word-break: break-word; }
    th { color: var(--muted); font-weight: 600; }
    svg { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
    .empty { color: var(--muted); font-size: 13px; }
    .app-controls { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-top: 12px; }
    .app-input { min-width: 340px; flex: 1; border: 1px solid var(--line); border-radius: 12px; padding: 10px 12px; font-size: 14px; background: #fff; }
    .app-hint { margin-top: 10px; color: var(--muted); font-size: 13px; }
    .app-results { margin-top: 12px; max-height: 220px; overflow: auto; display: grid; gap: 8px; }
    .result-item { border: 1px solid var(--line); border-radius: 12px; background: #fff; padding: 10px 12px; cursor: pointer; }
    .result-item:hover { border-color: var(--accent); }
    .viewer-frame-card { padding: 0; overflow: hidden; min-height: calc(100vh - 36px); }
    .viewer-frame { width: 100%; height: calc(100vh - 36px); border: 0; background: #fff; }
    .viewer-stack { display: grid; gap: 18px; min-height: calc(100vh - 36px); }
    .app-layout { display: grid; grid-template-columns: 340px minmax(0, 1fr); gap: 18px; min-height: calc(100vh - 36px); align-items: stretch; }
    .app-sidebar { display: grid; align-content: start; gap: 12px; }
    .app-main { min-width: 0; }
    .focus-active { color: var(--fork); font-weight: 600; }
    svg path.dimmed, svg text.dimmed { opacity: 0.14; }
    svg path.in-focus, svg text.in-focus { opacity: 1; }
    @media (max-width: 900px) { .graph-viewport { min-height: 72vh; } .inspector-drawer { width: 100vw; padding: 8px; } .viewer-frame { height: 72vh; } .app-layout { grid-template-columns: 1fr; } }
  `
}

export function renderSemanticViewerHtml(data: SemanticViewerData): string {
  const lanePlan = planLaneColumns(data)
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Action Semantic Viewer</title>
  <style>
${shellStyle()}
  </style>
</head>
<body>
  <div id="semantic-viewer-app">
    <section class="graph-pane">
      <div class="summary-card">
        <div style="font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:0.08em;">Action Semantic Viewer</div>
        <div style="margin-top:6px;font-size:24px;font-weight:700;">${shortId(data.action.user_action_id)}</div>
        <div class="summary-grid">
          <div class="metric"><div class="label">Selected By</div><div class="value">${data.action.selected_by}</div></div>
          <div class="metric"><div class="label">Queries</div><div class="value">${data.action.query_count}</div></div>
          <div class="metric"><div class="label">Tools</div><div class="value">${data.action.tool_call_count}</div></div>
          <div class="metric"><div class="label">Billed Tokens</div><div class="value">${data.action.total_billed_tokens}</div></div>
        </div>
        ${data.action.warning ? `<div class="warning">${data.action.warning}</div>` : ""}
      </div>
      <div class="graph-toolbar">
        <button id="zoom-out" class="toolbar-button" type="button">-</button>
        <button id="zoom-reset" class="toolbar-button" type="button">Reset</button>
        <button id="zoom-in" class="toolbar-button" type="button">+</button>
        <button id="clear-focus" class="toolbar-button" type="button">Clear Focus</button>
        <div id="focus-active" class="focus-active"></div>
        <div style="font-size:12px;color:var(--muted);">Drag to pan, scroll to zoom</div>
      </div>
      <div id="graph-viewport" class="graph-viewport">
        <div id="graph-content" class="graph-content">
          <div id="graph-shell" class="graph-shell"></div>
        </div>
      </div>
    </section>
    <aside id="inspector-drawer" class="inspector-drawer">
      <div class="inspector-card">
        <div class="inspector-header">
          <div style="display:flex;gap:12px;align-items:center;">
            <h2 id="inspector-title" style="margin-right:auto;">Action</h2>
            <button id="drawer-close" class="drawer-close" type="button">Close</button>
          </div>
          <div id="inspector-sub" class="inspector-sub">Click a node to inspect faithful dialogue, tools, evidence, and risk signals.</div>
        </div>
        <div class="tab-row">
          <button class="tab active" data-tab="overview">Overview</button>
          <button class="tab" data-tab="dialogue">Dialogue</button>
          <button class="tab" data-tab="tools">Tools</button>
          <button class="tab" data-tab="evidence">Evidence</button>
          <button class="tab" data-tab="risk">Risk</button>
        </div>
        <div id="inspector-body"></div>
      </div>
    </aside>
  </div>
  <script>
    window.__SEMANTIC_VIEWER_DATA__ = ${safeJson(data)};
    window.__SEMANTIC_LANE_PLAN__ = ${safeJson(lanePlan)};
  </script>
  <script>
    const data = window.__SEMANTIC_VIEWER_DATA__;
    const lanePlan = window.__SEMANTIC_LANE_PLAN__ || {};
    const viewport = document.getElementById("graph-viewport");
    const content = document.getElementById("graph-content");
    const shell = document.getElementById("graph-shell");
    const drawer = document.getElementById("inspector-drawer");
    const titleEl = document.getElementById("inspector-title");
    const subEl = document.getElementById("inspector-sub");
    const bodyEl = document.getElementById("inspector-body");
    const clearFocusButton = document.getElementById("clear-focus");
    const focusActiveEl = document.getElementById("focus-active");
    let activeTab = "overview";
    let selectedNodeId = data.nodes[0] ? data.nodes[0].node_id : null;
    let drawerOpen = false;
    let focusRootNodeId = null;
    let zoom = 1;
    let offsetX = 90;
    let offsetY = 40;
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let centerGraphX = 0;

    function escapeHtml(value) {
      return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
    }

    function metricCard(label, value) {
      return '<div class="metric"><div class="label">' + escapeHtml(label) + '</div><div class="value">' + escapeHtml(value ?? "-") + '</div></div>';
    }

    function renderOverview(detail) {
      return [
        '<div class="section-title">Observed Summary</div>',
        '<div class="inspector-grid">',
        metricCard("Query", detail.overview.query_label),
        metricCard("Turn", detail.overview.turn_label),
        metricCard("Duration ms", detail.overview.metrics.duration_ms),
        metricCard("Tool calls", detail.overview.metrics.tool_call_count),
        metricCard("Prompt tokens", detail.overview.metrics.prompt_tokens),
        metricCard("Output tokens", detail.overview.metrics.output_tokens),
        metricCard("Billed tokens", detail.overview.metrics.billed_tokens),
        metricCard("Compact events", detail.overview.metrics.compact_event_count),
        '</div>',
        '<div class="section-title">Full Query Identity</div><div class="raw">' + escapeHtml(detail.overview.query_identity || "-") + '</div>',
        '<div class="section-title">Reason</div><div class="raw">' + escapeHtml(detail.overview.reason || "-") + '</div>',
        '<div class="section-title">Action</div><div class="raw">' + escapeHtml(detail.overview.action || "-") + '</div>',
        '<div class="section-title">Result</div><div class="raw">' + escapeHtml(detail.overview.result || "-") + '</div>',
      ].join("");
    }

    function renderDialogue(detail) {
      if (!detail.dialogue.length) return '<div class="empty">No faithful dialogue blocks were extracted for this node.</div>';
      return detail.dialogue.map(block => {
        const roleClass =
          block.role === "user"
            ? "role-user"
            : block.role === "assistant"
              ? "role-assistant"
              : block.role === "tool_result"
                ? "role-tool-result"
                : block.role === "tool_use"
                  ? "role-tool-use"
                  : "";
        const badges = (block.badges || []).map(badge => '<span class="prompt-badge ' + (badge === "token-bearing" || badge === "feeds next prompt" ? 'important' : '') + '">' + escapeHtml(badge) + '</span>').join("");
        return [
          '<div class="dialogue-block ' + roleClass + '">',
          '<div class="block-title"><span class="role-badge">' + escapeHtml(block.role_label || block.role) + '</span><span>' + escapeHtml(block.title) + (block.snapshot_ref ? ' · ' + escapeHtml(block.snapshot_ref) : '') + '</span>' + badges + '</div>',
          '<pre>' + escapeHtml(block.raw_text) + '</pre>',
          block.truncated ? '<div class="block-title" style="margin-top:6px;">Display excerpt was truncated in the graph summary; raw text shown here remains faithful to the extracted block.</div>' : '',
          block.warnings && block.warnings.length ? '<div class="block-title" style="margin-top:6px;color:#ab3a1c;">' + escapeHtml(block.warnings.join(" | ")) + '</div>' : '',
          '</div>'
        ].join("");
      }).join("");
    }

    function renderTools(detail) {
      if (!detail.tools.length) return '<div class="empty">No tools on this node.</div>';
      const rows = detail.tools.map(tool => {
        return '<tr>' +
          '<td>' + escapeHtml(tool.tool_name) + '</td>' +
          '<td><div class="raw">' + escapeHtml(tool.command_or_path || tool.input_summary || "-") + '</div></td>' +
          '<td><div class="raw">' + escapeHtml(tool.result_summary_rich || tool.output_summary || "-") + '</div></td>' +
          '<td>' + escapeHtml([tool.detected_problem, tool.detected_fix_signal].filter(Boolean).join(" | ") || "-") + '</td>' +
          '</tr>';
      }).join("");
      return '<table><thead><tr><th>Tool</th><th>Command / Path</th><th>Observed Result</th><th>Problem / Fix</th></tr></thead><tbody>' + rows + '</tbody></table>';
    }

    function renderEvidence(detail) {
      if (!detail.evidence.length) return '<div class="empty">No evidence rows linked to this node.</div>';
      const rows = detail.evidence.map(item => '<tr><td>' + escapeHtml(item.evidence_id) + '</td><td>' + escapeHtml(item.category || "-") + '</td><td><div class="raw">' + escapeHtml(item.snapshot_ref) + '</div></td><td>' + escapeHtml(item.summary) + '</td></tr>').join("");
      return '<table><thead><tr><th>ID</th><th>Category</th><th>Snapshot</th><th>Summary</th></tr></thead><tbody>' + rows + '</tbody></table>';
    }

    function renderRisk(detail) {
      if (!detail.risk_flags.length) return '<div class="empty">No risk flags on this node.</div>';
      return detail.risk_flags.map(flag => '<div class="dialogue-block"><div class="raw">' + escapeHtml(flag) + '</div></div>').join("");
    }

    function renderInspector() {
      const detail = data.details[selectedNodeId] || data.details.action_root;
      const node = data.nodes.find(item => item.node_id === selectedNodeId) || data.nodes[0];
      titleEl.textContent = detail.overview.title;
      subEl.textContent = node ? (node.query_id ? node.query_id + ' / ' + (node.turn_id || '-') : data.action.terminal_reason) : data.action.terminal_reason;
      if (activeTab === "overview") bodyEl.innerHTML = renderOverview(detail);
      if (activeTab === "dialogue") bodyEl.innerHTML = renderDialogue(detail);
      if (activeTab === "tools") bodyEl.innerHTML = renderTools(detail);
      if (activeTab === "evidence") bodyEl.innerHTML = renderEvidence(detail);
      if (activeTab === "risk") bodyEl.innerHTML = renderRisk(detail);
      document.querySelectorAll(".node").forEach(nodeEl => {
        nodeEl.classList.toggle("selected", nodeEl.dataset.nodeId === selectedNodeId);
      });
      document.querySelectorAll(".tab").forEach(tab => {
        tab.classList.toggle("active", tab.dataset.tab === activeTab);
      });
      drawer.classList.toggle("drawer-open", drawerOpen);
    }

    function applyViewportTransform() {
      content.style.transform = 'translate(' + offsetX + 'px, ' + offsetY + 'px) scale(' + zoom + ')';
    }

    function clampZoom(nextZoom) {
      return Math.max(0.45, Math.min(2.2, nextZoom));
    }

    function recenterViewport() {
      const rect = viewport.getBoundingClientRect();
      offsetX = Math.max(24, rect.width / 2 - centerGraphX * zoom);
      offsetY = 40;
      applyViewportTransform();
    }

    function computeFocusState(rootNodeId) {
      if (!rootNodeId) return { nodes: new Set(), edges: new Set() };
      const nodeById = new Map(data.nodes.map(node => [node.node_id, node]));
      const outgoing = new Map();
      data.edges.forEach(edge => {
        const list = outgoing.get(edge.from) || [];
        list.push(edge);
        outgoing.set(edge.from, list);
      });
      const focusedNodes = new Set([rootNodeId]);
      const focusedEdges = new Set();
      const mainLaneId = data.lanes.find(lane => lane.query_source === "repl_main_thread")?.lane_id || null;

      function walkBranch(nodeId) {
        for (const edge of outgoing.get(nodeId) || []) {
          focusedEdges.add(edge.edge_id);
          focusedNodes.add(edge.to);
          if (edge.edge_type === "return") continue;
          walkBranch(edge.to);
        }
      }

      const rootNode = nodeById.get(rootNodeId);
      const rootEdges = outgoing.get(rootNodeId) || [];
      const seedEdges =
        rootNode && rootNode.lane_id === mainLaneId && rootEdges.some(edge => edge.edge_type === "fork")
          ? rootEdges.filter(edge => edge.edge_type === "fork")
          : rootEdges;
      for (const edge of seedEdges) {
        focusedEdges.add(edge.edge_id);
        focusedNodes.add(edge.to);
        if (edge.edge_type !== "return") walkBranch(edge.to);
      }
      return { nodes: focusedNodes, edges: focusedEdges };
    }

    function applyFocusState() {
      const focused = computeFocusState(focusRootNodeId);
      const hasFocus = Boolean(focusRootNodeId);
      document.querySelectorAll(".node").forEach(nodeEl => {
        const nodeId = nodeEl.dataset.nodeId;
        nodeEl.classList.toggle("dimmed", hasFocus && !focused.nodes.has(nodeId));
        nodeEl.classList.toggle("in-focus", !hasFocus || focused.nodes.has(nodeId));
      });
      document.querySelectorAll("svg [data-edge-id]").forEach(edgeEl => {
        const edgeId = edgeEl.getAttribute("data-edge-id");
        edgeEl.classList.toggle("dimmed", hasFocus && !focused.edges.has(edgeId));
        edgeEl.classList.toggle("in-focus", !hasFocus || focused.edges.has(edgeId));
      });
      clearFocusButton.disabled = !hasFocus;
      focusActiveEl.textContent = hasFocus ? "Branch focus active" : "";
    }

    function buildGraph() {
      const lanes = data.lanes;
      const nodes = data.nodes;
      const maxTurns = Math.max(1, ...lanes.map(lane => nodes.filter(node => node.lane_id === lane.lane_id).length));
      const laneWidth = 380;
      const nodeHeight = 168;
      const rowGap = 186;
      const plannedColumns = lanes.map(lane => lanePlan[lane.lane_id] ?? 0);
      const minColumn = plannedColumns.length ? Math.min(...plannedColumns) : 0;
      const maxColumn = plannedColumns.length ? Math.max(...plannedColumns) : 0;
      const width = Math.max(1600, 620 + (maxColumn - minColumn + 4) * laneWidth);
      const orderedTurnNodes = nodes.filter(node => node.node_type === "turn").sort((left, right) => {
        const leftTs = left.started_at ? Date.parse(left.started_at) : 0;
        const rightTs = right.started_at ? Date.parse(right.started_at) : 0;
        return leftTs - rightTs;
      });
      const height = 260 + Math.max(maxTurns, orderedTurnNodes.length) * rowGap;
      shell.style.width = width + "px";
      shell.style.height = height + "px";
      content.style.width = width + "px";
      content.style.height = height + "px";
      shell.innerHTML = "";

      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 " + width + " " + height);
      const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
      const forkMarker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
      forkMarker.setAttribute("id", "arrow-fork");
      forkMarker.setAttribute("viewBox", "0 0 10 10");
      forkMarker.setAttribute("refX", "9");
      forkMarker.setAttribute("refY", "5");
      forkMarker.setAttribute("markerWidth", "7");
      forkMarker.setAttribute("markerHeight", "7");
      forkMarker.setAttribute("orient", "auto-start-reverse");
      const forkArrowPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
      forkArrowPath.setAttribute("d", "M 0 0 L 10 5 L 0 10 z");
      forkArrowPath.setAttribute("fill", "var(--fork)");
      forkMarker.appendChild(forkArrowPath);
      defs.appendChild(forkMarker);
      const returnMarker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
      returnMarker.setAttribute("id", "arrow-return");
      returnMarker.setAttribute("viewBox", "0 0 10 10");
      returnMarker.setAttribute("refX", "9");
      returnMarker.setAttribute("refY", "5");
      returnMarker.setAttribute("markerWidth", "7");
      returnMarker.setAttribute("markerHeight", "7");
      returnMarker.setAttribute("orient", "auto-start-reverse");
      const returnArrowPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
      returnArrowPath.setAttribute("d", "M 0 0 L 10 5 L 0 10 z");
      returnArrowPath.setAttribute("fill", "var(--return)");
      returnMarker.appendChild(returnArrowPath);
      defs.appendChild(returnMarker);
      svg.appendChild(defs);
      shell.appendChild(svg);

      const laneX = new Map();
      const actionX = width / 2;
      lanes.forEach((lane, index) => {
        const laneColumn = lanePlan[lane.lane_id] ?? 0;
        laneX.set(lane.lane_id, actionX + laneColumn * laneWidth);
        const header = document.createElement("div");
        header.className = "lane-header tone-" + (index % 6);
        header.style.left = laneX.get(lane.lane_id) + "px";
        header.innerHTML = '<div style="font-weight:700;color:#1f1c17;">' + escapeHtml(lane.label) + '</div><div>' + escapeHtml((lane.turn_count || 0) + ' turns / ' + (lane.tool_call_count || 0) + ' tools') + '</div>';
        shell.appendChild(header);
      });

      const positioned = new Map();
      positioned.set("action_root", { x: actionX, y: 86 });

      const actionNode = document.createElement("button");
      actionNode.className = "node";
      actionNode.dataset.nodeId = "action_root";
      actionNode.style.left = actionX + "px";
      actionNode.style.top = "40px";
      actionNode.innerHTML = '<div class="title">Action ' + escapeHtml(data.action.user_action_id.slice(0, 8)) + '</div><div class="summary">' + escapeHtml(data.action.terminal_reason) + '</div>';
      actionNode.addEventListener("click", () => { selectedNodeId = "action_root"; drawerOpen = true; renderInspector(); });
      shell.appendChild(actionNode);

      const turnOrder = new Map();
      orderedTurnNodes.forEach((node, index) => {
        turnOrder.set(node.node_id, index);
      });
      const incomingForkByNode = new Map();
      data.edges.filter(edge => edge.edge_type === "fork").forEach(edge => {
        incomingForkByNode.set(edge.to, edge);
      });
      const outgoingForkCounts = new Map();
      data.edges.filter(edge => edge.edge_type === "fork").forEach(edge => {
        outgoingForkCounts.set(edge.from, (outgoingForkCounts.get(edge.from) || 0) + 1);
      });

      const lanesForRender = [...lanes].sort((left, right) => {
        const leftColumn = lanePlan[left.lane_id] ?? 0;
        const rightColumn = lanePlan[right.lane_id] ?? 0;
        return Math.abs(leftColumn) - Math.abs(rightColumn) || leftColumn - rightColumn;
      });

      lanesForRender.forEach(lane => {
        const laneNodes = nodes.filter(node => node.lane_id === lane.lane_id).sort((left, right) => {
          const leftOrder = turnOrder.get(left.node_id) ?? 0;
          const rightOrder = turnOrder.get(right.node_id) ?? 0;
          return leftOrder - rightOrder;
        });
        const firstForkEdge = laneNodes.length ? incomingForkByNode.get(laneNodes[0].node_id) : null;
        const parentPosition = firstForkEdge ? positioned.get(firstForkEdge.from) : null;
        const firstOrder = laneNodes.length ? (turnOrder.get(laneNodes[0].node_id) ?? 0) : 0;
        const naturalFirstTop = 170 + firstOrder * rowGap;
        const anchoredFirstTop = parentPosition ? Math.max(170, parentPosition.y + 58) : naturalFirstTop;
        const laneYOffset = parentPosition ? anchoredFirstTop - naturalFirstTop : 0;
        laneNodes.forEach(node => {
          const x = laneX.get(lane.lane_id);
          const y = 170 + (turnOrder.get(node.node_id) ?? 0) * rowGap + laneYOffset;
          positioned.set(node.node_id, { x, y: y + nodeHeight / 2 });
          const el = document.createElement("button");
          const laneIndex = lanes.findIndex(item => item.lane_id === lane.lane_id);
          el.className = "node tone-" + ((laneIndex >= 0 ? laneIndex : 0) % 6);
          if ((outgoingForkCounts.get(node.node_id) || 0) > 0) el.classList.add("branch-source");
          el.dataset.nodeId = node.node_id;
          el.style.left = x + "px";
          el.style.top = y + "px";
          const badges = (node.badges || []).slice(0, 4).map(badge => '<span class="badge ' + (badge.includes('problem') || badge.includes('warning') ? 'warn' : '') + '">' + escapeHtml(badge) + '</span>').join("");
          el.innerHTML = '<div class="title">' + escapeHtml(node.title) + '</div><div class="summary">' + escapeHtml(node.summary_observed || '-') + '</div><div class="badge-row">' + badges + '</div>';
          el.addEventListener("click", () => {
            selectedNodeId = node.node_id;
            const isBranchSource = (outgoingForkCounts.get(node.node_id) || 0) > 0;
            if (isBranchSource) {
              focusRootNodeId = focusRootNodeId === node.node_id ? null : node.node_id;
            }
            drawerOpen = true;
            renderInspector();
            applyFocusState();
          });
          shell.appendChild(el);
        });
      });

      function line(edgeId, from, to, color, dash, label, markerId) {
        if (!from || !to) return;
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("data-edge-id", edgeId);
        const midY = (from.y + to.y) / 2;
        path.setAttribute("d", 'M ' + from.x + ' ' + from.y + ' C ' + from.x + ' ' + midY + ', ' + to.x + ' ' + midY + ', ' + to.x + ' ' + to.y);
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", color);
        path.setAttribute("stroke-width", "2");
        if (dash) path.setAttribute("stroke-dasharray", dash);
        if (markerId) path.setAttribute("marker-end", "url(#" + markerId + ")");
        svg.appendChild(path);
        if (label) {
          const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
          text.setAttribute("data-edge-id", edgeId);
          text.setAttribute("x", String((from.x + to.x) / 2));
          text.setAttribute("y", String(midY - 8));
          text.setAttribute("text-anchor", "middle");
          text.setAttribute("font-size", "11");
          text.setAttribute("fill", color);
          text.textContent = label;
          svg.appendChild(text);
        }
      }

      data.edges.forEach(edge => {
        const from = positioned.get(edge.from);
        const to = positioned.get(edge.to);
        line(
          edge.edge_id,
          from,
          to,
          edge.edge_type === "fork" ? "var(--fork)" : edge.edge_type === "return" ? "var(--return)" : "var(--line)",
          edge.edge_type === "fork" ? "6 6" : edge.edge_type === "return" ? "4 4" : "",
          edge.edge_type === "fork" || edge.edge_type === "return" ? edge.label : "",
          edge.edge_type === "fork" ? "arrow-fork" : edge.edge_type === "return" ? "arrow-return" : "",
        );
      });

      const mainLane = data.lanes.find(lane => lane.query_source === "repl_main_thread") || data.lanes[0];
      centerGraphX = mainLane ? (laneX.get(mainLane.lane_id) || actionX) : actionX;
      recenterViewport();
      applyFocusState();
    }

    document.querySelectorAll(".tab").forEach(tab => {
      tab.addEventListener("click", () => {
        activeTab = tab.dataset.tab;
        renderInspector();
      });
    });

    document.getElementById("zoom-in").addEventListener("click", () => {
      zoom = clampZoom(zoom + 0.12);
      applyViewportTransform();
    });
    document.getElementById("zoom-out").addEventListener("click", () => {
      zoom = clampZoom(zoom - 0.12);
      applyViewportTransform();
    });
    document.getElementById("zoom-reset").addEventListener("click", () => {
      zoom = 1;
      recenterViewport();
    });
    clearFocusButton.addEventListener("click", () => {
      focusRootNodeId = null;
      applyFocusState();
    });

    document.getElementById("drawer-close").addEventListener("click", () => {
      drawerOpen = false;
      renderInspector();
    });

    viewport.addEventListener("pointerdown", event => {
      if (event.target.closest(".node")) return;
      isDragging = true;
      dragStartX = event.clientX - offsetX;
      dragStartY = event.clientY - offsetY;
      viewport.classList.add("dragging");
    });

    window.addEventListener("pointermove", event => {
      if (!isDragging) return;
      offsetX = event.clientX - dragStartX;
      offsetY = event.clientY - dragStartY;
      applyViewportTransform();
    });

    window.addEventListener("pointerup", () => {
      isDragging = false;
      viewport.classList.remove("dragging");
    });

    viewport.addEventListener("wheel", event => {
      event.preventDefault();
      const rect = viewport.getBoundingClientRect();
      const focusX = event.clientX - rect.left;
      const focusY = event.clientY - rect.top;
      const previousZoom = zoom;
      zoom = clampZoom(zoom + (event.deltaY < 0 ? 0.08 : -0.08));
      const ratio = zoom / previousZoom;
      offsetX = focusX - (focusX - offsetX) * ratio;
      offsetY = focusY - (focusY - offsetY) * ratio;
      applyViewportTransform();
    }, { passive: false });

    buildGraph();
    renderInspector();
  </script>
</body>
</html>`
}

export function renderSemanticViewerDirectoryAppHtml(
  entries: SemanticViewerIndexEntry[],
  options: { recentDbActions?: SemanticViewerRecentDbAction[] } = {},
): string {
  const sorted = [...entries].sort((left, right) => right.generated_at.localeCompare(left.generated_at))
  const recentDbActions = options.recentDbActions ?? []
  const recentRows = sorted.slice(0, 5).map((entry, index) => {
    const id = escapeForHtml(entry.user_action_id)
    const path = escapeForHtml(entry.relative_viewer_path)
    const meta = escapeForHtml(`${entry.output_dir_name} · ${entry.selected_by} · tools=${entry.tool_call_count} · queries=${entry.query_count}`)
    return `
          <div class="recent-action-row">
            <div class="recent-action-rank">#${index + 1}</div>
            <input class="recent-action-id" value="${id}" readonly aria-label="Recent user action id ${id.slice(0, 8)}" />
            <button class="recent-action-open" type="button" data-path="${path}" data-action-id="${id}">Open</button>
            <div class="recent-action-meta">${meta}</div>
          </div>`
  }).join("")
  const recentDbRows = recentDbActions.map((action, index) => {
    const id = escapeForHtml(action.user_action_id)
    const viewerPath = escapeForHtml(action.viewer_path ?? "")
    const meta = escapeForHtml(`${action.started_at || "unknown time"} · tools=${action.tool_call_count} · queries=${action.query_count} · duration_ms=${action.duration_ms ?? "-"}`)
    const actionButton = action.has_viewer
      ? `<button class="recent-action-open" type="button" data-path="${viewerPath}" data-action-id="${id}">Open</button>`
      : `<button class="recent-action-generate" type="button" data-action-id="${id}">Generate</button>`
    return `
          <div class="recent-action-row ${action.has_viewer ? "" : "missing-viewer"}">
            <div class="recent-action-rank">#${index + 1}</div>
            <input class="recent-action-id" value="${id}" readonly aria-label="Recent database user action id ${id.slice(0, 8)}" />
            ${actionButton}
            <div class="recent-action-meta">${meta}</div>
          </div>`
  }).join("")
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Semantic Viewer Directory</title>
  <style>
${shellStyle()}
    :root {
      --nb-bg: #f7f7f3;
      --nb-sidebar: #fbfbf8;
      --nb-paper: #ffffff;
      --nb-paper-soft: #fcfcfa;
      --nb-line: #e8e7df;
      --nb-ink: #1f2937;
      --nb-muted: #667085;
      --nb-accent: #2f6fed;
      --nb-accent-soft: #e9f1ff;
      --nb-shadow: 0 18px 48px rgba(16, 24, 40, 0.08);
      --nb-shadow-soft: 0 8px 24px rgba(16, 24, 40, 0.05);
    }
    body {
      padding: 0;
      background:
        radial-gradient(circle at top left, rgba(47,111,237,0.05), transparent 22%),
        linear-gradient(180deg, #fbfbf8 0%, #f6f6f2 100%);
      color: var(--nb-ink);
    }
    .app-layout {
      display: grid;
      grid-template-columns: 320px minmax(0, 1fr);
      gap: 0;
      min-height: 100vh;
      align-items: stretch;
    }
    .app-sidebar {
      background: linear-gradient(180deg, var(--nb-sidebar), #f8f8f4);
      border-right: 1px solid var(--nb-line);
      padding: 22px 18px;
      display: grid;
      align-content: start;
      gap: 14px;
      min-height: 100vh;
    }
    .app-main {
      min-width: 0;
      padding: 22px;
      display: grid;
      gap: 16px;
      align-content: start;
    }
    .app-card, .viewer-frame-card {
      background: var(--nb-paper);
      border: 1px solid var(--nb-line);
      border-radius: 24px;
      box-shadow: var(--nb-shadow-soft);
    }
    .app-card {
      padding: 18px;
      margin-bottom: 0;
    }
    .viewer-frame-card {
      padding: 14px;
      overflow: hidden;
      min-height: calc(100vh - 44px);
      box-shadow: var(--nb-shadow);
    }
    .directory-kicker {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--nb-muted);
    }
    .directory-title {
      margin-top: 8px;
      font-size: 28px;
      line-height: 1.15;
      font-weight: 700;
      color: var(--nb-ink);
    }
    .directory-copy {
      margin-top: 10px;
      color: var(--nb-muted);
      font-size: 14px;
      line-height: 1.6;
    }
    .app-controls {
      display: grid;
      gap: 10px;
      margin-top: 16px;
    }
    .app-input {
      min-width: 0;
      width: 100%;
      border: 1px solid var(--nb-line);
      border-radius: 16px;
      padding: 13px 14px;
      font-size: 14px;
      background: #fff;
      color: var(--nb-ink);
      box-shadow: inset 0 1px 2px rgba(16, 24, 40, 0.02);
    }
    .app-input:focus {
      outline: none;
      border-color: #b6cdf8;
      box-shadow: 0 0 0 4px rgba(47,111,237,0.12);
    }
    .app-button {
      border: 1px solid #c8dafc;
      background: linear-gradient(180deg, #ffffff, #f6f9ff);
      color: var(--nb-accent);
      border-radius: 999px;
      padding: 11px 16px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      justify-self: start;
    }
    .app-button:hover {
      border-color: #9fc0fb;
      background: linear-gradient(180deg, #ffffff, #eef4ff);
    }
    .app-hint {
      margin-top: 12px;
      color: var(--nb-muted);
      font-size: 13px;
      line-height: 1.55;
    }
    .search-meta {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 14px;
    }
    .meta-pill {
      border-radius: 999px;
      border: 1px solid var(--nb-line);
      background: #fff;
      color: var(--nb-muted);
      font-size: 12px;
      padding: 6px 10px;
    }
    .section-label {
      margin-top: 18px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--nb-muted);
    }
    .recent-action-list {
      display: grid;
      gap: 10px;
      margin-top: 10px;
    }
    .recent-action-row {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      gap: 8px;
      align-items: center;
      border: 1px solid var(--nb-line);
      border-radius: 16px;
      background: #fff;
      padding: 10px;
    }
    .recent-action-rank {
      color: var(--nb-muted);
      font-size: 12px;
      font-weight: 700;
    }
    .recent-action-id {
      min-width: 0;
      width: 100%;
      border: 0;
      background: transparent;
      color: var(--nb-ink);
      font: 12px/1.45 Consolas, "SFMono-Regular", monospace;
      overflow-wrap: anywhere;
    }
    .recent-action-id:focus {
      outline: 2px solid rgba(47,111,237,0.18);
      border-radius: 8px;
    }
    .recent-action-open, .recent-action-generate {
      border: 1px solid #c8dafc;
      background: #f6f9ff;
      color: var(--nb-accent);
      border-radius: 999px;
      padding: 6px 10px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 700;
    }
    .recent-action-open:hover, .recent-action-generate:hover {
      border-color: #9fc0fb;
      background: #eef4ff;
    }
    .recent-action-generate {
      border-color: #f2d4a7;
      background: #fff8ed;
      color: #a45f10;
    }
    .recent-action-row.missing-viewer {
      background: #fffdf8;
      border-color: #f0dfc3;
    }
    .recent-action-row.active {
      border-color: #97b7f5;
      background: linear-gradient(180deg, #ffffff, #f5f9ff);
      box-shadow: 0 0 0 4px rgba(47,111,237,0.1);
    }
    .recent-action-meta {
      grid-column: 2 / 4;
      color: var(--nb-muted);
      font-size: 12px;
      line-height: 1.45;
      overflow-wrap: anywhere;
    }
    .app-results {
      margin-top: 10px;
      max-height: none;
      overflow: auto;
      display: grid;
      gap: 10px;
    }
    .result-item {
      border: 1px solid var(--nb-line);
      border-radius: 18px;
      background: #fff;
      padding: 14px 14px 13px;
      cursor: pointer;
      text-align: left;
      transition: border-color 120ms ease, background 120ms ease, transform 120ms ease, box-shadow 120ms ease;
      box-shadow: 0 1px 2px rgba(16, 24, 40, 0.02);
    }
    .result-item:hover {
      border-color: #bed1f7;
      background: #fbfdff;
      transform: translateY(-1px);
      box-shadow: 0 10px 24px rgba(47, 111, 237, 0.08);
    }
    .result-item.active {
      border-color: #97b7f5;
      background: linear-gradient(180deg, #ffffff, #f5f9ff);
      box-shadow: 0 0 0 4px rgba(47,111,237,0.1);
    }
    .result-id {
      font-weight: 600;
      color: var(--nb-ink);
    }
    .result-meta {
      font-size: 12px;
      color: var(--nb-muted);
      margin-top: 6px;
      line-height: 1.5;
    }
    .empty {
      color: var(--nb-muted);
      font-size: 13px;
      padding: 16px 4px;
    }
    .notebook-tip {
      padding: 14px 16px;
      border-radius: 18px;
      background: linear-gradient(180deg, #ffffff, #fcfcfa);
      border: 1px solid var(--nb-line);
      color: var(--nb-muted);
      font-size: 13px;
      line-height: 1.6;
    }
    .viewer-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 14px;
      padding: 4px 4px 0;
    }
    .viewer-eyebrow {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--nb-muted);
    }
    .viewer-title {
      margin-top: 8px;
      font-size: 26px;
      font-weight: 700;
      color: var(--nb-ink);
    }
    .viewer-subtitle {
      margin-top: 8px;
      color: var(--nb-muted);
      font-size: 14px;
      line-height: 1.6;
      max-width: 720px;
    }
    .status-pill {
      border-radius: 999px;
      padding: 9px 14px;
      border: 1px solid var(--nb-line);
      background: #fff;
      color: var(--nb-muted);
      font-size: 12px;
      line-height: 1.4;
      white-space: nowrap;
      box-shadow: 0 1px 2px rgba(16,24,40,0.03);
    }
    .viewer-frame-shell {
      margin-top: 14px;
      border-radius: 20px;
      overflow: hidden;
      border: 1px solid var(--nb-line);
      background: var(--nb-paper-soft);
    }
    .viewer-frame {
      width: 100%;
      height: calc(100vh - 114px);
      border: 0;
      background: #fff;
      border-radius: 18px;
    }
    .viewer-footnote {
      margin-top: 10px;
      color: var(--nb-muted);
      font-size: 12px;
      line-height: 1.5;
      padding: 0 4px 2px;
    }
    .raw {
      background: var(--nb-accent-soft);
      color: var(--nb-accent);
      border-radius: 8px;
      padding: 2px 6px;
      font: 12px/1.45 Consolas, "SFMono-Regular", monospace;
    }
    @media (max-width: 1100px) {
      .app-layout { grid-template-columns: 300px minmax(0, 1fr); }
      .viewer-frame { height: calc(100vh - 128px); }
    }
    @media (max-width: 900px) {
      .app-layout { grid-template-columns: 1fr; }
      .app-sidebar { min-height: auto; border-right: 0; border-bottom: 1px solid var(--nb-line); }
      .app-main { padding-top: 0; }
      .viewer-frame-card { min-height: auto; }
      .viewer-header { flex-direction: column; }
      .viewer-frame { height: 72vh; }
    }
  </style>
</head>
<body>
  <div class="app-layout">
    <aside class="app-sidebar">
      <section class="app-card">
        <div class="directory-kicker">Semantic Viewer</div>
        <div class="directory-title">Search By Action ID</div>
        <div class="directory-copy">Open one \`user_action\` like a notebook page: search on the left, inspect the graph on the right, then drill into \`Dialogue\`, \`Tools\`, and \`Evidence\`.</div>
        <div class="app-controls">
          <input id="action-id-input" class="app-input" placeholder="Enter full or short action id" />
          <button id="load-action-button" class="app-button" type="button">Load Action</button>
        </div>
        <div id="app-status" class="app-hint">Type a full id like <span class="raw">${escapeForHtml(sorted[0]?.user_action_id ?? "user_action_id")}</span> or a short prefix.</div>
        <div class="search-meta">
          <div class="meta-pill">${sorted.length} indexed actions</div>
          <div class="meta-pill">white notebook shell</div>
        </div>
        <div class="section-label">Recent 5 DB Actions</div>
        <div class="notebook-tip">These come from DuckDB \`user_actions\`. If an action has no viewer yet, click Generate. If today's action is missing here, click Refresh DB first.</div>
        <div class="app-controls" style="margin-top:10px;">
          <button id="refresh-db-button" class="app-button" type="button">Refresh DB</button>
          <button id="generate-latest-button" class="app-button" type="button">Generate Latest Viewer</button>
        </div>
        <div id="db-refresh-status" class="app-hint">DB actions are read when this page loads.</div>
        <div id="recent-db-actions" class="recent-action-list">${recentDbRows || '<div class="empty">No DuckDB actions found. Click Refresh DB if recent events were not ingested yet.</div>'}
        </div>
        <div class="section-label">Recent 5 User Actions</div>
        <div class="notebook-tip">These are the latest five indexed actions from the local report root. Click Open to load one immediately, or select an ID field and copy it.</div>
        <div id="recent-actions" class="recent-action-list">${recentRows || '<div class="empty">No indexed semantic viewers yet.</div>'}
        </div>
        <div class="section-label">Matches</div>
        <div id="app-results" class="app-results"></div>
      </section>
      <section class="app-card">
        <div class="section-label" style="margin-top:0;">Reading Flow</div>
        <div class="notebook-tip">
          Start from the centered main thread, follow time downward, then click \`fork:N\` nodes to inspect branches.
        </div>
        <div class="notebook-tip" style="margin-top:10px;">
          In the right-side drawer inside each action viewer, \`Dialogue\` is usually the best first tab. It shows faithful user / assistant / tool-result blocks without dumping full payloads.
        </div>
        <div class="notebook-tip" style="margin-top:10px;">
          A turn is one observed query-loop iteration. Solid edges continue the same lane; dashed fork edges start child lanes from the parent turn; dashed return edges only appear when a later parent turn resumes after child completion.
        </div>
        <div class="notebook-tip" style="margin-top:10px;">
          \`Assistant context carried into this turn\` means prior assistant content is still token-bearing context in the next request window. \`Tool result\` blocks are marked as feeding the next prompt.
        </div>
      </section>
    </aside>
    <main class="app-main">
      <div class="viewer-header">
        <div>
          <div class="viewer-eyebrow">Action Workspace</div>
          <div class="viewer-title">Semantic Action Viewer</div>
          <div class="viewer-subtitle">This page is intentionally quiet: use search to switch actions, keep the graph visible, and treat the opened viewer like a research notebook for one runtime trace.</div>
        </div>
        <div id="viewer-status-pill" class="status-pill">Loading latest indexed action...</div>
      </div>
      <section class="viewer-frame-card">
        <div class="viewer-frame-shell">
          <iframe id="semantic-viewer-frame" class="viewer-frame" title="semantic viewer"></iframe>
        </div>
        <div class="viewer-footnote">Tip: drag inside the graph viewport to pan, use the mouse wheel to zoom, and click a node to open the detail drawer.</div>
      </section>
    </main>
  </div>
  <script>
    const entries = ${safeJson(sorted)};
    const input = document.getElementById("action-id-input");
    const button = document.getElementById("load-action-button");
    const status = document.getElementById("app-status");
    const results = document.getElementById("app-results");
    const recentActions = document.getElementById("recent-actions");
    const recentDbActions = document.getElementById("recent-db-actions");
    const refreshDbButton = document.getElementById("refresh-db-button");
    const generateLatestButton = document.getElementById("generate-latest-button");
    const dbRefreshStatus = document.getElementById("db-refresh-status");
    const frame = document.getElementById("semantic-viewer-frame");
    const viewerStatusPill = document.getElementById("viewer-status-pill");
    let activeActionId = null;

    function escapeHtml(value) {
      return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
    }

    function setLoadedState(entry, message) {
      activeActionId = entry ? entry.user_action_id : null;
      status.textContent = message;
      viewerStatusPill.textContent = message;
      updateActiveResult();
    }

    function openEntry(entry) {
      if (!entry) return;
      frame.src = entry.relative_viewer_path;
      setLoadedState(entry, "Loaded " + entry.user_action_id);
    }

    function updateActiveResult() {
      results.querySelectorAll(".result-item").forEach(item => {
        item.classList.toggle("active", item.getAttribute("data-action-id") === activeActionId);
      });
      recentActions.querySelectorAll(".recent-action-row").forEach(item => {
        item.classList.toggle("active", item.querySelector(".recent-action-open")?.getAttribute("data-action-id") === activeActionId);
      });
      recentDbActions.querySelectorAll(".recent-action-row").forEach(item => {
        const button = item.querySelector(".recent-action-open, .recent-action-generate");
        item.classList.toggle("active", button?.getAttribute("data-action-id") === activeActionId);
      });
    }

    async function postJson(path) {
      const response = await fetch(path, { method: "POST" });
      const text = await response.text();
      let payload = null;
      try { payload = text ? JSON.parse(text) : null; } catch { payload = { error: text }; }
      if (!response.ok) {
        throw new Error(payload?.error || payload?.stderr || payload?.stdout || "request failed");
      }
      return payload;
    }

    function renderResults(matches) {
      if (!matches.length) {
        results.innerHTML = '<div class="empty">No matching action viewer found.</div>';
        return;
      }
      results.innerHTML = matches.map(entry => {
        return '<button class="result-item" type="button" data-path="' + escapeHtml(entry.relative_viewer_path) + '" data-action-id="' + escapeHtml(entry.user_action_id) + '">' +
          '<div class="result-id">' + escapeHtml(entry.user_action_id) + '</div>' +
          '<div class="result-meta">' +
          escapeHtml(entry.output_dir_name + ' · ' + entry.selected_by + ' · tools=' + entry.tool_call_count + ' · queries=' + entry.query_count) +
          '</div></button>';
      }).join("");
      results.querySelectorAll(".result-item").forEach(item => {
        item.addEventListener("click", () => {
          const path = item.getAttribute("data-path");
          const actionId = item.getAttribute("data-action-id");
          const entry = entries.find(candidate => candidate.user_action_id === actionId);
          if (entry) openEntry(entry);
          else if (path && actionId) {
            frame.src = path;
            setLoadedState(null, "Loaded " + actionId);
          }
        });
      });
      updateActiveResult();
    }

    function matchEntries(query) {
      const normalized = String(query || "").trim().toLowerCase();
      if (!normalized) return entries.slice(0, 12);
      return entries.filter(entry => entry.user_action_id.toLowerCase().includes(normalized) || entry.output_dir_name.toLowerCase().includes(normalized)).slice(0, 20);
    }

    function loadFromInput() {
      const matches = matchEntries(input.value);
      renderResults(matches);
      if (matches.length === 1) {
        openEntry(matches[0]);
      } else if (matches.length > 1) {
        setLoadedState(null, "Found " + matches.length + " matching actions. Pick one below.");
      } else {
        setLoadedState(null, "No matching action viewer found.");
      }
    }

    input.addEventListener("input", () => renderResults(matchEntries(input.value)));
    input.addEventListener("keydown", event => {
      if (event.key === "Enter") loadFromInput();
    });
    button.addEventListener("click", loadFromInput);
    refreshDbButton.addEventListener("click", async () => {
      refreshDbButton.disabled = true;
      dbRefreshStatus.textContent = "Refreshing DuckDB from local observability events...";
      try {
        await postJson("/api/refresh-db");
        dbRefreshStatus.textContent = "DB refreshed. Reloading dashboard...";
        window.location.reload();
      } catch (error) {
        dbRefreshStatus.textContent = "Refresh failed: " + (error?.message || error);
      } finally {
        refreshDbButton.disabled = false;
      }
    });
    generateLatestButton.addEventListener("click", async () => {
      generateLatestButton.disabled = true;
      dbRefreshStatus.textContent = "Generating viewer for latest DB action...";
      try {
        const result = await postJson("/api/generate-latest");
        dbRefreshStatus.textContent = "Generated " + result.userActionId + ". Reloading dashboard...";
        window.location.href = "/";
      } catch (error) {
        dbRefreshStatus.textContent = "Generate latest failed: " + (error?.message || error);
      } finally {
        generateLatestButton.disabled = false;
      }
    });
    recentActions.querySelectorAll(".recent-action-open").forEach(item => {
      item.addEventListener("click", () => {
        const actionId = item.getAttribute("data-action-id");
        const entry = entries.find(candidate => candidate.user_action_id === actionId);
        openEntry(entry);
      });
    });
    recentDbActions.querySelectorAll(".recent-action-open").forEach(item => {
      item.addEventListener("click", () => {
        const path = item.getAttribute("data-path");
        const actionId = item.getAttribute("data-action-id");
        const entry = entries.find(candidate => candidate.user_action_id === actionId);
        if (entry) openEntry(entry);
        else if (path && actionId) {
          frame.src = path;
          setLoadedState(null, "Loaded " + actionId);
        }
      });
    });
    recentDbActions.querySelectorAll(".recent-action-generate").forEach(item => {
      item.addEventListener("click", async () => {
        const actionId = item.getAttribute("data-action-id");
        if (!actionId) return;
        item.disabled = true;
        dbRefreshStatus.textContent = "Generating viewer for " + actionId + "...";
        try {
          const result = await postJson("/api/generate/" + encodeURIComponent(actionId));
          dbRefreshStatus.textContent = "Generated " + result.userActionId + ". Reloading dashboard...";
          window.location.href = "/";
        } catch (error) {
          dbRefreshStatus.textContent = "Generate failed: " + (error?.message || error);
        } finally {
          item.disabled = false;
        }
      });
    });

    renderResults(entries.slice(0, 12));
    if (entries.length > 0) {
      openEntry(entries[0]);
      setLoadedState(entries[0], "Loaded latest indexed action " + entries[0].user_action_id);
    }
  </script>
</body>
</html>`
}

function escapeForHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;")
}
