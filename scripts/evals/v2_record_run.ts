import { spawnSync } from 'node:child_process'
import { copyFile, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

import type {
  EvalRun,
  EvalRunBinding,
  EvalScenario,
  EvalScore,
  EvalVariant,
} from '../../src/observability/v2/evalTypes'
import { buildScoresForSpecIds } from './v2_score_registry'

type JsonRecord = Record<string, unknown>

const repoRoot = path.resolve(import.meta.dirname, '..', '..')
const evalRoot = path.join(repoRoot, 'tests', 'evals', 'v2')
const reportRoot = path.join(
  repoRoot,
  'ObservrityTask',
  '10-系统版本',
  'v2',
  '06-运行报告',
)
const duckdbExe = path.join(repoRoot, 'tools', 'duckdb', 'duckdb.exe')
const defaultDbPath = path.join(
  repoRoot,
  '.observability',
  'observability_v1.duckdb',
)

async function findChildDir(parent: string, matcher: (name: string) => boolean) {
  const entries = await readdir(parent, { withFileTypes: true })
  const found = entries.find(entry => entry.isDirectory() && matcher(entry.name))
  if (!found) throw new Error(`Directory not found under ${parent}`)
  return path.join(parent, found.name)
}

async function resolveReportRoot(): Promise<string> {
  void reportRoot
  const taskRoot = path.join(repoRoot, 'ObservrityTask')
  const versionsRoot = await findChildDir(taskRoot, name => name.startsWith('10-'))
  const v2Root = path.join(versionsRoot, 'v2')
  const reportDir = await findChildDir(v2Root, name => name.startsWith('06-'))
  return reportDir
}

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const result: Record<string, string | boolean> = {}
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (!arg.startsWith('--')) continue
    const key = arg.slice(2)
    const next = argv[i + 1]
    if (!next || next.startsWith('--')) {
      result[key] = true
    } else {
      result[key] = next
      i += 1
    }
  }
  return result
}

function sqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`
}

function sanitizeId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '')
}

function asNumber(value: unknown): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string' && value.trim() !== '') return Number(value)
  return 0
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function asBoolean(value: unknown): boolean {
  return value === true
}

function parseJsonRecord(value: unknown): JsonRecord | undefined {
  if (typeof value !== 'string' || value.trim() === '') return undefined
  try {
    const parsed = JSON.parse(value) as unknown
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as JsonRecord
    }
  } catch {
    return undefined
  }
  return undefined
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))]
}

function queryDuckDb<T extends JsonRecord>(
  dbPath: string,
  sql: string,
): T[] {
  const result = spawnSync(duckdbExe, ['-json', dbPath, sql], {
    cwd: repoRoot,
    encoding: 'utf8',
  })

  if (result.status !== 0) {
    const message =
      String(result.stderr ?? '').trim() ||
      String(result.stdout ?? '').trim() ||
      String(result.error?.message ?? '').trim()
    throw new Error(
      `DuckDB query failed. Close other DuckDB readers and retry. ${message}`,
    )
  }

  const output = String(result.stdout ?? '').trim()
  if (!output) return []
  return JSON.parse(output) as T[]
}

function relationExists(dbPath: string, relation: string): boolean {
  try {
    const rows = queryDuckDb<{ name?: string }>(dbPath, 'SHOW TABLES;')
    return rows.some(row => asString(row.name) === relation)
  } catch {
    return false
  }
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, 'utf8')) as T
}

async function resolveReadableDbPath(
  dbPath: string,
  useSnapshot: boolean,
): Promise<string> {
  if (!useSnapshot) return dbPath
  const snapshotDir = path.join(repoRoot, '.observability', 'v2-db-snapshots')
  await mkdir(snapshotDir, { recursive: true })
  const snapshotPath = path.join(
    snapshotDir,
    `observability_v1_${Date.now()}.duckdb`,
  )
  await copyFile(dbPath, snapshotPath)
  return snapshotPath
}

async function loadScenario(scenarioId: string): Promise<EvalScenario> {
  const directPath = path.join(evalRoot, 'scenarios', `${scenarioId}.json`)
  try {
    return await readJson<EvalScenario>(directPath)
  } catch {
    // The phase-one catalog stores scenario shells before full manifests exist.
  }

  const catalog = await readJson<{
    scenarios: Array<{ scenario_id: string; name: string; focus?: string[] }>
  }>(path.join(evalRoot, 'scenarios', 'first-batch-catalog.json'))
  const found = catalog.scenarios.find(s => s.scenario_id === scenarioId)
  if (!found) throw new Error(`Scenario not found: ${scenarioId}`)

  return {
    scenario_id: found.scenario_id,
    name: found.name,
    description: `Catalog scenario: ${found.name}`,
    input_prompt: '',
    tags: found.focus ?? [],
    expected_artifacts: [],
    expected_tools: [],
    expected_skills: [],
    expected_constraints: [],
    owner: 'local',
    status: 'draft',
  }
}

async function loadVariant(variantId: string): Promise<EvalVariant> {
  const directPath = path.join(evalRoot, 'variants', `${variantId}.json`)
  try {
    return await readJson<EvalVariant>(directPath)
  } catch {
    // Fall through to shipped templates and fixture variants.
  }

  const templatePath = path.join(evalRoot, 'variants', `${variantId}.template.json`)
  try {
    return await readJson<EvalVariant>(templatePath)
  } catch {
    // Fall through to the baseline template compatibility path.
  }

  const baseline = await readJson<EvalVariant>(
    path.join(evalRoot, 'variants', 'baseline.template.json'),
  )
  if (baseline.variant_id === variantId) return baseline
  throw new Error(`Variant not found: ${variantId}`)
}

function buildReport(params: {
  run: EvalRun
  scenario: EvalScenario
  variant: EvalVariant
  action: JsonRecord
  rootQuery: JsonRecord | undefined
  tools: JsonRecord[]
  subagents: JsonRecord[]
  recoveries: JsonRecord[]
  variantEffect: JsonRecord
  scores: EvalScore[]
}): string {
  const {
    run,
    scenario,
    variant,
    action,
    rootQuery,
    tools,
    subagents,
    recoveries,
    variantEffect,
    scores,
  } = params
  const toolSummary =
    tools.length === 0
      ? '- No tools observed'
      : tools
          .map(
            t =>
              `- ${asString(t.tool_name) || 'unknown'}: count=${asNumber(t.tool_count)}, closed=${asNumber(t.closed_count)}, failed=${asNumber(t.failed_count)}`,
          )
          .join('\n')
  const subagentSummary =
    subagents.length === 0
      ? '- No subagents observed'
      : subagents
          .map(
            s =>
              `- ${asString(s.subagent_reason) || 'unknown'}: count=${asNumber(s.subagent_count)}, trigger=${asString(s.subagent_trigger_detail) || 'unknown'}`,
          )
          .join('\n')
  const scoreSummary = scores
    .map(
      score =>
        `- ${score.dimension}.${score.subdimension}: ${score.score_label} (${score.score_value ?? 'n/a'})`,
    )
    .join('\n')
  const policySummary = variantEffect.observed_policy
    ? JSON.stringify(variantEffect.observed_policy, null, 2)
    : 'null'

  return `# V2 Run Report: ${run.run_id}

## 理解清单

- scenario: ${scenario.scenario_id} (${scenario.name})
- variant: ${variant.variant_id} (${variant.name})
- run_group_id: ${run.run_group_id ?? 'none'}
- repeat_index: ${run.repeat_index ?? 'none'}
- user_action_id: ${run.entry_user_action_id ?? 'unknown'}
- root_query_id: ${run.root_query_id ?? 'unknown'}
- observability_db_ref: ${run.observability_db_ref ?? 'unknown'}

## 预期效果

This report binds one V2 run back to V1 evidence, then emits phase-one rule and structure scores.

## 设计思路

The report does not judge final answer quality by itself. It records trace-backed facts that can support baseline vs candidate comparison.

## V1 Evidence

- binding_mode: ${run.binding?.binding_mode ?? 'unknown'}
- bind_passed: ${run.binding?.bind_passed ?? false}
- binding_failure_reason: ${run.binding?.binding_failure_reason ?? 'n/a'}
- started_at: ${asString(action.started_at)}
- duration_ms: ${asNumber(action.duration_ms)}
- query_count: ${asNumber(action.query_count)}
- subagent_count: ${asNumber(action.subagent_count)}
- tool_call_count: ${asNumber(action.tool_call_count)}
- total_prompt_input_tokens: ${asNumber(action.total_prompt_input_tokens)}
- total_billed_tokens: ${asNumber(action.total_billed_tokens)}
- root_turn_count: ${asNumber(rootQuery?.turn_count)}
- root_terminal_reason: ${asString(rootQuery?.terminal_reason)}
- recovery_count: ${recoveries.length}

## Tools

${toolSummary}

## Subagents

${subagentSummary}

## Variant Effect Evidence

