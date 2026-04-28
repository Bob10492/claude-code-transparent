import { spawnSync } from 'node:child_process'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import type { EvalScore } from '../../src/observability/v2/evalTypes'
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

interface CandidateExperimentResult {
  candidate_variant_id: string
  candidate_run_id: string
  candidate_user_action_id: string
  compare_report: string
  gate_results: GateResult[]
}

interface ScenarioExperimentResult {
  scenario_id: string
  repeat_index: number
  baseline_run_id: string
  baseline_user_action_id: string
  candidates: CandidateExperimentResult[]
}

interface GateResult {
  scenario_id: string
  candidate_variant_id: string
  rule_type: 'hard_fail' | 'soft_warning'
  score_spec_id: string
  passed: boolean
  baseline_value: number | null
  candidate_value: number | null
  regression_pct: number | null
  condition: string
  notes?: string
}

const repoRoot = path.resolve(import.meta.dirname, '..', '..')
const evalRoot = path.join(repoRoot, 'tests', 'evals', 'v2')
const scoresRoot = path.join(evalRoot, 'scores')
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
  return await readJson<EvalGatePolicy>(filePath)
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
  const result = spawnSync('bun', ['run', script, ...args], {
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

function scoreKey(score: EvalScore): string {
  return `${score.dimension}.${score.subdimension}`
}

function valueFor(scores: EvalScore[], scoreSpecId: string): number | null {
  const score = scores.find(item => scoreKey(item) === scoreSpecId)
  return score?.score_value ?? null
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
    const regressionPctValue = spec
      ? regressionPct({
          baselineValue,
          candidateValue,
          direction: spec.direction,
        })
      : null
    return {
      scenario_id: scenarioId,
      candidate_variant_id: candidateVariantId,
      rule_type: rule.rule_type,
      score_spec_id: rule.score_spec_id,
      passed: rulePassed({
        rule,
        baselineValue,
        candidateValue,
        regressionPctValue,
        taskSuccessNotImproved,
      }),
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
}): string[] {
  const args = [
    '--scenario',
    params.scenarioId,
    '--variant',
    params.variantId,
    '--user-action-id',
    params.userActionId,
    '--snapshot-db',
  ]
  if (params.scoreSpecIds.length > 0) {
    args.push('--score-spec-ids', params.scoreSpecIds.join(','))
  }
  return args
}

function buildMarkdownReport(params: {
  experiment: EvalExperimentV21
  results: ScenarioExperimentResult[]
  outputJson: string
}): string {
  const { experiment, results, outputJson } = params
  const allGateResults = results.flatMap(result =>
    result.candidates.flatMap(candidate => candidate.gate_results),
  )
  const hardFailures = allGateResults.filter(
    result => result.rule_type === 'hard_fail' && !result.passed,
  )
  const softWarnings = allGateResults.filter(
    result => result.rule_type === 'soft_warning' && !result.passed,
  )

  const rows = results
    .flatMap(result =>
      result.candidates.map(candidate => {
        const gateSummary = candidate.gate_results.length
          ? `${candidate.gate_results.filter(gate => !gate.passed).length}/${candidate.gate_results.length} failed`
          : 'not configured'
        return `| ${result.scenario_id} | ${result.repeat_index} | ${result.baseline_run_id} | ${candidate.candidate_variant_id} | ${candidate.candidate_run_id} | ${gateSummary} | ${candidate.compare_report} |`
      }),
    )
    .join('\n')

  const gateRows =
    allGateResults.length === 0
      ? '| n/a | n/a | n/a | n/a | n/a | n/a |\n'
      : allGateResults
          .map(
            result =>
              `| ${result.scenario_id} | ${result.candidate_variant_id} | ${result.rule_type} | ${result.score_spec_id} | ${result.passed ? 'pass' : 'fail'} | ${result.regression_pct ?? 'n/a'} |`,
          )
          .join('\n')

  return `# V2.1 Experiment Summary: ${experiment.experiment_id}

## 理解清单

- experiment: ${experiment.experiment_id}
- mode: ${experiment.mode ?? 'bind_existing'}
- baseline_variant: ${experiment.baseline_variant_id}
- candidate_variants: ${experiment.candidate_variant_ids.join(', ')}
- scenario_count: ${experiment.scenario_ids?.length ?? 0}
- score_specs: ${(experiment.score_spec_ids ?? []).join(', ') || 'not configured'}
- gate_policy: ${experiment.gate_policy_id ?? 'not configured'}
- output_json: ${outputJson}

## 预期效果

This summary records a manifest-driven V2.1 experiment run. In bind-existing mode, every generated V2 run is backed by an existing V1 user_action_id.

## 设计思路

V2.1 intentionally does not execute the harness automatically. It turns existing V1 traces into comparable V2 runs, then runs the existing scorer and comparison scripts.

## Verdict

- hard_failures: ${hardFailures.length}
- soft_warnings: ${softWarnings.length}
- gate_status: ${hardFailures.length > 0 ? 'failed' : softWarnings.length > 0 ? 'warning' : 'passed'}

## Runs

| scenario | repeat | baseline_run | candidate_variant | candidate_run | gate | compare_report |
| --- | ---: | --- | --- | --- | --- | --- |
${rows}

## Gate Results

| scenario | candidate_variant | rule_type | score_spec | result | regression_pct |
| --- | --- | --- | --- | --- | ---: |
${gateRows}
`
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  const experimentArg = String(args.experiment ?? '')
  if (!experimentArg) throw new Error('Missing required --experiment <id-or-path>')

  const experimentPath = await findExperimentPath(experimentArg)
  const experiment = await readJson<EvalExperimentV21>(experimentPath)
  const mode = experiment.mode ?? 'bind_existing'

  if (mode === 'execute_harness') {
    throw new Error(
      'execute_harness mode is not implemented yet: missing headless harness execution adapter',
    )
  }
  if (mode !== 'bind_existing') {
    throw new Error(
      `Unsupported V2.1 experiment mode: ${mode}`,
    )
  }

  const scenarioIds = experiment.scenario_ids ?? []
  if (scenarioIds.length === 0) {
    throw new Error('Experiment must define scenario_ids for V2.1 runner.')
  }

  const scoreSpecs = await loadScoreSpecs()
  const gatePolicy = await loadGatePolicy(experiment.gate_policy_id)
  for (const scoreSpecId of experiment.score_spec_ids ?? []) {
    if (!scoreSpecs.has(scoreSpecId)) {
      throw new Error(
        `Experiment references missing score_spec_id: ${scoreSpecId}`,
      )
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
  const results: ScenarioExperimentResult[] = []

  for (const scenarioId of scenarioIds) {
    const baselineUserActionId = findBoundUserActionId({
      experiment,
      scenarioId,
      variantId: experiment.baseline_variant_id,
    })
    if (!baselineUserActionId) {
      throw new Error(
        `Missing action binding for scenario=${scenarioId}, variant=${experiment.baseline_variant_id}. V2.1 bind_existing mode requires user_action_id bindings.`,
      )
    }

    for (let repeatIndex = 1; repeatIndex <= repeatCount; repeatIndex += 1) {
      const baselineOutput = runBunScript(
        'scripts/evals/v2_record_run.ts',
        buildRecordRunArgs({
          scenarioId,
          variantId: experiment.baseline_variant_id,
          userActionId: baselineUserActionId,
          scoreSpecIds: experiment.score_spec_ids ?? [],
        }),
      )
      const baselineRunId = extractCreatedRunId(baselineOutput)
      const baselineScores = await readJson<EvalScore[]>(
        path.join(scoresRoot, `${baselineRunId}.scores.json`),
      )

      const candidates: CandidateExperimentResult[] = []
      for (const candidateVariantId of experiment.candidate_variant_ids) {
        const candidateActionId = findBoundUserActionId({
          experiment,
          scenarioId,
          variantId: candidateVariantId,
        })
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
          }),
        )
        const candidateRunId = extractCreatedRunId(candidateOutput)
        const candidateScores = await readJson<EvalScore[]>(
          path.join(scoresRoot, `${candidateRunId}.scores.json`),
        )

        const compareOutput = runBunScript('scripts/evals/v2_compare_runs.ts', [
          '--baseline-run',
          baselineRunId,
          '--candidate-run',
          candidateRunId,
        ])

        candidates.push({
          candidate_variant_id: candidateVariantId,
          candidate_run_id: candidateRunId,
          candidate_user_action_id: candidateActionId,
          compare_report: extractCreatedReport(compareOutput),
          gate_results: evaluateGate({
            scenarioId,
            candidateVariantId,
            gatePolicy,
            scoreSpecs,
            baselineScores,
            candidateScores,
          }),
        })
      }

      results.push({
        scenario_id: scenarioId,
        repeat_index: repeatIndex,
        baseline_run_id: baselineRunId,
        baseline_user_action_id: baselineUserActionId,
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
  await writeFile(
    outputJsonPath,
    `${JSON.stringify(
      {
        experiment,
        runner: {
          mode,
          score_spec_ids: experiment.score_spec_ids ?? [],
          gate_policy_id: experiment.gate_policy_id ?? null,
        },
        results,
        created_at: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
  )

  const reportRoot = await resolveReportRoot()
  await mkdir(reportRoot, { recursive: true })
  const outputMarkdownPath = path.join(
    reportRoot,
    `experiment_${experiment.experiment_id}_${runStamp}.md`,
  )
  await writeFile(
    outputMarkdownPath,
    buildMarkdownReport({
      experiment,
      results,
      outputJson: outputJsonRel,
    }),
  )

  console.log(`Created V2.1 experiment summary: ${outputJsonRel}`)
  console.log(`Created V2.1 experiment report: ${path.relative(repoRoot, outputMarkdownPath)}`)
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
