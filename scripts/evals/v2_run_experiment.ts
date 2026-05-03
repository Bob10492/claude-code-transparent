import { spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import type {
  EvalScenario,
  EvalScore,
  EvalVariant,
} from '../../src/observability/v2/evalTypes'
import type {
  EvalExperimentActionBinding,
  EvalExperimentFlatActionBinding,
  EvalExperimentNestedActionBinding,
  EvalExperimentV21,
  EvalGatePolicy,
  EvalGatePolicyRule,
  EvalScoreSpec,
  EvalScoreSpecCollection,
} from '../../src/observability/v2/evalExperimentTypes'
import {
  applyVariantV0,
  buildLongContextFixtureEvidence,
  createRunIdentity,
  executeHarnessAndCapture,
  isExecuteHarnessDisabled,
  type ExecuteHarnessResult,
} from './v2_harness_execution'
import { buildScoresForSpecIds } from './v2_score_registry'

type JsonRecord = Record<string, unknown>
type ExperimentProfile = 'smoke' | 'real_experiment'

interface RunArtifact {
  run: {
    run_id: string
    scenario_id: string
    variant_id: string
    entry_user_action_id?: string
  }
  variant_effect?: JsonRecord
}

interface VariantEffectSummary {
  scenario_id: string
  candidate_variant_id: string
  baseline_variant_effect_observed: boolean
  candidate_variant_effect_observed: boolean
  runtime_difference_observed: boolean
  baseline_policy_mode: string
  candidate_policy_mode: string
  summary: string[]
}

interface ExperimentValidity {
  status: 'valid' | 'invalid' | 'inconclusive'
  profile: ExperimentProfile
  reason: string
  blockers: string[]
  warnings: string[]
  checks: {
    baseline_captured: boolean
    candidate_captured: boolean
    no_ambiguous_capture: boolean
    score_evidence_present: boolean
    variant_effect_observed: boolean
    runtime_difference_observed: boolean
    scenario_intent_matched: boolean
  }
}

type LongContextReviewVerdict =
  | 'pass'
  | 'warning'
  | 'needs_manual_review'
  | 'invalid'

interface LongContextSummaryItem {
  scenario_id: string
  candidate_variant_id: string
  repeat_count: number
  context_family: string
  context_size_class: string
  retained_constraint_mean: number | null
  lost_constraint_mean: number | null
  constraint_retention_rate_mean: number | null
  retrieved_fact_mean: number | null
  missed_fact_mean: number | null
  retrieved_fact_hit_rate_mean: number | null
  distractor_confusion_mean: number | null
  compaction_trigger_mean: number | null
  compaction_saved_tokens_mean: number | null
  tool_result_budget_trigger_mean: number | null
  total_prompt_input_tokens_mean: number | null
  prompt_token_delta_mean: number | null
  success_under_context_pressure_rate: number | null
  manual_review_required: boolean
  manual_review_questions: string[]
  interpretation: string[]
}

interface CandidateExperimentResult {
  candidate_variant_id: string
  candidate_run_group_id: string
  candidate_run_id: string
  candidate_user_action_id: string
  candidate_eval_run_id?: string
  candidate_benchmark_run_id?: string
  candidate_execution?: ExecuteHarnessResult
  baseline_variant_effect?: JsonRecord
  candidate_variant_effect?: JsonRecord
  variant_effect_summary?: VariantEffectSummary
  experiment_validity?: ExperimentValidity
  compare_report: string
  gate_results: GateResult[]
  scorecard_summary: ScorecardItem[]
  exploration_signals: string[]
  recommended_review_mode: ReviewMode
}

interface ScenarioExperimentResult {
  scenario_id: string
  repeat_index: number
  baseline_run_group_id: string
  baseline_run_id: string
  baseline_user_action_id: string
  baseline_eval_run_id?: string
  baseline_benchmark_run_id?: string
  baseline_execution?: ExecuteHarnessResult
  candidates: CandidateExperimentResult[]
}

interface RunExecutionFailure {
  scenario_id: string
  variant_id: string
  run_group_id: string
  repeat_index: number
  stage: 'execute_harness' | 'capture' | 'record_run' | 'compare'
  error: string
}

interface RunGroupArtifact {
  run_group_id: string
  experiment_id: string
  scenario_id: string
  variant_id: string
  repeat_count: number
  run_ids: string[]
  status: 'completed' | 'partial' | 'failed'
  started_at: string | null
  ended_at: string | null
  aggregate_summary_ref: string | null
  stability_metrics: StabilityMetrics
  flaky_status: 'stable' | 'flaky' | 'unstable' | 'inconclusive'
  failures: RunExecutionFailure[]
}

interface StabilityMetrics {
  repeat_success_rate: number
  capture_failure_rate: number
  total_billed_tokens_mean: number | null
  total_billed_tokens_min: number | null
  total_billed_tokens_max: number | null
  total_billed_tokens_stddev: number | null
  e2e_duration_mean: number | null
  e2e_duration_min: number | null
  e2e_duration_max: number | null
  e2e_duration_stddev: number | null
  tool_call_count_variance: number | null
  subagent_count_variance: number | null
  turn_count_variance: number | null
  recovery_rate: number
}

interface GateResult {
  scenario_id: string
  candidate_variant_id: string
  rule_type: 'hard_fail' | 'soft_warning'
  score_spec_id: string
  verdict: 'pass' | 'hard_fail' | 'soft_warning' | 'missing' | 'inconclusive'
  passed: boolean
  baseline_value: number | null
  candidate_value: number | null
  regression_pct: number | null
  condition: string
  notes?: string
}

interface RiskVerdict {
  status: 'pass' | 'warning' | 'fail' | 'inconclusive'
  scope: 'regression_risk_only'
  is_final_experiment_judgment: false
  hard_fail_count: number
  soft_warning_count: number
  missing_score_count: number
  inconclusive_count: number
  candidate_count: number
  notes: string
}

type ReviewMode =
  | 'regression_review'
  | 'manual_review'
  | 'exploratory_review'

interface ScorecardItem {
  scenario_id: string
  candidate_variant_id: string
  score_spec_id: string
  direction: EvalScoreSpec['direction'] | 'unknown'
  baseline_value: number | null
  candidate_value: number | null
  delta: number | null
  interpretation:
    | 'improved'
    | 'regressed'
    | 'unchanged'
    | 'changed'
    | 'missing'
    | 'observed'
    | 'not_applicable'
}

const repoRoot = path.resolve(import.meta.dirname, '..', '..')
const bunExe = process.execPath
const evalRoot = path.join(repoRoot, 'tests', 'evals', 'v2')
const scoresRoot = path.join(evalRoot, 'scores')
const runsRoot = path.join(evalRoot, 'runs')
const runGroupsRoot = path.join(evalRoot, 'run-groups')
const experimentRunsRoot = path.join(evalRoot, 'experiment-runs')

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

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, 'utf8')) as T
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function asBoolean(value: unknown): boolean {
  return value === true
}

function asNumber(value: unknown): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string' && value.trim() !== '') return Number(value)
  return 0
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item.length > 0)
}

function asJsonRecord(value: unknown): JsonRecord | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  return value as JsonRecord
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))]
}

function sanitizeId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '')
}

