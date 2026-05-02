import { spawnSync } from 'node:child_process'
import { mkdir, readFile, readdir, rm, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'

type JsonRecord = Record<string, unknown>

interface VerifyCase {
  case_id: string
  description: string
  manifest: JsonRecord
  expect: 'success' | 'failure'
  expected_error?: string
  db_path?: string
  no_snapshot_db?: boolean
  extra_args?: string[]
}

interface VerifyResult {
  case_id: string
  description: string
  passed: boolean
  expected: 'success' | 'failure'
  status: number | null
  summary_ref?: string
  report_ref?: string
  artifacts_cleaned?: boolean
  error_excerpt?: string
}

const repoRoot = path.resolve(import.meta.dirname, '..', '..')
const duckdbExe = path.join(repoRoot, 'tools', 'duckdb', 'duckdb.exe')
const stamp = new Date().toISOString().replace(/[:.]/g, '')
const tempRoot = path.join(repoRoot, '.observability', 'v2-execute-harness-verification', stamp)
const manifestsRoot = path.join(tempRoot, 'manifests')
const reportsRoot = path.join(repoRoot, 'tests', 'evals', 'v2', 'verification-reports')

const scoreSpecIds = [
  'task_success.main_chain_observed',
  'efficiency.total_billed_tokens',
  'decision_quality.subagent_count_observed',
  'stability.recovery_absence',
  'controllability.turn_limit_basic',
]

function sqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`
}

function fixtureExperiment(params: {
  id: string
  scenarioId?: string
  baselineVariantId?: string
  candidateVariantId?: string
  execution?: JsonRecord
  actionBindings?: JsonRecord[]
}): JsonRecord {
  return {
    experiment_id: params.id,
    name: params.id,
    goal: 'V2.2-alpha execute_harness verification fixture.',
    baseline_variant_id: params.baselineVariantId ?? 'baseline_default',
    candidate_variant_ids: [params.candidateVariantId ?? 'candidate_session_memory_sparse'],
    scenario_set_id: 'v2_2_alpha_verify',
    scenario_ids: [params.scenarioId ?? 'cost_sensitive_task'],
    repeat_count: 1,
    score_spec_ids: scoreSpecIds,
    gate_policy_id: 'default_v2_1_gate',
    mode: 'execute_harness',
    execution: params.execution ?? {},
    action_bindings: params.actionBindings,
    status: 'ready',
  }
}

function fixtureExecution(dbPath: string, env?: JsonRecord): JsonRecord {
  return {
    adapter: 'cli_print',
    command: 'bun',
    args: ['run', 'scripts/evals/v2_emit_fixture_trace.ts'],
    timeout_ms: 30000,
    env: {
      V2_FIXTURE_DB_PATH: dbPath,
      ...env,
    },
  }
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

async function findChildDir(parent: string, matcher: (name: string) => boolean): Promise<string> {
  const entries = await readdir(parent, { withFileTypes: true })
  const found = entries.find(entry => entry.isDirectory() && matcher(entry.name))
  if (!found) throw new Error(`Directory not found under ${parent}`)
  return path.join(parent, found.name)
}

async function resolveV2ReportRoot(): Promise<string> {
  const taskRoot = path.join(repoRoot, 'ObservrityTask')
  const versionsRoot = await findChildDir(taskRoot, name => name.startsWith('10-'))
  const v2Root = path.join(versionsRoot, 'v2')
  return await findChildDir(v2Root, name => name.startsWith('06-'))
}

function runBun(args: string[]) {
  return spawnSync('bun', ['run', ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
  })
}

function runDuckDb(dbPath: string, sql: string): void {
  const result = spawnSync(duckdbExe, [dbPath, sql], {
    cwd: repoRoot,
    encoding: 'utf8',
  })
  if (result.status !== 0) {
    throw new Error(
      String(result.stderr ?? '').trim() ||
        String(result.stdout ?? '').trim() ||
        String(result.error?.message ?? '').trim(),
    )
  }
}

function extractOutputRef(output: string, label: string): string | undefined {
  const match = output.match(new RegExp(`${label}:\\s*(.+)`))
  return match?.[1]?.trim()
}

function extractAllOutputRefs(output: string, label: string): string[] {
  return [...output.matchAll(new RegExp(`${label}:\\s*(.+)`, 'g'))]
    .map(match => match[1]?.trim())
    .filter((value): value is string => Boolean(value))
}

function relToAbs(ref: string): string {
  return path.isAbsolute(ref) ? ref : path.resolve(repoRoot, ref)
}

async function removeIfExists(filePath: string): Promise<void> {
  await unlink(filePath).catch(() => undefined)
}

async function cleanupGeneratedArtifacts(summaryRef?: string): Promise<void> {
  if (!summaryRef) return
  const summaryPath = relToAbs(summaryRef)
  const summary = JSON.parse(await readFile(summaryPath, 'utf8')) as {
    run_refs?: string[]
    score_refs?: string[]
    report_refs?: string[]
  }
  const v2ReportRoot = await resolveV2ReportRoot()
  const runReportRefs = (summary.run_refs ?? []).map(runRef => {
    const runId = path.basename(runRef, '.json')
    return path.join(v2ReportRoot, `${runId}.md`)
  })
  const refs = [
    ...(summary.run_refs ?? []),
    ...(summary.score_refs ?? []),
    ...(summary.report_refs ?? []),
    ...runReportRefs,
    summaryRef,
  ]
  for (const ref of refs) {
    await removeIfExists(relToAbs(ref))
  }
}

async function cleanupPartialArtifacts(output: string): Promise<void> {
  const runIds = extractAllOutputRefs(output, 'Created V2 run')
  const reportRefs = extractAllOutputRefs(output, 'report')
  const refs = [
    ...runIds.flatMap(runId => [
      path.join('tests', 'evals', 'v2', 'runs', `${runId}.json`),
      path.join('tests', 'evals', 'v2', 'scores', `${runId}.scores.json`),
    ]),
    ...reportRefs,
  ]
  for (const ref of refs) {
    await removeIfExists(relToAbs(ref))
  }
}

async function listFilesInDir(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
  return entries
    .filter(entry => entry.isFile())
    .map(entry => path.join(dir, entry.name))
}

async function listGeneratedArtifactFiles(): Promise<Set<string>> {
  const v2ReportRoot = await resolveV2ReportRoot()
  const files = [
    ...(await listFilesInDir(path.join(repoRoot, 'tests', 'evals', 'v2', 'runs'))),
    ...(await listFilesInDir(path.join(repoRoot, 'tests', 'evals', 'v2', 'scores'))),
    ...(await listFilesInDir(v2ReportRoot)),
  ]
  return new Set(files.map(file => path.resolve(file)))
}

async function cleanupArtifactsCreatedAfter(before: Set<string>): Promise<void> {
  const after = await listGeneratedArtifactFiles()
  for (const filePath of after) {
    if (!before.has(filePath)) {
      await removeIfExists(filePath)
    }
  }
}

function createEmptyCaptureDb(dbPath: string): void {
  runDuckDb(
    dbPath,
    'CREATE TABLE user_actions(user_action_id VARCHAR, benchmark_run_id VARCHAR);',
  )
}

function createBindExistingDb(dbPath: string): JsonRecord[] {
  const baselineActionId = 'v2-verify-baseline-action'
  const candidateActionId = 'v2-verify-candidate-action'
  const startedAt = '2026-05-01T00:00:00.000Z'
  const sql = [
    'CREATE TABLE user_actions(event_date VARCHAR, user_action_id VARCHAR, started_at VARCHAR, started_at_ms BIGINT, ended_at VARCHAR, ended_at_ms BIGINT, duration_ms BIGINT, event_count BIGINT, query_count BIGINT, main_thread_query_count BIGINT, subagent_query_count BIGINT, subagent_count BIGINT, tool_call_count BIGINT, raw_input_tokens BIGINT, output_tokens BIGINT, cache_read_tokens BIGINT, cache_create_tokens BIGINT, total_prompt_input_tokens BIGINT, total_billed_tokens BIGINT, main_thread_total_prompt_input_tokens BIGINT, subagent_total_prompt_input_tokens BIGINT);',
    'CREATE TABLE queries(query_id VARCHAR, user_action_id VARCHAR, agent_name VARCHAR, started_at VARCHAR, turn_count BIGINT, terminal_reason VARCHAR);',
    'CREATE TABLE tools(user_action_id VARCHAR, tool_name VARCHAR, is_closed BOOLEAN, has_failed BOOLEAN);',
    'CREATE TABLE subagents(user_action_id VARCHAR, subagent_reason VARCHAR, subagent_trigger_kind VARCHAR, subagent_trigger_detail VARCHAR, duration_ms BIGINT);',
    'CREATE TABLE recoveries(user_action_id VARCHAR, event_name VARCHAR, ts_wall VARCHAR);',
    'CREATE TABLE metrics_integrity_daily(event_date VARCHAR, strict_query_completion_rate DOUBLE, strict_turn_state_closure_rate DOUBLE, tool_lifecycle_closure_rate DOUBLE, subagent_lifecycle_closure_rate DOUBLE);',
    `INSERT INTO user_actions VALUES ('2026-05-01', ${sqlString(baselineActionId)}, ${sqlString(startedAt)}, 0, '2026-05-01T00:00:01.000Z', 1000, 1000, 2, 1, 1, 0, 0, 0, 100, 10, 0, 0, 100, 110, 100, 0);`,
    `INSERT INTO user_actions VALUES ('2026-05-01', ${sqlString(candidateActionId)}, ${sqlString(startedAt)}, 0, '2026-05-01T00:00:01.000Z', 1000, 1000, 2, 1, 1, 0, 0, 0, 90, 10, 0, 0, 90, 100, 90, 0);`,
    `INSERT INTO queries VALUES ('q-baseline', ${sqlString(baselineActionId)}, 'main_thread', ${sqlString(startedAt)}, 1, 'fixture_completed');`,
    `INSERT INTO queries VALUES ('q-candidate', ${sqlString(candidateActionId)}, 'main_thread', ${sqlString(startedAt)}, 1, 'fixture_completed');`,
    "INSERT INTO metrics_integrity_daily VALUES ('2026-05-01', 1, 1, 1, 1);",
  ].join('\n')
  runDuckDb(dbPath, sql)
  return [
    {
      scenario_id: 'cost_sensitive_task',
      variant_id: 'baseline_default',
      entry_user_action_id: baselineActionId,
    },
    {
      scenario_id: 'cost_sensitive_task',
      variant_id: 'candidate_session_memory_sparse',
      entry_user_action_id: candidateActionId,
    },
  ]
}

async function runCase(testCase: VerifyCase): Promise<VerifyResult> {
  const manifestPath = path.join(manifestsRoot, `${testCase.case_id}.json`)
  await writeJson(manifestPath, testCase.manifest)
  const beforeArtifacts = await listGeneratedArtifactFiles()
  const args = ['scripts/evals/v2_run_experiment.ts', '--experiment', manifestPath]
  if (testCase.db_path) args.push('--db', testCase.db_path)
  if (testCase.no_snapshot_db) args.push('--no-snapshot-db')
  if (testCase.extra_args) args.push(...testCase.extra_args)
  const result = runBun(args)
  const output = [String(result.stdout ?? '').trim(), String(result.stderr ?? '').trim()]
    .filter(Boolean)
    .join('\n')
  const summaryRef = extractOutputRef(output, 'Created V2 experiment summary')
  const reportRef = extractOutputRef(output, 'Created V2 experiment report')

  if (testCase.expect === 'failure') {
    await cleanupPartialArtifacts(output)
    await cleanupArtifactsCreatedAfter(beforeArtifacts)
    const hasExpectedError =
      result.status !== 0 &&
      (!testCase.expected_error || output.includes(testCase.expected_error))
    return {
      case_id: testCase.case_id,
      description: testCase.description,
      passed: hasExpectedError,
      expected: testCase.expect,
      status: result.status,
      error_excerpt: output.slice(0, 700),
    }
  }

  const passed = result.status === 0 && Boolean(summaryRef)
  if (summaryRef) await cleanupGeneratedArtifacts(summaryRef)
  await cleanupArtifactsCreatedAfter(beforeArtifacts)
  return {
    case_id: testCase.case_id,
    description: testCase.description,
    passed,
    expected: testCase.expect,
    status: result.status,
    summary_ref: summaryRef,
    report_ref: reportRef,
    artifacts_cleaned: Boolean(summaryRef),
    error_excerpt: output.slice(0, 700),
  }
}

async function main(): Promise<void> {
  await mkdir(manifestsRoot, { recursive: true })
  await mkdir(reportsRoot, { recursive: true })

  const successDb = path.join(tempRoot, 'success.duckdb')
  const missingCaptureDb = path.join(tempRoot, 'missing-capture.duckdb')
  const ambiguousCaptureDb = path.join(tempRoot, 'ambiguous-capture.duckdb')
  const baselineFailDb = path.join(tempRoot, 'baseline-fail.duckdb')
  const candidateFailDb = path.join(tempRoot, 'candidate-fail.duckdb')
  const fallbackDb = path.join(tempRoot, 'fallback.duckdb')
  createEmptyCaptureDb(missingCaptureDb)
  const fallbackBindings = createBindExistingDb(fallbackDb)

  const cases: VerifyCase[] = [
    {
      case_id: 'execute_harness_success_fixture',
      description: 'execute_harness success path creates run, score, report, and risk verdict through benchmark_run_id capture.',
      expect: 'success',
      db_path: successDb,
      no_snapshot_db: true,
      manifest: fixtureExperiment({
        id: `v2_2_verify_success_${stamp}`,
        execution: fixtureExecution(successDb),
      }),
    },
    {
      case_id: 'adapter_not_found',
      description: 'Unsupported adapter should fail clearly.',
      expect: 'failure',
      expected_error: 'Unsupported execute_harness adapter',
      db_path: missingCaptureDb,
      no_snapshot_db: true,
      manifest: fixtureExperiment({
        id: `v2_2_verify_adapter_missing_${stamp}`,
        execution: { adapter: 'not_real_adapter' },
      }),
    },
    {
      case_id: 'capture_failed',
      description: 'Completed execution without matching benchmark_run_id should fail capture.',
      expect: 'failure',
      expected_error: 'action capture capture_failed',
      db_path: missingCaptureDb,
      no_snapshot_db: true,
      manifest: fixtureExperiment({
        id: `v2_2_verify_capture_failed_${stamp}`,
        execution: {
          adapter: 'cli_print',
          command: 'bun',
          args: ['--version'],
          timeout_ms: 30000,
        },
      }),
    },
    {
      case_id: 'ambiguous_capture',
      description: 'Multiple user_action_id rows for one benchmark_run_id should fail capture.',
      expect: 'failure',
      expected_error: 'action capture ambiguous_capture',
      db_path: ambiguousCaptureDb,
      no_snapshot_db: true,
      manifest: fixtureExperiment({
        id: `v2_2_verify_ambiguous_capture_${stamp}`,
        execution: fixtureExecution(ambiguousCaptureDb, {
          V2_FIXTURE_DUPLICATE_CAPTURE: '1',
        }),
      }),
    },
    {
      case_id: 'variant_apply_failed',
      description: 'Strict config snapshot check should fail before execution when the referenced snapshot is missing.',
      expect: 'failure',
      expected_error: 'Variant apply failed',
      db_path: missingCaptureDb,
      no_snapshot_db: true,
      manifest: fixtureExperiment({
        id: `v2_2_verify_variant_apply_failed_${stamp}`,
        execution: {
          ...fixtureExecution(missingCaptureDb),
          require_config_snapshot: true,
        },
      }),
    },
    {
      case_id: 'scenario_missing',
      description: 'Missing scenario manifest should fail before execution.',
      expect: 'failure',
      expected_error: 'Scenario not found',
      db_path: missingCaptureDb,
      no_snapshot_db: true,
      manifest: fixtureExperiment({
        id: `v2_2_verify_scenario_missing_${stamp}`,
        scenarioId: 'not_real_scenario',
        execution: fixtureExecution(missingCaptureDb),
      }),
    },
    {
      case_id: 'baseline_failure',
      description: 'Baseline execution failure should stop the experiment.',
      expect: 'failure',
      expected_error: 'baseline scenario=cost_sensitive_task variant=baseline_default execute_harness failed',
      db_path: baselineFailDb,
      no_snapshot_db: true,
      manifest: fixtureExperiment({
        id: `v2_2_verify_baseline_failure_${stamp}`,
        execution: fixtureExecution(baselineFailDb, {
          V2_FIXTURE_FAIL_VARIANT: 'baseline_default',
        }),
      }),
    },
    {
      case_id: 'candidate_failure',
      description: 'Candidate execution failure should stop the experiment after the baseline succeeds.',
      expect: 'failure',
      expected_error: 'candidate scenario=cost_sensitive_task variant=candidate_session_memory_sparse execute_harness failed',
      db_path: candidateFailDb,
      no_snapshot_db: true,
      manifest: fixtureExperiment({
        id: `v2_2_verify_candidate_failure_${stamp}`,
        execution: fixtureExecution(candidateFailDb, {
          V2_FIXTURE_FAIL_VARIANT: 'candidate_session_memory_sparse',
        }),
      }),
    },
    {
      case_id: 'disabled_fallback_to_bind_existing',
      description: 'Automation can be disabled and fall back to bind_existing.',
      expect: 'success',
      db_path: fallbackDb,
      no_snapshot_db: true,
      extra_args: ['--disable-execute-harness'],
      manifest: fixtureExperiment({
        id: `v2_2_verify_disabled_fallback_${stamp}`,
        execution: {
          ...fixtureExecution(fallbackDb),
          allow_fallback_to_bind_existing: true,
        },
        actionBindings: fallbackBindings,
      }),
    },
  ]

  const results: VerifyResult[] = []
  for (const testCase of cases) {
    results.push(await runCase(testCase))
  }

  const failed = results.filter(result => !result.passed)
  const report = {
    verification_id: `v2_2_execute_harness_alpha_${stamp}`,
    generated_at: new Date().toISOString(),
    temp_root: path.relative(repoRoot, tempRoot),
    passed: failed.length === 0,
    case_count: results.length,
    failed_count: failed.length,
    note:
      'Success-path verification uses a fixture command to avoid model/API spend; the production default adapter is cli_print.',
    results,
  }
  const reportPath = path.join(reportsRoot, `v2_2_execute_harness_alpha_${stamp}.json`)
  await writeJson(reportPath, report)
  await rm(tempRoot, { recursive: true, force: true }).catch(() => undefined)

  console.log(`Created V2.2 execute_harness verification report: ${path.relative(repoRoot, reportPath)}`)
  if (failed.length > 0) {
    for (const result of failed) {
      console.error(`FAILED ${result.case_id}: ${result.error_excerpt ?? ''}`)
    }
    process.exit(1)
  }
  console.log(`V2.2 execute_harness alpha verification passed: ${results.length}/${results.length}`)
}

main().catch(async error => {
  await rm(tempRoot, { recursive: true, force: true }).catch(() => undefined)
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
