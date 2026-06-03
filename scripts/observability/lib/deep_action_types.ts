export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue }

export type SelectionMode = "latest" | "explicit_user_action_id"

export type ActionRow = {
  user_action_id: string
  event_date: string
  started_at: string
  started_at_ms: number
  ended_at: string
  ended_at_ms: number
  duration_ms: number
  query_count: number
  subagent_count: number
  tool_call_count: number
  total_prompt_input_tokens: number
  total_billed_tokens: number
  main_thread_total_prompt_input_tokens: number
  subagent_total_prompt_input_tokens: number
}

export type IntegrityRow = Record<string, string | number | boolean | null>

export type QueryRow = {
  query_id: string
  user_action_id: string
  query_source: string | null
  subagent_id: string | null
  subagent_reason: string | null
  subagent_trigger_kind: string | null
  subagent_trigger_detail: string | null
  agent_name: string | null
  source_group: string | null
  started_at: string
  started_at_ms: number
  ended_at: string | null
  ended_at_ms: number | null
  duration_ms: number | null
  turn_count: number
  query_max_loop_iter: number | null
  tool_call_count: number
  terminal_reason: string | null
  strict_is_complete: boolean | null
  inferred_is_complete: boolean | null
}

export type TurnRow = {
  query_id: string
  turn_id: string
  agent_name: string | null
  query_source: string | null
  started_at: string
  started_at_ms: number
  ended_at: string | null
  ended_at_ms: number | null
  duration_ms: number | null
  loop_iter_start: number | null
  loop_iter_end: number | null
  tool_call_count: number
  stop_reason: string | null
  transition_out: string | null
  termination_reason: string | null
  strict_is_closed: boolean | null
  inferred_is_closed: boolean | null
}

export type ToolRow = {
  tool_call_id: string
  query_id: string | null
  turn_id: string | null
  subagent_id: string | null
  tool_name: string | null
  detected_at: string | null
  detected_at_ms: number | null
  started_at: string | null
  started_at_ms: number | null
  completed_at: string | null
  completed_at_ms: number | null
  duration_ms: number | null
  success: boolean | null
  failure_reason: string | null
}

export type SubagentRow = {
  subagent_id: string
  query_id: string | null
  subagent_type: string | null
  subagent_reason: string | null
  subagent_trigger_kind: string | null
  subagent_trigger_detail: string | null
  query_source: string | null
  agent_name: string | null
  source_group: string | null
  spawned_at: string | null
  spawned_at_ms: number | null
  completed_at: string | null
  completed_at_ms: number | null
  duration_ms: number | null
}

export type EventRow = {
  event_name: string
  ts_wall: string
  ts_wall_ms: number | null
  query_id: string | null
  effective_query_id: string | null
  turn_id: string | null
  tool_call_id: string | null
  subagent_id: string | null
  payload_json: string | null
  snapshot_refs_json: string | null
}

export type SnapshotIndexRow = {
  snapshot_ref: string
  file_name: string
  relative_path: string
  absolute_path: string
  exists: boolean
  size_bytes: number | null
  sha256: string | null
  referenced_count: number
  first_event_ts: string | null
  last_event_ts: string | null
  category: string | null
}

export type SnapshotRecord = {
  snapshotRef: string
  category: string | null
  exists: boolean
  absolutePath: string
  data: JsonValue | null
  warnings: string[]
}

export type ToolInputSemantics = {
  toolUseId: string
  toolName: string
  inputSummary: string
  commandOrPath: string
  touchedFiles: string[]
  producedFiles: string[]
  assistantTextSummary: string
  promptSummary: string
  rawInput: JsonValue | null
}

export type ToolResultCandidate = {
  tool_use_id: string | null
  snapshot_ref: string
  category: string | null
  matched_by: "tool_use_id" | "turn_fallback"
  text_summary: string
  stdout_summary: string
  stderr_summary: string
  error_summary: string
  status: string
  result_files: string[]
  warnings: string[]
}

export type RichToolCall = {
  tool_call_id: string
  query_id: string | null
  subagent_id: string | null
  agent_name: string | null
  turn_id: string | null
  tool_name: string
  detected_at: string | null
  completed_at: string | null
  duration_ms: number | null
  success: boolean | null
  input_summary: string
  output_summary: string
  stdout_summary: string
  stderr_summary: string
  error_summary: string
  result_summary_rich: string
  detected_problem: string
  detected_fix_signal: string
  result_files: string[]
  command_or_path: string
  intent_inferred: string
  produced_files: string[]
  touched_files: string[]
  snapshot_refs: string[]
  evidence_refs: string[]
  warnings: string[]
  prompt_summary: string
}

export type PhaseRecord = {
  phase_id: string
  phase_name: string
  stage_kind: "input" | "main" | "subagent" | "compact" | "script" | "issue" | "fix" | "output"
  start_local: string
  end_local: string
  duration_ms: number
  start_ms: number
  end_ms: number
  query_ids: string[]
  turn_ids: string[]
  tool_counts: Record<string, number>
  main_outputs: string[]
  problems: string[]
  fixes: string[]
  evidence_refs: string[]
  tool_call_ids: string[]
  phase_tool_call_ids: string[]
  primary_artifacts: string[]
  reason_summary: string
  action_summary: string
  result_summary: string
}

