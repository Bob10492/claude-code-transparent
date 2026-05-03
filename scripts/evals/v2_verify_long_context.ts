import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

type JsonRecord = Record<string, unknown>

const repoRoot = path.resolve(import.meta.dirname, '..', '..')
const experimentRunsRoot = path.join(repoRoot, 'tests', 'evals', 'v2', 'experiment-runs')
const reportsRoot = path.join(repoRoot, 'tests', 'evals', 'v2', 'verification-reports')
const stamp = new Date().toISOString().replace(/[:.]/g, '')

async function findLatestFixtureSmokeSummary(): Promise<string> {
  const entries = await readdir(experimentRunsRoot, { withFileTypes: true })
  const matches = entries
    .filter(
      entry =>
        entry.isFile() &&
        entry.name.startsWith('v2_4_long_context_fixture_smoke_') &&
        entry.name.endsWith('.json'),
    )
    .map(entry => entry.name)
    .sort()
  const latest = matches.at(-1)
  if (!latest) {
    throw new Error(
      'No V2.4 fixture smoke summary found. Run bun run scripts/evals/v2_run_experiment.ts --experiment tests/evals/v2/experiments/_experiment.long_context.fixture_smoke.json first.',
    )
  }
  return path.join(experimentRunsRoot, latest)
}

async function main(): Promise<void> {
  const scenarioIds = [
    'long_context_constraint_retention',
    'long_context_fact_retrieval',
    'long_context_distractor_resistance',
    'long_context_compaction_pressure',
  ]
  for (const scenarioId of scenarioIds) {
    const scenarioPath = path.join(
      repoRoot,
      'tests',
      'evals',
      'v2',
      'scenarios',
      'long-context',
      `${scenarioId}.json`,
    )
    await readFile(scenarioPath, 'utf8')
  }

  const summaryPath = await findLatestFixtureSmokeSummary()
  const summary = JSON.parse(await readFile(summaryPath, 'utf8')) as JsonRecord
  const reportRefs = Array.isArray(summary.report_refs)
    ? summary.report_refs.filter((value): value is string => typeof value === 'string')
    : []
  const batchRef =
    reportRefs.find(ref => path.basename(ref).startsWith('batch_experiment_')) ?? null
  if (!batchRef) {
    throw new Error('Latest V2.4 fixture smoke summary is missing a batch report ref.')
  }
  const batchMarkdown = await readFile(path.resolve(repoRoot, batchRef), 'utf8')

  if (!Array.isArray(summary.long_context_summary)) {
    throw new Error('summary.long_context_summary must be present for V2.4 fixture smoke.')
  }
  if ((summary.long_context_summary as unknown[]).length < 4) {
    throw new Error('summary.long_context_summary must contain at least four scenario rows.')
  }
  if (typeof summary.long_context_review_verdict !== 'string') {
    throw new Error('summary.long_context_review_verdict must be present.')
  }
  if (!batchMarkdown.includes('## Long Context Summary')) {
    throw new Error('Batch report is missing the Long Context Summary section.')
  }

  await mkdir(reportsRoot, { recursive: true })
  const verificationPath = path.join(
    reportsRoot,
    `v2_4_long_context_${stamp}.json`,
  )
  await writeFile(
    verificationPath,
    `${JSON.stringify(
      {
        verification_id: `v2_4_long_context_${stamp}`,
        generated_at: new Date().toISOString(),
        passed: true,
        inspected_summary_ref: path.relative(repoRoot, summaryPath),
        batch_report_ref: batchRef,
        long_context_review_verdict: summary.long_context_review_verdict,
        scenario_row_count: (summary.long_context_summary as unknown[]).length,
      },
      null,
      2,
    )}\n`,
  )

  console.log(
    `V2.4 long-context verification passed: ${path.relative(repoRoot, verificationPath)}`,
  )
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
