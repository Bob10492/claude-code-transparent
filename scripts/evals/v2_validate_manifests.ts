import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

import type {
  EvalChangeLayer,
  EvalExperiment,
  EvalScenario,
  EvalVariant,
} from '../../src/observability/v2/evalTypes'

const repoRoot = path.resolve(import.meta.dirname, '..', '..')
const evalRoot = path.join(repoRoot, 'tests', 'evals', 'v2')
const changeLayers = new Set<EvalChangeLayer>([
  'harness',
  'skill',
  'tool',
  'model',
  'mixed',
])

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, 'utf8')) as T
}

async function listJsonFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  return entries
    .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
    .map(entry => path.join(dir, entry.name))
}

function requireString(
  errors: string[],
  objectName: string,
  fieldName: string,
  value: unknown,
) {
  if (typeof value !== 'string' || value.trim() === '') {
    errors.push(`${objectName}.${fieldName} must be a non-empty string`)
  }
}

function requireArray(
  errors: string[],
  objectName: string,
  fieldName: string,
  value: unknown,
) {
  if (!Array.isArray(value)) {
    errors.push(`${objectName}.${fieldName} must be an array`)
  }
}

function validateScenario(filePath: string, scenario: EvalScenario): string[] {
  const errors: string[] = []
  requireString(errors, filePath, 'scenario_id', scenario.scenario_id)
  requireString(errors, filePath, 'name', scenario.name)
  requireString(errors, filePath, 'description', scenario.description)
  requireString(errors, filePath, 'owner', scenario.owner)
  requireArray(errors, filePath, 'tags', scenario.tags)
  requireArray(errors, filePath, 'expected_artifacts', scenario.expected_artifacts)
  requireArray(errors, filePath, 'expected_tools', scenario.expected_tools)
  requireArray(errors, filePath, 'expected_skills', scenario.expected_skills)
  requireArray(errors, filePath, 'expected_constraints', scenario.expected_constraints)
  return errors
}

function validateVariant(filePath: string, variant: EvalVariant): string[] {
  const errors: string[] = []
  requireString(errors, filePath, 'variant_id', variant.variant_id)
  requireString(errors, filePath, 'name', variant.name)
  requireString(errors, filePath, 'description', variant.description)
  if (!changeLayers.has(variant.change_layer)) {
    errors.push(`${filePath}.change_layer has invalid value: ${variant.change_layer}`)
  }
  return errors
}

function validateExperiment(filePath: string, experiment: EvalExperiment): string[] {
  const errors: string[] = []
  requireString(errors, filePath, 'experiment_id', experiment.experiment_id)
  requireString(errors, filePath, 'name', experiment.name)
  requireString(errors, filePath, 'goal', experiment.goal)
  requireString(errors, filePath, 'baseline_variant_id', experiment.baseline_variant_id)
  requireString(errors, filePath, 'scenario_set_id', experiment.scenario_set_id)
  requireArray(errors, filePath, 'candidate_variant_ids', experiment.candidate_variant_ids)
  return errors
}

async function validateAll(): Promise<string[]> {
  const errors: string[] = []

  for (const filePath of await listJsonFiles(path.join(evalRoot, 'scenarios'))) {
    if (path.basename(filePath).startsWith('_')) continue
    if (path.basename(filePath) === 'first-batch-catalog.json') continue
    errors.push(...validateScenario(filePath, await readJson<EvalScenario>(filePath)))
  }

  for (const filePath of await listJsonFiles(path.join(evalRoot, 'variants'))) {
    if (path.basename(filePath).startsWith('_')) continue
    errors.push(...validateVariant(filePath, await readJson<EvalVariant>(filePath)))
  }

  for (const filePath of await listJsonFiles(path.join(evalRoot, 'experiments'))) {
    if (path.basename(filePath).startsWith('_')) continue
    errors.push(...validateExperiment(filePath, await readJson<EvalExperiment>(filePath)))
  }

  return errors
}

const errors = await validateAll()
if (errors.length > 0) {
  console.error('V2 manifest validation failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('V2 manifest validation passed.')
