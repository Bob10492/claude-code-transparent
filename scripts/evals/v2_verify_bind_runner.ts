import { spawnSync } from 'node:child_process'
import { mkdir, readFile, rm, unlink, writeFile } from 'node:fs/promises'
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
const tempRoot = path.join(repoRoot, '.observability', 'v2-runner-verification', stamp)
const manifestsRoot = path.join(tempRoot, 'manifests')
const reportsRoot = path.join(repoRoot, 'tests', 'evals', 'v2', 'verification-reports')

const baselineActionId = '1d5eb5e1-2fe0-42fa-9450-7b05d6367976'
const candidateActionId = 'dbf9fae1-0a5a-4f50-aba7-02047ced9390'
const missingRootActionId = 'v2-verify-missing-root-action'
const nonexistentActionId = '00000000-0000-0000-0000-000000000000'

const scoreSpecIds = [
  'task_success.main_chain_observed',
  'efficiency.total_billed_tokens',
  'decision_quality.subagent_count_observed',
  'stability.recovery_absence',
  'controllability.turn_limit_basic',
]

function experiment(params: {
  id: string
  scenarioIds: string[]
  candidateVariantIds: string[]
  bindings: Array<JsonRecord>
  scoreSpecIds?: string[]
  gatePolicyId?: string
  mode?: 'bind_existing' | 'execute_harness'
}): JsonRecord {
  return {
    experiment_id: params.id,
    name: params.id,
    goal: 'V2.1 bind_existing runner verification case.',
    baseline_variant_id: 'baseline_default',
    candidate_variant_ids: params.candidateVariantIds,
    scenario_set_id: 'v2_1_verify',
    scenario_ids: params.scenarioIds,
    repeat_count: 1,
    score_spec_ids: params.scoreSpecIds ?? scoreSpecIds,
    gate_policy_id: params.gatePolicyId ?? 'default_v2_1_gate',
    mode: params.mode ?? 'bind_existing',
    action_bindings: params.bindings,
    status: 'ready',
  }
}

