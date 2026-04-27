import { spawnSync } from 'node:child_process'
import { copyFile, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

import type {
  EvalRun,
  EvalScenario,
  EvalScore,
  EvalVariant,
} from '../../src/observability/v2/evalTypes'

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
    // Fall through to shipped templates.
  }

  const baseline = await readJson<EvalVariant>(
    path.join(evalRoot, 'variants', 'baseline.template.json'),
  )
  if (baseline.variant_id === variantId) return baseline
  throw new Error(`Variant not found: ${variantId}`)
}

function scoreLabel(value: number): string {
  if (value >= 1) return 'pass'
  if (value > 0) return 'partial'
  return 'fail'
}

function buildScores(params: {
  runId: string
  scenario: EvalScenario
  action: JsonRecord
  rootQuery: JsonRecord | undefined
  integrity: JsonRecord | undefined
  tools: JsonRecord[]
  subagents: JsonRecord[]
  recoveries: JsonRecord[]
}): EvalScore[] {
  const {
    runId,
    scenario,
    action,
    rootQuery,
    integrity,
    tools,
    subagents,
    recoveries,
  } = params

  const expectedTools = new Set(scenario.expected_tools)
  const observedTools = new Set(tools.map(t => asString(t.tool_name)))
  const expectedToolHitRate =
    expectedTools.size === 0
      ? null
      : [...expectedTools].filter(tool => observedTools.has(tool)).length /
        expectedTools.size

  const closureValues = [
    integrity?.strict_query_completion_rate,
    integrity?.strict_turn_state_closure_rate,
    integrity?.tool_lifecycle_closure_rate,
    integrity?.subagent_lifecycle_closure_rate,
  ].map(asNumber)
  const closureHealth =
    closureValues.length === 0
      ? 0
      : closureValues.reduce((sum, value) => sum + value, 0) /
        closureValues.length

  const maxTurnCount = asNumber(rootQuery?.turn_count)
  const turnLimit = scenario.max_turn_count ?? 8
  const maxTurnScore = maxTurnCount > 0 && maxTurnCount <= turnLimit ? 1 : 0
  const billedLimit = scenario.max_total_billed_tokens
  const billedTokens = asNumber(action.total_billed_tokens)
  const billedBudgetScore =
    billedLimit === undefined ? null : billedTokens <= billedLimit ? 1 : 0
  const subagentLimit = scenario.max_subagent_count
  const subagentCount = subagents.reduce(
    (sum, subagent) => sum + asNumber(subagent.subagent_count),
    0,
  )
  const subagentBudgetScore =
    subagentLimit === undefined ? null : subagentCount <= subagentLimit ? 1 : 0
  const recoveryScore = recoveries.length === 0 ? 1 : 0

  return [
    {
      score_id: `${runId}_task_success_main_chain_observed`,
      run_id: runId,
      dimension: 'task_success',
      subdimension: 'main_chain_observed',
      score_value: rootQuery ? 1 : 0,
      score_label: rootQuery ? 'pass' : 'fail',
      evidence_ref: 'queries',
      reason: rootQuery
        ? 'Main-thread root query is present in V1 evidence.'
        : 'No main-thread root query found for this user_action_id.',
    },
    {
      score_id: `${runId}_decision_quality_expected_tool_hit_rate`,
      run_id: runId,
      dimension: 'decision_quality',
      subdimension: 'expected_tool_hit_rate',
      score_value: expectedToolHitRate,
      score_label:
        expectedToolHitRate === null ? 'not_applicable' : scoreLabel(expectedToolHitRate),
      evidence_ref: 'tools',
      reason:
        expectedToolHitRate === null
          ? 'Scenario has no expected_tools yet.'
          : `Observed ${observedTools.size} tool names against ${expectedTools.size} expected tools.`,
    },
    {
      score_id: `${runId}_efficiency_total_billed_tokens`,
      run_id: runId,
      dimension: 'efficiency',
      subdimension: 'total_billed_tokens',
      score_value: asNumber(action.total_billed_tokens),
      score_label: 'observed',
      evidence_ref: 'user_actions.total_billed_tokens',
      reason: 'Raw efficiency fact from V1 user_actions.',
    },
    {
      score_id: `${runId}_efficiency_total_billed_token_budget`,
      run_id: runId,
      dimension: 'efficiency',
      subdimension: 'total_billed_token_budget',
      score_value: billedBudgetScore,
      score_label:
        billedBudgetScore === null ? 'not_applicable' : scoreLabel(billedBudgetScore),
      evidence_ref: 'user_actions.total_billed_tokens',
      reason:
        billedLimit === undefined
          ? 'Scenario has no max_total_billed_tokens budget.'
          : `total_billed_tokens=${billedTokens}; budget=${billedLimit}.`,
    },
    {
      score_id: `${runId}_stability_v1_closure_health`,
      run_id: runId,
      dimension: 'stability',
      subdimension: 'v1_closure_health',
      score_value: Number(closureHealth.toFixed(6)),
      score_label: scoreLabel(closureHealth),
      evidence_ref: 'metrics_integrity_daily',
      reason:
        'Average of query, turn, tool, and subagent closure rates for the action date.',
    },
    {
      score_id: `${runId}_stability_recovery_absence`,
      run_id: runId,
      dimension: 'stability',
      subdimension: 'recovery_absence',
      score_value: recoveryScore,
      score_label: scoreLabel(recoveryScore),
      evidence_ref: 'recoveries',
      reason:
        recoveries.length === 0
          ? 'No recovery events were observed for this action.'
          : `${recoveries.length} recovery events were observed for this action.`,
    },
    {
      score_id: `${runId}_controllability_turn_limit_basic`,
      run_id: runId,
      dimension: 'controllability',
      subdimension: 'turn_limit_basic',
      score_value: maxTurnScore,
      score_label: scoreLabel(maxTurnScore),
      evidence_ref: 'queries.turn_count',
      reason: `Root query turn_count=${maxTurnCount}; scenario limit is ${turnLimit}.`,
    },
    {
      score_id: `${runId}_decision_quality_subagent_count_observed`,
      run_id: runId,
      dimension: 'decision_quality',
      subdimension: 'subagent_count_observed',
      score_value: subagentCount,
      score_label: 'observed',
      evidence_ref: 'subagents',
      reason: 'Observed subagent count is a fact for later baseline vs candidate comparison.',
    },
    {
      score_id: `${runId}_controllability_subagent_count_budget`,
      run_id: runId,
      dimension: 'controllability',
      subdimension: 'subagent_count_budget',
      score_value: subagentBudgetScore,
      score_label:
        subagentBudgetScore === null
          ? 'not_applicable'
          : scoreLabel(subagentBudgetScore),
      evidence_ref: 'subagents',
      reason:
        subagentLimit === undefined
          ? 'Scenario has no max_subagent_count budget.'
          : `subagent_count=${subagentCount}; budget=${subagentLimit}.`,
    },
  ]
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

  return `# V2 Run Report: ${run.run_id}

## 理解清单

- scenario: ${scenario.scenario_id} (${scenario.name})
- variant: ${variant.variant_id} (${variant.name})
- user_action_id: ${run.entry_user_action_id ?? 'unknown'}
- root_query_id: ${run.root_query_id ?? 'unknown'}
- observability_db_ref: ${run.observability_db_ref ?? 'unknown'}

## 预期效果

This report binds one V2 run back to V1 evidence, then emits phase-one rule and structure scores.

## 设计思路

The report does not judge final answer quality by itself. It records trace-backed facts that can support baseline vs candidate comparison.

## V1 Evidence

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

## Scores

${scoreSummary}
`
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  const scenarioId = String(args.scenario ?? '')
  const variantId = String(args.variant ?? 'baseline_default')
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

  const runId = sanitizeId(
    `run_${new Date().toISOString().replaceAll(':', '').replaceAll('.', '')}_${scenario.scenario_id}_${variant.variant_id}_${userActionId.slice(0, 8)}`,
  )
  const run: EvalRun = {
    run_id: runId,
    scenario_id: scenario.scenario_id,
    variant_id: variant.variant_id,
    started_at: asString(action.started_at),
    ended_at: asString(action.ended_at),
    status: 'completed',
    entry_user_action_id: userActionId,
    root_query_id: asString(rootQuery?.query_id),
    observability_db_ref: path.relative(repoRoot, sourceDbPath),
    notes: 'Generated by scripts/evals/v2_record_run.ts',
  }

  const scores = buildScores({
    runId,
    scenario,
    action,
    rootQuery,
    integrity,
    tools,
    subagents,
    recoveries,
  })

  const runsDir = path.join(evalRoot, 'runs')
  const scoresDir = path.join(evalRoot, 'scores')
  await mkdir(runsDir, { recursive: true })
  await mkdir(scoresDir, { recursive: true })
  await mkdir(outputReportRoot, { recursive: true })

  await writeFile(
    path.join(runsDir, `${runId}.json`),
    `${JSON.stringify({ run, scenario, variant, evidence: { action, rootQuery, tools, subagents, recoveries } }, null, 2)}\n`,
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