function createRunGroupId(params: {
  experimentId: string
  scenarioId: string
  variantId: string
  stamp: string
}): string {
  const base = sanitizeId(
    `group_${params.experimentId}_${params.scenarioId}_${params.variantId}_${params.stamp}`,
  )
  return base.length > 160 ? base.slice(0, 160) : base
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

async function findChildDir(parent: string, matcher: (name: string) => boolean) {
  const entries = await readdir(parent, { withFileTypes: true })
  const found = entries.find(entry => entry.isDirectory() && matcher(entry.name))
  if (!found) throw new Error(`Directory not found under ${parent}`)
  return path.join(parent, found.name)
}

async function resolveReportRoot(): Promise<string> {
  const taskRoot = path.join(repoRoot, 'ObservrityTask')
  const versionsRoot = await findChildDir(taskRoot, name => name.startsWith('10-'))
  const v2Root = path.join(versionsRoot, 'v2')
  return await findChildDir(v2Root, name => name.startsWith('06-'))
}

async function findExperimentPath(idOrPath: string): Promise<string> {
  if (idOrPath.endsWith('.json')) {
    return path.isAbsolute(idOrPath) ? idOrPath : path.resolve(repoRoot, idOrPath)
  }
  return path.join(evalRoot, 'experiments', `${idOrPath}.json`)
}

async function loadScoreSpecs(): Promise<Map<string, EvalScoreSpec>> {
  const specs = new Map<string, EvalScoreSpec>()
  for (const filePath of await listJsonFiles(path.join(evalRoot, 'score-specs'))) {
    if (path.basename(filePath).startsWith('_')) continue
    const collection = await readJson<EvalScoreSpecCollection>(filePath)
    for (const spec of collection.score_specs ?? []) {
      specs.set(spec.score_spec_id, spec)
    }
  }
  return specs
}

async function loadGatePolicy(gatePolicyId?: string): Promise<EvalGatePolicy | undefined> {
  if (!gatePolicyId) return undefined
  const filePath = path.join(evalRoot, 'gates', `${gatePolicyId}.json`)
  try {
    return await readJson<EvalGatePolicy>(filePath)
  } catch {
    return undefined
  }
}

async function loadScenario(scenarioId: string): Promise<EvalScenario> {
  const directPath = path.join(evalRoot, 'scenarios', `${scenarioId}.json`)
  try {
    return await readJson<EvalScenario>(directPath)
  } catch {
    const nestedFiles = await listJsonFiles(path.join(evalRoot, 'scenarios'), true)
    for (const filePath of nestedFiles) {
      if (path.basename(filePath) !== `${scenarioId}.json`) continue
      return await readJson<EvalScenario>(filePath)
    }
    throw new Error(`Scenario not found: ${scenarioId}`)
  }
}

async function loadVariant(variantId: string): Promise<EvalVariant> {
  const directPath = path.join(evalRoot, 'variants', `${variantId}.json`)
  try {
    return await readJson<EvalVariant>(directPath)
  } catch {
    // Fall through to template compatibility paths used by V2.1 samples.
  }

  const templatePath = path.join(evalRoot, 'variants', `${variantId}.template.json`)
  try {
    return await readJson<EvalVariant>(templatePath)
  } catch {
    // Fall through to baseline.template.json compatibility.
  }

  const baseline = await readJson<EvalVariant>(
    path.join(evalRoot, 'variants', 'baseline.template.json'),
  )
  if (baseline.variant_id === variantId) return baseline
  throw new Error(`Variant not found: ${variantId}`)
}

function normalizeGateRules(gatePolicy: EvalGatePolicy | undefined): EvalGatePolicyRule[] {
  if (!gatePolicy) return []
  return [
    ...(gatePolicy.rules ?? []),
    ...(gatePolicy.hard_fail_rules ?? []).map(rule => ({
      ...rule,
      rule_type: 'hard_fail' as const,
    })),
    ...(gatePolicy.soft_warning_rules ?? []).map(rule => ({
      ...rule,
      rule_type: 'soft_warning' as const,
    })),
  ]
}

function isFlatActionBinding(
  binding: EvalExperimentActionBinding,
): binding is EvalExperimentFlatActionBinding {
  return 'variant_id' in binding && 'entry_user_action_id' in binding
}

function isNestedActionBinding(
  binding: EvalExperimentActionBinding,
): binding is EvalExperimentNestedActionBinding {
  return 'baseline_user_action_id' in binding && 'candidate_user_action_ids' in binding
}

function findBoundUserActionId(params: {
  experiment: EvalExperimentV21
  scenarioId: string
  variantId: string
}): string | undefined {
  const { experiment, scenarioId, variantId } = params
  for (const binding of experiment.action_bindings ?? []) {
    if (binding.scenario_id !== scenarioId) continue
    if (isFlatActionBinding(binding) && binding.variant_id === variantId) {
      return binding.entry_user_action_id
    }
    if (isNestedActionBinding(binding)) {
      if (variantId === experiment.baseline_variant_id) return binding.baseline_user_action_id
      return binding.candidate_user_action_ids[variantId]
    }
  }
  return undefined
}

function runBunScript(script: string, args: string[]): string {
  const result = spawnSync(bunExe, ['run', script, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
  })
  if (result.status !== 0) {
    throw new Error(
      [
        `Command failed: bun run ${script} ${args.join(' ')}`,
        String(result.stderr ?? '').trim(),
        String(result.stdout ?? '').trim(),
      ]
        .filter(Boolean)
        .join('\n'),
    )
  }
  return String(result.stdout ?? '')
}

function extractCreatedRunId(output: string): string {
  const match = output.match(/Created V2 run:\s*(\S+)/)
  if (!match?.[1]) {
    throw new Error(`Cannot find created run id in output:\n${output}`)
  }
  return match[1]
}

function extractCreatedReport(output: string): string {
  const match = output.match(/Created comparison report:\s*(.+)/)
  return match?.[1]?.trim() ?? ''
}

async function readRunArtifact(runId: string): Promise<RunArtifact> {
  return readJson<RunArtifact>(path.join(runsRoot, `${runId}.json`))
}

function scoreKey(score: EvalScore): string {
  return `${score.dimension}.${score.subdimension}`
}

function valueFor(scores: EvalScore[], scoreSpecId: string): number | null {
  const score = scores.find(item => scoreKey(item) === scoreSpecId)
  return score?.score_value ?? null
}

function scorecardItem(params: {
  scenarioId: string
  candidateVariantId: string
  scoreSpecId: string
  spec: EvalScoreSpec | undefined
  baselineValue: number | null
  candidateValue: number | null
}): ScorecardItem {
  const {
    scenarioId,
    candidateVariantId,
    scoreSpecId,
    spec,
    baselineValue,
    candidateValue,
  } = params
  const delta =
    baselineValue === null || candidateValue === null
      ? null
      : Number((candidateValue - baselineValue).toFixed(6))
  let interpretation: ScorecardItem['interpretation'] = 'not_applicable'
  if (baselineValue === null || candidateValue === null) {
    interpretation = 'missing'
  } else if (delta === 0) {
    interpretation = 'unchanged'
  } else if (!spec || spec.direction === 'observed_only') {
    interpretation = 'observed'
  } else if (spec.direction === 'lower_is_better') {
    interpretation = candidateValue < baselineValue ? 'improved' : 'regressed'
  } else if (spec.direction === 'higher_is_better' || spec.direction === 'boolean_pass') {
    interpretation = candidateValue > baselineValue ? 'improved' : 'regressed'
  } else {
    interpretation = 'changed'
  }
  return {
    scenario_id: scenarioId,
    candidate_variant_id: candidateVariantId,
    score_spec_id: scoreSpecId,
    direction: spec?.direction ?? 'unknown',
    baseline_value: baselineValue,
    candidate_value: candidateValue,
    delta,
    interpretation,
  }
}

function buildScorecardSummary(params: {
  scenarioId: string
  candidateVariantId: string
  scoreSpecs: Map<string, EvalScoreSpec>
  baselineScores: EvalScore[]
  candidateScores: EvalScore[]
}): ScorecardItem[] {
  const {
    scenarioId,
    candidateVariantId,
    scoreSpecs,
    baselineScores,
    candidateScores,
  } = params
  const scoreSpecIds = [
    ...new Set([
      ...baselineScores.map(scoreKey),
      ...candidateScores.map(scoreKey),
    ]),
  ].sort()
  return scoreSpecIds.map(scoreSpecId =>
    scorecardItem({
      scenarioId,
      candidateVariantId,
      scoreSpecId,
      spec: scoreSpecs.get(scoreSpecId),
      baselineValue: valueFor(baselineScores, scoreSpecId),
      candidateValue: valueFor(candidateScores, scoreSpecId),
    }),
  )
}

function buildExplorationSignals(params: {
  scorecard: ScorecardItem[]
  gateResults: GateResult[]
  experimentValidity?: ExperimentValidity
  variantEffectSummary?: VariantEffectSummary
}): string[] {
  const { scorecard, gateResults, experimentValidity, variantEffectSummary } = params
  const signals: string[] = []
  const changedScores = scorecard.filter(item =>
    ['improved', 'regressed', 'changed', 'observed'].includes(item.interpretation),
  )
  const improvedScores = scorecard.filter(item => item.interpretation === 'improved')
  const regressedScores = scorecard.filter(item => item.interpretation === 'regressed')
  const hardOrSoftGateResults = gateResults.filter(
    result => result.verdict === 'hard_fail' || result.verdict === 'soft_warning',
  )

  if (changedScores.length > 0) {
    signals.push(
      `${changedScores.length} score dimension(s) changed; inspect the scorecard before treating the risk verdict as the final answer.`,
    )
  }
  if (improvedScores.length > 0 && regressedScores.length > 0) {
    signals.push(
      'Candidate shows a tradeoff pattern: at least one score improved while another regressed.',
    )
  }
  if (hardOrSoftGateResults.length > 0 && improvedScores.length > 0) {
    signals.push(
      'Risk gate raised a warning/failure, but at least one score improved; this may be worth exploratory review instead of immediate rejection.',
    )
  }
  if (variantEffectSummary?.runtime_difference_observed) {
    signals.push(
      'A real runtime difference was observed between baseline and candidate; inspect policy evidence before reading score deltas.',
    )
  }
  if (
    experimentValidity?.profile === 'real_experiment' &&
    experimentValidity.status !== 'valid'
  ) {
    signals.push(
      `Real experiment validity is ${experimentValidity.status}; treat score deltas as provisional until the variant effect is clearly observed.`,
    )
  }
  if (signals.length === 0) {
    signals.push(
      'No exploratory signal was derived from the current automatic scorecard; manual review may still find qualitative differences.',
    )
  }
  return signals
}

function recommendReviewMode(params: {
  scorecard: ScorecardItem[]
  gateResults: GateResult[]
  experimentValidity?: ExperimentValidity
}): ReviewMode {
  const { scorecard, gateResults, experimentValidity } = params
  if (experimentValidity?.profile === 'real_experiment') {
    if (experimentValidity.status === 'invalid') return 'manual_review'
    if (experimentValidity.status === 'inconclusive') return 'exploratory_review'
  }
  const hasRisk = gateResults.some(result => result.verdict !== 'pass')
  const hasTradeoff =
    scorecard.some(item => item.interpretation === 'improved') &&
    scorecard.some(item => item.interpretation === 'regressed')
  if (hasTradeoff) return 'exploratory_review'
  if (hasRisk) return 'manual_review'
  return 'regression_review'
}

function regressionPct(params: {
  baselineValue: number | null
  candidateValue: number | null
  direction: EvalScoreSpec['direction']
}): number | null {
  const { baselineValue, candidateValue, direction } = params
  if (baselineValue === null || candidateValue === null) return null
  if (baselineValue === candidateValue) return 0

  const denominator = Math.max(Math.abs(baselineValue), 1)
  if (direction === 'lower_is_better') {
    return candidateValue > baselineValue
      ? ((candidateValue - baselineValue) / denominator) * 100
      : 0
  }
  if (direction === 'higher_is_better' || direction === 'boolean_pass') {
    return candidateValue < baselineValue
      ? ((baselineValue - candidateValue) / denominator) * 100
      : 0
  }
  return null
}

function rulePassed(params: {
  rule: EvalGatePolicyRule
  baselineValue: number | null
  candidateValue: number | null
  regressionPctValue: number | null
  taskSuccessNotImproved: boolean
}): boolean {
  const {
    rule,
    baselineValue,
    candidateValue,
    regressionPctValue,
    taskSuccessNotImproved,
  } = params

  if (rule.condition === 'candidate < baseline') {
    if (baselineValue === null || candidateValue === null) return true
    return !(candidateValue < baselineValue)
  }

  if (rule.condition.includes('candidate_regression_pct >')) {
    if (regressionPctValue === null) return true
    const threshold = rule.threshold ?? 0
    const exceeds = regressionPctValue > threshold
    if (rule.condition.includes('task_success_not_improved')) {
      return !(exceeds && taskSuccessNotImproved)
    }
    return !exceeds
  }

  return true
}

function isSupportedGateCondition(condition: string): boolean {
  return condition === 'candidate < baseline' || condition.includes('candidate_regression_pct >')
}

function evaluateGate(params: {
  scenarioId: string
  candidateVariantId: string
  gatePolicy: EvalGatePolicy | undefined
  scoreSpecs: Map<string, EvalScoreSpec>
  baselineScores: EvalScore[]
  candidateScores: EvalScore[]
}): GateResult[] {
  const {
    scenarioId,
    candidateVariantId,
    gatePolicy,
    scoreSpecs,
    baselineScores,
    candidateScores,
  } = params
  const rules = normalizeGateRules(gatePolicy)
  if (rules.length === 0) return []

  const taskBaseline = valueFor(baselineScores, 'task_success.main_chain_observed')
  const taskCandidate = valueFor(candidateScores, 'task_success.main_chain_observed')
  const taskSuccessNotImproved =
    taskBaseline !== null && taskCandidate !== null && taskCandidate <= taskBaseline

  return rules.map(rule => {
    const spec = scoreSpecs.get(rule.score_spec_id)
    const baselineValue = valueFor(baselineScores, rule.score_spec_id)
    const candidateValue = valueFor(candidateScores, rule.score_spec_id)
    const hasMissingScore = baselineValue === null || candidateValue === null
    const hasUnsupportedCondition = !isSupportedGateCondition(rule.condition)
    const regressionPctValue = spec
      ? regressionPct({
          baselineValue,
          candidateValue,
          direction: spec.direction,
        })
      : null
    const passed =
      !hasMissingScore &&
      !hasUnsupportedCondition &&
      rulePassed({
        rule,
        baselineValue,
        candidateValue,
        regressionPctValue,
        taskSuccessNotImproved,
      })
    const verdict: GateResult['verdict'] = hasMissingScore
      ? 'missing'
      : !spec || hasUnsupportedCondition
        ? 'inconclusive'
        : passed
          ? 'pass'
          : rule.rule_type
    return {
      scenario_id: scenarioId,
      candidate_variant_id: candidateVariantId,
      rule_type: rule.rule_type,
      score_spec_id: rule.score_spec_id,
      verdict,
      passed,
      baseline_value: baselineValue,
      candidate_value: candidateValue,
      regression_pct:
        regressionPctValue === null ? null : Number(regressionPctValue.toFixed(3)),
      condition: rule.condition,
      notes: rule.notes,
    }
  })
}

function buildRecordRunArgs(params: {
  scenarioId: string
  variantId: string
  userActionId: string
  runGroupId: string
  repeatIndex: number
  scoreSpecIds: string[]
  dbPath?: string
  snapshotDb: boolean
}): string[] {
  const args = [
    '--scenario',
    params.scenarioId,
    '--variant',
    params.variantId,
    '--user-action-id',
    params.userActionId,
    '--run-group-id',
    params.runGroupId,
    '--repeat-index',
    String(params.repeatIndex),
  ]
  if (params.snapshotDb) args.push('--snapshot-db')
  if (params.dbPath) args.push('--db', params.dbPath)
  if (params.scoreSpecIds.length > 0) {
    args.push('--score-spec-ids', params.scoreSpecIds.join(','))
  }
  return args
}

function requireCapturedAction(params: {
  label: string
  result: ExecuteHarnessResult
}): string {
  const { label, result } = params
  if (result.execution.status !== 'completed') {
    throw new Error(
      `${label} execute_harness failed: ${result.execution.error ?? result.execution.status}`,
    )
  }
  if (result.capture.status !== 'captured' || !result.capture.user_action_id) {
    throw new Error(
      `${label} action capture ${result.capture.status}: ${result.capture.error ?? 'no user_action_id'}`,
    )
  }
  return result.capture.user_action_id
}

function summarizeRisk(results: ScenarioExperimentResult[]): RiskVerdict {
  const candidates = results.flatMap(result => result.candidates)
  const allGateResults = candidates.flatMap(candidate => candidate.gate_results)
  const hardFailCount = allGateResults.filter(result => result.verdict === 'hard_fail').length
  const softWarningCount = allGateResults.filter(
    result => result.verdict === 'soft_warning',
  ).length
  const missingScoreCount = allGateResults.filter(result => result.verdict === 'missing').length
  const inconclusiveCount = allGateResults.filter(
    result => result.verdict === 'inconclusive',
  ).length
  return {
    status:
      hardFailCount > 0
        ? 'fail'
        : missingScoreCount > 0 || inconclusiveCount > 0
          ? 'inconclusive'
          : softWarningCount > 0
            ? 'warning'
            : 'pass',
    scope: 'regression_risk_only',
    is_final_experiment_judgment: false,
    hard_fail_count: hardFailCount,
    soft_warning_count: softWarningCount,
    missing_score_count: missingScoreCount,
    inconclusive_count: inconclusiveCount,
    candidate_count: candidates.length,
    notes:
      'This verdict is only a regression-risk gate result. It is not a final judgment about model intelligence, harness value, or exploratory potential.',
  }
}

function aggregateScorecard(results: ScenarioExperimentResult[]): ScorecardItem[] {
  return results.flatMap(result =>
    result.candidates.flatMap(candidate => candidate.scorecard_summary),
  )
}

function aggregateExplorationSignals(results: ScenarioExperimentResult[]): string[] {
  return [
    ...new Set(
      results.flatMap(result =>
        result.candidates.flatMap(candidate => candidate.exploration_signals),
      ),
    ),
  ]
}

function aggregateReviewMode(results: ScenarioExperimentResult[]): ReviewMode {
  const modes = results.flatMap(result =>
    result.candidates.map(candidate => candidate.recommended_review_mode),
  )
  if (modes.includes('exploratory_review')) return 'exploratory_review'
  if (modes.includes('manual_review')) return 'manual_review'
  return 'regression_review'
}

function runRefs(results: ScenarioExperimentResult[]): string[] {
  return results.flatMap(result => [
    path.join('tests', 'evals', 'v2', 'runs', `${result.baseline_run_id}.json`),
    ...result.candidates.map(candidate =>
      path.join('tests', 'evals', 'v2', 'runs', `${candidate.candidate_run_id}.json`),
    ),
  ])
}

function scoreRefs(results: ScenarioExperimentResult[]): string[] {
  return results.flatMap(result => [
    path.join('tests', 'evals', 'v2', 'scores', `${result.baseline_run_id}.scores.json`),
    ...result.candidates.map(candidate =>
      path.join('tests', 'evals', 'v2', 'scores', `${candidate.candidate_run_id}.scores.json`),
    ),
  ])
}

function reportRefs(params: {
  results: ScenarioExperimentResult[]
  experimentReport: string
  batchReport: string
}): string[] {
  return [
    ...params.results.flatMap(result =>
      result.candidates.map(candidate => candidate.compare_report),
    ),
    params.batchReport,
    params.experimentReport,
  ].filter(Boolean)
}

function syntheticRunId(params: {
  scenarioId: string
  variantId: string
  userActionId: string
}): string {
  return sanitizeId(
    `run_${new Date().toISOString().replaceAll(':', '').replaceAll('.', '')}_${params.scenarioId}_${params.variantId}_${params.userActionId.slice(0, 8)}`,
  )
}

async function synthesizeFixtureRun(params: {
  experiment: EvalExperimentV21
  scenario: EvalScenario
  variant: EvalVariant
  runGroupId: string
  repeatIndex: number
  scoreSpecIds: string[]
}): Promise<{
  runId: string
  userActionId: string
  scores: EvalScore[]
  runArtifact: RunArtifact
  execution: ExecuteHarnessResult
}> {
  const now = new Date()
  const startedAt = now.toISOString()
  const endedAt = new Date(now.getTime() + 10).toISOString()
  const userActionId = randomUUID()
  const queryId = randomUUID()
  const identity = createRunIdentity({
    experimentId: params.experiment.experiment_id,
    scenarioId: params.scenario.scenario_id,
    variantId: params.variant.variant_id,
    stamp: now.toISOString().replace(/[:.]/g, ''),
    repeatIndex: params.repeatIndex,
  })
  const variantApply = applyVariantV0({
    variant: params.variant,
    execution: params.experiment.execution,
    context: {
      experiment_id: params.experiment.experiment_id,
      scenario_id: params.scenario.scenario_id,
      variant_id: params.variant.variant_id,
      benchmark_run_id: identity.benchmark_run_id,
      eval_run_id: identity.eval_run_id,
    },
  })
  const longContextFixture = await buildLongContextFixtureEvidence({
    scenarioId: params.scenario.scenario_id,
    variantId: params.variant.variant_id,
    env: variantApply.env,
  })
  const tokenBase =
    longContextFixture?.tokenBase ??
    (params.variant.variant_id === 'baseline_default'
      ? 110
      : params.variant.variant_id.includes('sparse')
        ? 100
        : params.variant.variant_id.includes('shadow')
          ? 105
          : params.variant.variant_id.includes('guarded')
            ? 98
            : 104)
  const turnCount = longContextFixture?.turnCount ?? 1
  const subagentCount = longContextFixture?.subagentCount ?? 0
  const toolCallCount = longContextFixture?.toolCallCount ?? 0
  const action: JsonRecord = {
    event_date: startedAt.slice(0, 10),
    user_action_id: userActionId,
    started_at: startedAt,
    ended_at: endedAt,
    duration_ms: 10,
    subagent_count: subagentCount,
    tool_call_count: toolCallCount,
    total_billed_tokens: tokenBase,
    total_prompt_input_tokens: tokenBase - 10,
    raw_input_tokens: tokenBase - 10,
    output_tokens: 10,
    cache_read_tokens: 0,
    cache_create_tokens: 0,
    main_thread_total_prompt_input_tokens: tokenBase - 10,
    subagent_total_prompt_input_tokens: 0,
  }
  const rootQuery: JsonRecord = {
    query_id: queryId,
    turn_count: turnCount,
    terminal_reason: 'fixture_completed',
  }
  const tools = Array.from({ length: toolCallCount }, (_, index) => ({
    tool_name: index === 0 ? 'Read' : 'Search',
    is_closed: true,
    has_failed: false,
  }))
  const subagents = Array.from({ length: subagentCount }, () => ({
    subagent_count: 1,
    subagent_reason: 'session_memory',
    subagent_trigger_kind: 'context_pressure',
    subagent_trigger_detail: params.scenario.scenario_id,
  }))
  const recoveries: JsonRecord[] = []
  const integrity: JsonRecord = {
    strict_query_completion_rate: 1,
    strict_turn_state_closure_rate: 1,
    tool_lifecycle_closure_rate: 1,
    subagent_lifecycle_closure_rate: 1,
  }
  const longContext =
    longContextFixture?.payload && params.scenario.long_context_profile
      ? {
          context_family: params.scenario.long_context_profile.context_family,
          context_size_class: params.scenario.long_context_profile.context_size_class,
          fixture_ref: params.scenario.long_context_profile.fixture_ref,
          expected_retained_constraints:
            params.scenario.long_context_profile.expected_retained_constraints,
          expected_retrieved_facts:
            params.scenario.long_context_profile.expected_retrieved_facts,
          distractor_refs: params.scenario.long_context_profile.distractor_refs,
          forbidden_confusions: params.scenario.long_context_profile.forbidden_confusions,
          manual_review_questions:
            params.scenario.long_context_profile.manual_review_questions,
          total_prompt_input_tokens: tokenBase - 10,
          ...longContextFixture.payload,
        }
      : null
  const variantEffect: JsonRecord = {
    effect_type: 'fixture_variant',
    policy_event_observed: false,
    variant_effect_observed: params.variant.variant_id.includes('sparse'),
    observed_policy: null,
    session_memory_subagent_count: subagentCount,
    session_memory_trigger_details: longContextFixture
      ? [params.scenario.scenario_id]
      : [],
  }
  const runId = syntheticRunId({
    scenarioId: params.scenario.scenario_id,
    variantId: params.variant.variant_id,
    userActionId,
  })
  const binding = {
    binding_mode: 'fact_only' as const,
    entry_user_action_id: userActionId,
    root_query_id: String(rootQuery.query_id),
    observability_db_ref: 'fixture_trace://synthetic',
    bind_passed: true,
    binding_failure_reason: null,
  }
  const run = {
    run_id: runId,
    scenario_id: params.scenario.scenario_id,
    variant_id: params.variant.variant_id,
    run_group_id: params.runGroupId,
    repeat_index: params.repeatIndex,
    started_at: startedAt,
    ended_at: endedAt,
    status: 'completed' as const,
    entry_user_action_id: userActionId,
    root_query_id: String(rootQuery.query_id),
    observability_db_ref: 'fixture_trace://synthetic',
    binding,
    notes: 'Synthetic fixture_trace run generated by V2.4 fast path.',
  }
  const scores = buildScoresForSpecIds(
    {
      runId,
      scenario: params.scenario,
      action,
      rootQuery,
      integrity,
      tools,
      subagents,
      recoveries,
      variantEffect,
      longContext: longContext ?? undefined,
    },
    params.scoreSpecIds,
  )

  await mkdir(runsRoot, { recursive: true })
  await mkdir(scoresRoot, { recursive: true })
  await writeFile(
    path.join(runsRoot, `${runId}.json`),
    `${JSON.stringify(
      {
        run,
        binding,
        scenario: params.scenario,
        variant: params.variant,
        evidence: {
          action,
          rootQuery,
          tools,
          subagents,
          recoveries,
        },
        variant_effect: variantEffect,
        long_context: longContext,
      },
      null,
      2,
    )}\n`,
  )
  await writeFile(
    path.join(scoresRoot, `${runId}.scores.json`),
    `${JSON.stringify(scores, null, 2)}\n`,
  )

  return {
    runId,
    userActionId,
    scores,
    runArtifact: {
      run,
      variant_effect: variantEffect,
      ...(longContext ? { long_context: longContext } : {}),
    } as RunArtifact,
    execution: {
      execution: {
        status: 'completed',
        stdoutRef: 'fixture_trace://synthetic',
        stderrRef: 'fixture_trace://synthetic',
      },
      capture: {
        status: 'captured',
        user_action_id: userActionId,
        match_count: 1,
      },
      variant_apply: variantApply,
      benchmark_run_id: identity.benchmark_run_id,
      eval_run_id: identity.eval_run_id,
    },
  }
}

async function writeSyntheticCompareReport(params: {
  baselineRunId: string
  candidateRunId: string
  scorecard: ScorecardItem[]
  variantEffectSummary: VariantEffectSummary
}): Promise<string> {
  const reportRoot = await resolveReportRoot()
  await mkdir(reportRoot, { recursive: true })
  const reportPath = path.join(
    reportRoot,
    `compare_${params.baselineRunId}_vs_${params.candidateRunId}.md`,
  )
  const rows = params.scorecard
    .map(
      item =>
        `| ${item.score_spec_id} | ${item.baseline_value ?? 'n/a'} | ${item.candidate_value ?? 'n/a'} | ${item.delta ?? 'n/a'} | ${item.interpretation} |`,
    )
    .join('\n')
  await writeFile(
    reportPath,
    `# Synthetic Compare: ${params.baselineRunId} vs ${params.candidateRunId}

## Scorecard

| score | baseline | candidate | delta | interpretation |
| --- | ---: | ---: | ---: | --- |
${rows || '| n/a | n/a | n/a | n/a | n/a |'}

## Variant Effect Summary

- scenario: ${params.variantEffectSummary.scenario_id}
- candidate_variant: ${params.variantEffectSummary.candidate_variant_id}
- baseline_policy_mode: ${params.variantEffectSummary.baseline_policy_mode}
- candidate_policy_mode: ${params.variantEffectSummary.candidate_policy_mode}
- candidate_variant_effect_observed: ${params.variantEffectSummary.candidate_variant_effect_observed}
- runtime_difference_observed: ${params.variantEffectSummary.runtime_difference_observed}

${params.variantEffectSummary.summary.map(item => `- ${item}`).join('\n')}
`,
  )
  return path.relative(repoRoot, reportPath)
}

function numberOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(6))
}

