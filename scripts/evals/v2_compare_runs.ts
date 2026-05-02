import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import type { EvalScore } from '../../src/observability/v2/evalTypes'

interface RunFile {
  run: {
    run_id: string
    scenario_id: string
    variant_id: string
    entry_user_action_id?: string
  }
  variant_effect?: Record<string, unknown>
  scenario?: {
    evaluation_note?: string
    expected_observations?: string[]
  }
}

const repoRoot = path.resolve(import.meta.dirname, '..', '..')
const evalRoot = path.join(repoRoot, 'tests', 'evals', 'v2')
const reportRoot = path.join(
  repoRoot,
  'ObservrityTask',
  '10-绯荤粺鐗堟湰',
  'v2',
  '06-杩愯鎶ュ憡',
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
  return await findChildDir(v2Root, name => name.startsWith('06-'))
}

function parseArgs(argv: string[]): Record<string, string> {
  const result: Record<string, string> = {}
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (!arg.startsWith('--')) continue
    const key = arg.slice(2)
    const next = argv[i + 1]
    if (!next || next.startsWith('--')) continue
    result[key] = next
    i += 1
  }
  return result
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, 'utf8')) as T
}

function runPath(runId: string): string {
  return path.join(evalRoot, 'runs', `${runId}.json`)
}

function scorePath(runId: string): string {
  return path.join(evalRoot, 'scores', `${runId}.scores.json`)
}