- effect_type: ${asString(variantEffect.effect_type) || 'unknown'}
- policy_event_observed: ${asBoolean(variantEffect.policy_event_observed)}
- variant_effect_observed: ${asBoolean(variantEffect.variant_effect_observed)}
- session_memory_subagent_count: ${asNumber(variantEffect.session_memory_subagent_count)}
- session_memory_trigger_details: ${(variantEffect.session_memory_trigger_details as string[] | undefined)?.join(', ') || 'none'}
- reason: ${asString(variantEffect.reason) || 'n/a'}

### Observed Policy

\`\`\`json
${policySummary}
\`\`\`

## Scores

${scoreSummary}
`
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  const scenarioId = String(args.scenario ?? '')
  const variantId = String(args.variant ?? 'baseline_default')
  const runGroupId = String(args['run-group-id'] ?? '')
  const repeatIndex =
    args['repeat-index'] === undefined ? undefined : asNumber(args['repeat-index'])
  const sourceDbPath = String(args.db ?? defaultDbPath)
  const dbPath = await resolveReadableDbPath(
    sourceDbPath,
    Boolean(args['snapshot-db']),
  )
  const outputReportRoot = await resolveReportRoot()

  if (!scenarioId) {
    throw new Error('Missing required --scenario <scenario_id>')
  }

  const scenario = await loadScenario(scenarioId)
  const variant = await loadVariant(variantId)

  let userActionId = String(args['user-action-id'] ?? '')
  if (!userActionId || args.latest) {
    const latest = queryDuckDb<{ user_action_id: string }>(
      dbPath,
      'SELECT user_action_id FROM user_actions ORDER BY started_at DESC LIMIT 1;',
    )[0]
    if (!latest?.user_action_id) throw new Error('No user_actions found in V1 DB')
    userActionId = latest.user_action_id
  }

  const action = queryDuckDb<JsonRecord>(
    dbPath,
    `SELECT * FROM user_actions WHERE user_action_id = ${sqlString(userActionId)} LIMIT 1;`,
  )[0]
  if (!action) throw new Error(`user_action_id not found: ${userActionId}`)

  const rootQuery = queryDuckDb<JsonRecord>(
    dbPath,
    `SELECT * FROM queries WHERE user_action_id = ${sqlString(userActionId)} AND agent_name = 'main_thread' ORDER BY started_at ASC LIMIT 1;`,
  )[0]

  if (!rootQuery?.query_id) {
    throw new Error(
      `Fact-only binding failed: user_action_id=${userActionId} has no main_thread root query in V1 evidence. This run cannot enter formal score/compare/gate.`,
    )
  }

  const tools = queryDuckDb<JsonRecord>(
    dbPath,
    `SELECT tool_name, COUNT(*) AS tool_count, SUM(CASE WHEN is_closed THEN 1 ELSE 0 END) AS closed_count, SUM(CASE WHEN has_failed THEN 1 ELSE 0 END) AS failed_count FROM tools WHERE user_action_id = ${sqlString(userActionId)} GROUP BY 1 ORDER BY tool_count DESC;`,
  )
  const subagents = queryDuckDb<JsonRecord>(
    dbPath,
    `SELECT subagent_reason, subagent_trigger_kind, subagent_trigger_detail, COUNT(*) AS subagent_count, ROUND(AVG(duration_ms), 3) AS avg_duration_ms FROM subagents WHERE user_action_id = ${sqlString(userActionId)} GROUP BY 1, 2, 3 ORDER BY subagent_count DESC;`,
  )
  const recoveries = queryDuckDb<JsonRecord>(
    dbPath,
    `SELECT * FROM recoveries WHERE user_action_id = ${sqlString(userActionId)} AND event_name NOT LIKE 'stop_hooks.%' ORDER BY ts_wall ASC;`,
  )
  const integrity = queryDuckDb<JsonRecord>(
    dbPath,
    `SELECT * FROM metrics_integrity_daily WHERE event_date = ${sqlString(asString(action.event_date))} LIMIT 1;`,
  )[0]
  const sessionMemoryPolicyRow = relationExists(dbPath, 'events_raw')
    ? queryDuckDb<JsonRecord>(
        dbPath,
        `SELECT ts_wall, query_source, payload_json FROM events_raw WHERE user_action_id = ${sqlString(userActionId)} AND event_name = 'session_memory.policy.observed' ORDER BY ts_wall DESC LIMIT 1;`,
      )[0]
    : undefined
  const observedPolicy = parseJsonRecord(sessionMemoryPolicyRow?.payload_json)
  const sessionMemorySubagentRows = subagents.filter(
    subagent => asString(subagent.subagent_reason) === 'session_memory',
  )
  const sessionMemorySubagentCount = sessionMemorySubagentRows.reduce(
    (sum, subagent) => sum + asNumber(subagent.subagent_count),
    0,
  )
  const sessionMemoryTriggerDetails = uniqueStrings(
    sessionMemorySubagentRows.map(subagent =>
      asString(subagent.subagent_trigger_detail),
    ),
  )
  const variantEffect: JsonRecord = {
    effect_type: 'session_memory_policy',
    policy_event_observed: observedPolicy !== undefined,
    variant_effect_observed:
      variant.variant_id === 'candidate_session_memory_sparse'
        ? observedPolicy !== undefined &&
          (asString(observedPolicy.mode) === 'sparse' ||
            asBoolean(observedPolicy.natural_break_only))
        : observedPolicy !== undefined,
    observed_policy: observedPolicy ?? null,
    observed_at: asString(sessionMemoryPolicyRow?.ts_wall),
    observed_query_source: asString(sessionMemoryPolicyRow?.query_source),
    session_memory_subagent_count: sessionMemorySubagentCount,
    session_memory_trigger_details: sessionMemoryTriggerDetails,
    reason:
      observedPolicy !== undefined
        ? variant.variant_id === 'candidate_session_memory_sparse' &&
          !(
            asString(observedPolicy.mode) === 'sparse' ||
            asBoolean(observedPolicy.natural_break_only)
          )
          ? 'Session-memory policy was observed, but the candidate sparse policy markers were not present.'
          : 'Session-memory runtime policy was observed from V1 events.'
        : 'No session-memory policy observation event was found for this run.',
  }

  const runId = sanitizeId(
    `run_${new Date().toISOString().replaceAll(':', '').replaceAll('.', '')}_${scenario.scenario_id}_${variant.variant_id}_${userActionId.slice(0, 8)}`,
  )
  const binding: EvalRunBinding = {
    binding_mode: 'fact_only',
    entry_user_action_id: userActionId,
    root_query_id: asString(rootQuery.query_id),
    observability_db_ref: path.relative(repoRoot, sourceDbPath),
    bind_passed: true,
    binding_failure_reason: null,
  }
  const run: EvalRun = {
    run_id: runId,
    scenario_id: scenario.scenario_id,
    variant_id: variant.variant_id,
    ...(runGroupId ? { run_group_id: runGroupId } : {}),
    ...(repeatIndex !== undefined ? { repeat_index: repeatIndex } : {}),
    started_at: asString(action.started_at),
    ended_at: asString(action.ended_at),
    status: 'completed',
    entry_user_action_id: userActionId,
    root_query_id: binding.root_query_id,
    observability_db_ref: path.relative(repoRoot, sourceDbPath),
    binding,
    notes: 'Generated by scripts/evals/v2_record_run.ts',
  }

  const requestedScoreSpecIds = String(args['score-spec-ids'] ?? '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
  const scores = buildScoresForSpecIds({
    runId,
    scenario,
    action,
    rootQuery,
    integrity,
    tools,
    subagents,
    recoveries,
    variantEffect,
  }, requestedScoreSpecIds)

  const runsDir = path.join(evalRoot, 'runs')
  const scoresDir = path.join(evalRoot, 'scores')
  await mkdir(runsDir, { recursive: true })
  await mkdir(scoresDir, { recursive: true })
  await mkdir(outputReportRoot, { recursive: true })

  await writeFile(
    path.join(runsDir, `${runId}.json`),
    `${JSON.stringify({ run, binding, scenario, variant, evidence: { action, rootQuery, tools, subagents, recoveries }, variant_effect: variantEffect }, null, 2)}\n`,
  )
  await writeFile(
    path.join(scoresDir, `${runId}.scores.json`),
    `${JSON.stringify(scores, null, 2)}\n`,
  )
  await writeFile(
    path.join(outputReportRoot, `${runId}.md`),
    buildReport({
      run,
      scenario,
      variant,
      action,
      rootQuery,
      tools,
      subagents,
      recoveries,
      variantEffect,
      scores,
    }),
  )

  if (Boolean(args['snapshot-db']) && dbPath !== sourceDbPath) {
    await rm(dbPath, { force: true }).catch(() => undefined)
  }

  console.log(`Created V2 run: ${runId}`)
  console.log(`user_action_id: ${userActionId}`)
  console.log(
    `report: ${path.relative(repoRoot, path.join(outputReportRoot, `${runId}.md`))}`,
  )
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