function variance(values: number[]): number | null {
  if (values.length < 2) return 0
  const avg = mean(values)
  if (avg === null) return null
  return Number(
    (values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length).toFixed(6),
  )
}

function stddev(values: number[]): number | null {
  const value = variance(values)
  return value === null ? null : Number(Math.sqrt(value).toFixed(6))
}

function minValue(values: number[]): number | null {
  return values.length === 0 ? null : Math.min(...values)
}

function maxValue(values: number[]): number | null {
  return values.length === 0 ? null : Math.max(...values)
}

function meanFromUnknown(values: unknown[]): number | null {
  return mean(
    values
      .map(numberOrNull)
      .filter((value): value is number => value !== null),
  )
}

function scoreValue(scores: EvalScore[], scoreSpecId: string): number | null {
  return valueFor(scores, scoreSpecId)
}

function hasPolicyEventObserved(variantEffect: JsonRecord | undefined): boolean {
  return asBoolean(variantEffect?.policy_event_observed)
}

function hasVariantEffectObserved(variantEffect: JsonRecord | undefined): boolean {
  return asBoolean(variantEffect?.variant_effect_observed)
}

function observedPolicyMode(variantEffect: JsonRecord | undefined): string {
  const observedPolicy = variantEffect?.observed_policy
  if (observedPolicy && typeof observedPolicy === 'object' && !Array.isArray(observedPolicy)) {
    return asString((observedPolicy as JsonRecord).mode) || 'unknown'
  }
  return 'unknown'
}

function policySignature(variantEffect: JsonRecord | undefined): string {
  const observedPolicy = variantEffect?.observed_policy
  if (!observedPolicy || typeof observedPolicy !== 'object' || Array.isArray(observedPolicy)) {
    return ''
  }
  return JSON.stringify(observedPolicy)
}