function scoreKey(score: EvalScore): string {
  return `${score.dimension}.${score.subdimension}`
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

function isLowerBetter(score: EvalScore): boolean {
  return (
    (score.dimension === 'efficiency' &&
      ['total_billed_tokens', 'total_prompt_input_tokens', 'e2e_duration_ms'].includes(
        score.subdimension,
      )) ||
    score.subdimension === 'subagent_count_observed'
  )
}

function classifyDelta(
  baseline: EvalScore | undefined,
  candidate: EvalScore | undefined,
): string {
  if (!baseline || !candidate) return 'missing'
  if (baseline.score_label === 'observed' || candidate.score_label === 'observed') {
    if (baseline.score_value === null || candidate.score_value === null) {
      return 'observed'
    }
    const delta = candidate.score_value - baseline.score_value
    if (delta === 0) return 'unchanged'
    if (isLowerBetter(candidate)) return delta < 0 ? 'improved' : 'regressed'
    return 'changed'
  }
  if (baseline.score_value === null || candidate.score_value === null) {
    return 'not_applicable'
  }

  const delta = candidate.score_value - baseline.score_value
  if (delta === 0) return 'unchanged'
  if (isLowerBetter(candidate)) return delta < 0 ? 'improved' : 'regressed'
  return delta > 0 ? 'improved' : 'regressed'
}

function formatValue(value: number | null): string {
  return value === null ? 'n/a' : String(value)
}

function policyMode(runFile: RunFile): string {
  const observed = runFile.variant_effect?.observed_policy
  if (observed && typeof observed === 'object' && !Array.isArray(observed)) {
    return asString((observed as Record<string, unknown>).mode) || 'unknown'
  }
  return 'unknown'
}

function policySignature(runFile: RunFile): string {
  const observed = runFile.variant_effect?.observed_policy
  if (!observed || typeof observed !== 'object' || Array.isArray(observed)) return ''
  return JSON.stringify(observed)
}

function buildReport(params: {
  baselineRun: RunFile
  candidateRun: RunFile
  baselineScores: EvalScore[]
  candidateScores: EvalScore[]
}): string {
  const { baselineRun, candidateRun, baselineScores, candidateScores } = params
  const baselineByKey = new Map(baselineScores.map(score => [scoreKey(score), score]))
  const candidateByKey = new Map(candidateScores.map(score => [scoreKey(score), score]))
  const keys = [...new Set([...baselineByKey.keys(), ...candidateByKey.keys()])].sort()

  const rows = keys
    .map(key => {
      const baseline = baselineByKey.get(key)
      const candidate = candidateByKey.get(key)
      const delta =
        baseline?.score_value === null ||
        candidate?.score_value === null ||
        baseline?.score_value === undefined ||
        candidate?.score_value === undefined
          ? 'n/a'
          : String(candidate.score_value - baseline.score_value)
      return `| ${key} | ${formatValue(baseline?.score_value ?? null)} | ${formatValue(candidate?.score_value ?? null)} | ${delta} | ${classifyDelta(baseline, candidate)} |`
    })
    .join('\n')

  const regressionCount = keys.filter(
    key => classifyDelta(baselineByKey.get(key), candidateByKey.get(key)) === 'regressed',
  ).length

  const baselineObserved = asBoolean(baselineRun.variant_effect?.policy_event_observed)
  const candidateObserved = asBoolean(candidateRun.variant_effect?.policy_event_observed)
  const candidateEffectObserved = asBoolean(
    candidateRun.variant_effect?.variant_effect_observed,
  )
  const baselinePolicyMode = policyMode(baselineRun)
  const candidatePolicyMode = policyMode(candidateRun)
  const baselineSubagentCount = asNumber(
    baselineRun.variant_effect?.session_memory_subagent_count,
  )
  const candidateSubagentCount = asNumber(
    candidateRun.variant_effect?.session_memory_subagent_count,
  )
  const baselineTriggerDetails = [
    ...asStringArray(baselineRun.variant_effect?.session_memory_trigger_details),
  ].sort()
  const candidateTriggerDetails = [
    ...asStringArray(candidateRun.variant_effect?.session_memory_trigger_details),
  ].sort()
  const runtimeDifferenceObserved =
    candidateEffectObserved &&
    ((policySignature(baselineRun) &&
      policySignature(candidateRun) &&
      policySignature(baselineRun) !== policySignature(candidateRun)) ||
      baselineSubagentCount !== candidateSubagentCount ||
      baselineTriggerDetails.join('|') !== candidateTriggerDetails.join('|'))

  const variantEffectRows = [
    `- baseline_policy_event_observed: ${baselineObserved}`,
    `- candidate_policy_event_observed: ${candidateObserved}`,
    `- candidate_variant_effect_observed: ${candidateEffectObserved}`,
    `- baseline_policy_mode: ${baselinePolicyMode}`,
    `- candidate_policy_mode: ${candidatePolicyMode}`,
    `- baseline_session_memory_subagent_count: ${baselineSubagentCount}`,
    `- candidate_session_memory_subagent_count: ${candidateSubagentCount}`,
  ].join('\n')

  const runtimeSummary = [
    baselineObserved
      ? `- Baseline session_memory policy was observed with mode=${baselinePolicyMode}.`
      : '- Baseline session_memory policy was not observed.',
    candidateObserved
      ? `- Candidate session_memory policy was observed with mode=${candidatePolicyMode}.`
      : '- Candidate session_memory policy was not observed.',
    candidateEffectObserved
      ? '- Candidate sparse runtime markers were observed.'
      : '- Candidate sparse runtime markers were not observed.',
    runtimeDifferenceObserved
      ? '- A runtime difference was observed between baseline and candidate.'
      : '- No stable runtime difference was observed between baseline and candidate.',
    `- Trigger details: baseline=[${baselineTriggerDetails.join(', ') || 'none'}], candidate=[${candidateTriggerDetails.join(', ') || 'none'}].`,
  ].join('\n')

  const interpretationLimits = [
    candidateEffectObserved
      ? '- Candidate runtime effect was observed, but this comparison is still single-run and should not be treated as a full stability judgment.'
      : '- Candidate runtime effect was not observed cleanly enough; score deltas may be noise rather than proof of harness value.',
    '- This compare report only uses trace-backed V1/V2 evidence and does not judge final answer quality by itself.',
    `- Scenario note: ${asString(candidateRun.scenario?.evaluation_note) || 'n/a'}`,
  ].join('\n')

  return `# V2 Run Comparison

## Understanding

- baseline_run: ${baselineRun.run.run_id}
- candidate_run: ${candidateRun.run.run_id}
- scenario: ${candidateRun.run.scenario_id}
- baseline_variant: ${baselineRun.run.variant_id}
- candidate_variant: ${candidateRun.run.variant_id}

## Expected Outcome

This report compares two V2 runs using score artifacts generated from V1 observability evidence.

## Design Rationale

Higher is better for capability and stability scores. Lower is better for explicit efficiency cost or latency scores.

## Summary

- regression_count: ${regressionCount}
- baseline_user_action_id: ${baselineRun.run.entry_user_action_id ?? 'unknown'}
- candidate_user_action_id: ${candidateRun.run.entry_user_action_id ?? 'unknown'}
- runtime_difference_observed: ${runtimeDifferenceObserved}

## Variant Effect Evidence

${variantEffectRows}

## Runtime Difference Summary

${runtimeSummary}

## Score Deltas

| score | baseline | candidate | delta | verdict |
| --- | ---: | ---: | ---: | --- |
${rows}

## Interpretation Limits

${interpretationLimits}
`
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  const baselineRunId = args['baseline-run']
  const candidateRunId = args['candidate-run']
  if (!baselineRunId || !candidateRunId) {
    throw new Error(
      'Missing required args: --baseline-run <run_id> --candidate-run <run_id>',
    )
  }

  const baselineRun = await readJson<RunFile>(runPath(baselineRunId))
  const candidateRun = await readJson<RunFile>(runPath(candidateRunId))
  const baselineScores = await readJson<EvalScore[]>(scorePath(baselineRunId))
  const candidateScores = await readJson<EvalScore[]>(scorePath(candidateRunId))
  const outputReportRoot = await resolveReportRoot()
  const report = buildReport({
    baselineRun,
    candidateRun,
    baselineScores,
    candidateScores,
  })

  await mkdir(outputReportRoot, { recursive: true })
  const reportPath = path.join(
    outputReportRoot,
    `compare_${baselineRunId}_vs_${candidateRunId}.md`,
  )
  await writeFile(reportPath, report)
  console.log(`Created comparison report: ${path.relative(repoRoot, reportPath)}`)
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
