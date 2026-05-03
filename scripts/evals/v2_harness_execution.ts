import { spawnSync } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { existsSync, unlinkSync, writeFileSync } from 'node:fs'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import type { EvalScenario, EvalVariant } from '../../src/observability/v2/evalTypes'
import type { EvalExperimentExecutionConfig } from '../../src/observability/v2/evalExperimentTypes'

type JsonRecord = Record<string, unknown>

export interface EvalExecutionContext {
  experiment_id: string
  scenario_id: string
  variant_id: string
  benchmark_run_id: string
  eval_run_id: string
}

export interface HarnessExecutionAdapterInput {
  experimentId: string
  scenarioId: string
  variantId: string
  runId: string
  prompt: string
  timeoutMs: number
}

export interface HarnessExecutionAdapterOutput {
  status: 'completed' | 'failed' | 'timeout'
  entryUserActionId?: string
  stdoutRef?: string
  stderrRef?: string
  error?: string
}

export interface HarnessExecutionAdapter {
  execute(input: HarnessExecutionAdapterInput): Promise<HarnessExecutionAdapterOutput>
}

export interface CaptureResult {
  status: 'captured' | 'capture_failed' | 'ambiguous_capture'
  user_action_id?: string
  match_count: number
  error?: string
}

export interface VariantApplyResult {
  env: Record<string, string>
  cliArgs: string[]
  metadata: JsonRecord
}

export interface ExecuteHarnessResult {
  execution: HarnessExecutionAdapterOutput
  capture: CaptureResult
  variant_apply: VariantApplyResult
  benchmark_run_id: string
  eval_run_id: string
}

const repoRoot = path.resolve(import.meta.dirname, '..', '..')
const bunExe = process.execPath
const nodeExe = process.env.CLAUDE_CODE_NODE_EXE?.trim() || 'node.exe'
const duckdbExe = path.join(repoRoot, 'tools', 'duckdb', 'duckdb.exe')
const defaultDbPath = path.join(repoRoot, '.observability', 'observability_v1.duckdb')
const harnessRunsRoot = path.join(repoRoot, '.observability', 'v2h')
const windowsLauncherBridgePath = path.join(
  repoRoot,
  'scripts',
  'evals',
  'v2_windows_spawn_bridge.cjs',
)

function sqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`
}

function spawnDuckDb(args: string[]) {
  return spawnSync(duckdbExe, args, {
    cwd: repoRoot,
    encoding: 'utf8',
  })
}

function runDuckDbSql(dbPath: string, sql: string): void {
  const tempSqlPath = path.join(
    repoRoot,
    '.observability',
    `fixture_sql_${randomUUID()}.sql`,
  )
  const tempSqlRef = path.relative(repoRoot, tempSqlPath).split(path.sep).join('/')
  writeFileSync(tempSqlPath, `${sql}\n`, 'utf8')
  try {
    const result = spawnDuckDb([dbPath, `.read ${tempSqlRef}`])
    if (result.status !== 0) {
      throw new Error(
        String(result.stderr ?? '').trim() ||
          String(result.stdout ?? '').trim() ||
          String(result.error?.message ?? '').trim(),
      )
    }
  } finally {
    unlinkSync(tempSqlPath)
  }
}

function sanitizeId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '')
}

function artifactRunDirName(runId: string): string {
  return createHash('sha1').update(runId).digest('hex').slice(0, 16)
}

function evalAlias(prefix: string, value: string): string {
  const human = sanitizeId(value).slice(0, 12)
  const hash = createHash('sha1').update(value).digest('hex').slice(0, 8)
  return `${prefix}_${human}_${hash}`
}

function stringifyEnv(value: string | number | boolean): string {
  return typeof value === 'string' ? value : String(value)
}

function mergeEnvRecords(...records: Array<Record<string, string | number | boolean> | undefined>) {
  const env: Record<string, string> = {}
  for (const record of records) {
    for (const [key, value] of Object.entries(record ?? {})) {
      env[key] = stringifyEnv(value)
    }
  }
  return env
}

function spawnWithMergedEnv(
  command: string,
  args: string[],
  options: {
    cwd: string
    encoding: BufferEncoding
    timeout?: number
    env: Record<string, string>
    input?: string
  },
) {
  if (process.platform !== 'win32') {
    return spawnSync(command, args, {
      cwd: options.cwd,
      encoding: options.encoding,
      timeout: options.timeout,
      input: options.input,
      env: {
        ...process.env,
        ...options.env,
      },
    })
  }

  const previousValues = new Map<string, string | undefined>()
  for (const [key, value] of Object.entries(options.env)) {
    previousValues.set(key, process.env[key])
    process.env[key] = value
  }
  try {
    return spawnSync(command, args, {
      cwd: options.cwd,
      encoding: options.encoding,
      timeout: options.timeout,
      input: options.input,
    })
  } finally {
    for (const [key, previousValue] of previousValues.entries()) {
      if (previousValue === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = previousValue
      }
    }
  }
}

function featureGateEnvName(key: string): string {
  return `CLAUDE_CODE_FEATURE_${key.replace(/[^a-zA-Z0-9]+/g, '_').toUpperCase()}`
}

function queryDuckDb<T extends JsonRecord>(dbPath: string, sql: string): T[] {
  const result = spawnDuckDb(['-json', dbPath, sql])
  if (result.status !== 0) {
    const message =
      String(result.stderr ?? '').trim() ||
      String(result.stdout ?? '').trim() ||
      String(result.error?.message ?? '').trim()
    throw new Error(`DuckDB query failed: ${message}`)
  }
  const output = String(result.stdout ?? '').trim()
  return output ? (JSON.parse(output) as T[]) : []
}

function escapeSqlLiteral(value: string): string {
  return value.replaceAll("'", "''")
}

async function readJsonRecord(filePath: string): Promise<JsonRecord> {
  return JSON.parse(await readFile(filePath, 'utf8')) as JsonRecord
}

async function listJsonFiles(dir: string, recursive = false): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
  const files = entries
    .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
    .map(entry => path.join(dir, entry.name))
  if (!recursive) return files
  const nested = await Promise.all(
    entries
      .filter(entry => entry.isDirectory())
      .map(entry => listJsonFiles(path.join(dir, entry.name), true)),
  )
  return [...files, ...nested.flat()]
}

async function resolveScenarioManifestPath(scenarioId: string): Promise<string | undefined> {
  const directPath = path.join(repoRoot, 'tests', 'evals', 'v2', 'scenarios', `${scenarioId}.json`)
  if (existsSync(directPath)) return directPath
  const nestedFiles = await listJsonFiles(
    path.join(repoRoot, 'tests', 'evals', 'v2', 'scenarios'),
    true,
  )
  return nestedFiles.find(filePath => path.basename(filePath) === `${scenarioId}.json`)
}

function idsFromFixtureSection(payload: JsonRecord, key: string): string[] {
  const items = payload[key]
  if (!Array.isArray(items)) return []
  return items
    .map(item =>
      item && typeof item === 'object' && typeof (item as JsonRecord).id === 'string'
        ? String((item as JsonRecord).id)
        : item && typeof item === 'object' && typeof (item as JsonRecord)[`${key.slice(0, -1)}_id`] === 'string'
          ? String((item as JsonRecord)[`${key.slice(0, -1)}_id`])
          : null,
    )
    .filter((value): value is string => Boolean(value))
}

function takeAllButLast(values: string[]): string[] {
  return values.length <= 1 ? values : values.slice(0, -1)
}

function nonEmptyLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
}

function isBulletLine(line: string): boolean {
  return /^[-*]\s+/.test(line)
}

function parseCliPrintResultText(stdoutText: string): string | null {
  const trimmed = stdoutText.trim()
  if (!trimmed) return null

  const parseCandidate = (candidate: string): string | null => {
    try {
      const parsed = JSON.parse(candidate) as unknown
      if (
        parsed &&
        typeof parsed === 'object' &&
        !Array.isArray(parsed) &&
        typeof (parsed as JsonRecord).result === 'string'
      ) {
        return String((parsed as JsonRecord).result)
      }
    } catch {
      return null
    }
    return null
  }

  const direct = parseCandidate(trimmed)
  if (direct) return direct

  const lines = trimmed
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const fromLine = parseCandidate(lines[index])
    if (fromLine) return fromLine
  }

  return trimmed
}

function supportsRetainedConstraintId(constraintId: string): boolean {
  return ['four_bullets_only', 'read_only_task'].includes(constraintId)
}

function supportsRetrievedFactId(factId: string): boolean {
  return [
    'cli_entrypoint_cli_tsx',
    'capture_key_benchmark_run_id',
    'experiment_summary_dir',
  ].includes(factId)
}

function supportsConfusionId(confusionId: string): boolean {
  return [
    'old_entrypoint_main_tsx',
    'fake_capture_key_latest_action',
  ].includes(confusionId)
}

function evaluateRetainedConstraint(
  constraintId: string,
  answerText: string,
  answerLines: string[],
): boolean | null {
  const lower = answerText.toLowerCase()
  switch (constraintId) {
    case 'four_bullets_only':
      return answerLines.length === 4 && answerLines.every(isBulletLine)
    case 'read_only_task':
      return (
        lower.includes('read-only') ||
        lower.includes('read only') ||
        lower.includes('do not modify files') ||
        lower.includes('do not modify file')
      )
    default:
      return null
  }
}

function evaluateRetrievedFact(factId: string, answerText: string): boolean | null {
  switch (factId) {
    case 'cli_entrypoint_cli_tsx':
      return answerText.includes('src/entrypoints/cli.tsx')
    case 'capture_key_benchmark_run_id':
      return answerText.includes('benchmark_run_id')
    case 'experiment_summary_dir':
      return answerText.includes('tests/evals/v2/experiment-runs/')
    default:
      return null
  }
}

function evaluateForbiddenConfusion(confusionId: string, answerText: string): boolean | null {
  const lower = answerText.toLowerCase()
  switch (confusionId) {
    case 'old_entrypoint_main_tsx':
      return answerText.includes('src/main.tsx')
    case 'fake_capture_key_latest_action':
      return (
        /latest\s+user_action_id/i.test(answerText) ||
        /latest\s+action\s*id/i.test(answerText) ||
        lower.includes('latest action id')
      )
    default:
      return null
  }
}

async function buildLongContextRealOutputEvidence(params: {
  scenario: EvalScenario
  variantId: string
  stdoutRef: string
}): Promise<JsonRecord | null> {
  const profile = params.scenario.long_context_profile
  if (!profile) return null

  const stdoutPath = path.resolve(repoRoot, params.stdoutRef)
  const stdoutText = await readFile(stdoutPath, 'utf8')
  const answerText = parseCliPrintResultText(stdoutText)

  const payload: JsonRecord = {
    parser_version: 'candidate_long_context_output_parser_v0',
    parser_mode: 'real_smoke_rule_based',
    parser_status: answerText ? 'parsed' : 'unparsed',
    variant_id: params.variantId,
    observed_output_excerpt: answerText?.trim().slice(0, 240) ?? '',
    supported_constraint_ids: profile.expected_retained_constraints.filter(
      supportsRetainedConstraintId,
    ),
    supported_fact_ids: profile.expected_retrieved_facts.filter(supportsRetrievedFactId),
    supported_confusion_ids: profile.forbidden_confusions.filter(supportsConfusionId),
    manual_review_required: profile.manual_review_questions.length > 0,
  }

  if (!answerText) {
    return payload
  }

  const answerLines = nonEmptyLines(answerText)
  const observedRetainedConstraints: string[] = []
  const observedLostConstraints: string[] = []
  const observedRetrievedFacts: string[] = []
  const observedMissedFacts: string[] = []
  const observedConfusions: string[] = []

  for (const constraintId of profile.expected_retained_constraints) {
    const observed = evaluateRetainedConstraint(constraintId, answerText, answerLines)
    if (observed === true) observedRetainedConstraints.push(constraintId)
    if (observed === false) observedLostConstraints.push(constraintId)
  }

  for (const factId of profile.expected_retrieved_facts) {
    const observed = evaluateRetrievedFact(factId, answerText)
    if (observed === true) observedRetrievedFacts.push(factId)
    if (observed === false) observedMissedFacts.push(factId)
  }

  for (const confusionId of profile.forbidden_confusions) {
    const observed = evaluateForbiddenConfusion(confusionId, answerText)
    if (observed === true) observedConfusions.push(confusionId)
  }

  payload.observed_retained_constraints = observedRetainedConstraints
  payload.observed_lost_constraints = observedLostConstraints
  payload.observed_retrieved_facts = observedRetrievedFacts
  payload.observed_missed_facts = observedMissedFacts
  payload.observed_confusions = observedConfusions
  return payload
}

function upsertLongContextEvidence(params: {
  dbPath?: string
  userActionId: string
  scenarioId: string
  variantId: string
  payload: JsonRecord
}): void {
  const targetDbPath = params.dbPath ?? defaultDbPath
  runDuckDbSql(
    targetDbPath,
    [
      'CREATE TABLE IF NOT EXISTS long_context_evidence(user_action_id VARCHAR, scenario_id VARCHAR, variant_id VARCHAR, payload_json VARCHAR);',
      `DELETE FROM long_context_evidence WHERE user_action_id = ${sqlString(params.userActionId)};`,
      `INSERT INTO long_context_evidence VALUES (${sqlString(params.userActionId)}, ${sqlString(params.scenarioId)}, ${sqlString(params.variantId)}, ${sqlString(JSON.stringify(params.payload))});`,
    ].join('\n'),
  )
}

export async function buildLongContextFixtureEvidence(params: {
  scenarioId: string
  variantId: string
  env: Record<string, string>
}): Promise<{
  payload: JsonRecord
  tokenBase: number
  turnCount: number
  subagentCount: number
  toolCallCount: number
  events: Array<{ event_name: string; payload: JsonRecord }>
  } | null> {
  const manifestPath = await resolveScenarioManifestPath(params.scenarioId)
  if (!manifestPath) return null
  const scenario = await readJsonRecord(manifestPath) as EvalScenario
  const profile = scenario.long_context_profile
  if (!profile) return null

  const fixtureDir = path.resolve(repoRoot, profile.fixture_ref)
  const criticalFactsPayload = await readJsonRecord(path.join(fixtureDir, 'critical_facts.json'))
  const constraintsPayload = await readJsonRecord(path.join(fixtureDir, 'constraints.json'))
  const distractorsPayload = await readJsonRecord(path.join(fixtureDir, 'distractors.json'))
  const expectedOutput = await readFile(path.join(fixtureDir, 'expected_output.md'), 'utf8')
  const observedMode =
    params.env.V2_FIXTURE_VARIANT_KIND ??
    (params.variantId === 'baseline_default'
      ? 'baseline'
      : params.variantId.includes('guarded')
        ? 'long_context_guarded'
        : params.variantId.includes('sparse')
          ? 'sparse'
          : 'baseline')

  const expectedConstraints =
    profile.expected_retained_constraints.length > 0
      ? profile.expected_retained_constraints
      : idsFromFixtureSection(constraintsPayload, 'constraints')
  const expectedFacts =
    profile.expected_retrieved_facts.length > 0
      ? profile.expected_retrieved_facts
      : idsFromFixtureSection(criticalFactsPayload, 'facts')
  const distractorIds =
    profile.distractor_refs.length > 0
      ? profile.distractor_refs
      : idsFromFixtureSection(distractorsPayload, 'distractors')

  let observedRetainedConstraints = [...expectedConstraints]
  let observedLostConstraints: string[] = []
  let observedRetrievedFacts = [...expectedFacts]
  let observedMissedFacts: string[] = []
  let observedConfusions: string[] = []
  let compactionTriggerCount = 0
  let toolResultBudgetTriggerCount = 0
  let compactionSavedTokens = 0
  let tokenBase = 1180
  let turnCount = 3
  let subagentCount = 0
  let toolCallCount = 0
  let successUnderContextPressure = 1

  switch (profile.context_family) {
    case 'constraint_retention':
      tokenBase = observedMode === 'baseline' ? 1280 : 1090
      if (observedMode === 'baseline') {
        observedLostConstraints = expectedConstraints.length > 0 ? [expectedConstraints.at(-1) as string] : []
        observedRetainedConstraints = takeAllButLast(expectedConstraints)
      }
      break
    case 'retrieval':
      tokenBase = observedMode === 'baseline' ? 1360 : 1140
      if (observedMode === 'baseline') {
        observedMissedFacts = expectedFacts.length > 0 ? [expectedFacts.at(-1) as string] : []
        observedRetrievedFacts = takeAllButLast(expectedFacts)
      }
      break
    case 'distractor_resistance':
      tokenBase = observedMode === 'baseline' ? 1320 : 1120
      if (observedMode === 'baseline') {
        observedConfusions = distractorIds.slice(0, 1)
      }
      break
    case 'compaction_pressure':
      tokenBase = observedMode === 'baseline' ? 1640 : 1240
      turnCount = 5
      subagentCount = observedMode === 'baseline' ? 1 : 1
      toolCallCount = 2
      compactionTriggerCount = observedMode === 'baseline' ? 2 : 2
      toolResultBudgetTriggerCount = 1
      compactionSavedTokens = observedMode === 'baseline' ? 42 : 188
      if (observedMode === 'baseline') {
        observedLostConstraints = expectedConstraints.length > 0 ? [expectedConstraints.at(-1) as string] : []
        observedRetainedConstraints = takeAllButLast(expectedConstraints)
        observedMissedFacts = expectedFacts.length > 0 ? [expectedFacts.at(-1) as string] : []
        observedRetrievedFacts = takeAllButLast(expectedFacts)
        successUnderContextPressure = 0
      }
      break
  }

  if (observedMode !== 'baseline') {
    observedRetainedConstraints = [...expectedConstraints]
    observedLostConstraints = []
    observedRetrievedFacts = [...expectedFacts]
    observedMissedFacts = []
    observedConfusions = []
  }

  const payload: JsonRecord = {
    context_family: profile.context_family,
    context_size_class: profile.context_size_class,
    fixture_ref: profile.fixture_ref,
    expected_retained_constraints: expectedConstraints,
    expected_retrieved_facts: expectedFacts,
    distractor_refs: distractorIds,
    forbidden_confusions: profile.forbidden_confusions,
    manual_review_questions: profile.manual_review_questions,
    observed_retained_constraints: observedRetainedConstraints,
    observed_lost_constraints: observedLostConstraints,
    observed_retrieved_facts: observedRetrievedFacts,
    observed_missed_facts: observedMissedFacts,
    observed_confusions: observedConfusions,
    compaction_trigger_count: compactionTriggerCount,
    compaction_saved_tokens: compactionSavedTokens,
    tool_result_budget_trigger_count: toolResultBudgetTriggerCount,
    memory_or_subagent_count: subagentCount,
    success_under_context_pressure: successUnderContextPressure,
    manual_review_required: profile.manual_review_questions.length > 0,
    expected_output_excerpt: expectedOutput.trim().slice(0, 240),
    observed_mode: observedMode,
  }

  const events: Array<{ event_name: string; payload: JsonRecord }> = []
  for (let index = 0; index < compactionTriggerCount; index += 1) {
    events.push({
      event_name: index === 0 ? 'messages.compact_boundary.applied' : 'messages.microcompact.applied',
      payload: {
        tokens_saved:
          compactionTriggerCount <= 1
            ? compactionSavedTokens
            : Math.floor(compactionSavedTokens / compactionTriggerCount),
      },
    })
  }
  for (let index = 0; index < toolResultBudgetTriggerCount; index += 1) {
    events.push({
      event_name: 'messages.tool_result_budget.applied',
      payload: {
        tokens_saved: 0,
      },
    })
  }

  return {
    payload,
    tokenBase,
    turnCount,
    subagentCount,
    toolCallCount,
    events,
  }
}

async function runFixtureEmitterViaBridge(params: {
  env: Record<string, string>
  runDir: string
  timeoutMs: number
}): Promise<{
  status: HarnessExecutionAdapterOutput['status']
  stdoutRef: string
  stderrRef: string
  error?: string
}> {
  const stdoutPath = path.join(params.runDir, 'stdout.txt')
  const stderrPath = path.join(params.runDir, 'stderr.txt')
  const commandPath = path.join(params.runDir, 'command.json')
  const launcherRequestPath = path.join(params.runDir, 'launcher-request.json')
  const launcherResultPath = path.join(params.runDir, 'launcher-result.json')
  const command = bunExe
  const args = ['run', 'scripts/evals/v2_emit_fixture_trace.ts']

  await writeFile(
    commandPath,
    `${JSON.stringify(
      {
        adapter: 'fixture_trace',
        transport: 'external_emitter',
        command,
        args,
        launcher_bridge_ref: path.relative(repoRoot, windowsLauncherBridgePath),
        launcher_request_ref: path.relative(repoRoot, launcherRequestPath),
        timeout_ms: params.timeoutMs,
        env_keys: Object.keys(params.env).sort(),
      },
      null,
      2,
    )}\n`,
    'utf8',
  )
  await writeFile(
    launcherRequestPath,
    `${JSON.stringify(
      {
        command,
        args,
        cwd: repoRoot,
        env: params.env,
        timeout_ms: params.timeoutMs,
      },
      null,
      2,
    )}\n`,
    'utf8',
  )

  const bridgeResult = spawnSync(
    nodeExe,
    [windowsLauncherBridgePath, '--request', launcherRequestPath, '--result', launcherResultPath],
    {
      cwd: repoRoot,
      encoding: 'utf8',
      timeout: params.timeoutMs + 10_000,
    },
  )

  let stdoutText = ''
  let stderrText = ''
  let status: HarnessExecutionAdapterOutput['status'] = 'completed'
  let errorText = ''

  if (bridgeResult.status !== 0 && !existsSync(launcherResultPath)) {
    stdoutText = String(bridgeResult.stdout ?? '')
    stderrText = String(bridgeResult.stderr ?? bridgeResult.error?.message ?? '')
    errorText =
      stderrText.trim() ||
      stdoutText.trim() ||
      `fixture emitter bridge exited with status ${bridgeResult.status}`
    status = bridgeResult.error?.name === 'ETIMEDOUT' ? 'timeout' : 'failed'
  } else {
    const launcherPayload = JSON.parse(await readFile(launcherResultPath, 'utf8')) as {
      child_status?: number | null
      stdout?: string
      stderr?: string
      error_name?: string | null
      error_message?: string | null
      timed_out?: boolean
      signal?: string | null
    }
    stdoutText = String(launcherPayload.stdout ?? '')
    stderrText = String(launcherPayload.stderr ?? launcherPayload.error_message ?? '')
    if (launcherPayload.timed_out) {
      status = 'timeout'
      errorText = launcherPayload.error_message ?? 'fixture emitter bridge timed out'
    } else if ((launcherPayload.child_status ?? 0) !== 0) {
      status = 'failed'
      errorText =
        String(launcherPayload.stderr ?? '').trim() ||
        String(launcherPayload.stdout ?? '').trim() ||
        String(launcherPayload.error_message ?? '').trim() ||
        (launcherPayload.signal
          ? `fixture emitter terminated by signal ${launcherPayload.signal}`
          : `fixture emitter exited with status ${launcherPayload.child_status}`)
    }
  }

  await writeFile(stdoutPath, stdoutText, 'utf8')
  await writeFile(stderrPath, stderrText, 'utf8')
  return {
    status,
    stdoutRef: path.relative(repoRoot, stdoutPath),
    stderrRef: path.relative(repoRoot, stderrPath),
    error: errorText || undefined,
  }
}

function relationColumns(dbPath: string, relation: string): string[] {
  const rows = queryDuckDb<{ name?: string }>(
    dbPath,
    `PRAGMA table_info('${escapeSqlLiteral(relation)}');`,
  )
  return rows
    .map(row => (typeof row.name === 'string' ? row.name : null))
    .filter((value): value is string => Boolean(value))
}

function hasRelationColumn(dbPath: string, relation: string, column: string): boolean {
  return relationColumns(dbPath, relation).includes(column)
}

export function buildEvalContextEnv(context: EvalExecutionContext): Record<string, string> {
  return {
    CLAUDE_CODE_EVAL_EXPERIMENT_ID: evalAlias('exp', context.experiment_id),
    CLAUDE_CODE_EVAL_SCENARIO_ID: evalAlias('scn', context.scenario_id),
    CLAUDE_CODE_EVAL_VARIANT_ID: evalAlias('var', context.variant_id),
    CLAUDE_CODE_EVAL_EXPERIMENT_LABEL: context.experiment_id,
    CLAUDE_CODE_EVAL_SCENARIO_LABEL: context.scenario_id,
    CLAUDE_CODE_EVAL_VARIANT_LABEL: context.variant_id,
    CLAUDE_CODE_EVAL_BENCHMARK_RUN_ID: context.benchmark_run_id,
    CLAUDE_CODE_EVAL_RUN_ID: context.eval_run_id,
  }
}

export function isExecuteHarnessDisabled(args: Record<string, string | boolean>): boolean {
  return (
    Boolean(args['disable-execute-harness']) ||
    process.env.V2_2_EXECUTE_HARNESS === '0' ||
    process.env.V2_EXECUTE_HARNESS === '0'
  )
}

export function createRunIdentity(params: {
  experimentId: string
  scenarioId: string
  variantId: string
  stamp: string
  repeatIndex?: number
}): { eval_run_id: string; benchmark_run_id: string } {
  const repeatPart =
    typeof params.repeatIndex === 'number' ? `_repeat_${params.repeatIndex}` : ''
  const base = `${params.experimentId}_${params.scenarioId}_${params.variantId}${repeatPart}_${params.stamp}`
  const humanPrefix = sanitizeId(
    `${params.experimentId.slice(0, 20)}_${params.scenarioId.slice(0, 20)}_${params.variantId.slice(0, 20)}${repeatPart}`,
  )
  const hash = createHash('sha1').update(base).digest('hex').slice(0, 12)
  const identity = `${humanPrefix}_${hash}`
  return {
    eval_run_id: `eval_${identity}`,
    benchmark_run_id: `bench_${identity}`,
  }
}

export function applyVariantV0(params: {
  variant: EvalVariant
  execution?: EvalExperimentExecutionConfig
  context: EvalExecutionContext
}): VariantApplyResult {
  const { variant, execution, context } = params
  const featureGateEnv = Object.fromEntries(
    Object.entries(variant.feature_gates ?? {}).map(([key, value]) => [
      featureGateEnvName(key),
      stringifyEnv(value),
    ]),
  )
  const env = {
    ...buildEvalContextEnv(context),
    ...mergeEnvRecords(execution?.env, variant.env_overrides),
    ...featureGateEnv,
  }
  const cliArgs: string[] = []
  const maxTurns = variant.model_config?.max_turns ?? execution?.max_turns
  if (variant.model_config?.model) cliArgs.push('--model', variant.model_config.model)
  if (variant.model_config?.thinking) cliArgs.push('--thinking', variant.model_config.thinking)
  if (typeof maxTurns === 'number') cliArgs.push('--max-turns', String(maxTurns))
  if (typeof variant.model_config?.max_budget_usd === 'number') {
    cliArgs.push('--max-budget-usd', String(variant.model_config.max_budget_usd))
  }

  if (variant.config_snapshot_ref) {
    env.CLAUDE_CODE_EVAL_CONFIG_SNAPSHOT_REF = variant.config_snapshot_ref
  }
  if (execution?.require_config_snapshot && variant.config_snapshot_ref) {
    const candidatePath = path.resolve(repoRoot, variant.config_snapshot_ref)
    if (!existsSync(candidatePath)) {
      throw new Error(
        `Variant apply failed: config_snapshot_ref does not exist: ${variant.config_snapshot_ref}`,
      )
    }
  }

  return {
    env,
    cliArgs,
    metadata: {
      supported_variant_fields: [
        'env_overrides',
        'config_snapshot_ref',
        'model_config',
        'feature_gates',
      ],
      config_snapshot_ref: variant.config_snapshot_ref ?? null,
      feature_gate_count: Object.keys(variant.feature_gates ?? {}).length,
      env_override_count: Object.keys(variant.env_overrides ?? {}).length,
      model_config: variant.model_config ?? null,
    },
  }
}

function expandTemplateArgs(args: string[], input: HarnessExecutionAdapterInput): string[] {
  return args.map(arg =>
    arg
      .replaceAll('{prompt}', input.prompt)
      .replaceAll('{runId}', input.runId)
      .replaceAll('{experimentId}', input.experimentId)
      .replaceAll('{scenarioId}', input.scenarioId)
      .replaceAll('{variantId}', input.variantId),
  )
}

export class DisabledHarnessExecutionAdapter implements HarnessExecutionAdapter {
  async execute(): Promise<HarnessExecutionAdapterOutput> {
    return {
      status: 'failed',
      error:
        'execute_harness adapter is disabled. Use bind_existing or remove --disable-execute-harness/V2_2_EXECUTE_HARNESS=0.',
    }
  }
}

export class CliPrintHarnessExecutionAdapter implements HarnessExecutionAdapter {
  constructor(
    private readonly options: {
      execution?: EvalExperimentExecutionConfig
      env: Record<string, string>
      cliArgs: string[]
    },
  ) {}

  async execute(input: HarnessExecutionAdapterInput): Promise<HarnessExecutionAdapterOutput> {
    const runDir = path.join(harnessRunsRoot, artifactRunDirName(input.runId))
    await mkdir(runDir, { recursive: true })
    const stdoutPath = path.join(runDir, 'stdout.txt')
    const stderrPath = path.join(runDir, 'stderr.txt')
    const commandPath = path.join(runDir, 'command.json')
    const promptPath = path.join(runDir, 'prompt.txt')
    const launcherRequestPath = path.join(runDir, 'launcher-request.json')
    const launcherResultPath = path.join(runDir, 'launcher-result.json')
    const command = this.options.execution?.command ?? bunExe
    const defaultArgs = [
      'run',
      'src/entrypoints/cli.tsx',
      '--print',
      '--output-format',
      'json',
      ...this.options.cliArgs,
    ]
    const args = this.options.execution?.args
      ? expandTemplateArgs(this.options.execution.args, input)
      : defaultArgs
    const promptViaStdin = !this.options.execution?.args
    if (promptViaStdin) {
      await writeFile(promptPath, input.prompt, 'utf8')
    }
    if (process.platform === 'win32') {
      await writeFile(
        launcherRequestPath,
        `${JSON.stringify(
          {
            command,
            args,
            cwd: repoRoot,
            env: this.options.env,
            timeout_ms: input.timeoutMs,
            stdin_text: promptViaStdin ? input.prompt : undefined,
          },
          null,
          2,
        )}\n`,
        'utf8',
      )
    }

    await writeFile(
      commandPath,
      `${JSON.stringify(
        {
          command,
          args,
          prompt_transport: promptViaStdin ? 'stdin' : 'arg_template',
          prompt_ref: promptViaStdin ? path.relative(repoRoot, promptPath) : null,
          launcher_bridge_ref:
            process.platform === 'win32'
              ? path.relative(repoRoot, windowsLauncherBridgePath)
              : null,
          launcher_request_ref:
            process.platform === 'win32'
              ? path.relative(repoRoot, launcherRequestPath)
              : null,
          timeout_ms: input.timeoutMs,
          env_keys: Object.keys(this.options.env).sort(),
        },
        null,
        2,
      )}\n`,
      'utf8',
    )

    let status: HarnessExecutionAdapterOutput['status'] = 'completed'
    let stdoutText = ''
    let stderrText = ''
    let errorText = ''

    if (process.platform === 'win32') {
      const bridgeResult = spawnSync(
        nodeExe,
        [windowsLauncherBridgePath, '--request', launcherRequestPath, '--result', launcherResultPath],
        {
          cwd: repoRoot,
          encoding: 'utf8',
          timeout: input.timeoutMs + 10_000,
        },
      )
      if (bridgeResult.status !== 0 && !existsSync(launcherResultPath)) {
        stdoutText = String(bridgeResult.stdout ?? '')
        stderrText = String(bridgeResult.stderr ?? bridgeResult.error?.message ?? '')
        errorText =
          stderrText.trim() ||
          stdoutText.trim() ||
          `Windows launcher bridge exited with status ${bridgeResult.status}`
        status = bridgeResult.error?.name === 'ETIMEDOUT' ? 'timeout' : 'failed'
      } else {
        const launcherPayload = JSON.parse(await readFile(launcherResultPath, 'utf8')) as {
          child_status?: number | null
          stdout?: string
          stderr?: string
          error_name?: string | null
          error_message?: string | null
          timed_out?: boolean
          signal?: string | null
        }
        stdoutText = String(launcherPayload.stdout ?? '')
        stderrText = String(launcherPayload.stderr ?? launcherPayload.error_message ?? '')
        if (launcherPayload.timed_out) {
          status = 'timeout'
          errorText = launcherPayload.error_message ?? 'Windows launcher bridge timed out'
        } else if ((launcherPayload.child_status ?? 0) !== 0) {
          status = 'failed'
          errorText =
            String(launcherPayload.stderr ?? '').trim() ||
            String(launcherPayload.stdout ?? '').trim() ||
            String(launcherPayload.error_message ?? '').trim() ||
            (launcherPayload.signal
              ? `command terminated by signal ${launcherPayload.signal}`
              : `command exited with status ${launcherPayload.child_status}`)
        }
      }
    } else {
      const result = spawnWithMergedEnv(command, args, {
        cwd: repoRoot,
        encoding: 'utf8',
        timeout: input.timeoutMs,
        env: this.options.env,
        input: promptViaStdin ? input.prompt : undefined,
      })
      stdoutText = String(result.stdout ?? '')
      stderrText = String(result.stderr ?? result.error?.message ?? '')
      if (result.error && result.error.name === 'ETIMEDOUT') {
        status = 'timeout'
        errorText = result.error.message
      } else if (result.status !== 0) {
        status = 'failed'
        errorText =
          String(result.stderr ?? '').trim() ||
          String(result.stdout ?? '').trim() ||
          String(result.error?.message ?? '').trim() ||
          `command exited with status ${result.status}`
      }
    }

    await writeFile(stdoutPath, stdoutText, 'utf8')
    await writeFile(stderrPath, stderrText, 'utf8')

    const stdoutRef = path.relative(repoRoot, stdoutPath)
    const stderrRef = path.relative(repoRoot, stderrPath)
    if (status === 'timeout') {
      return {
        status: 'timeout',
        stdoutRef,
        stderrRef,
        error: errorText,
      }
    }
    if (status === 'failed') {
      return {
        status: 'failed',
        stdoutRef,
        stderrRef,
        error: errorText,
      }
    }
    return {
      status: 'completed',
      stdoutRef,
      stderrRef,
    }
  }
}

export class FixtureTraceHarnessExecutionAdapter implements HarnessExecutionAdapter {
  constructor(
    private readonly options: {
      execution?: EvalExperimentExecutionConfig
      env: Record<string, string>
    },
  ) {}

  async execute(input: HarnessExecutionAdapterInput): Promise<HarnessExecutionAdapterOutput> {
    const runDir = path.join(harnessRunsRoot, artifactRunDirName(input.runId))
    await mkdir(runDir, { recursive: true })
    const stdoutPath = path.join(runDir, 'stdout.txt')
    const stderrPath = path.join(runDir, 'stderr.txt')
    const commandPath = path.join(runDir, 'command.json')
    const dbPath = path.resolve(
      repoRoot,
      this.options.execution?.db_path ??
        this.options.env.V2_FIXTURE_DB_PATH ??
        path.join('.observability', 'v2-fixture-trace.duckdb'),
    )

    await writeFile(
      commandPath,
      `${JSON.stringify(
        {
          adapter: 'fixture_trace',
          db_path: path.relative(repoRoot, dbPath),
          timeout_ms: input.timeoutMs,
          env_keys: Object.keys(this.options.env).sort(),
        },
        null,
        2,
      )}\n`,
      'utf8',
    )

    if (this.options.env.V2_FIXTURE_FAIL_VARIANT === input.variantId) {
      const message = `Fixture requested failure for variant ${input.variantId}`
      await writeFile(stdoutPath, '', 'utf8')
      await writeFile(stderrPath, message, 'utf8')
      return {
        status: 'failed',
        stdoutRef: path.relative(repoRoot, stdoutPath),
        stderrRef: path.relative(repoRoot, stderrPath),
        error: message,
      }
    }

    if (process.platform === 'win32') {
      return runFixtureEmitterViaBridge({
        env: this.options.env,
        runDir,
        timeoutMs: input.timeoutMs,
      })
    }

    const now = new Date()
    const endedAt = new Date(now.getTime() + 10).toISOString()
    const userActionId = randomUUID()
    const queryId = randomUUID()
    const benchmarkRunId = this.options.env.CLAUDE_CODE_EVAL_BENCHMARK_RUN_ID
    const evalRunId = this.options.env.CLAUDE_CODE_EVAL_RUN_ID
    const experimentId =
      this.options.env.CLAUDE_CODE_EVAL_EXPERIMENT_LABEL ?? input.experimentId
    const scenarioId = this.options.env.CLAUDE_CODE_EVAL_SCENARIO_LABEL ?? input.scenarioId
    const variantId = this.options.env.CLAUDE_CODE_EVAL_VARIANT_LABEL ?? input.variantId
    const longContextFixture = await buildLongContextFixtureEvidence({
      scenarioId,
      variantId,
      env: this.options.env,
    })
    const tokenBase =
      longContextFixture?.tokenBase ??
      (input.variantId === 'baseline_default'
        ? 110
        : input.variantId.includes('sparse')
          ? 100
          : 105)
    const turnCount = longContextFixture?.turnCount ?? 1
    const subagentCount = longContextFixture?.subagentCount ?? 0
    const toolCallCount = longContextFixture?.toolCallCount ?? 0

    const sql = [
      'CREATE TABLE IF NOT EXISTS user_actions(event_date VARCHAR, user_action_id VARCHAR, started_at VARCHAR, started_at_ms BIGINT, ended_at VARCHAR, ended_at_ms BIGINT, duration_ms BIGINT, event_count BIGINT, query_count BIGINT, main_thread_query_count BIGINT, subagent_query_count BIGINT, subagent_count BIGINT, tool_call_count BIGINT, experiment_id VARCHAR, scenario_id VARCHAR, variant_id VARCHAR, benchmark_run_id VARCHAR, eval_run_id VARCHAR, raw_input_tokens BIGINT, output_tokens BIGINT, cache_read_tokens BIGINT, cache_create_tokens BIGINT, total_prompt_input_tokens BIGINT, total_billed_tokens BIGINT, main_thread_total_prompt_input_tokens BIGINT, subagent_total_prompt_input_tokens BIGINT);',
      'CREATE TABLE IF NOT EXISTS queries(query_id VARCHAR, user_action_id VARCHAR, agent_name VARCHAR, started_at VARCHAR, turn_count BIGINT, terminal_reason VARCHAR);',
      'CREATE TABLE IF NOT EXISTS tools(user_action_id VARCHAR, tool_name VARCHAR, is_closed BOOLEAN, has_failed BOOLEAN);',
      'CREATE TABLE IF NOT EXISTS subagents(user_action_id VARCHAR, subagent_reason VARCHAR, subagent_trigger_kind VARCHAR, subagent_trigger_detail VARCHAR, duration_ms BIGINT);',
      'CREATE TABLE IF NOT EXISTS recoveries(user_action_id VARCHAR, event_name VARCHAR, ts_wall VARCHAR);',
      'CREATE TABLE IF NOT EXISTS metrics_integrity_daily(event_date VARCHAR, strict_query_completion_rate DOUBLE, strict_turn_state_closure_rate DOUBLE, tool_lifecycle_closure_rate DOUBLE, subagent_lifecycle_closure_rate DOUBLE);',
      'CREATE TABLE IF NOT EXISTS events_raw(user_action_id VARCHAR, event_name VARCHAR, ts_wall VARCHAR, query_source VARCHAR, payload_json VARCHAR);',
      `INSERT INTO user_actions VALUES (${sqlString(now.toISOString().slice(0, 10))}, ${sqlString(userActionId)}, ${sqlString(now.toISOString())}, 0, ${sqlString(endedAt)}, 10, 10, 2, 1, 1, 0, ${subagentCount}, ${toolCallCount}, ${sqlString(experimentId)}, ${sqlString(scenarioId)}, ${sqlString(variantId)}, ${sqlString(benchmarkRunId)}, ${sqlString(evalRunId)}, ${tokenBase - 10}, 10, 0, 0, ${tokenBase - 10}, ${tokenBase}, ${tokenBase - 10}, 0);`,
      `INSERT INTO queries VALUES (${sqlString(queryId)}, ${sqlString(userActionId)}, 'main_thread', ${sqlString(now.toISOString())}, ${turnCount}, 'fixture_completed');`,
      `INSERT INTO metrics_integrity_daily VALUES (${sqlString(now.toISOString().slice(0, 10))}, 1, 1, 1, 1);`,
      ...Array.from({ length: toolCallCount }, (_, index) =>
        `INSERT INTO tools VALUES (${sqlString(userActionId)}, ${sqlString(index === 0 ? 'Read' : 'Search')}, true, false);`,
      ),
      ...Array.from({ length: subagentCount }, () =>
        `INSERT INTO subagents VALUES (${sqlString(userActionId)}, 'session_memory', 'context_pressure', ${sqlString(scenarioId)}, 12);`,
      ),
      ...(longContextFixture?.events ?? []).map((event, index) =>
        `INSERT INTO events_raw VALUES (${sqlString(userActionId)}, ${sqlString(event.event_name)}, ${sqlString(new Date(now.getTime() + index + 1).toISOString())}, 'main_thread', ${sqlString(JSON.stringify(event.payload))});`,
      ),
    ].join('\n')

    try {
      runDuckDbSql(dbPath, sql)
      if (longContextFixture) {
        upsertLongContextEvidence({
          dbPath,
          userActionId,
          scenarioId,
          variantId,
          payload: longContextFixture.payload,
        })
      }
      await writeFile(stdoutPath, `fixture_user_action_id=${userActionId}\n`, 'utf8')
      await writeFile(stderrPath, '', 'utf8')
      return {
        status: 'completed',
        stdoutRef: path.relative(repoRoot, stdoutPath),
        stderrRef: path.relative(repoRoot, stderrPath),
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      await writeFile(stdoutPath, '', 'utf8')
      await writeFile(stderrPath, message, 'utf8')
      return {
        status: 'failed',
        stdoutRef: path.relative(repoRoot, stdoutPath),
        stderrRef: path.relative(repoRoot, stderrPath),
        error: message,
      }
    }
  }
}

export function createHarnessExecutionAdapter(params: {
  execution?: EvalExperimentExecutionConfig
  env: Record<string, string>
  cliArgs: string[]
}): HarnessExecutionAdapter {
  const adapter = params.execution?.adapter ?? 'cli_print'
  if (adapter === 'disabled') return new DisabledHarnessExecutionAdapter()
  if (adapter === 'cli_print') return new CliPrintHarnessExecutionAdapter(params)
  if (adapter === 'fixture_trace') return new FixtureTraceHarnessExecutionAdapter(params)
  throw new Error(`Unsupported execute_harness adapter: ${adapter}`)
}

export function rebuildObservabilityDb(dbPath?: string): void {
  const args = ['run', 'scripts/observability/build_duckdb_etl.ts']
  if (dbPath) args.push('--db-path', dbPath)
  const result = spawnSync(bunExe, args, {
    cwd: repoRoot,
    encoding: 'utf8',
  })
  if (result.status !== 0) {
    const message =
      String(result.stderr ?? '').trim() ||
      String(result.stdout ?? '').trim() ||
      String(result.error?.message ?? '').trim()
    throw new Error(`Failed to rebuild V1 observability DB before capture: ${message}`)
  }
}

export function captureUserActionByBenchmarkRunId(params: {
  benchmarkRunId: string
  dbPath?: string
}): CaptureResult {
  try {
    const captureDbPath = params.dbPath ?? defaultDbPath
    if (!hasRelationColumn(captureDbPath, 'user_actions', 'benchmark_run_id')) {
      return {
        status: 'capture_failed',
        match_count: 0,
        error: [
          `user_actions is missing benchmark_run_id in ${captureDbPath}.`,
          'The V1 DuckDB schema is stale and was not rebuilt with the current ETL.',
          'Run bun run scripts/observability/build_duckdb_etl.ts and retry.',
        ].join(' '),
      }
    }
    const rows = queryDuckDb<{ user_action_id: string }>(
      captureDbPath,
      [
        'SELECT DISTINCT user_action_id',
        'FROM user_actions',
        `WHERE benchmark_run_id = ${sqlString(params.benchmarkRunId)}`,
        "  AND TRIM(COALESCE(user_action_id, '')) <> ''",
        'ORDER BY user_action_id;',
      ].join(' '),
    )
    if (rows.length === 0) {
      return {
        status: 'capture_failed',
        match_count: 0,
        error: `No user_action_id found for benchmark_run_id=${params.benchmarkRunId}`,
      }
    }
    if (rows.length > 1) {
      return {
        status: 'ambiguous_capture',
        match_count: rows.length,
        error: `Multiple user_action_id values found for benchmark_run_id=${params.benchmarkRunId}`,
      }
    }
    return {
      status: 'captured',
      user_action_id: rows[0].user_action_id,
      match_count: 1,
    }
  } catch (error) {
    return {
      status: 'capture_failed',
      match_count: 0,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

export async function executeHarnessAndCapture(params: {
  experimentId: string
  scenario: EvalScenario
  variant: EvalVariant
  execution?: EvalExperimentExecutionConfig
  evalRunId: string
  benchmarkRunId: string
  dbPath?: string
}): Promise<ExecuteHarnessResult> {
  const context: EvalExecutionContext = {
    experiment_id: params.experimentId,
    scenario_id: params.scenario.scenario_id,
    variant_id: params.variant.variant_id,
    benchmark_run_id: params.benchmarkRunId,
    eval_run_id: params.evalRunId,
  }
  const variantApply = applyVariantV0({
    variant: params.variant,
    execution: params.execution,
    context,
  })
  const timeoutMs = params.execution?.timeout_ms ?? 180_000
  const adapter = createHarnessExecutionAdapter({
    execution: params.execution,
    env: variantApply.env,
    cliArgs: variantApply.cliArgs,
  })
  const execution = await adapter.execute({
    experimentId: params.experimentId,
    scenarioId: params.scenario.scenario_id,
    variantId: params.variant.variant_id,
    runId: params.evalRunId,
    prompt: params.scenario.input_prompt,
    timeoutMs,
  })
  const shouldRebuildDb =
    execution.status === 'completed' &&
    params.execution?.adapter !== 'fixture_trace' &&
    (!params.dbPath ||
      (!params.execution?.command && !params.execution?.args))

  if (shouldRebuildDb) {
    rebuildObservabilityDb(params.dbPath)
  }
  const capture =
    execution.status === 'completed'
      ? captureUserActionByBenchmarkRunId({
          benchmarkRunId: params.benchmarkRunId,
          dbPath: params.dbPath,
        })
      : {
          status: 'capture_failed' as const,
          match_count: 0,
          error: execution.error ?? `Harness execution did not complete: ${execution.status}`,
        }

  if (
    execution.status === 'completed' &&
    capture.status === 'captured' &&
    params.execution?.adapter !== 'fixture_trace' &&
    params.scenario.long_context_profile &&
    execution.stdoutRef
  ) {
    const realLongContextPayload = await buildLongContextRealOutputEvidence({
      scenario: params.scenario,
      variantId: params.variant.variant_id,
      stdoutRef: execution.stdoutRef,
    })
    if (realLongContextPayload) {
      upsertLongContextEvidence({
        dbPath: params.dbPath,
        userActionId: capture.user_action_id,
        scenarioId: params.scenario.scenario_id,
        variantId: params.variant.variant_id,
        payload: realLongContextPayload,
      })
    }
  }
  return {
    execution,
    capture,
    variant_apply: variantApply,
    benchmark_run_id: params.benchmarkRunId,
    eval_run_id: params.evalRunId,
  }
}