function runtimeDifferenceAnalysis(params: {
  scenarioId: string
  candidateVariantId: string
  baselineVariantEffect: JsonRecord | undefined
  candidateVariantEffect: JsonRecord | undefined
  scorecard: ScorecardItem[]
}): VariantEffectSummary {
  const {
    scenarioId,
    candidateVariantId,
    baselineVariantEffect,
    candidateVariantEffect,
    scorecard,
  } = params
  const summary: string[] = []
  const baselineObserved = hasPolicyEventObserved(baselineVariantEffect)
  const candidateObserved = hasPolicyEventObserved(candidateVariantEffect)
  const candidateEffectObserved = hasVariantEffectObserved(candidateVariantEffect)
  const baselineMode = observedPolicyMode(baselineVariantEffect)
  const candidateMode = observedPolicyMode(candidateVariantEffect)
  const baselinePolicySig = policySignature(baselineVariantEffect)
  const candidatePolicySig = policySignature(candidateVariantEffect)
  const baselineSubagentCount = asNumber(
    baselineVariantEffect?.session_memory_subagent_count,
  )
  const candidateSubagentCount = asNumber(
    candidateVariantEffect?.session_memory_subagent_count,
  )
  const baselineTriggerDetails = [
    ...asStringArray(baselineVariantEffect?.session_memory_trigger_details),
  ].sort()
  const candidateTriggerDetails = [
    ...asStringArray(candidateVariantEffect?.session_memory_trigger_details),
  ].sort()
  const triggerDetailsChanged =
    baselineTriggerDetails.join('|') !== candidateTriggerDetails.join('|')
  const policyChanged =
    baselinePolicySig !== '' &&
    candidatePolicySig !== '' &&
    baselinePolicySig !== candidatePolicySig
  const scoreChanged = scorecard.some(item =>
    ['improved', 'regressed', 'changed', 'observed'].includes(item.interpretation),
  )

  if (baselineObserved) {
    summary.push(`Baseline session_memory policy was observed with mode=${baselineMode}.`)
  } else {
    summary.push('Baseline session_memory policy was not observed in V1 events.')
  }
  if (candidateObserved) {
    summary.push(`Candidate session_memory policy was observed with mode=${candidateMode}.`)
  } else {
    summary.push('Candidate session_memory policy was not observed in V1 events.')
  }
  if (candidateEffectObserved) {
    summary.push('Candidate sparse-policy markers were observed in runtime evidence.')
  }
  if (policyChanged) {
    summary.push('Observed baseline and candidate session_memory policies differ.')
  }
  if (baselineSubagentCount !== candidateSubagentCount) {
    summary.push(
      `Session_memory subagent count changed from ${baselineSubagentCount} to ${candidateSubagentCount}.`,
    )
  }
  if (triggerDetailsChanged) {
    summary.push(
      `Session_memory trigger details changed from [${baselineTriggerDetails.join(', ') || 'none'}] to [${candidateTriggerDetails.join(', ') || 'none'}].`,
    )
  }
  if (scoreChanged) {
    summary.push('At least one score dimension changed between baseline and candidate.')
  }

  const runtimeDifferenceObserved =
    candidateEffectObserved &&
    (policyChanged ||
      baselineSubagentCount !== candidateSubagentCount ||
      triggerDetailsChanged)

  if (!runtimeDifferenceObserved) {
    summary.push(
      'No stable runtime difference was observed yet; any score delta may still be execution noise rather than a proven harness effect.',
    )
  }

  return {
    scenario_id: scenarioId,
    candidate_variant_id: candidateVariantId,
    baseline_variant_effect_observed: baselineObserved,
    candidate_variant_effect_observed: candidateEffectObserved,
    runtime_difference_observed: runtimeDifferenceObserved,
    baseline_policy_mode: baselineMode,
    candidate_policy_mode: candidateMode,
    summary,
  }
}

function buildExperimentValidity(params: {
  profile: ExperimentProfile
  scenarioId: string
  candidateVariantId: string
  scenario?: EvalScenario
  baselineExecution?: ExecuteHarnessResult
  candidateExecution?: ExecuteHarnessResult
  scorecard: ScorecardItem[]
  variantEffectSummary: VariantEffectSummary
}): ExperimentValidity {
  const {
    profile,
    scenarioId,
    candidateVariantId,
    scenario,
    baselineExecution,
    candidateExecution,
    scorecard,
    variantEffectSummary,
  } = params
  const longContextMode = isLongContextScenario(scenario)
  const baselineCaptured =
    baselineExecution === undefined || baselineExecution.capture.status === 'captured'
  const candidateCaptured =
    candidateExecution === undefined || candidateExecution.capture.status === 'captured'
  const noAmbiguousCapture =
    baselineExecution?.capture.status !== 'ambiguous_capture' &&
    candidateExecution?.capture.status !== 'ambiguous_capture'
  const scoreEvidencePresent = scorecard.some(item => item.interpretation !== 'missing')
  const longContextScoreEvidencePresent = scorecard.some(
    item =>
      item.score_spec_id.startsWith('context.') && item.interpretation !== 'missing',
  )
  const effectiveScoreEvidencePresent = longContextMode
    ? longContextScoreEvidencePresent || scoreEvidencePresent
    : scoreEvidencePresent
  const variantEffectObserved = longContextMode
    ? effectiveScoreEvidencePresent
    : variantEffectSummary.candidate_variant_effect_observed
  const runtimeDifferenceObserved = longContextMode
    ? effectiveScoreEvidencePresent
    : variantEffectSummary.runtime_difference_observed
  const scenarioIntentMatched =
    longContextMode
      ? baselineCaptured && candidateCaptured && effectiveScoreEvidencePresent
      : profile === 'smoke'
      ? baselineCaptured && candidateCaptured
      : variantEffectObserved && runtimeDifferenceObserved

  const blockers: string[] = []
  const warnings: string[] = []
  if (!baselineCaptured) {
    blockers.push(
      `baseline_not_captured: scenario=${scenarioId}, candidate=${candidateVariantId}`,
    )
  }
  if (!candidateCaptured) {
    blockers.push(
      `candidate_not_captured: scenario=${scenarioId}, candidate=${candidateVariantId}`,
    )
  }
  if (!noAmbiguousCapture) {
    blockers.push(
      `ambiguous_capture_present: scenario=${scenarioId}, candidate=${candidateVariantId}`,
    )
  }
  if (!effectiveScoreEvidencePresent) {
    blockers.push(
      `${longContextMode ? 'long_context_score_evidence_missing' : 'score_evidence_missing'}: scenario=${scenarioId}, candidate=${candidateVariantId}`,
    )
  }
  if (profile === 'real_experiment' && !longContextMode && !variantEffectObserved) {
    blockers.push(
      `variant_effect_not_observed: scenario=${scenarioId}, candidate=${candidateVariantId}`,
    )
  }
  if (
    profile === 'real_experiment' &&
    !longContextMode &&
    variantEffectObserved &&
    !runtimeDifferenceObserved
  ) {
    warnings.push(
      `runtime_difference_not_observed: scenario=${scenarioId}, candidate=${candidateVariantId}`,
    )
  }
  if (
    longContextMode &&
    profile === 'real_experiment' &&
    !longContextScoreEvidencePresent
  ) {
    warnings.push(
      `long_context_manual_review_only: scenario=${scenarioId}, candidate=${candidateVariantId}`,
    )
  }
  if (profile === 'real_experiment' && !scenarioIntentMatched) {
    warnings.push(
      `scenario_intent_not_matched: scenario=${scenarioId}, candidate=${candidateVariantId}`,
    )
  }

  const status: ExperimentValidity['status'] =
    blockers.length > 0 ? 'invalid' : warnings.length > 0 ? 'inconclusive' : 'valid'
  const reason =
    status === 'valid'
      ? longContextMode
        ? profile === 'smoke'
          ? 'Long-context fixture smoke passed: the trace-backed scoring and reporting loop is healthy.'
          : 'Long-context real smoke captured interpretable trace-backed context-governance evidence.'
        : profile === 'smoke'
        ? 'Smoke check passed: execute_harness closed the automatic execution and capture loop.'
        : 'Real experiment is valid: runtime effect was observed and the baseline/candidate difference is interpretable.'
      : status === 'invalid'
        ? `Experiment is invalid because: ${blockers.join('; ')}`
        : `Experiment is inconclusive because: ${warnings.join('; ')}`

  return {
    status,
    profile,
    reason,
    blockers,
    warnings,
    checks: {
      baseline_captured: baselineCaptured,
      candidate_captured: candidateCaptured,
      no_ambiguous_capture: noAmbiguousCapture,
      score_evidence_present: effectiveScoreEvidencePresent,
      variant_effect_observed: variantEffectObserved,
      runtime_difference_observed: runtimeDifferenceObserved,
      scenario_intent_matched: scenarioIntentMatched,
    },
  }
}

function aggregateExperimentValidity(results: ScenarioExperimentResult[]): ExperimentValidity {
  const validities = results.flatMap(result =>
    result.candidates
      .map(candidate => candidate.experiment_validity)
      .filter((value): value is ExperimentValidity => Boolean(value)),
  )
  const blockers = validities.flatMap(validity => validity.blockers)
  const warnings = validities.flatMap(validity => validity.warnings)
  const status: ExperimentValidity['status'] =
    validities.some(validity => validity.status === 'invalid')
      ? 'invalid'
      : validities.some(validity => validity.status === 'inconclusive')
        ? 'inconclusive'
        : 'valid'
  const profile = validities[0]?.profile ?? 'smoke'
  return {
    status,
    profile,
    reason:
      status === 'valid'
        ? profile === 'smoke'
          ? 'Smoke check remains healthy.'
          : 'Real experiment remains interpretable.'
        : status === 'invalid'
          ? `At least one scenario/candidate pair is invalid: ${blockers.join('; ')}`
          : `At least one scenario/candidate pair is inconclusive: ${warnings.join('; ')}`,
    blockers,
    warnings,
    checks: {
      baseline_captured: validities.every(validity => validity.checks.baseline_captured),
      candidate_captured: validities.every(validity => validity.checks.candidate_captured),
      no_ambiguous_capture: validities.every(validity => validity.checks.no_ambiguous_capture),
      score_evidence_present: validities.every(validity => validity.checks.score_evidence_present),
      variant_effect_observed: validities.every(validity => validity.checks.variant_effect_observed),
      runtime_difference_observed: validities.every(
        validity => validity.checks.runtime_difference_observed,
      ),
      scenario_intent_matched: validities.every(
        validity => validity.checks.scenario_intent_matched,
      ),
    },
  }
}

function aggregateVariantEffectSummary(results: ScenarioExperimentResult[]): VariantEffectSummary[] {
  return results.flatMap(result =>
    result.candidates
      .map(candidate => candidate.variant_effect_summary)
      .filter((value): value is VariantEffectSummary => Boolean(value)),
  )
}

function isLongContextScenario(scenario: EvalScenario | undefined): boolean {
  return Boolean(scenario?.long_context_profile)
}

function longContextStringArray(value: JsonRecord | undefined, key: string): string[] {
  return asStringArray(value?.[key])
}

function longContextNumber(value: JsonRecord | undefined, key: string): number | null {
  return numberOrNull(value?.[key])
}

