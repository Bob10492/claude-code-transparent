import { spawnSync } from 'node:child_process'
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
  createRunIdentity,
  executeHarnessAndCapture,
  isExecuteHarnessDisabled,
  type ExecuteHarnessResult,
} from './v2_harness_execution'

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

interface CandidateExperimentResult {
  candidate_variant_id: string
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
  baseline_run_id: string
  baseline_user_action_id: string
  baseline_eval_run_id?: string
  baseline_benchmark_run_id?: string
  baseline_execution?: ExecuteHarnessResult
  candidates: CandidateExperimentResult[]
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

async function listJsonFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
  return entries
    .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
    .map(entry => path.join(dir, entry.name))
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
  const filePath = path.join(evalRoot, 'scenarios', `${scenarioId}.json`)
  try {
    return await readJson<EvalScenario>(filePath)
  } catch {
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

function reportRefs(results: ScenarioExperimentResult[], experimentReport: string): string[] {
  return [
    ...results.flatMap(result =>
      result.candidates.map(candidate => candidate.compare_report),
    ),
    experimentReport,
  ].filter(Boolean)
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
  baselineExecution?: ExecuteHarnessResult
  candidateExecution?: ExecuteHarnessResult
  scorecard: ScorecardItem[]
  variantEffectSummary: VariantEffectSummary
}): ExperimentValidity {
  const {
    profile,
    scenarioId,
    candidateVariantId,
    baselineExecution,
    candidateExecution,
    scorecard,
    variantEffectSummary,
  } = params
  const baselineCaptured =
    baselineExecution === undefined || baselineExecution.capture.status === 'captured'
  const candidateCaptured =
    candidateExecution === undefined || candidateExecution.capture.status === 'captured'
  const noAmbiguousCapture =
    baselineExecution?.capture.status !== 'ambiguous_capture' &&
    candidateExecution?.capture.status !== 'ambiguous_capture'
  const scoreEvidencePresent = scorecard.some(item => item.interpretation !== 'missing')
  const variantEffectObserved = variantEffectSummary.candidate_variant_effect_observed
  const scenarioIntentMatched =
    profile === 'smoke'
      ? baselineCaptured && candidateCaptured
      : variantEffectObserved && variantEffectSummary.runtime_difference_observed

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
  if (!scoreEvidencePresent) {
    blockers.push(
      `score_evidence_missing: scenario=${scenarioId}, candidate=${candidateVariantId}`,
    )
  }
  if (profile === 'real_experiment' && !variantEffectObserved) {
    blockers.push(
      `variant_effect_not_observed: scenario=${scenarioId}, candidate=${candidateVariantId}`,
    )
  }
  if (
    profile === 'real_experiment' &&
    variantEffectObserved &&
    !variantEffectSummary.runtime_difference_observed
  ) {
    warnings.push(
      `runtime_difference_not_observed: scenario=${scenarioId}, candidate=${candidateVariantId}`,
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
      ? profile === 'smoke'
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
      score_evidence_present: scoreEvidencePresent,
      variant_effect_observed: variantEffectObserved,
      runtime_difference_observed: variantEffectSummary.runtime_difference_observed,
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

function buildMarkdownReport(params: {
  experiment: EvalExperimentV21
  results: ScenarioExperimentResult[]
  outputJson: string
  riskVerdict: RiskVerdict
  experimentValidity: ExperimentValidity
  scorecardSummary: ScorecardItem[]
  explorationSignals: string[]
  recommendedReviewMode: ReviewMode
  variantEffectSummary: VariantEffectSummary[]
}): string {
  const {
    experiment,
    results,
    outputJson,
    riskVerdict,
    experimentValidity,
    scorecardSummary,
    explorationSignals,
    recommendedReviewMode,
    variantEffectSummary,
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
  const profileSection =
    reportProfile === 'smoke'
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
    reportProfile === 'smoke'
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
  const dbPath = typeof args.db === 'string' ? args.db : undefined
  const snapshotDb = !Boolean(args['no-snapshot-db'])
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
  if (mode === 'execute_harness') {
    if (scenarioIds.length !== 1) {
      throw new Error('V2.2 execute_harness supports exactly one scenario.')
    }
    if (experiment.candidate_variant_ids.length !== 1) {
      throw new Error('V2.2 execute_harness supports exactly one candidate variant.')
    }
    if (repeatCount !== 1) {
      throw new Error('V2.2 execute_harness supports repeat_count=1 only.')
    }
  }

  const results: ScenarioExperimentResult[] = []
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
    const scenario = mode === 'execute_harness' ? await loadScenario(scenarioId) : undefined

    for (let repeatIndex = 1; repeatIndex <= repeatCount; repeatIndex += 1) {
      let baselineUserActionId = findBoundUserActionId({
        experiment,
        scenarioId,
        variantId: experiment.baseline_variant_id,
      })
      let baselineExecution: ExecuteHarnessResult | undefined
      let baselineEvalRunId: string | undefined
      let baselineBenchmarkRunId: string | undefined

      if (mode === 'execute_harness') {
        if (!scenario) throw new Error(`Scenario not found: ${scenarioId}`)
        const baselineVariant = await loadVariant(experiment.baseline_variant_id)
        const identity = createRunIdentity({
          experimentId: experiment.experiment_id,
          scenarioId,
          variantId: experiment.baseline_variant_id,
          stamp: executionStamp,
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
          scoreSpecIds: experiment.score_spec_ids ?? [],
          dbPath,
          snapshotDb,
        }),
      )
      const baselineRunId = extractCreatedRunId(baselineOutput)
      const baselineScores = await readJson<EvalScore[]>(
        path.join(scoresRoot, `${baselineRunId}.scores.json`),
      )
      const baselineRunArtifact = await readRunArtifact(baselineRunId)

      const candidates: CandidateExperimentResult[] = []
      for (const candidateVariantId of experiment.candidate_variant_ids) {
        let candidateActionId = findBoundUserActionId({
          experiment,
          scenarioId,
          variantId: candidateVariantId,
        })
        let candidateExecution: ExecuteHarnessResult | undefined
        let candidateEvalRunId: string | undefined
        let candidateBenchmarkRunId: string | undefined

        if (mode === 'execute_harness') {
          if (!scenario) throw new Error(`Scenario not found: ${scenarioId}`)
          const candidateVariant = await loadVariant(candidateVariantId)
          const identity = createRunIdentity({
            experimentId: experiment.experiment_id,
            scenarioId,
            variantId: candidateVariantId,
            stamp: executionStamp,
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
          baselineVariantEffect: baselineRunArtifact.variant_effect,
          candidateVariantEffect: candidateRunArtifact.variant_effect,
          scorecard,
        })
        const experimentValidityForCandidate = buildExperimentValidity({
          profile: experiment.report_profile ?? 'smoke',
          scenarioId,
          candidateVariantId,
          baselineExecution,
          candidateExecution,
          scorecard,
          variantEffectSummary: variantEffect,
        })

        candidates.push({
          candidate_variant_id: candidateVariantId,
          candidate_run_id: candidateRunId,
          candidate_user_action_id: candidateActionId,
          candidate_eval_run_id: candidateEvalRunId,
          candidate_benchmark_run_id: candidateBenchmarkRunId,
          candidate_execution: candidateExecution,
          baseline_variant_effect: baselineRunArtifact.variant_effect,
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

      results.push({
        scenario_id: scenarioId,
        repeat_index: repeatIndex,
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
  const generatedAt = new Date().toISOString()
  const riskVerdict = summarizeRisk(results)
  const scorecardSummary = aggregateScorecard(results)
  const explorationSignals = aggregateExplorationSignals(results)
  const recommendedReviewMode = aggregateReviewMode(results)
  const variantEffectSummary = aggregateVariantEffectSummary(results)
  const experimentValidity = aggregateExperimentValidity(results)

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
        score_refs: scoreRefs(results),
        report_refs: reportRefs(results, outputMarkdownRel),
        risk_verdict: riskVerdict,
        gate_verdict: riskVerdict,
        experiment_validity: experimentValidity,
        variant_effect_summary: variantEffectSummary,
        runtime_difference_summary: variantEffectSummary.flatMap(item => item.summary),
        verdict_boundary:
          'risk_verdict/gate_verdict is regression-risk-only and is not a final experiment judgment.',
        scorecard_summary: scorecardSummary,
        exploration_signals: explorationSignals,
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
          execute_harness_alpha_limits:
            mode === 'execute_harness'
              ? {
                  scenario_count: 1,
                  candidate_count: 1,
                  repeat_count: 1,
                }
              : null,
          score_spec_ids: experiment.score_spec_ids ?? [],
          gate_policy_id: experiment.gate_policy_id ?? null,
        },
        results,
        created_at: generatedAt,
      },
      null,
      2,
    )}\n`,
  )

  await writeFile(
    outputMarkdownPath,
    buildMarkdownReport({
      experiment,
      results,
      outputJson: outputJsonRel,
      riskVerdict,
      experimentValidity,
      scorecardSummary,
      explorationSignals,
      recommendedReviewMode,
      variantEffectSummary,
    }),
  )

  console.log(`Created V2 experiment summary: ${outputJsonRel}`)
  console.log(`Created V2 experiment report: ${outputMarkdownRel}`)
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
