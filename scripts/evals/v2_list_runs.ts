import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

interface RunFile {
  run: {
    run_id: string
    scenario_id: string
    variant_id: string
    started_at: string
    entry_user_action_id?: string
    observability_db_ref?: string
  }
}

const repoRoot = path.resolve(import.meta.dirname, '..', '..')
const runsRoot = path.join(repoRoot, 'tests', 'evals', 'v2', 'runs')

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

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  const scenario = args.scenario
  const variant = args.variant
  const limit = Number(args.limit ?? 20)

  const files = await readdir(runsRoot, { withFileTypes: true }).catch(() => [])
  const runs = await Promise.all(
    files
      .filter(file => file.isFile() && file.name.endsWith('.json'))
      .map(file => readJson<RunFile>(path.join(runsRoot, file.name))),
  )

  const filtered = runs
    .map(file => file.run)
    .filter(run => !scenario || run.scenario_id === scenario)
    .filter(run => !variant || run.variant_id === variant)
    .sort((a, b) => b.run_id.localeCompare(a.run_id))
    .slice(0, limit)

  for (const run of filtered) {
    console.log(
      [
        run.run_id,
        `scenario=${run.scenario_id}`,
        `variant=${run.variant_id}`,
        `action=${run.entry_user_action_id ?? 'unknown'}`,
        `db=${run.observability_db_ref ?? 'unknown'}`,
      ].join(' | '),
    )
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