async function aggregateLongContextSummary(
  results: ScenarioExperimentResult[],
): Promise<LongContextSummaryItem[]> {
  const grouped = new Map<
    string,
    {
      scenario_id: string
      candidate_variant_id: string
      repeat_count: number
      context_family: string
      context_size_class: string
      retainedCounts: number[]
      lostCounts: number[]
      retentionRates: number[]
      retrievedCounts: number[]
      missedCounts: number[]
      hitRates: number[]
      distractorCounts: number[]
      compactionTriggers: number[]
      compactionSavedTokens: number[]
      toolResultBudgetTriggers: number[]
      totalPromptInputTokens: number[]
      promptTokenDeltas: number[]
      successRates: number[]
      manualReviewQuestions: string[]
      manualReviewRequired: boolean
    }
  >()

  for (const result of results) {
    const baselineArtifact = await readRunArtifact(result.baseline_run_id)
    const baselineLongContext = asJsonRecord((baselineArtifact as JsonRecord).long_context)
    for (const candidate of result.candidates) {
      const candidateArtifact = await readRunArtifact(candidate.candidate_run_id)
      const candidateLongContext = asJsonRecord((candidateArtifact as JsonRecord).long_context)
      if (!candidateLongContext && !baselineLongContext) continue

      const summaryKey = `${result.scenario_id}::${candidate.candidate_variant_id}`
      const entry =
        grouped.get(summaryKey) ??
        {
          scenario_id: result.scenario_id,
          candidate_variant_id: candidate.candidate_variant_id,
          repeat_count: 0,
          context_family:
            asString(candidateLongContext?.context_family) ||
            asString(baselineLongContext?.context_family) ||
            'unknown',
          context_size_class:
            asString(candidateLongContext?.context_size_class) ||
            asString(baselineLongContext?.context_size_class) ||
            'unknown',
          retainedCounts: [],
          lostCounts: [],
          retentionRates: [],
          retrievedCounts: [],
          missedCounts: [],
          hitRates: [],
          distractorCounts: [],
          compactionTriggers: [],
          compactionSavedTokens: [],
          toolResultBudgetTriggers: [],
          totalPromptInputTokens: [],
          promptTokenDeltas: [],
          successRates: [],
          manualReviewQuestions: [],
          manualReviewRequired: false,
        }
      entry.repeat_count += 1

      const retained = longContextStringArray(
        candidateLongContext,
        'observed_retained_constraints',
      ).length
      const lost = longContextStringArray(
        candidateLongContext,
        'observed_lost_constraints',
      ).length
      const retrieved = longContextStringArray(
        candidateLongContext,
        'observed_retrieved_facts',
      ).length
      const missed = longContextStringArray(
        candidateLongContext,
        'observed_missed_facts',
      ).length
      const confusions = longContextStringArray(candidateLongContext, 'observed_confusions').length
      const retainedRate =
        retained + lost > 0 ? Number((retained / (retained + lost)).toFixed(6)) : null
      const hitRate =
        retrieved + missed > 0
          ? Number((retrieved / (retrieved + missed)).toFixed(6))
          : null
      const compactionTriggerCount = longContextNumber(
        candidateLongContext,
        'compaction_trigger_count',
      )
      const compactionSavedTokens = longContextNumber(
        candidateLongContext,
        'compaction_saved_tokens',
      )
      const toolResultBudgetTriggers = longContextNumber(
        candidateLongContext,
        'tool_result_budget_trigger_count',
      )
      const totalPromptInputTokens = longContextNumber(
        candidateLongContext,
        'total_prompt_input_tokens',
      )
      const baselinePromptInputTokens = longContextNumber(
        baselineLongContext,
        'total_prompt_input_tokens',
      )
      const successRate = longContextNumber(
        candidateLongContext,
        'success_under_context_pressure',
      )
      if (retainedRate !== null) entry.retentionRates.push(retainedRate)
      if (hitRate !== null) entry.hitRates.push(hitRate)
      entry.retainedCounts.push(retained)
      entry.lostCounts.push(lost)
      entry.retrievedCounts.push(retrieved)
      entry.missedCounts.push(missed)
      entry.distractorCounts.push(confusions)
      if (compactionTriggerCount !== null) entry.compactionTriggers.push(compactionTriggerCount)
      if (compactionSavedTokens !== null) entry.compactionSavedTokens.push(compactionSavedTokens)
      if (toolResultBudgetTriggers !== null) {
        entry.toolResultBudgetTriggers.push(toolResultBudgetTriggers)
      }
      if (totalPromptInputTokens !== null) entry.totalPromptInputTokens.push(totalPromptInputTokens)
      if (baselinePromptInputTokens !== null && totalPromptInputTokens !== null) {
        entry.promptTokenDeltas.push(totalPromptInputTokens - baselinePromptInputTokens)
      }
      if (successRate !== null) entry.successRates.push(successRate)
      entry.manualReviewQuestions = uniqueStrings([
        ...entry.manualReviewQuestions,
        ...longContextStringArray(candidateLongContext, 'manual_review_questions'),
      ])
      entry.manualReviewRequired =
        entry.manualReviewRequired ||
        asBoolean(candidateLongContext?.manual_review_required) ||
        entry.manualReviewQuestions.length > 0
      grouped.set(summaryKey, entry)
    }
  }

  return [...grouped.values()]
    .map(entry => {
      const retainedConstraintMean = mean(entry.retainedCounts)
      const lostConstraintMean = mean(entry.lostCounts)
      const constraintRetentionRateMean = mean(entry.retentionRates)
      const retrievedFactMean = mean(entry.retrievedCounts)
      const missedFactMean = mean(entry.missedCounts)
      const retrievedFactHitRateMean = mean(entry.hitRates)
      const distractorConfusionMean = mean(entry.distractorCounts)
      const compactionTriggerMean = mean(entry.compactionTriggers)
      const compactionSavedTokensMean = mean(entry.compactionSavedTokens)
      const toolResultBudgetTriggerMean = mean(entry.toolResultBudgetTriggers)
      const totalPromptInputTokensMean = mean(entry.totalPromptInputTokens)
      const promptTokenDeltaMean = mean(entry.promptTokenDeltas)
      const successUnderContextPressureRate = mean(entry.successRates)
      const interpretation: string[] = []

      if (lostConstraintMean !== null && lostConstraintMean > 0) {
        interpretation.push(
          `Candidate still loses an average of ${lostConstraintMean.toFixed(3)} hard constraints under context pressure.`,
        )
      } else if (constraintRetentionRateMean !== null) {
        interpretation.push(
          `Observed constraint retention remained at ${(constraintRetentionRateMean * 100).toFixed(1)}%.`,
        )
      }
      if (retrievedFactHitRateMean === null) {
        interpretation.push(
          'Automatic fact-retrieval quality could not be fully established from trace-backed evidence alone.',
        )
      } else {
        interpretation.push(
          `Observed fact retrieval hit rate is ${(retrievedFactHitRateMean * 100).toFixed(1)}%.`,
        )
      }
      if (distractorConfusionMean !== null && distractorConfusionMean > 0) {
        interpretation.push(
          `Distractor confusion remains observable with mean count ${distractorConfusionMean.toFixed(3)}.`,
        )
      } else {
        interpretation.push('No distractor confusion was observed in the current evidence window.')
      }
      if (compactionTriggerMean !== null && compactionTriggerMean > 0) {
        interpretation.push(
          `Compaction/tool-result governance was active with mean compaction trigger count ${compactionTriggerMean.toFixed(3)} and mean saved tokens ${compactionSavedTokensMean ?? 0}.`,
        )
      }
      if (promptTokenDeltaMean !== null) {
        interpretation.push(
          `Relative to baseline, candidate prompt-token delta mean is ${promptTokenDeltaMean.toFixed(3)}.`,
        )
      }
      if (
        successUnderContextPressureRate !== null &&
        successUnderContextPressureRate < 1
      ) {
        interpretation.push(
          `Success under context pressure is incomplete at ${(successUnderContextPressureRate * 100).toFixed(1)}%.`,
        )
      }
      if (entry.manualReviewQuestions.length > 0) {
        interpretation.push(
          `Manual review remains open for ${entry.manualReviewQuestions.length} question(s).`,
        )
      }

      return {
        scenario_id: entry.scenario_id,
        candidate_variant_id: entry.candidate_variant_id,
        repeat_count: entry.repeat_count,
        context_family: entry.context_family,
        context_size_class: entry.context_size_class,
        retained_constraint_mean: retainedConstraintMean,
        lost_constraint_mean: lostConstraintMean,
        constraint_retention_rate_mean: constraintRetentionRateMean,
        retrieved_fact_mean: retrievedFactMean,
        missed_fact_mean: missedFactMean,
        retrieved_fact_hit_rate_mean: retrievedFactHitRateMean,
        distractor_confusion_mean: distractorConfusionMean,
        compaction_trigger_mean: compactionTriggerMean,
        compaction_saved_tokens_mean: compactionSavedTokensMean,
        tool_result_budget_trigger_mean: toolResultBudgetTriggerMean,
        total_prompt_input_tokens_mean: totalPromptInputTokensMean,
        prompt_token_delta_mean: promptTokenDeltaMean,
        success_under_context_pressure_rate: successUnderContextPressureRate,
        manual_review_required: entry.manualReviewRequired,
        manual_review_questions: entry.manualReviewQuestions,
        interpretation,
      }
    })
    .sort((a, b) =>
      `${a.scenario_id}:${a.candidate_variant_id}`.localeCompare(
        `${b.scenario_id}:${b.candidate_variant_id}`,
      ),
    )
}

function summarizeLongContextVerdict(params: {
  experimentValidity: ExperimentValidity
  longContextSummary: LongContextSummaryItem[]
}): LongContextReviewVerdict | undefined {
  const { experimentValidity, longContextSummary } = params
  if (longContextSummary.length === 0) return undefined
  if (experimentValidity.status === 'invalid') return 'invalid'
  const hasWarning = longContextSummary.some(
    item =>
      (item.lost_constraint_mean ?? 0) > 0 ||
      (item.distractor_confusion_mean ?? 0) > 0 ||
      (item.success_under_context_pressure_rate !== null &&
        item.success_under_context_pressure_rate < 1),
  )
  if (hasWarning) return 'warning'
  const needsManualReview =
    experimentValidity.status === 'inconclusive' ||
    longContextSummary.some(
      item =>
        item.manual_review_required ||
        item.constraint_retention_rate_mean === null ||
        item.retrieved_fact_hit_rate_mean === null,
    )
  if (needsManualReview) return 'needs_manual_review'
  return 'pass'
}

function runGroupRefs(runGroups: RunGroupArtifact[]): string[] {
  return runGroups.map(group =>
    path.join('tests', 'evals', 'v2', 'run-groups', `${group.run_group_id}.json`),
  )
}

async function buildRunGroups(params: {
  experimentId: string
  baselineVariantId: string
  repeatCount: number
  results: ScenarioExperimentResult[]
  failures: RunExecutionFailure[]
  aggregateSummaryRef: string
}): Promise<RunGroupArtifact[]> {
  const groups = new Map<
    string,
    {
      experiment_id: string
      scenario_id: string
      variant_id: string
      run_ids: string[]
      failures: RunExecutionFailure[]
    }
  >()

  function ensureGroup(runGroupId: string, scenarioId: string, variantId: string) {
    if (!groups.has(runGroupId)) {
      groups.set(runGroupId, {
        experiment_id: params.experimentId,
        scenario_id: scenarioId,
        variant_id: variantId,
        run_ids: [],
        failures: [],
      })
    }
    return groups.get(runGroupId)!
  }

  for (const result of params.results) {
    ensureGroup(
      result.baseline_run_group_id,
      result.scenario_id,
      params.baselineVariantId,
    ).run_ids.push(result.baseline_run_id)
    for (const candidate of result.candidates) {
      ensureGroup(
        candidate.candidate_run_group_id,
        result.scenario_id,
        candidate.candidate_variant_id,
      ).run_ids.push(candidate.candidate_run_id)
    }
  }

  for (const failure of params.failures) {
    ensureGroup(failure.run_group_id, failure.scenario_id, failure.variant_id).failures.push(failure)
  }

  const artifacts: RunGroupArtifact[] = []
  for (const [runGroupId, group] of groups.entries()) {
    const runArtifacts = await Promise.all(group.run_ids.map(runId => readRunArtifact(runId)))
    const scoreArtifacts = await Promise.all(
      group.run_ids.map(runId =>
        readJson<EvalScore[]>(path.join(scoresRoot, `${runId}.scores.json`)),
      ),
    )
    const actions = runArtifacts
      .map(artifact => (artifact as JsonRecord).evidence)
      .map(evidence =>
        evidence && typeof evidence === 'object' && !Array.isArray(evidence)
          ? (evidence as JsonRecord).action
          : undefined,
      )
      .filter(
        (action): action is JsonRecord =>
          Boolean(action) && typeof action === 'object' && !Array.isArray(action),
      )
    const rootQueries = runArtifacts
      .map(artifact => (artifact as JsonRecord).evidence)
      .map(evidence =>
        evidence && typeof evidence === 'object' && !Array.isArray(evidence)
          ? (evidence as JsonRecord).rootQuery
          : undefined,
      )
      .filter(
        (query): query is JsonRecord =>
          Boolean(query) && typeof query === 'object' && !Array.isArray(query),
      )
    const totalBilledTokens = scoreArtifacts
      .map(scores => scoreValue(scores, 'efficiency.total_billed_tokens'))
      .filter((value): value is number => value !== null)
    const durations = actions
      .map(action => numberOrNull(action.duration_ms))
      .filter((value): value is number => value !== null)
    const toolCounts = actions
      .map(action => numberOrNull(action.tool_call_count))
      .filter((value): value is number => value !== null)
    const subagentCounts = actions
      .map(action => numberOrNull(action.subagent_count))
      .filter((value): value is number => value !== null)
    const turnCounts = rootQueries
      .map(query => numberOrNull(query.turn_count))
      .filter((value): value is number => value !== null)
    const recoveryFlags = runArtifacts.map(artifact => {
      const evidence = (artifact as JsonRecord).evidence
      if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) return 0
      const recoveries = (evidence as JsonRecord).recoveries
      return Array.isArray(recoveries) && recoveries.length > 0 ? 1 : 0
    })
    const successCount = group.run_ids.length
    const expectedCount = params.repeatCount
    const failureCount = group.failures.length
    const metrics: StabilityMetrics = {
      repeat_success_rate: Number((successCount / expectedCount).toFixed(6)),
      capture_failure_rate: Number((failureCount / expectedCount).toFixed(6)),
      total_billed_tokens_mean: mean(totalBilledTokens),
      total_billed_tokens_min: minValue(totalBilledTokens),
      total_billed_tokens_max: maxValue(totalBilledTokens),
      total_billed_tokens_stddev: stddev(totalBilledTokens),
      e2e_duration_mean: mean(durations),
      e2e_duration_min: minValue(durations),
      e2e_duration_max: maxValue(durations),
      e2e_duration_stddev: stddev(durations),
      tool_call_count_variance: variance(toolCounts),
      subagent_count_variance: variance(subagentCounts),
      turn_count_variance: variance(turnCounts),
      recovery_rate:
        recoveryFlags.length === 0
          ? 0
          : Number(
              (
                recoveryFlags.reduce((sum, value) => sum + value, 0) /
                recoveryFlags.length
              ).toFixed(6),
            ),
    }
    const tokenCv =
      metrics.total_billed_tokens_mean && metrics.total_billed_tokens_stddev !== null
        ? metrics.total_billed_tokens_stddev / Math.max(metrics.total_billed_tokens_mean, 1)
        : 0
    const status: RunGroupArtifact['status'] =
      successCount === expectedCount && failureCount === 0
        ? 'completed'
        : successCount === 0
          ? 'failed'
          : 'partial'
    const flakyStatus: RunGroupArtifact['flaky_status'] =
      successCount === 0
        ? 'unstable'
        : expectedCount < 2
          ? 'inconclusive'
          : failureCount > 0 || successCount < expectedCount
            ? 'flaky'
            : tokenCv > 0.2 ||
                (metrics.tool_call_count_variance ?? 0) > 1 ||
                (metrics.subagent_count_variance ?? 0) > 1 ||
                (metrics.turn_count_variance ?? 0) > 1
              ? 'flaky'
              : 'stable'

    artifacts.push({
      run_group_id: runGroupId,
      experiment_id: group.experiment_id,
      scenario_id: group.scenario_id,
      variant_id: group.variant_id,
      repeat_count: expectedCount,
      run_ids: group.run_ids,
      status,
      started_at: actions.map(action => asString(action.started_at)).filter(Boolean).sort()[0] ?? null,
      ended_at:
        actions
          .map(action => asString(action.ended_at))
          .filter(Boolean)
          .sort()
          .at(-1) ?? null,
      aggregate_summary_ref: params.aggregateSummaryRef,
      stability_metrics: metrics,
      flaky_status: flakyStatus,
      failures: group.failures,
    })
  }

  return artifacts.sort((a, b) =>
    `${a.scenario_id}:${a.variant_id}`.localeCompare(`${b.scenario_id}:${b.variant_id}`),
  )
}

