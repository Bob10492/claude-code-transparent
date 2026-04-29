import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

type JsonRecord = Record<string, unknown>

const repoRoot = path.resolve(import.meta.dirname, '..', '..')
const experimentRunsRoot = path.join(repoRoot, 'tests', 'evals', 'v2', 'experiment-runs')
const gateStatuses = new Set(['pass', 'warning', 'fail', 'inconclusive'])

async function readJson(filePath: string): Promise<JsonRecord> {
  return JSON.parse(await readFile(filePath, 'utf8')) as JsonRecord
}

function requireString(errors: string[], filePath: string, fieldName: string, value: unknown) {
  if (typeof value !== 'string' || value.trim() === '') {
    errors.push(`${filePath}.${fieldName} must be a non-empty string`)
  }
}

function requireArray(errors: string[], filePath: string, fieldName: string, value: unknown) {
  if (!Array.isArray(value)) {
    errors.push(`${filePath}.${fieldName} must be an array`)
  }
}

function requireNumber(errors: string[], objectName: string, fieldName: string, value: unknown) {
  if (typeof value !== 'number') {
    errors.push(`${objectName}.${fieldName} must be a number`)
  }
}

function validateArtifact(filePath: string, artifact: JsonRecord): string[] {
  const errors: string[] = []
  requireString(errors, filePath, 'experiment_id', artifact.experiment_id)
  requireString(errors, filePath, 'manifest_ref', artifact.manifest_ref)
  requireString(errors, filePath, 'generated_at', artifact.generated_at)
  requireString(errors, filePath, 'mode', artifact.mode)
  requireArray(errors, filePath, 'run_refs', artifact.run_refs)
  requireArray(errors, filePath, 'score_refs', artifact.score_refs)
  requireArray(errors, filePath, 'report_refs', artifact.report_refs)
  requireArray(errors, filePath, 'errors', artifact.errors)
  requireArray(errors, filePath, 'warnings', artifact.warnings)

  const gateVerdict = artifact.gate_verdict as JsonRecord | undefined
  if (!gateVerdict || typeof gateVerdict !== 'object' || Array.isArray(gateVerdict)) {
    errors.push(`${filePath}.gate_verdict must be an object`)
    return errors
  }
  if (!gateStatuses.has(String(gateVerdict.status))) {
    errors.push(`${filePath}.gate_verdict.status has invalid value: ${gateVerdict.status}`)
  }
  requireNumber(errors, `${filePath}.gate_verdict`, 'hard_fail_count', gateVerdict.hard_fail_count)
  requireNumber(errors, `${filePath}.gate_verdict`, 'soft_warning_count', gateVerdict.soft_warning_count)
  requireNumber(errors, `${filePath}.gate_verdict`, 'missing_score_count', gateVerdict.missing_score_count)
  requireNumber(errors, `${filePath}.gate_verdict`, 'inconclusive_count', gateVerdict.inconclusive_count)
  requireNumber(errors, `${filePath}.gate_verdict`, 'candidate_count', gateVerdict.candidate_count)
  return errors
}

const entries = await readdir(experimentRunsRoot, { withFileTypes: true }).catch(() => [])
const files = entries
  .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
  .map(entry => path.join(experimentRunsRoot, entry.name))

const errors: string[] = []
for (const filePath of files) {
  errors.push(...validateArtifact(filePath, await readJson(filePath)))
}

if (errors.length > 0) {
  console.error('V2 experiment artifact schema validation failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(`V2 experiment artifact schema validation passed: ${files.length} file(s).`)