function bindingsFor(params: {
  scenarioIds: string[]
  candidateVariantIds: string[]
  baselineActionId?: string
  candidateActionId?: string
}): JsonRecord[] {
  return params.scenarioIds.flatMap(scenarioId => [
    {
      scenario_id: scenarioId,
      variant_id: 'baseline_default',
      entry_user_action_id: params.baselineActionId ?? baselineActionId,
    },
    ...params.candidateVariantIds.map(variantId => ({
      scenario_id: scenarioId,
      variant_id: variantId,
      entry_user_action_id: params.candidateActionId ?? candidateActionId,
    })),
  ])
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function runBun(args: string[]) {
  return spawnSync('bun', ['run', ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
  })
}

function extractOutputRef(output: string, label: string): string | undefined {
  const match = output.match(new RegExp(`${label}:\\s*(.+)`))
  return match?.[1]?.trim()
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
  const runReportRefs = (summary.run_refs ?? []).map(runRef => {
    const runId = path.basename(runRef, '.json')
    return path.join(
      'ObservrityTask',
      '10-系统版本',
      'v2',
      '06-运行报告',
      `${runId}.md`,
    )
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

function assertExperimentArtifactSchema(summary: JsonRecord): string[] {
  const errors: string[] = []
  const requiredStrings = ['experiment_id', 'manifest_ref', 'generated_at', 'mode']
  for (const field of requiredStrings) {
    if (typeof summary[field] !== 'string' || String(summary[field]).trim() === '') {
      errors.push(`${field} must be a non-empty string`)
    }
  }
  for (const field of ['run_refs', 'score_refs', 'report_refs', 'errors', 'warnings']) {
    if (!Array.isArray(summary[field])) errors.push(`${field} must be an array`)
  }
  const riskVerdict = summary.risk_verdict as JsonRecord | undefined
  if (!riskVerdict || typeof riskVerdict !== 'object') {
    errors.push('risk_verdict must be an object')
  } else {
    if (!['pass', 'warning', 'fail', 'inconclusive'].includes(String(riskVerdict.status))) {
      errors.push('risk_verdict.status has invalid value')
    }
    if (riskVerdict.scope !== 'regression_risk_only') {
      errors.push('risk_verdict.scope must be regression_risk_only')
    }
    if (riskVerdict.is_final_experiment_judgment !== false) {
      errors.push('risk_verdict.is_final_experiment_judgment must be false')
    }
  }
  const gateVerdict = summary.gate_verdict as JsonRecord | undefined
  if (!gateVerdict || typeof gateVerdict !== 'object') {
    errors.push('gate_verdict compatibility alias must be an object')
  }
  for (const field of ['scorecard_summary', 'exploration_signals']) {
    if (!Array.isArray(summary[field])) errors.push(`${field} must be an array`)
  }
  if (typeof summary.recommended_review_mode !== 'string') {
    errors.push('recommended_review_mode must be a string')
  }
  if (summary.final_decision !== null) {
    errors.push('final_decision must be null until a human decision is recorded')
  }
  return errors
}

async function createMissingRootDb(): Promise<string> {
  const dbPath = path.join(tempRoot, 'missing-root.duckdb')
  const sql = [
    'CREATE TABLE user_actions(event_date VARCHAR, user_action_id VARCHAR, started_at VARCHAR, ended_at VARCHAR, total_billed_tokens BIGINT);',
    `INSERT INTO user_actions VALUES ('2026-04-29', '${missingRootActionId}', '2026-04-29T00:00:00.000Z', '2026-04-29T00:00:01.000Z', 1);`,
    'CREATE TABLE queries(query_id VARCHAR, user_action_id VARCHAR, agent_name VARCHAR, started_at VARCHAR);',
  ].join(' ')
  const result = spawnSync(duckdbExe, [dbPath, sql], {
    cwd: repoRoot,
    encoding: 'utf8',
  })
  if (result.status !== 0) {
    throw new Error(String(result.stderr || result.stdout || result.error?.message))
  }
  return dbPath
}

async function runCase(testCase: VerifyCase): Promise<VerifyResult> {
  const manifestPath = path.join(manifestsRoot, `${testCase.case_id}.json`)
  await writeJson(manifestPath, testCase.manifest)
  const args = ['scripts/evals/v2_run_experiment.ts', '--experiment', manifestPath]
  if (testCase.db_path) args.push('--db', testCase.db_path)
  if (testCase.no_snapshot_db) args.push('--no-snapshot-db')

  const result = runBun(args)
  const output = [String(result.stdout ?? '').trim(), String(result.stderr ?? '').trim()]
    .filter(Boolean)
    .join('\n')
  const summaryRef = extractOutputRef(output, 'Created V2.1 experiment summary')
  const reportRef = extractOutputRef(output, 'Created V2.1 experiment report')

  if (testCase.expect === 'failure') {
    const hasExpectedError =
      result.status !== 0 &&
      (!testCase.expected_error || output.includes(testCase.expected_error))
    return {
      case_id: testCase.case_id,
      description: testCase.description,
      passed: hasExpectedError,
      expected: testCase.expect,
      status: result.status,
      error_excerpt: output.slice(0, 500),
    }
  }

  let passed = result.status === 0 && Boolean(summaryRef)
  let errorExcerpt = ''
  if (summaryRef) {
    const summary = JSON.parse(await readFile(relToAbs(summaryRef), 'utf8')) as JsonRecord
    const schemaErrors = assertExperimentArtifactSchema(summary)
    if (schemaErrors.length > 0) {
      passed = false
      errorExcerpt = schemaErrors.join('; ')
    }
    await cleanupGeneratedArtifacts(summaryRef)
  }

  return {
    case_id: testCase.case_id,
    description: testCase.description,
    passed,
    expected: testCase.expect,
    status: result.status,
    summary_ref: summaryRef,
    report_ref: reportRef,
    artifacts_cleaned: Boolean(summaryRef),
    error_excerpt: errorExcerpt || output.slice(0, 500),
  }
}

async function main(): Promise<void> {
  await mkdir(manifestsRoot, { recursive: true })
  await mkdir(reportsRoot, { recursive: true })
  const missingRootDb = await createMissingRootDb()

  const cases: VerifyCase[] = [
    {
      case_id: 'single_scenario_single_candidate',
      description: 'Single scenario plus one candidate should complete.',
      expect: 'success',
      manifest: experiment({
        id: `v2_1_verify_single_candidate_${stamp}`,
        scenarioIds: ['cost_sensitive_task'],
        candidateVariantIds: ['candidate_session_memory_sparse'],
        bindings: bindingsFor({
          scenarioIds: ['cost_sensitive_task'],
          candidateVariantIds: ['candidate_session_memory_sparse'],
        }),
      }),
    },
    {
      case_id: 'single_scenario_multi_candidate',
      description: 'Single scenario plus multiple candidates should complete.',
      expect: 'success',
      manifest: experiment({
        id: `v2_1_verify_multi_candidate_${stamp}`,
        scenarioIds: ['cost_sensitive_task'],
        candidateVariantIds: [
          'candidate_session_memory_sparse',
          'candidate_tool_router_v2',
        ],
        bindings: bindingsFor({
          scenarioIds: ['cost_sensitive_task'],
          candidateVariantIds: [
            'candidate_session_memory_sparse',
            'candidate_tool_router_v2',
          ],
        }),
      }),
    },
    {
      case_id: 'multi_scenario_single_candidate',
      description: 'Multiple scenarios plus one candidate should complete.',
      expect: 'success',
      manifest: experiment({
        id: `v2_1_verify_multi_scenario_${stamp}`,
        scenarioIds: ['cost_sensitive_task', 'tool_choice_sensitive'],
        candidateVariantIds: ['candidate_session_memory_sparse'],
        bindings: bindingsFor({
          scenarioIds: ['cost_sensitive_task', 'tool_choice_sensitive'],
          candidateVariantIds: ['candidate_session_memory_sparse'],
        }),
      }),
    },
    {
      case_id: 'missing_action_binding',
      description: 'Missing candidate action binding should fail clearly.',
      expect: 'failure',
      expected_error: 'Missing action binding',
      manifest: experiment({
        id: `v2_1_verify_missing_binding_${stamp}`,
        scenarioIds: ['cost_sensitive_task'],
        candidateVariantIds: ['candidate_session_memory_sparse'],
        bindings: [
          {
            scenario_id: 'cost_sensitive_task',
            variant_id: 'baseline_default',
            entry_user_action_id: baselineActionId,
          },
        ],
      }),
    },
    {
      case_id: 'nonexistent_user_action_id',
      description: 'Nonexistent V1 user_action_id should fail.',
      expect: 'failure',
      expected_error: 'user_action_id not found',
      manifest: experiment({
        id: `v2_1_verify_missing_action_${stamp}`,
        scenarioIds: ['cost_sensitive_task'],
        candidateVariantIds: ['candidate_session_memory_sparse'],
        bindings: bindingsFor({
          scenarioIds: ['cost_sensitive_task'],
          candidateVariantIds: ['candidate_session_memory_sparse'],
          baselineActionId: nonexistentActionId,
        }),
      }),
    },
    {
      case_id: 'root_query_missing',
      description: 'V1 action without main_thread root query should fail.',
      expect: 'failure',
      expected_error: 'Fact-only binding failed',
      db_path: missingRootDb,
      no_snapshot_db: true,
      manifest: experiment({
        id: `v2_1_verify_missing_root_${stamp}`,
        scenarioIds: ['cost_sensitive_task'],
        candidateVariantIds: ['candidate_session_memory_sparse'],
        bindings: bindingsFor({
          scenarioIds: ['cost_sensitive_task'],
          candidateVariantIds: ['candidate_session_memory_sparse'],
          baselineActionId: missingRootActionId,
          candidateActionId: missingRootActionId,
        }),
      }),
    },
    {
      case_id: 'missing_score_spec_id',
      description: 'Missing score_spec_id should fail before run creation.',
      expect: 'failure',
      expected_error: 'Experiment references missing score_spec_id',
      manifest: experiment({
        id: `v2_1_verify_missing_score_spec_${stamp}`,
        scenarioIds: ['cost_sensitive_task'],
        candidateVariantIds: ['candidate_session_memory_sparse'],
        scoreSpecIds: ['not.real.score'],
        bindings: bindingsFor({
          scenarioIds: ['cost_sensitive_task'],
          candidateVariantIds: ['candidate_session_memory_sparse'],
        }),
      }),
    },
    {
      case_id: 'missing_gate_policy_id',
      description: 'Missing gate_policy_id should fail before run creation.',
      expect: 'failure',
      expected_error: 'Experiment references missing gate_policy_id',
      manifest: experiment({
        id: `v2_1_verify_missing_gate_${stamp}`,
        scenarioIds: ['cost_sensitive_task'],
        candidateVariantIds: ['candidate_session_memory_sparse'],
        gatePolicyId: 'not_real_gate',
        bindings: bindingsFor({
          scenarioIds: ['cost_sensitive_task'],
          candidateVariantIds: ['candidate_session_memory_sparse'],
        }),
      }),
    },
    {
      case_id: 'execute_harness_blocked',
      description: 'execute_harness mode should fail with the explicit adapter error.',
      expect: 'failure',
      expected_error:
        'execute_harness mode is not implemented yet: missing headless harness execution adapter',
      manifest: experiment({
        id: `v2_1_verify_execute_harness_${stamp}`,
        scenarioIds: ['cost_sensitive_task'],
        candidateVariantIds: ['candidate_session_memory_sparse'],
        mode: 'execute_harness',
        bindings: bindingsFor({
          scenarioIds: ['cost_sensitive_task'],
          candidateVariantIds: ['candidate_session_memory_sparse'],
        }),
      }),
    },
  ]

  const results: VerifyResult[] = []
  for (const testCase of cases) {
    results.push(await runCase(testCase))
  }

  const failed = results.filter(result => !result.passed)
  const report = {
    verification_id: `v2_1_bind_runner_${stamp}`,
    generated_at: new Date().toISOString(),
    temp_root: path.relative(repoRoot, tempRoot),
    passed: failed.length === 0,
    case_count: results.length,
    failed_count: failed.length,
    results,
  }
  const reportPath = path.join(reportsRoot, `v2_1_bind_runner_${stamp}.json`)
  await writeJson(reportPath, report)
  await rm(tempRoot, { recursive: true, force: true }).catch(() => undefined)

  console.log(`Created V2.1 verification report: ${path.relative(repoRoot, reportPath)}`)
  if (failed.length > 0) {
    for (const result of failed) {
      console.error(`FAILED ${result.case_id}: ${result.error_excerpt ?? ''}`)
    }
    process.exit(1)
  }
  console.log(`V2.1 bind runner verification passed: ${results.length}/${results.length}`)
}

main().catch(async error => {
  await rm(tempRoot, { recursive: true, force: true }).catch(() => undefined)
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