async function writeRunGroups(runGroups: RunGroupArtifact[]): Promise<void> {
  await mkdir(runGroupsRoot, { recursive: true })
  for (const group of runGroups) {
    await writeFile(
      path.join(runGroupsRoot, `${group.run_group_id}.json`),
      `${JSON.stringify(group, null, 2)}\n`,
    )
  }
}

function buildLongContextSection(params: {
  longContextSummary: LongContextSummaryItem[]
  longContextReviewVerdict?: LongContextReviewVerdict
}): string {
  const { longContextSummary, longContextReviewVerdict } = params
  if (longContextSummary.length === 0) return ''
  const rows = longContextSummary
    .map(
      item =>
        `| ${item.scenario_id} | ${item.candidate_variant_id} | ${item.context_family} | ${item.context_size_class} | ${item.constraint_retention_rate_mean ?? 'n/a'} | ${item.retrieved_fact_hit_rate_mean ?? 'n/a'} | ${item.lost_constraint_mean ?? 'n/a'} | ${item.missed_fact_mean ?? 'n/a'} | ${item.distractor_confusion_mean ?? 'n/a'} | ${item.compaction_trigger_mean ?? 'n/a'} | ${item.compaction_saved_tokens_mean ?? 'n/a'} | ${item.total_prompt_input_tokens_mean ?? 'n/a'} | ${item.success_under_context_pressure_rate ?? 'n/a'} | ${item.manual_review_required} |`,
    )
    .join('\n')
  const semanticRows = longContextSummary
    .flatMap(item =>
      item.interpretation.map(
        interpretation =>
          `- ${item.scenario_id} / ${item.candidate_variant_id}: ${interpretation}`,
      ),
    )
    .join('\n')
  const manualReviewRows = longContextSummary
    .flatMap(item =>
      item.manual_review_questions.map(
        question =>
          `- ${item.scenario_id} / ${item.candidate_variant_id}: ${question}`,
      ),
    )
    .join('\n')
  return `## Long Context Summary

- review_verdict: ${longContextReviewVerdict ?? 'not_applicable'}
- note: This section evaluates constraint retention, fact retrieval, distractor resistance, and compaction behavior under context pressure.

| scenario | candidate_variant | family | size | retention_rate | fact_hit_rate | lost_constraints | missed_facts | distractor_confusion | compaction_triggers | compaction_saved_tokens | total_prompt_tokens | success_under_pressure | manual_review_required |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
${rows}

### Semantic Interpretation

${semanticRows || '- No long-context interpretation rows were generated.'}

### Manual Review Notes

${manualReviewRows || '- No manual review prompts were attached to the current long-context scenarios.'}

### Interpretation Limits

- Automatic long-context scores are strongest in fixture_trace mode.
- Real smoke may still require human inspection even when trace-backed cost and compaction evidence is present.
`
}

function buildBatchReport(params: {
  experiment: EvalExperimentV21
  runGroups: RunGroupArtifact[]
  failures: RunExecutionFailure[]
  outputJson: string
  longContextSummary: LongContextSummaryItem[]
  longContextReviewVerdict?: LongContextReviewVerdict
}): string {
  const {
    experiment,
    runGroups,
    failures,
    outputJson,
    longContextSummary,
    longContextReviewVerdict,
  } = params
  const groupRows = runGroups
    .map(group => {
      const metrics = group.stability_metrics
      return `| ${group.scenario_id} | ${group.variant_id} | ${group.repeat_count} | ${metrics.repeat_success_rate} | ${metrics.total_billed_tokens_mean ?? 'n/a'} | ${metrics.total_billed_tokens_stddev ?? 'n/a'} | ${metrics.e2e_duration_mean ?? 'n/a'} | ${metrics.e2e_duration_stddev ?? 'n/a'} | ${metrics.tool_call_count_variance ?? 'n/a'} | ${metrics.subagent_count_variance ?? 'n/a'} | ${metrics.turn_count_variance ?? 'n/a'} | ${metrics.recovery_rate} | ${group.flaky_status} |`
    })
    .join('\n')
  const flakyRows = runGroups
    .filter(group => group.flaky_status !== 'stable')
    .map(group => `- ${group.scenario_id} / ${group.variant_id}: ${group.flaky_status}`)
    .join('\n')
  const rankingRows = runGroups
    .filter(group => group.variant_id !== experiment.baseline_variant_id)
    .sort((a, b) => {
      const aMetrics = a.stability_metrics
      const bMetrics = b.stability_metrics
      if (bMetrics.repeat_success_rate !== aMetrics.repeat_success_rate) {
        return bMetrics.repeat_success_rate - aMetrics.repeat_success_rate
      }
      return (
        (aMetrics.total_billed_tokens_mean ?? Number.POSITIVE_INFINITY) -
        (bMetrics.total_billed_tokens_mean ?? Number.POSITIVE_INFINITY)
      )
    })
    .map(
      (group, index) =>
        `| ${index + 1} | ${group.variant_id} | ${group.scenario_id} | ${group.stability_metrics.repeat_success_rate} | ${group.stability_metrics.total_billed_tokens_mean ?? 'n/a'} | ${group.flaky_status} |`,
    )
    .join('\n')
  const failureRows =
    failures.length === 0
      ? '- No run failures recorded.'
      : failures
          .map(
            failure =>
              `- ${failure.scenario_id} / ${failure.variant_id} / repeat ${failure.repeat_index}: ${failure.stage}: ${failure.error}`,
          )
          .join('\n')

  const longContextSection = buildLongContextSection({
    longContextSummary,
    longContextReviewVerdict,
  })

  return `# ${longContextSummary.length > 0 ? 'V2.4 Long-Context' : 'V2.3 Batch'} Experiment Summary: ${experiment.experiment_id}

## Understanding

- experiment: ${experiment.experiment_id}
- mode: ${experiment.mode ?? 'bind_existing'}
- scenario_count: ${experiment.scenario_ids?.length ?? 0}
- candidate_count: ${experiment.candidate_variant_ids.length}
- repeat_count: ${experiment.repeat_count ?? 1}
- output_json: ${outputJson}

## Batch Stability Table

| scenario | variant | repeats | success_rate | token_mean | token_stddev | duration_mean_ms | duration_stddev_ms | tool_variance | subagent_variance | turn_variance | recovery_rate | flaky_status |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
${groupRows || '| n/a | n/a | 0 | 0 | n/a | n/a | n/a | n/a | n/a | n/a | n/a | 0 | inconclusive |'}

## Candidate Ranking

| rank | candidate_variant | scenario | success_rate | token_mean | flaky_status |
| ---: | --- | --- | ---: | ---: | --- |
${rankingRows || '| n/a | n/a | n/a | n/a | n/a | n/a |'}

## Flaky Scenario Notes

${flakyRows || '- No flaky run group detected by the current V2.3 heuristic.'}

## Run Failures

${failureRows}

${longContextSection}

## Interpretation Limits

- V2.3 stability is based on repeat groups and trace-backed metrics; it is not a model-quality judge.
- Flaky status is a first-pass engineering signal based on failures and coarse variance, not a statistical proof.
`
}