export type ArtifactRecord = {
  artifact_path: string
  artifact_type: string
  first_seen_phase: string
  created_by_tool: string
  created_by_tool_call_id: string | null
  created_by_phase_id: string | null
  modified_by_tools: string[]
  modified_by_tool_call_ids: string[]
  phase_ids: string[]
  evidence_refs: string[]
}

export type EvidenceRecord = {
  evidence_id: string
  snapshot_ref: string
  category: string | null
  query_id: string | null
  turn_id: string | null
  extracted_fields: string[]
  summary: string
}

export type RepairChain = {
  chain_id: string
  problem_summary: string
  root_cause_guess: string
  fix_actions: string[]
  verification_summary: string
  tool_call_ids: string[]
  phase_ids: string[]
  artifact_paths: string[]
  evidence_refs: string[]
  status: "resolved" | "unresolved"
}

export type TurnSnapshotBundle = {
  requestSnapshots: SnapshotRecord[]
  responseSnapshots: SnapshotRecord[]
  relatedSnapshots: SnapshotRecord[]
  afterTurnSnapshots: SnapshotRecord[]
}

export type DialogueBlockRole =
  | "user"
  | "assistant"
  | "tool_use"
  | "tool_result"
  | "subagent"
  | "compact"
  | "note"

export type DialogueBlockKind =
  | "user_message"
  | "assistant_reply"
  | "assistant_tool_use"
  | "tool_result"
  | "subagent_prompt"
  | "subagent_return"
  | "compact_event"
  | "note"

export type SemanticNodeType = "action" | "turn"

export type SemanticEdgeType = "sequential" | "fork" | "return"

export type DialogueBlock = {
  dialogue_block_id: string
  node_id: string
  role: DialogueBlockRole
  kind: DialogueBlockKind
  title: string
  role_label: string
  badges: string[]
  raw_text: string
  excerpt: string
  truncated: boolean
  query_id: string | null
  turn_id: string | null
  snapshot_ref: string | null
  message_uuid: string | null
  tool_call_id: string | null
  evidence_ref: string | null
  warnings: string[]
}

export type SemanticNodeMetricSummary = {
  duration_ms: number | null
  prompt_tokens: number | null
  output_tokens: number | null
  billed_tokens: number | null
  cache_read_tokens: number | null
  tool_call_count: number
  subagent_spawn_count: number
  compact_event_count: number
}

export type SemanticNode = {
  node_id: string
  node_type: SemanticNodeType
  title: string
  lane_id: string
  query_id: string | null
  turn_id: string | null
  agent_name: string | null
  started_at: string | null
  ended_at: string | null
  phase_ids: string[]
  tool_call_ids: string[]
  artifact_paths: string[]
  evidence_refs: string[]
  summary_observed: string
  summary_interpretation: string
  badges: string[]
  metrics: SemanticNodeMetricSummary
}

export type SemanticEdge = {
  edge_id: string
  from: string
  to: string
  edge_type: SemanticEdgeType
  label: string
}

export type SemanticLane = {
  lane_id: string
  query_id: string
  label: string
  query_source: string | null
  agent_name: string | null
  turn_count: number
  tool_call_count: number
  duration_ms: number | null
  terminal_reason: string | null
}

export type SemanticActionSummary = {
  user_action_id: string
  selected_by: SelectionMode
  duration_ms: number
  query_count: number
  subagent_count: number
  tool_call_count: number
  total_billed_tokens: number
  terminal_reason: string
  warning: string | null
}

export type SemanticNodeDetail = {
  node_id: string
  overview: {
    title: string
    query_label: string
    query_identity: string
    turn_label: string
    reason: string
    action: string
    result: string
    metrics: SemanticNodeMetricSummary
  }
  dialogue: DialogueBlock[]
  tools: RichToolCall[]
  artifacts: ArtifactRecord[]
  evidence: EvidenceRecord[]
  risk_flags: string[]
}

export type SemanticViewerData = {
  action: SemanticActionSummary
  lanes: SemanticLane[]
  nodes: SemanticNode[]
  edges: SemanticEdge[]
  details: Record<string, SemanticNodeDetail>
}

export type SemanticViewerIndexEntry = {
  user_action_id: string
  output_dir_name: string
  relative_viewer_path: string
  selected_by: SelectionMode
  terminal_reason: string
  generated_at: string
  query_count: number
  tool_call_count: number
}

export type SemanticViewerRecentDbAction = {
  user_action_id: string
  started_at: string
  duration_ms: number | null
  query_count: number
  tool_call_count: number
  has_viewer: boolean
  viewer_path: string | null
}

export type GraphProfile = "overview" | "rich" | "debug" | "artifact" | "full"

export type GraphStats = {
  size_bytes: number
  line_count: number
  node_count: number
  edge_count: number
  subgraph_count: number
}

export type GraphChunkManifest = {
  file_name: string
  profile: GraphProfile
  phase_range: string
  stats: GraphStats
  renderable: boolean
}

export type GraphManifest = {
  user_action_id: string
  generated_at: string
  phase_count: number
  tool_count: number
  artifact_count: number
  repair_chain_count: number
  chunks: GraphChunkManifest[]
  full_graph_too_large: boolean
  recommended_entry: string
}
