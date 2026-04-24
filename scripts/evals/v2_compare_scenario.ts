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
}

const repoRoot = path.resolve(import.meta.dirname, '..', '..')
const runsRoot = path.join(repoRoot, 'tests', 'evals', 'v2', 'runs')
const scoresRoot = path.join(repoRoot, 'tests', 'evals', 'v2', 'scores')

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

async function latestRunId(scenario: string, variant: string): Promise<string> {
  const files = await readdir(runsRoot, { withFileTypes: true }).catch(() => [])
  const runs = await Promise.all(
    files
      .filter(file => file.isFile() && file.name.endsWith('.json'))
      .map(file => readJson<RunFile>(path.join(runsRoot, file.name))),
  )
  const match = runs
    .map(file => file.run)
    .filter(run => run.scenario_id === scenario && run.variant_id === variant)
    .sort((a, b) => b.run_id.localeCompare(a.run_id))[0]
  if (!match) throw new Error(`No run found for scenario=${scenario}, variant=${variant}`)
  return match.run_id
}

function scoreKey(score: EvalScore): string {
  return `${score.dimension}.${score.subdimension}`
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
    if (baseline.score_value === null || candidate.score_value === null) return 'observed'
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

  return `# V2 Run Comparison

## 理解清单

- baseline_run: ${baselineRun.run.run_id}
- candidate_run: ${candidateRun.run.run_id}
- scenario: ${candidateRun.run.scenario_id}
- baseline_variant: ${baselineRun.run.variant_id}
- candidate_variant: ${candidateRun.run.variant_id}

## 预期效果

This report compares the latest baseline and candidate runs for one scenario.

## 设计思路

Higher is better for capability and stability scores. Lower is better for explicit efficiency cost, latency, and subagent count evidence.

## Summary

- regression_count: ${regressionCount}
- baseline_user_action_id: ${baselineRun.run.entry_user_action_id ?? 'unknown'}
- candidate_user_action_id: ${candidateRun.run.entry_user_action_id ?? 'unknown'}

## Score Deltas

| score | baseline | candidate | delta | verdict |
| --- | ---: | ---: | ---: | --- |
${rows}
`
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  const scenario = args.scenario
  const baselineVariant = args.baseline ?? 'baseline_default'
  const candidateVariant = args.candidate
  if (!scenario || !candidateVariant) {
    throw new Error(
      'Missing required args: --scenario <scenario_id> --candidate <variant_id> [--baseline baseline_default]',
    )
  }

  const baselineRun = await latestRunId(scenario, baselineVariant)
  const candidateRun = await latestRunId(scenario, candidateVariant)
  const baselineRunFile = await readJson<RunFile>(path.join(runsRoot, `${baselineRun}.json`))
  const candidateRunFile = await readJson<RunFile>(path.join(runsRoot, `${candidateRun}.json`))
  const baselineScores = await readJson<EvalScore[]>(
    path.join(scoresRoot, `${baselineRun}.scores.json`),
  )
  const candidateScores = await readJson<EvalScore[]>(
    path.join(scoresRoot, `${candidateRun}.scores.json`),
  )
  const reportRoot = await resolveReportRoot()
  const report = buildReport({
    baselineRun: baselineRunFile,
    candidateRun: candidateRunFile,
    baselineScores,
    candidateScores,
  })
  await mkdir(reportRoot, { recursive: true })
  const reportPath = path.join(reportRoot, `compare_${baselineRun}_vs_${candidateRun}.md`)
  await writeFile(reportPath, report)
  console.log(`Created comparison report: ${path.relative(repoRoot, reportPath)}`)
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