function buildMarkdownReport(params: {
  experiment: EvalExperimentV21
  results: ScenarioExperimentResult[]
  runGroups: RunGroupArtifact[]
  failures: RunExecutionFailure[]
  batchReport: string
  outputJson: string
  riskVerdict: RiskVerdict
  experimentValidity: ExperimentValidity
  scorecardSummary: ScorecardItem[]
  explorationSignals: string[]
  recommendedReviewMode: ReviewMode
  variantEffectSummary: VariantEffectSummary[]
  longContextSummary: LongContextSummaryItem[]
  longContextReviewVerdict?: LongContextReviewVerdict
}): string {
  const {
    experiment,
    results,
    runGroups,
    failures,
    batchReport,
    outputJson,
    riskVerdict,
    experimentValidity,
    scorecardSummary,
    explorationSignals,
    recommendedReviewMode,
    variantEffectSummary,
    longContextSummary,
    longContextReviewVerdict,
  } = params
  const allGateResults = results.flatMap(result =>
    result.candidates.flatMap(candidate => candidate.gate_results),
  )
  const hardFailures = allGateResults.filter(result => result.verdict === 'hard_fail')
  const softWarnings = allGateResults.filter(result => result.verdict === 'soft_warning')
  const missingOrInconclusive = allGateResults.filter(
    result => result.verdict === 'missing' || result.verdict === 'inconclusive',
  )

  const rows = results
    .flatMap(result =>
      result.candidates.map(candidate => {
        const gateSummary = candidate.gate_results.length
          ? `${candidate.gate_results.filter(gate => gate.verdict !== 'pass').length}/${candidate.gate_results.length} not passed`
          : 'not configured'
        const validityStatus = candidate.experiment_validity?.status ?? 'unknown'
        return `| ${result.scenario_id} | ${result.repeat_index} | ${result.baseline_run_id} | ${candidate.candidate_variant_id} | ${candidate.candidate_run_id} | ${validityStatus} | ${gateSummary} | ${candidate.compare_report} |`
      }),
    )
    .join('\n')

  const runGroupRows = runGroups
    .map(group => {
      const metrics = group.stability_metrics
      return `| ${group.scenario_id} | ${group.variant_id} | ${group.repeat_count} | ${metrics.repeat_success_rate} | ${metrics.total_billed_tokens_mean ?? 'n/a'} | ${metrics.total_billed_tokens_stddev ?? 'n/a'} | ${group.flaky_status} |`
    })
    .join('\n')

  const failureRows =
    failures.length === 0
      ? '- No run failures recorded.'
      : failures
          .map(
            failure =>
              `- ${failure.scenario_id} / ${failure.variant_id} / repeat ${failure.repeat_index}: ${failure.stage}: ${failure.error}`,
          )
          .join('\n')

  const gateRows =
    allGateResults.length === 0
      ? '| n/a | n/a | n/a | n/a | n/a | n/a |\n'
      : allGateResults
          .map(
            result =>
              `| ${result.scenario_id} | ${result.candidate_variant_id} | ${result.rule_type} | ${result.score_spec_id} | ${result.verdict} | ${result.regression_pct ?? 'n/a'} |`,
          )
          .join('\n')

  const scorecardRows = scorecardSummary
    .map(
      item =>
        `| ${item.scenario_id} | ${item.candidate_variant_id} | ${item.score_spec_id} | ${item.baseline_value ?? 'n/a'} | ${item.candidate_value ?? 'n/a'} | ${item.delta ?? 'n/a'} | ${item.interpretation} |`,
    )
    .join('\n')

  const explorationRows = explorationSignals.map(signal => `- ${signal}`).join('\n')
  const variantEffectRows =
    variantEffectSummary.length === 0
      ? '- No variant effect evidence summary was generated.'
      : variantEffectSummary
          .map(
            item =>
              `- ${item.scenario_id} / ${item.candidate_variant_id}: baseline_mode=${item.baseline_policy_mode}, candidate_mode=${item.candidate_policy_mode}, candidate_effect_observed=${item.candidate_variant_effect_observed}, runtime_difference_observed=${item.runtime_difference_observed}`,
          )
          .join('\n')

  const runtimeDifferenceRows =
    variantEffectSummary.length === 0
      ? '- No runtime difference summary available.'
      : variantEffectSummary
          .flatMap(item =>
            item.summary.map(
              summary =>
                `- ${item.scenario_id} / ${item.candidate_variant_id}: ${summary}`,
            ),
          )
          .join('\n')
  const longContextSection = buildLongContextSection({
    longContextSummary,
    longContextReviewVerdict,
  })

  const validityRows = [
    `- status: ${experimentValidity.status}`,
    `- profile: ${experimentValidity.profile}`,
    `- baseline_captured: ${experimentValidity.checks.baseline_captured}`,
    `- candidate_captured: ${experimentValidity.checks.candidate_captured}`,
    `- no_ambiguous_capture: ${experimentValidity.checks.no_ambiguous_capture}`,
    `- score_evidence_present: ${experimentValidity.checks.score_evidence_present}`,
    `- variant_effect_observed: ${experimentValidity.checks.variant_effect_observed}`,
    `- runtime_difference_observed: ${experimentValidity.checks.runtime_difference_observed}`,
    `- scenario_intent_matched: ${experimentValidity.checks.scenario_intent_matched}`,
    `- reason: ${experimentValidity.reason}`,
  ].join('\n')

  const validityNotes = [
    ...experimentValidity.blockers.map(item => `- blocker: ${item}`),
    ...experimentValidity.warnings.map(item => `- warning: ${item}`),
  ].join('\n')

  const reportProfile: ExperimentProfile = experiment.report_profile ?? 'smoke'
  const longContextMode = longContextSummary.length > 0
  const profileSection =
    longContextMode
      ? `## Long Context Review

- requested_mode: ${experiment.mode ?? 'bind_existing'}
- review_verdict: ${longContextReviewVerdict ?? 'not_applicable'}
- note: This profile focuses on whether long-context pressure preserves constraints, facts, and governance signals.`
      : reportProfile === 'smoke'
      ? `## Smoke Check

- requested_mode: ${experiment.mode ?? 'bind_existing'}
- execute_harness_loop_closed: ${experimentValidity.checks.baseline_captured && experimentValidity.checks.candidate_captured}
- note: This profile validates the automatic pipeline, not harness value.`
      : `## Real Experiment

- requested_mode: ${experiment.mode ?? 'bind_existing'}
- evaluation_intent: ${experiment.evaluation_intent ?? 'exploration'}
- candidate_runtime_effect_observed: ${experimentValidity.checks.variant_effect_observed}
- runtime_difference_observed: ${experimentValidity.checks.runtime_difference_observed}
- note: This profile asks whether the candidate changed runtime behavior in an interpretable way.`

  const interpretationLimits =
    longContextMode
      ? [
          '- Long-context automatic scoring is strongest in fixture_trace mode; real smoke still preserves a manual-review lane.',
          '- Cost and compaction evidence alone do not prove that the final answer remained semantically correct.',
        ].join('\n')
      : reportProfile === 'smoke'
      ? [
          '- Smoke only proves the automatic execute_harness -> capture -> run/score/report loop is healthy.',
          '- Smoke does not prove a candidate harness change is beneficial.',
        ].join('\n')
      : [
          '- This real experiment remains single-scenario and single-run; it is not yet a stability study.',
          experimentValidity.checks.variant_effect_observed
            ? '- Candidate runtime effect was observed, but qualitative harness value still needs broader experiments.'
            : '- Candidate runtime effect was not observed cleanly enough; do not treat score deltas as a reliable judgment.',
        ].join('\n')

  return `# V2 Experiment Summary: ${experiment.experiment_id}

## Understanding

- experiment: ${experiment.experiment_id}
- mode: ${experiment.mode ?? 'bind_existing'}
- baseline_variant: ${experiment.baseline_variant_id}
- candidate_variants: ${experiment.candidate_variant_ids.join(', ')}
- scenario_count: ${experiment.scenario_ids?.length ?? 0}
- score_specs: ${(experiment.score_spec_ids ?? []).join(', ') || 'not configured'}
- gate_policy: ${experiment.gate_policy_id ?? 'not configured'}
- output_json: ${outputJson}

## Expected Outcome

This summary records a manifest-driven V2 experiment run. In bind_existing mode, V2 binds existing V1 traces. In execute_harness mode, V2 executes the scenario first, then captures the generated user_action_id through benchmark_run_id.

## Design Rationale

The runner always scores only trace-backed V1 facts. V2.2-beta adds runtime-effect evidence and experiment-validity semantics so smoke and real experiments are not confused with each other.

${profileSection}

## Risk Verdict

- hard_failures: ${hardFailures.length}
- soft_warnings: ${softWarnings.length}
- missing_or_inconclusive: ${missingOrInconclusive.length}
- risk_status: ${riskVerdict.status}
- scope: regression_risk_only
- final_experiment_judgment: false
- recommended_review_mode: ${recommendedReviewMode}

This section is a regression-risk gate, not a final judgment about whether the harness change is valuable.

## Variant Effect Evidence

${variantEffectRows}

## Experiment Validity

${validityRows}

${validityNotes || '- No additional blockers or warnings.'}

## Runtime Difference Summary

${runtimeDifferenceRows}

${longContextSection}

## V2.3 Batch Robustness

- batch_report: ${batchReport || 'not generated'}
- run_group_count: ${runGroups.length}
- run_failure_count: ${failures.length}

| scenario | variant | repeats | success_rate | token_mean | token_stddev | flaky_status |
| --- | --- | ---: | ---: | ---: | ---: | --- |
${runGroupRows || '| n/a | n/a | 0 | 0 | n/a | n/a | inconclusive |'}

### Run Failures

${failureRows}

## Scorecard Summary

| scenario | candidate_variant | score | baseline | candidate | delta | interpretation |
| --- | --- | --- | ---: | ---: | ---: | --- |
${scorecardRows || '| n/a | n/a | n/a | n/a | n/a | n/a | n/a |'}

## Exploration Signals

${explorationRows || '- No exploration signal generated.'}

## Runs

| scenario | repeat | baseline_run | candidate_variant | candidate_run | experiment_validity | risk_gate | compare_report |
| --- | ---: | --- | --- | --- | --- | --- | --- |
${rows}

## Risk Gate Details

| scenario | candidate_variant | rule_type | score_spec | verdict | regression_pct |
| --- | --- | --- | --- | --- | ---: |
${gateRows}

## Interpretation Limits

${interpretationLimits}
`
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  const experimentArg = String(args.experiment ?? '')
  if (!experimentArg) throw new Error('Missing required --experiment <id-or-path>')

  const experimentPath = await findExperimentPath(experimentArg)
  const experiment = await readJson<EvalExperimentV21>(experimentPath)
  const requestedMode = experiment.mode ?? 'bind_existing'
  const automationDisabled = isExecuteHarnessDisabled(args)
  const mode =
    requestedMode === 'execute_harness' && automationDisabled
      ? 'bind_existing'
      : requestedMode

  if (
    requestedMode === 'execute_harness' &&
    automationDisabled &&
    experiment.execution?.allow_fallback_to_bind_existing === false
  ) {
    throw new Error(
      'execute_harness is disabled and this experiment does not allow bind_existing fallback.',
    )
  }
  if (mode !== 'bind_existing' && mode !== 'execute_harness') {
    throw new Error(`Unsupported V2 experiment mode: ${mode}`)
  }

  const scenarioIds = experiment.scenario_ids ?? []
  if (scenarioIds.length === 0) {
    throw new Error('Experiment must define scenario_ids for V2.1 runner.')
  }

  const scoreSpecs = await loadScoreSpecs()
  const gatePolicy = await loadGatePolicy(experiment.gate_policy_id)
  const configuredDbPath =
    typeof experiment.execution?.db_path === 'string' && experiment.execution.db_path.trim()
      ? path.resolve(repoRoot, experiment.execution.db_path)
      : undefined
  const dbPath = typeof args.db === 'string' ? args.db : configuredDbPath
  const snapshotDb = !Boolean(args['no-snapshot-db'])
  const failurePolicy = experiment.execution?.failure_policy ?? 'fail_fast'
  for (const scoreSpecId of experiment.score_spec_ids ?? []) {
    if (!scoreSpecs.has(scoreSpecId)) {
      throw new Error(`Experiment references missing score_spec_id: ${scoreSpecId}`)
    }
  }
  if (experiment.gate_policy_id && !gatePolicy) {
    throw new Error(
      `Experiment references missing gate_policy_id: ${experiment.gate_policy_id}`,
    )
  }
  for (const rule of normalizeGateRules(gatePolicy)) {
    if (!scoreSpecs.has(rule.score_spec_id)) {
      throw new Error(
        `Gate policy ${experiment.gate_policy_id} references missing score_spec_id: ${rule.score_spec_id}`,
      )
    }
  }

  const repeatCount = Math.max(experiment.repeat_count ?? 1, 1)
  const scenarioCatalog = new Map<string, EvalScenario>()
  for (const scenarioId of scenarioIds) {
    scenarioCatalog.set(scenarioId, await loadScenario(scenarioId))
  }
  const fixtureTraceFastPath =
    mode === 'execute_harness' && experiment.execution?.adapter === 'fixture_trace'

  const results: ScenarioExperimentResult[] = []
  const failures: RunExecutionFailure[] = []
  if (mode === 'bind_existing') {
    for (const scenarioId of scenarioIds) {
      for (const variantId of [
        experiment.baseline_variant_id,
        ...experiment.candidate_variant_ids,
      ]) {
        const userActionId = findBoundUserActionId({
          experiment,
          scenarioId,
          variantId,
        })
        if (!userActionId) {
          throw new Error(
            `Missing action binding for scenario=${scenarioId}, variant=${variantId}. bind_existing mode requires user_action_id bindings.`,
          )
        }
      }
    }
  }

  const executionStamp = new Date().toISOString().replace(/[:.]/g, '')

  for (const scenarioId of scenarioIds) {
    const scenarioRecord = scenarioCatalog.get(scenarioId)
    const scenario = mode === 'execute_harness' ? scenarioRecord : undefined
    const baselineRunGroupId = createRunGroupId({
      experimentId: experiment.experiment_id,
      scenarioId,
      variantId: experiment.baseline_variant_id,
      stamp: executionStamp,
    })

    for (let repeatIndex = 1; repeatIndex <= repeatCount; repeatIndex += 1) {
      let baselineUserActionId = findBoundUserActionId({
        experiment,
        scenarioId,
        variantId: experiment.baseline_variant_id,
      })
      let baselineExecution: ExecuteHarnessResult | undefined
      let baselineEvalRunId: string | undefined
      let baselineBenchmarkRunId: string | undefined
      let baselineRunId = ''
      let baselineScores: EvalScore[] = []
      let baselineRunArtifact: RunArtifact | undefined

      try {
      if (fixtureTraceFastPath) {
        if (!scenarioRecord) throw new Error(`Scenario not found: ${scenarioId}`)
        const baselineVariant = await loadVariant(experiment.baseline_variant_id)
        const syntheticBaseline = await synthesizeFixtureRun({
          experiment,
          scenario: scenarioRecord,
          variant: baselineVariant,
          runGroupId: baselineRunGroupId,
          repeatIndex,
          scoreSpecIds: experiment.score_spec_ids ?? [],
        })
        baselineUserActionId = syntheticBaseline.userActionId
        baselineExecution = syntheticBaseline.execution
        baselineEvalRunId = syntheticBaseline.execution.eval_run_id
        baselineBenchmarkRunId = syntheticBaseline.execution.benchmark_run_id
        baselineRunId = syntheticBaseline.runId
        baselineScores = syntheticBaseline.scores
        baselineRunArtifact = syntheticBaseline.runArtifact
      } else {

      if (mode === 'execute_harness') {
        if (!scenario) throw new Error(`Scenario not found: ${scenarioId}`)
        const baselineVariant = await loadVariant(experiment.baseline_variant_id)
        const identity = createRunIdentity({
          experimentId: experiment.experiment_id,
          scenarioId,
          variantId: experiment.baseline_variant_id,
          stamp: executionStamp,
          repeatIndex,
        })
        baselineEvalRunId = identity.eval_run_id
        baselineBenchmarkRunId = identity.benchmark_run_id
        baselineExecution = await executeHarnessAndCapture({
          experimentId: experiment.experiment_id,
          scenario,
          variant: baselineVariant,
          execution: experiment.execution,
          evalRunId: identity.eval_run_id,
          benchmarkRunId: identity.benchmark_run_id,
          dbPath,
        })
        baselineUserActionId = requireCapturedAction({
          label: `baseline scenario=${scenarioId} variant=${experiment.baseline_variant_id}`,
          result: baselineExecution,
        })
      }

      if (!baselineUserActionId) {
        throw new Error(
          `Missing action binding for scenario=${scenarioId}, variant=${experiment.baseline_variant_id}. bind_existing mode requires user_action_id bindings.`,
        )
      }

      const baselineOutput = runBunScript(
        'scripts/evals/v2_record_run.ts',
        buildRecordRunArgs({
          scenarioId,
          variantId: experiment.baseline_variant_id,
          userActionId: baselineUserActionId,
          runGroupId: baselineRunGroupId,
          repeatIndex,
          scoreSpecIds: experiment.score_spec_ids ?? [],
          dbPath,
          snapshotDb,
        }),
      )
      baselineRunId = extractCreatedRunId(baselineOutput)
      baselineScores = await readJson<EvalScore[]>(
        path.join(scoresRoot, `${baselineRunId}.scores.json`),
      )
      baselineRunArtifact = await readRunArtifact(baselineRunId)
      }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        if (failurePolicy === 'fail_fast') throw error
        failures.push({
          scenario_id: scenarioId,
          variant_id: experiment.baseline_variant_id,
          run_group_id: baselineRunGroupId,
          repeat_index: repeatIndex,
          stage: message.includes('capture') ? 'capture' : mode === 'execute_harness' ? 'execute_harness' : 'record_run',
          error: message,
        })
        continue
      }

      const candidates: CandidateExperimentResult[] = []
      for (const candidateVariantId of experiment.candidate_variant_ids) {
        const candidateRunGroupId = createRunGroupId({
          experimentId: experiment.experiment_id,
          scenarioId,
          variantId: candidateVariantId,
          stamp: executionStamp,
        })
        let candidateActionId = findBoundUserActionId({
          experiment,
          scenarioId,
          variantId: candidateVariantId,
        })
        let candidateExecution: ExecuteHarnessResult | undefined
        let candidateEvalRunId: string | undefined
        let candidateBenchmarkRunId: string | undefined

        try {
        if (fixtureTraceFastPath) {
          if (!scenarioRecord) throw new Error(`Scenario not found: ${scenarioId}`)
          const candidateVariant = await loadVariant(candidateVariantId)
          const syntheticCandidate = await synthesizeFixtureRun({
            experiment,
            scenario: scenarioRecord,
            variant: candidateVariant,
            runGroupId: candidateRunGroupId,
            repeatIndex,
            scoreSpecIds: experiment.score_spec_ids ?? [],
          })
          candidateActionId = syntheticCandidate.userActionId
          candidateExecution = syntheticCandidate.execution
          candidateEvalRunId = syntheticCandidate.execution.eval_run_id
          candidateBenchmarkRunId = syntheticCandidate.execution.benchmark_run_id
          const candidateRunId = syntheticCandidate.runId
          const candidateScores = syntheticCandidate.scores
          const candidateRunArtifact = syntheticCandidate.runArtifact

          const gateResults = evaluateGate({
            scenarioId,
            candidateVariantId,
            gatePolicy,
            scoreSpecs,
            baselineScores,
            candidateScores,
          })
          const scorecard = buildScorecardSummary({
            scenarioId,
            candidateVariantId,
            scoreSpecs,
            baselineScores,
            candidateScores,
          })
          const variantEffect = runtimeDifferenceAnalysis({
            scenarioId,
            candidateVariantId,
            baselineVariantEffect: baselineRunArtifact?.variant_effect,
            candidateVariantEffect: candidateRunArtifact.variant_effect,
            scorecard,
          })
          const experimentValidityForCandidate = buildExperimentValidity({
            profile: experiment.report_profile ?? 'smoke',
            scenarioId,
            candidateVariantId,
            scenario: scenarioRecord,
            baselineExecution,
            candidateExecution,
            scorecard,
            variantEffectSummary: variantEffect,
          })
          const syntheticCompareReport = await writeSyntheticCompareReport({
            baselineRunId,
            candidateRunId,
            scorecard,
            variantEffectSummary: variantEffect,
          })

          candidates.push({
            candidate_variant_id: candidateVariantId,
            candidate_run_group_id: candidateRunGroupId,
            candidate_run_id: candidateRunId,
            candidate_user_action_id: candidateActionId,
            candidate_eval_run_id: candidateEvalRunId,
            candidate_benchmark_run_id: candidateBenchmarkRunId,
            candidate_execution: candidateExecution,
            baseline_variant_effect: baselineRunArtifact?.variant_effect,
            candidate_variant_effect: candidateRunArtifact.variant_effect,
            variant_effect_summary: variantEffect,
            experiment_validity: experimentValidityForCandidate,
            compare_report: syntheticCompareReport,
            gate_results: gateResults,
            scorecard_summary: scorecard,
            exploration_signals: buildExplorationSignals({
              scorecard,
              gateResults,
              experimentValidity: experimentValidityForCandidate,
              variantEffectSummary: variantEffect,
            }),
            recommended_review_mode: recommendReviewMode({
              scorecard,
              gateResults,
              experimentValidity: experimentValidityForCandidate,
            }),
          })
        } else {

        if (mode === 'execute_harness') {
          if (!scenario) throw new Error(`Scenario not found: ${scenarioId}`)
          const candidateVariant = await loadVariant(candidateVariantId)
          const identity = createRunIdentity({
            experimentId: experiment.experiment_id,
            scenarioId,
            variantId: candidateVariantId,
            stamp: executionStamp,
            repeatIndex,
          })
          candidateEvalRunId = identity.eval_run_id
          candidateBenchmarkRunId = identity.benchmark_run_id
          candidateExecution = await executeHarnessAndCapture({
            experimentId: experiment.experiment_id,
            scenario,
            variant: candidateVariant,
            execution: experiment.execution,
            evalRunId: identity.eval_run_id,
            benchmarkRunId: identity.benchmark_run_id,
            dbPath,
          })
          candidateActionId = requireCapturedAction({
            label: `candidate scenario=${scenarioId} variant=${candidateVariantId}`,
            result: candidateExecution,
          })
        }

        if (!candidateActionId) {
          throw new Error(
            `Missing candidate user_action_id for scenario=${scenarioId}, variant=${candidateVariantId}`,
          )
        }

        const candidateOutput = runBunScript(
          'scripts/evals/v2_record_run.ts',
          buildRecordRunArgs({
            scenarioId,
            variantId: candidateVariantId,
            userActionId: candidateActionId,
            runGroupId: candidateRunGroupId,
            repeatIndex,
            scoreSpecIds: experiment.score_spec_ids ?? [],
            dbPath,
            snapshotDb,
          }),
        )
        const candidateRunId = extractCreatedRunId(candidateOutput)
        const candidateScores = await readJson<EvalScore[]>(
          path.join(scoresRoot, `${candidateRunId}.scores.json`),
        )
        const candidateRunArtifact = await readRunArtifact(candidateRunId)

        const compareOutput = runBunScript('scripts/evals/v2_compare_runs.ts', [
          '--baseline-run',
          baselineRunId,
          '--candidate-run',
          candidateRunId,
        ])

        const gateResults = evaluateGate({
          scenarioId,
          candidateVariantId,
          gatePolicy,
          scoreSpecs,
          baselineScores,
          candidateScores,
        })
        const scorecard = buildScorecardSummary({
          scenarioId,
          candidateVariantId,
          scoreSpecs,
          baselineScores,
          candidateScores,
        })
        const variantEffect = runtimeDifferenceAnalysis({
          scenarioId,
          candidateVariantId,
          baselineVariantEffect: baselineRunArtifact?.variant_effect,
          candidateVariantEffect: candidateRunArtifact.variant_effect,
          scorecard,
        })
        const experimentValidityForCandidate = buildExperimentValidity({
          profile: experiment.report_profile ?? 'smoke',
          scenarioId,
          candidateVariantId,
          scenario: scenarioRecord,
          baselineExecution,
          candidateExecution,
          scorecard,
          variantEffectSummary: variantEffect,
        })

        candidates.push({
          candidate_variant_id: candidateVariantId,
          candidate_run_group_id: candidateRunGroupId,
          candidate_run_id: candidateRunId,
          candidate_user_action_id: candidateActionId,
          candidate_eval_run_id: candidateEvalRunId,
          candidate_benchmark_run_id: candidateBenchmarkRunId,
          candidate_execution: candidateExecution,
          baseline_variant_effect: baselineRunArtifact?.variant_effect,
          candidate_variant_effect: candidateRunArtifact.variant_effect,
          variant_effect_summary: variantEffect,
          experiment_validity: experimentValidityForCandidate,
          compare_report: extractCreatedReport(compareOutput),
          gate_results: gateResults,
          scorecard_summary: scorecard,
          exploration_signals: buildExplorationSignals({
            scorecard,
            gateResults,
            experimentValidity: experimentValidityForCandidate,
            variantEffectSummary: variantEffect,
          }),
          recommended_review_mode: recommendReviewMode({
            scorecard,
            gateResults,
            experimentValidity: experimentValidityForCandidate,
          }),
        })
        }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          if (failurePolicy === 'fail_fast') throw error
          failures.push({
            scenario_id: scenarioId,
            variant_id: candidateVariantId,
            run_group_id: candidateRunGroupId,
            repeat_index: repeatIndex,
            stage: message.includes('compare') ? 'compare' : message.includes('capture') ? 'capture' : mode === 'execute_harness' ? 'execute_harness' : 'record_run',
            error: message,
          })
          continue
        }
      }

      results.push({
        scenario_id: scenarioId,
        repeat_index: repeatIndex,
        baseline_run_group_id: baselineRunGroupId,
        baseline_run_id: baselineRunId,
        baseline_user_action_id: baselineUserActionId,
        baseline_eval_run_id: baselineEvalRunId,
        baseline_benchmark_run_id: baselineBenchmarkRunId,
        baseline_execution: baselineExecution,
        candidates,
      })
    }
  }

  await mkdir(experimentRunsRoot, { recursive: true })
  const runStamp = new Date().toISOString().replace(/[:.]/g, '')
  const outputJsonPath = path.join(
    experimentRunsRoot,
    `${experiment.experiment_id}_${runStamp}.json`,
  )
  const outputJsonRel = path.relative(repoRoot, outputJsonPath)
  const reportRoot = await resolveReportRoot()
  await mkdir(reportRoot, { recursive: true })
  const outputMarkdownPath = path.join(
    reportRoot,
    `experiment_${experiment.experiment_id}_${runStamp}.md`,
  )
  const outputMarkdownRel = path.relative(repoRoot, outputMarkdownPath)
  const batchMarkdownPath = path.join(
    reportRoot,
    `batch_experiment_${experiment.experiment_id}_${runStamp}.md`,
  )
  const batchMarkdownRel = path.relative(repoRoot, batchMarkdownPath)
  const generatedAt = new Date().toISOString()
  const riskVerdict = summarizeRisk(results)
  const scorecardSummary = aggregateScorecard(results)
  const explorationSignals = aggregateExplorationSignals(results)
  const recommendedReviewMode = aggregateReviewMode(results)
  const variantEffectSummary = aggregateVariantEffectSummary(results)
  const experimentValidity = aggregateExperimentValidity(results)
  const longContextSummary = await aggregateLongContextSummary(results)
  const longContextReviewVerdict = summarizeLongContextVerdict({
    experimentValidity,
    longContextSummary,
  })
  const runGroups = await buildRunGroups({
    experimentId: experiment.experiment_id,
    baselineVariantId: experiment.baseline_variant_id,
    repeatCount,
    results,
    failures,
    aggregateSummaryRef: batchMarkdownRel,
  })
  await writeRunGroups(runGroups)

  const warningMessages = results
    .flatMap(result => result.candidates.flatMap(candidate => candidate.gate_results))
    .filter(
      result =>
        result.verdict === 'soft_warning' ||
        result.verdict === 'missing' ||
        result.verdict === 'inconclusive',
    )
    .map(
      result =>
        `${result.verdict}: scenario=${result.scenario_id}, candidate=${result.candidate_variant_id}, score=${result.score_spec_id}`,
    )
  warningMessages.push(...experimentValidity.warnings)

  const errorMessages = results
    .flatMap(result => result.candidates.flatMap(candidate => candidate.gate_results))
    .filter(result => result.verdict === 'hard_fail')
    .map(
      result =>
        `hard_fail: scenario=${result.scenario_id}, candidate=${result.candidate_variant_id}, score=${result.score_spec_id}`,
    )
  errorMessages.push(...experimentValidity.blockers)
  errorMessages.push(
    ...failures.map(
      failure =>
        `${failure.stage}: scenario=${failure.scenario_id}, variant=${failure.variant_id}, repeat=${failure.repeat_index}: ${failure.error}`,
    ),
  )

  await writeFile(
    outputJsonPath,
    `${JSON.stringify(
      {
        experiment_id: experiment.experiment_id,
        manifest_ref: path.relative(repoRoot, experimentPath),
        generated_at: generatedAt,
        mode,
        requested_mode: requestedMode,
        automation_disabled: automationDisabled,
        report_profile: experiment.report_profile ?? 'smoke',
        evaluation_intent: experiment.evaluation_intent ?? null,
        run_refs: runRefs(results),
        run_group_refs: runGroupRefs(runGroups),
        score_refs: scoreRefs(results),
        report_refs: reportRefs({
          results,
          experimentReport: outputMarkdownRel,
          batchReport: batchMarkdownRel,
        }),
        risk_verdict: riskVerdict,
        gate_verdict: riskVerdict,
        experiment_validity: experimentValidity,
        long_context_review_verdict: longContextReviewVerdict ?? null,
        long_context_summary: longContextSummary,
        variant_effect_summary: variantEffectSummary,
        runtime_difference_summary: variantEffectSummary.flatMap(item => item.summary),
        verdict_boundary:
          'risk_verdict/gate_verdict is regression-risk-only and is not a final experiment judgment.',
        scorecard_summary: scorecardSummary,
        exploration_signals: explorationSignals,
        stability_summary: runGroups,
        flaky_scenarios: runGroups
          .filter(group => group.flaky_status !== 'stable')
          .map(group => ({
            scenario_id: group.scenario_id,
            variant_id: group.variant_id,
            flaky_status: group.flaky_status,
          })),
        recommended_review_mode: recommendedReviewMode,
        final_decision: null,
        errors: errorMessages,
        warnings: warningMessages,
        experiment,
        runner: {
          requested_mode: requestedMode,
          mode,
          automation_disabled: automationDisabled,
          fallback_reason:
            requestedMode === 'execute_harness' && mode === 'bind_existing'
              ? 'execute_harness disabled by flag or environment; bind_existing fallback used'
              : null,
          v2_3_batch_capabilities: {
            multi_scenario: scenarioIds.length > 1,
            multi_candidate: experiment.candidate_variant_ids.length > 1,
            repeat_count: repeatCount,
            failure_policy: failurePolicy,
          },
          score_spec_ids: experiment.score_spec_ids ?? [],
          gate_policy_id: experiment.gate_policy_id ?? null,
        },
        results,
        run_failures: failures,
        created_at: generatedAt,
      },
      null,
      2,
    )}\n`,
  )

  await writeFile(
    batchMarkdownPath,
    buildBatchReport({
      experiment,
      runGroups,
      failures,
      outputJson: outputJsonRel,
      longContextSummary,
      longContextReviewVerdict,
    }),
  )

  await writeFile(
    outputMarkdownPath,
    buildMarkdownReport({
      experiment,
      results,
      runGroups,
      failures,
      batchReport: batchMarkdownRel,
      outputJson: outputJsonRel,
      riskVerdict,
      experimentValidity,
      scorecardSummary,
      explorationSignals,
      recommendedReviewMode,
      variantEffectSummary,
      longContextSummary,
      longContextReviewVerdict,
    }),
  )

  console.log(`Created V2 experiment summary: ${outputJsonRel}`)
  console.log(`Created V2 batch summary: ${batchMarkdownRel}`)
  console.log(`Created V2 experiment report: ${outputMarkdownRel}`)
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
