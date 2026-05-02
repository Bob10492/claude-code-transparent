import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

type JsonRecord = Record<string, unknown>

const repoRoot = path.resolve(import.meta.dirname, '..', '..')
const experimentRunsRoot = path.join(repoRoot, 'tests', 'evals', 'v2', 'experiment-runs')
const gateStatuses = new Set(['pass', 'warning', 'fail', 'inconclusive'])
const validityStatuses = new Set(['valid', 'invalid', 'inconclusive'])
const reportProfiles = new Set(['smoke', 'real_experiment'])
const evaluationIntents = new Set(['regression', 'exploration'])

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

function requireOptionalString(
  errors: string[],
  filePath: string,
  fieldName: string,
  value: unknown,
) {
  if (value !== undefined && typeof value !== 'string') {
    errors.push(`${filePath}.${fieldName} must be a string when present`)
  }
}

function requireObject(errors: string[], filePath: string, fieldName: string, value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    errors.push(`${filePath}.${fieldName} must be an object`)
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
  if (
    artifact.report_profile !== undefined &&
    !reportProfiles.has(String(artifact.report_profile))
  ) {
    errors.push(`${filePath}.report_profile has invalid value: ${artifact.report_profile}`)
  }
  if (
    artifact.evaluation_intent !== undefined &&
    artifact.evaluation_intent !== null &&
    !evaluationIntents.has(String(artifact.evaluation_intent))
  ) {
    errors.push(`${filePath}.evaluation_intent has invalid value: ${artifact.evaluation_intent}`)
  }

  const riskVerdict = (artifact.risk_verdict ?? artifact.gate_verdict) as JsonRecord | undefined
  if (!riskVerdict || typeof riskVerdict !== 'object' || Array.isArray(riskVerdict)) {
    errors.push(`${filePath}.risk_verdict or ${filePath}.gate_verdict must be an object`)
    return errors
  }
  const verdictObjectName = artifact.risk_verdict ? 'risk_verdict' : 'gate_verdict'
  if (!gateStatuses.has(String(riskVerdict.status))) {
    errors.push(`${filePath}.${verdictObjectName}.status has invalid value: ${riskVerdict.status}`)
  }
  requireNumber(errors, `${filePath}.${verdictObjectName}`, 'hard_fail_count', riskVerdict.hard_fail_count)
  requireNumber(errors, `${filePath}.${verdictObjectName}`, 'soft_warning_count', riskVerdict.soft_warning_count)
  requireNumber(errors, `${filePath}.${verdictObjectName}`, 'missing_score_count', riskVerdict.missing_score_count)
  requireNumber(errors, `${filePath}.${verdictObjectName}`, 'inconclusive_count', riskVerdict.inconclusive_count)
  requireNumber(errors, `${filePath}.${verdictObjectName}`, 'candidate_count', riskVerdict.candidate_count)
  if (artifact.risk_verdict !== undefined) {
    requireString(errors, `${filePath}.risk_verdict`, 'scope', riskVerdict.scope)
    if (riskVerdict.is_final_experiment_judgment !== false) {
      errors.push(`${filePath}.risk_verdict.is_final_experiment_judgment must be false`)
    }
  }
  if (artifact.scorecard_summary !== undefined) {
    requireArray(errors, filePath, 'scorecard_summary', artifact.scorecard_summary)
  }
  if (artifact.exploration_signals !== undefined) {
    requireArray(errors, filePath, 'exploration_signals', artifact.exploration_signals)
  }
  if (artifact.variant_effect_summary !== undefined) {
    requireArray(errors, filePath, 'variant_effect_summary', artifact.variant_effect_summary)
  }
  if (artifact.runtime_difference_summary !== undefined) {
    requireArray(errors, filePath, 'runtime_difference_summary', artifact.runtime_difference_summary)
  }
  if (artifact.experiment_validity !== undefined) {
    requireObject(errors, filePath, 'experiment_validity', artifact.experiment_validity)
    const validity = artifact.experiment_validity as JsonRecord
    if (!validityStatuses.has(String(validity.status))) {
      errors.push(
        `${filePath}.experiment_validity.status has invalid value: ${validity.status}`,
      )
    }
    requireOptionalString(errors, `${filePath}.experiment_validity`, 'profile', validity.profile)
    requireOptionalString(errors, `${filePath}.experiment_validity`, 'reason', validity.reason)
    requireArray(errors, `${filePath}.experiment_validity`, 'blockers', validity.blockers)
    requireArray(errors, `${filePath}.experiment_validity`, 'warnings', validity.warnings)
  }
  requireOptionalString(
    errors,
    filePath,
    'recommended_review_mode',
    artifact.recommended_review_mode,
  )
  requireOptionalString(errors, filePath, 'verdict_boundary', artifact.verdict_boundary)
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
