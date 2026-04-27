param(
  [string]$UserActionId,
  [switch]$Latest,
  [string]$OutputPath,
  [switch]$SnapshotDb
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$duckdbExe = Join-Path $repoRoot "tools\duckdb\duckdb.exe"
$dbPath = Join-Path $repoRoot ".observability\observability_v1.duckdb"
$snapshotPath = $null
$docsRoot = Join-Path $repoRoot "ObservrityTask"
$defaultOutputDir = Join-Path $docsRoot "action-reports"

if (Test-Path -LiteralPath $docsRoot) {
  $versionRoot = Get-ChildItem -LiteralPath $docsRoot -Directory |
    Where-Object {
      Test-Path -LiteralPath (Join-Path (Join-Path $_.FullName "v1") "README.md")
    } |
    Select-Object -First 1

  if ($null -ne $versionRoot) {
    $v1Root = Join-Path $versionRoot.FullName "v1"
    $sampleDir = Get-ChildItem -LiteralPath $v1Root -Directory |
      Where-Object { $_.Name -like "03-*" } |
      Select-Object -First 1

    if ($null -ne $sampleDir) {
      $defaultOutputDir = $sampleDir.FullName
    } else {
      $defaultOutputDir = Join-Path $v1Root "03-samples"
    }
  }
}

if (-not (Test-Path -LiteralPath $duckdbExe)) {
  throw "DuckDB executable not found at $duckdbExe"
}

if (-not (Test-Path -LiteralPath $dbPath)) {
  throw "DuckDB database not found at $dbPath"
}

if ($SnapshotDb) {
  $snapshotDir = Join-Path $repoRoot ".observability\v1-report-db-snapshots"
  [System.IO.Directory]::CreateDirectory($snapshotDir) | Out-Null
  $snapshotPath = Join-Path $snapshotDir ("observability_v1_{0}.duckdb" -f ([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()))
  Copy-Item -LiteralPath $dbPath -Destination $snapshotPath -Force
  $dbPath = $snapshotPath
}

function As-Array {
  param([object]$Value)

  if ($null -eq $Value) {
    return @()
  }

  if ($Value -is [System.Array]) {
    return $Value
  }

  return @($Value)
}

function Escape-SqlLiteral {
  param([string]$Value)
  return $Value.Replace("'", "''")
}

function Invoke-DuckDbJson {
  param([string]$Sql)

  $raw = & $duckdbExe -json $dbPath $Sql
  if ([string]::IsNullOrWhiteSpace($raw)) {
    return @()
  }

  return As-Array ($raw | ConvertFrom-Json)
}

function To-LocalDisplay {
  param([string]$UtcText)

  if ([string]::IsNullOrWhiteSpace($UtcText)) {
    return ""
  }

  return ([DateTimeOffset]::Parse($UtcText).ToLocalTime().ToString("yyyy-MM-dd HH:mm:ss"))
}

function To-LocalShort {
  param([string]$UtcText)

  if ([string]::IsNullOrWhiteSpace($UtcText)) {
    return ""
  }

  return ([DateTimeOffset]::Parse($UtcText).ToLocalTime().ToString("HH:mm:ss"))
}

function To-MermaidLabel {
  param([string[]]$Lines)

  $text = ($Lines | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }) -join "<br/>"
  return $text.Replace('"', "'")
}

function Short-Id {
  param([string]$Value)

  if ([string]::IsNullOrWhiteSpace($Value)) {
    return "null"
  }

  if ($Value.Length -le 8) {
    return $Value
  }

  return $Value.Substring(0, 8)
}

function Format-Number {
  param([object]$Value)

  if ($null -eq $Value) {
    return "0"
  }

  try {
    return ([long]$Value).ToString("N0")
  } catch {
    return "$Value"
  }
}

function Format-Duration {
  param([object]$DurationMs)

  if ($null -eq $DurationMs -or [string]::IsNullOrWhiteSpace("$DurationMs")) {
    return ""
  }

  $ms = [double]$DurationMs
  if ($ms -lt 1000) {
    return ("{0}ms" -f [math]::Round($ms))
  }

  return ("{0}s" -f [math]::Round($ms / 1000, 1))
}

function Get-QueryNodeId {
  param([string]$QueryId)
  return "Q_" + (Short-Id $QueryId)
}

function Get-TurnNodeId {
  param([string]$QueryId, [string]$TurnId)
  return "T_" + (Short-Id $QueryId) + "_" + ($TurnId.Replace("-", "_"))
}

function Get-SpawnNodeId {
  param([int]$Index)
  return "S_$Index"
}

function Get-ToolLabel {
  param([object[]]$ToolRows)

  if ($ToolRows.Count -eq 0) {
    return $null
  }

  $parts = @()
  $groups = $ToolRows | Group-Object tool_name | Sort-Object Name
  foreach ($group in $groups) {
    $failed = @($group.Group | Where-Object { $_.success -eq $false }).Count
    $suffix = if ($group.Count -gt 1) { " x$($group.Count)" } else { "" }
    $failureSuffix = if ($failed -gt 0) { " !fail=$failed" } else { "" }
    $parts += ("{0}{1}{2}" -f $group.Name, $suffix, $failureSuffix)
  }

  return ($parts -join " + ")
}

function Find-MainTurnForSpawn {
  param(
    [long]$SpawnAtMs,
    [object[]]$TurnRows
  )

  if ($TurnRows.Count -eq 0) {
    return $null
  }

  for ($i = 0; $i -lt $TurnRows.Count; $i++) {
    $current = $TurnRows[$i]
    $next = if ($i + 1 -lt $TurnRows.Count) { $TurnRows[$i + 1] } else { $null }
    $startsBefore = [long]$current.started_at_ms -le $SpawnAtMs
    $nextStartsAfter = ($null -eq $next) -or ([long]$next.started_at_ms -gt $SpawnAtMs)
    if ($startsBefore -and $nextStartsAfter) {
      return $current
    }
  }

  return $null
}

if ([string]::IsNullOrWhiteSpace($UserActionId)) {
  $Latest = $true
}

if ($Latest) {
  $latestRows = Invoke-DuckDbJson @"
select user_action_id
from user_actions
order by started_at_ms desc
limit 1;
"@

  if ($latestRows.Count -eq 0) {
    throw "No user actions found in user_actions."
  }

  $UserActionId = $latestRows[0].user_action_id
}

$escapedActionId = Escape-SqlLiteral $UserActionId

$actionRows = Invoke-DuckDbJson @"
select *
from user_actions
where user_action_id = '$escapedActionId';
"@

if ($actionRows.Count -eq 0) {
  throw "User action not found: $UserActionId"
}

$action = $actionRows[0]

$integrityRows = Invoke-DuckDbJson @"
select *
from metrics_integrity_daily
where event_date = '$($action.event_date)';
"@
$integrity = if ($integrityRows.Count -gt 0) { $integrityRows[0] } else { $null }

$queries = Invoke-DuckDbJson @"
select query_id, user_action_id, query_source, subagent_id, subagent_reason,
       subagent_trigger_kind, subagent_trigger_detail,
       agent_name, source_group,
       started_at, started_at_ms, ended_at, ended_at_ms, duration_ms,
       turn_count, query_max_loop_iter, tool_call_count, terminal_reason,
       strict_is_complete, inferred_is_complete
from queries
where user_action_id = '$escapedActionId'
order by started_at_ms asc;
"@

$turns = Invoke-DuckDbJson @"
select query_id, turn_id, agent_name, query_source, started_at, started_at_ms, ended_at, ended_at_ms,
       duration_ms, loop_iter_start, loop_iter_end, tool_call_count, stop_reason,
       transition_out, termination_reason, strict_is_closed, inferred_is_closed
from turns
where user_action_id = '$escapedActionId'
order by started_at_ms asc;
"@

$subagents = Invoke-DuckDbJson @"
select subagent_id, query_id, subagent_type, subagent_reason,
       subagent_trigger_kind, subagent_trigger_detail,
       query_source, agent_name, source_group,
       spawned_at, spawned_at_ms, completed_at, completed_at_ms, duration_ms
from subagents
where user_action_id = '$escapedActionId'
order by spawned_at_ms asc;
"@

$tools = Invoke-DuckDbJson @"
select query_id, turn_id, tool_name, detected_at, detected_at_ms, duration_ms, success
from tools
where user_action_id = '$escapedActionId'
order by detected_at_ms asc;
"@

$queryCosts = Invoke-DuckDbJson @"
select query_id,
       sum(total_prompt_input_tokens) as total_prompt_input_tokens,
       sum(total_billed_tokens) as total_billed_tokens,
       sum(output_tokens) as output_tokens
from usage_facts
where user_action_id = '$escapedActionId'
  and is_authoritative
  and query_id is not null
group by query_id;
"@

$spawns = Invoke-DuckDbJson @"
select ts_wall, ts_wall_ms, query_id, subagent_id, subagent_reason,
       subagent_trigger_kind, subagent_trigger_detail, query_source
from events_raw
where user_action_id = '$escapedActionId'
  and event_name = 'subagent.spawned'
order by ts_wall_ms asc;
"@

$mainQuery = $queries | Where-Object { $_.agent_name -eq "main_thread" } | Select-Object -First 1
$mainTurns = @($turns | Where-Object { $_.agent_name -eq "main_thread" } | Sort-Object started_at_ms)

$toolsByTurnKey = @{}
foreach ($tool in $tools) {
  $key = "$($tool.query_id)|$($tool.turn_id)"
  if (-not $toolsByTurnKey.ContainsKey($key)) {
    $toolsByTurnKey[$key] = @()
  }
  $toolsByTurnKey[$key] += $tool
}

$turnsByQuery = @{}
foreach ($turn in $turns) {
  if (-not $turnsByQuery.ContainsKey($turn.query_id)) {
    $turnsByQuery[$turn.query_id] = @()
  }
  $turnsByQuery[$turn.query_id] += $turn
}

$costByQuery = @{}
foreach ($cost in $queryCosts) {
  $costByQuery[$cost.query_id] = $cost
}

$subagentByQuery = @{}
foreach ($subagent in $subagents) {
  if (-not [string]::IsNullOrWhiteSpace($subagent.query_id)) {
    $subagentByQuery[$subagent.query_id] = $subagent
  }
}

$usedDefaultOutputPath = [string]::IsNullOrWhiteSpace($OutputPath)
if ($usedDefaultOutputPath) {
  $OutputPath = Join-Path $defaultOutputDir ("user_action_{0}_auto_report.md" -f (Short-Id $UserActionId))
} elseif (-not [System.IO.Path]::IsPathRooted($OutputPath)) {
  $OutputPath = Join-Path $repoRoot $OutputPath
}

$overviewLines = New-Object System.Collections.Generic.List[string]
$overviewLines.Add("flowchart TD")
$overviewLines.Add(("  UA[""{0}""]" -f (To-MermaidLabel @(
    "user_action"
    (Short-Id $UserActionId)
    ("{0} -> {1}" -f (To-LocalShort $action.started_at), (To-LocalShort $action.ended_at))
    ("duration {0}" -f (Format-Duration $action.duration_ms))
    ("billed {0}" -f (Format-Number $action.total_billed_tokens))
  ))))
$overviewLines.Add("  classDef action fill:#eef6ff,stroke:#2f6fed,stroke-width:1px,color:#10233f")
$overviewLines.Add("  classDef main fill:#ecfdf3,stroke:#16803c,stroke-width:1px,color:#0c331b")
$overviewLines.Add("  classDef subagent fill:#fff7e6,stroke:#b7791f,stroke-width:1px,color:#442a05")
$overviewLines.Add("  classDef spawn fill:#f5f5f5,stroke:#737373,stroke-dasharray: 4 3,color:#262626")
$overviewLines.Add("  class UA action")

$mermaidLines = New-Object System.Collections.Generic.List[string]
$mermaidLines.Add("flowchart TD")
$mermaidLines.Add(("  UA[""{0}""]" -f (To-MermaidLabel @(
    "user_action"
    (Short-Id $UserActionId)
    ("queries {0}, subagents {1}, tools {2}" -f $action.query_count, $action.subagent_count, $action.tool_call_count)
    ("duration {0}" -f (Format-Duration $action.duration_ms))
    ("billed {0}" -f (Format-Number $action.total_billed_tokens))
  ))))
$mermaidLines.Add("  classDef action fill:#eef6ff,stroke:#2f6fed,stroke-width:1px,color:#10233f")
$mermaidLines.Add("  classDef main fill:#ecfdf3,stroke:#16803c,stroke-width:1px,color:#0c331b")
$mermaidLines.Add("  classDef subagent fill:#fff7e6,stroke:#b7791f,stroke-width:1px,color:#442a05")
$mermaidLines.Add("  classDef turn fill:#ffffff,stroke:#a3a3a3,stroke-width:1px,color:#262626")
$mermaidLines.Add("  classDef spawn fill:#f5f5f5,stroke:#737373,stroke-dasharray: 4 3,color:#262626")
$mermaidLines.Add("  classDef warn fill:#fff1f2,stroke:#e11d48,stroke-width:2px,color:#4c0519")
$mermaidLines.Add("  class UA action")

$queryNodeIds = @{}
foreach ($query in $queries) {
  $queryNodeId = Get-QueryNodeId $query.query_id
  $queryNodeIds[$query.query_id] = $queryNodeId
  $cost = $costByQuery[$query.query_id]
  $queryBilled = if ($null -ne $cost) { Format-Number $cost.total_billed_tokens } else { "0" }
  $queryLabel = To-MermaidLabel @(
    $query.agent_name
    (Short-Id $query.query_id)
    ("turns {0}, tools {1}" -f $query.turn_count, $query.tool_call_count)
    ("billed {0}" -f $queryBilled)
    ("duration {0}" -f (Format-Duration $query.duration_ms))
    $query.terminal_reason
  )
  $mermaidLines.Add(("  {0}[""{1}""]" -f $queryNodeId, $queryLabel))
  $queryClass = if ($query.agent_name -eq "main_thread") { "main" } else { "subagent" }
  $mermaidLines.Add(("  class {0} {1}" -f $queryNodeId, $queryClass))

  $overviewLabel = To-MermaidLabel @(
    $query.agent_name
    (Short-Id $query.query_id)
    ("turns {0}, tools {1}" -f $query.turn_count, $query.tool_call_count)
    ("billed {0}" -f $queryBilled)
    $query.subagent_reason
  )
  $overviewLines.Add(("  {0}[""{1}""]" -f $queryNodeId, $overviewLabel))
  $overviewLines.Add(("  class {0} {1}" -f $queryNodeId, $queryClass))
}

$turnNodeIds = @{}
foreach ($turn in $turns) {
  $turnNodeId = Get-TurnNodeId $turn.query_id $turn.turn_id
  $turnNodeIds["$($turn.query_id)|$($turn.turn_id)"] = $turnNodeId
  $toolKey = "$($turn.query_id)|$($turn.turn_id)"
  $toolLabel = if ($toolsByTurnKey.ContainsKey($toolKey)) { Get-ToolLabel $toolsByTurnKey[$toolKey] } else { $null }
  $detail = if (-not [string]::IsNullOrWhiteSpace($toolLabel)) { $toolLabel } elseif (-not [string]::IsNullOrWhiteSpace($turn.stop_reason)) { $turn.stop_reason } else { "no_tool" }
  $turnLabel = To-MermaidLabel @(
    $turn.turn_id
    $detail
    ("loop={0}" -f $turn.loop_iter_end)
    ("duration {0}" -f (Format-Duration $turn.duration_ms))
  )
  $mermaidLines.Add(("  {0}[""{1}""]" -f $turnNodeId, $turnLabel))
  $turnClass = if (($turn.strict_is_closed -eq $false) -or ($turn.inferred_is_closed -eq $false)) { "warn" } else { "turn" }
  $mermaidLines.Add(("  class {0} {1}" -f $turnNodeId, $turnClass))
}

foreach ($query in $queries) {
  $queryTurns = @($turnsByQuery[$query.query_id] | Sort-Object started_at_ms)
  if ($queryTurns.Count -eq 0) {
    continue
  }

  $queryNodeId = $queryNodeIds[$query.query_id]
  $firstTurnNodeId = $turnNodeIds["$($query.query_id)|$($queryTurns[0].turn_id)"]
  $mermaidLines.Add(("  {0} --> {1}" -f $queryNodeId, $firstTurnNodeId))

  for ($i = 0; $i -lt $queryTurns.Count - 1; $i++) {
    $fromNodeId = $turnNodeIds["$($query.query_id)|$($queryTurns[$i].turn_id)"]
    $toNodeId = $turnNodeIds["$($query.query_id)|$($queryTurns[$i + 1].turn_id)"]
    $mermaidLines.Add(("  {0} --> {1}" -f $fromNodeId, $toNodeId))
  }
}

$spawnIndex = 0
$spawnSummary = @()
foreach ($spawn in $spawns) {
  $spawnIndex += 1
  $spawnNodeId = Get-SpawnNodeId $spawnIndex
  $spawnSummary += [PSCustomObject]@{
    NodeId = $spawnNodeId
    QueryId = $spawn.query_id
    SubagentId = $spawn.subagent_id
    SubagentReason = $spawn.subagent_reason
    SubagentTriggerKind = $spawn.subagent_trigger_kind
    SubagentTriggerDetail = $spawn.subagent_trigger_detail
    SpawnedAt = $spawn.ts_wall
    SpawnedAtMs = [long]$spawn.ts_wall_ms
  }

  $spawnLabel = To-MermaidLabel @(
    ("spawn {0}" -f $spawn.subagent_reason)
    $spawn.subagent_trigger_detail
    (To-LocalShort $spawn.ts_wall)
  )
  $mermaidLines.Add(("  {0}[""{1}""]" -f $spawnNodeId, $spawnLabel))
  $mermaidLines.Add(("  class {0} spawn" -f $spawnNodeId))

  $overviewSpawnLabel = To-MermaidLabel @(
    ("spawn {0}" -f $spawn.subagent_reason)
    $spawn.subagent_trigger_detail
  )
  $overviewLines.Add(("  {0}[""{1}""]" -f $spawnNodeId, $overviewSpawnLabel))
  $overviewLines.Add(("  class {0} spawn" -f $spawnNodeId))

  $queryNodeId = $queryNodeIds[$spawn.query_id]
  $parentTurn = Find-MainTurnForSpawn -SpawnAtMs ([long]$spawn.ts_wall_ms) -TurnRows $mainTurns
  if ($null -ne $parentTurn) {
    $parentTurnNodeId = $turnNodeIds["$($parentTurn.query_id)|$($parentTurn.turn_id)"]
    $mermaidLines.Add(("  {0} --> {1} --> {2}" -f $parentTurnNodeId, $spawnNodeId, $queryNodeId))
    $overviewParentNodeId = if ($null -ne $mainQuery) { $queryNodeIds[$mainQuery.query_id] } else { "UA" }
    $overviewLines.Add(("  {0} -->|after {1}| {2} --> {3}" -f $overviewParentNodeId, $parentTurn.turn_id, $spawnNodeId, $queryNodeId))
  } else {
    $mermaidLines.Add(("  UA --> {0} --> {1}" -f $spawnNodeId, $queryNodeId))
    $overviewLines.Add(("  UA --> {0} --> {1}" -f $spawnNodeId, $queryNodeId))
  }
}

foreach ($query in $queries) {
  if (($null -ne $mainQuery) -and ($query.query_id -eq $mainQuery.query_id)) {
    $mermaidLines.Add(("  UA --> {0}" -f $queryNodeIds[$query.query_id]))
    $overviewLines.Add(("  UA --> {0}" -f $queryNodeIds[$query.query_id]))
    continue
  }

  $hasSpawn = $spawnSummary | Where-Object { $_.QueryId -eq $query.query_id } | Select-Object -First 1
  if ($null -eq $hasSpawn) {
    $mermaidLines.Add(("  UA --> {0}" -f $queryNodeIds[$query.query_id]))
    $overviewLines.Add(("  UA --> {0}" -f $queryNodeIds[$query.query_id]))
  }
}

$content = New-Object System.Collections.Generic.List[string]
$content.Add("# Action Report")
$content.Add("")
$content.Add("This report is generated directly from the current .observability files and DuckDB facts. Copy either Mermaid block into Mermaid Live Editor to visualize the graph.")
$content.Add("")
$content.Add("## Basics")
$content.Add("")
$content.Add("- user_action_id: $UserActionId")
$content.Add("- UTC: $($action.started_at) -> $($action.ended_at)")
$content.Add("- Local: $(To-LocalDisplay $action.started_at) -> $(To-LocalDisplay $action.ended_at)")
$content.Add("- duration_ms: $($action.duration_ms)")
$content.Add("- query_count: $($action.query_count)")
$content.Add("- subagent_count: $($action.subagent_count)")
$content.Add("- tool_call_count: $($action.tool_call_count)")
$content.Add("- total_prompt_input_tokens: $($action.total_prompt_input_tokens)")
$content.Add("- total_billed_tokens: $($action.total_billed_tokens)")
$content.Add("- main_thread_total_prompt_input_tokens: $($action.main_thread_total_prompt_input_tokens)")
$content.Add("- subagent_total_prompt_input_tokens: $($action.subagent_total_prompt_input_tokens)")
$content.Add("")

if ($null -ne $integrity) {
  $content.Add("## Integrity Snapshot")
  $content.Add("")
  $content.Add("- strict_query_completion_rate: $($integrity.strict_query_completion_rate)")
  $content.Add("- inferred_query_completion_rate: $($integrity.inferred_query_completion_rate)")
  $content.Add("- strict_turn_state_closure_rate: $($integrity.strict_turn_state_closure_rate)")
  $content.Add("- tool_lifecycle_closure_rate: $($integrity.tool_lifecycle_closure_rate)")
  $content.Add("- subagent_lifecycle_closure_rate: $($integrity.subagent_lifecycle_closure_rate)")
  $content.Add("- orphan_event_rate: $($integrity.orphan_event_rate)")
  $content.Add("")
}

if ($queries.Count -eq 1) {
  $content.Add("## Summary")
  $content.Add("")
  $content.Add("This action expanded into a single query without extra branches.")
  $content.Add("")
} else {
  $content.Add("## Summary")
  $content.Add("")
  $content.Add("This action expanded into $($queries.Count) queries and $($subagents.Count) subagents.")
  $content.Add("")
}

$content.Add("## Diagram Reading Guide")
$content.Add("")
$content.Add("- Blue node: whole user action.")
$content.Add("- Green node: main-thread query.")
$content.Add("- Orange node: subagent query.")
$content.Add("- Dashed gray node: subagent spawn decision.")
$content.Add("- Red bordered turn: incomplete or suspicious closure state.")
$content.Add("- Node labels intentionally show only high-signal fields: turns/tools, billed tokens, duration, terminal state, and trigger detail.")
$content.Add("")

$content.Add("## Mermaid Overview")
$content.Add("")
$content.Add('```mermaid')
foreach ($line in $overviewLines) {
  $content.Add($line)
}
$content.Add('```')
$content.Add("")

$content.Add("## Mermaid Detailed DAG")
$content.Add("")
$content.Add('```mermaid')
foreach ($line in $mermaidLines) {
  $content.Add($line)
}
$content.Add('```')
$content.Add("")

$content.Add("## Query List")
$content.Add("")
foreach ($query in $queries) {
  $queryCost = $costByQuery[$query.query_id]
  $content.Add("### $($query.agent_name) $($query.query_id)")
  $content.Add("")
  $content.Add("- query_source: $($query.query_source)")
  $content.Add("- subagent_reason: $($query.subagent_reason)")
  $content.Add("- subagent_trigger_kind: $($query.subagent_trigger_kind)")
  $content.Add("- subagent_trigger_detail: $($query.subagent_trigger_detail)")
  $content.Add("- time: $(To-LocalDisplay $query.started_at) -> $(To-LocalDisplay $query.ended_at)")
  $content.Add("- turn_count: $($query.turn_count)")
  $content.Add("- max_loop_iter: $($query.query_max_loop_iter)")
  $content.Add("- tool_call_count: $($query.tool_call_count)")
  if ($null -ne $queryCost) {
    $content.Add("- total_prompt_input_tokens: $($queryCost.total_prompt_input_tokens)")
    $content.Add("- total_billed_tokens: $($queryCost.total_billed_tokens)")
  }
  $content.Add("- terminal_reason: $($query.terminal_reason)")
  $content.Add("- completeness: strict=$($query.strict_is_complete), inferred=$($query.inferred_is_complete)")
  $content.Add("")

  $queryTurns = @($turnsByQuery[$query.query_id] | Sort-Object started_at_ms)
  foreach ($turn in $queryTurns) {
    $toolKey = "$($turn.query_id)|$($turn.turn_id)"
    $toolLabel = if ($toolsByTurnKey.ContainsKey($toolKey)) { Get-ToolLabel $toolsByTurnKey[$toolKey] } else { "none" }
    $content.Add("- $($turn.turn_id): tools=$toolLabel, stop_reason=$($turn.stop_reason), transition_out=$($turn.transition_out), duration_ms=$($turn.duration_ms), strict_closed=$($turn.strict_is_closed)")
  }
  $content.Add("")
}

$content.Add("## Branch Points")
$content.Add("")
if ($spawnSummary.Count -eq 0) {
  $content.Add("- No subagent.spawned events were observed for this action.")
  $content.Add("")
} else {
  foreach ($spawn in $spawnSummary) {
    $childQuery = $queries | Where-Object { $_.query_id -eq $spawn.QueryId } | Select-Object -First 1
    $parentTurn = Find-MainTurnForSpawn -SpawnAtMs $spawn.SpawnedAtMs -TurnRows $mainTurns
    $parentText = if ($null -ne $parentTurn) {
      "attached after main-thread $($parentTurn.turn_id) by time inference"
    } else {
      "no parent turn inferred"
    }
    $content.Add("- $(To-LocalDisplay $spawn.SpawnedAt): spawn $($spawn.SubagentReason), trigger_kind=$($spawn.SubagentTriggerKind), trigger_detail=$($spawn.SubagentTriggerDetail), child_query=$($childQuery.query_id), $parentText")
  }
  $content.Add("")
}

$content.Add("## Reading SOP")
$content.Add("")
$content.Add("1. Find the target action in user_actions.")
$content.Add("2. Use queries to list all agents and branches under that action.")
$content.Add("3. Use turns to inspect loop count and turn termination.")
$content.Add("4. Use tools to inspect concrete tool calls per turn.")
$content.Add("5. Use events_raw for key events only: query.started, api.stream.completed, subagent.spawned, query.terminated.")
$content.Add("6. If you need content, follow snapshot refs into .observability/snapshots.")
$content.Add("")

function Write-ReportFile {
  param(
    [string]$Path,
    [System.Collections.Generic.List[string]]$Lines
  )

  [System.IO.Directory]::CreateDirectory((Split-Path -Parent $Path)) | Out-Null
  $Lines | Set-Content -LiteralPath $Path -Encoding utf8
}

try {
  Write-ReportFile -Path $OutputPath -Lines $content
} catch {
  if (-not $usedDefaultOutputPath) {
    throw
  }

  $fallbackOutputDir = Join-Path $repoRoot ".observability\action-reports"
  $OutputPath = Join-Path $fallbackOutputDir ("user_action_{0}_auto_report.md" -f (Short-Id $UserActionId))
  Write-Warning ("Default report directory is not writable; writing report to {0}" -f $OutputPath)
  Write-ReportFile -Path $OutputPath -Lines $content
}

Write-Output ("Generated report: {0}" -f $OutputPath)

if (-not [string]::IsNullOrWhiteSpace($snapshotPath) -and (Test-Path -LiteralPath $snapshotPath)) {
  Remove-Item -LiteralPath $snapshotPath -Force
}
