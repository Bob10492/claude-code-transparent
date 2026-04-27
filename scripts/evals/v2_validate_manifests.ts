import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

import type {
  EvalChangeLayer,
  EvalScenario,
  EvalVariant,
} from '../../src/observability/v2/evalTypes'
import type {
  EvalExperimentV21,
  EvalGatePolicy,
  EvalScoreSpecCollection,
} from '../../src/observability/v2/evalExperimentTypes'

const repoRoot = path.resolve(import.meta.dirname, '..', '..')
const evalRoot = path.join(repoRoot, 'tests', 'evals', 'v2')
const changeLayers = new Set<EvalChangeLayer>([
  'harness',
  'skill',
  'tool',
  'model',
  'mixed',
])
const scoreDimensions = new Set([
  'task_success',
  'decision_quality',
  'efficiency',
  'stability',
  'controllability',
])
const scoreDirections = new Set([
  'higher_is_better',
  'lower_is_better',
  'boolean_pass',
  'observed_only',
])
const automationLevels = new Set(['automatic', 'manual_review', 'mixed'])
const experimentModes = new Set(['bind_existing', 'execute_harness'])

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

function requireOptionalNumber(
  errors: string[],
  objectName: string,
  fieldName: string,
  value: unknown,
) {
  if (value !== undefined && typeof value !== 'number') {
    errors.push(`${objectName}.${fieldName} must be a number when present`)
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
  requireOptionalNumber(errors, filePath, 'max_turn_count', scenario.max_turn_count)
  requireOptionalNumber(
    errors,
    filePath,
    'max_total_billed_tokens',
    scenario.max_total_billed_tokens,
  )
  requireOptionalNumber(errors, filePath, 'max_subagent_count', scenario.max_subagent_count)
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

function validateExperiment(filePath: string, experiment: EvalExperimentV21): string[] {
  const errors: string[] = []
  requireString(errors, filePath, 'experiment_id', experiment.experiment_id)
  requireString(errors, filePath, 'name', experiment.name)
  requireString(errors, filePath, 'goal', experiment.goal)
  requireString(errors, filePath, 'baseline_variant_id', experiment.baseline_variant_id)
  requireString(errors, filePath, 'scenario_set_id', experiment.scenario_set_id)
  requireArray(errors, filePath, 'candidate_variant_ids', experiment.candidate_variant_ids)
  if (experiment.scenario_ids !== undefined) {
    requireArray(errors, filePath, 'scenario_ids', experiment.scenario_ids)
  }
  if (
    experiment.repeat_count !== undefined &&
    (typeof experiment.repeat_count !== 'number' || experiment.repeat_count < 1)
  ) {
    errors.push(`${filePath}.repeat_count must be a positive number when present`)
  }
  if (experiment.score_spec_ids !== undefined) {
    requireArray(errors, filePath, 'score_spec_ids', experiment.score_spec_ids)
  }
  if (
    experiment.mode !== undefined &&
    !experimentModes.has(experiment.mode)
  ) {
    errors.push(`${filePath}.mode has invalid value: ${experiment.mode}`)
  }
  if (experiment.action_bindings !== undefined) {
    requireArray(errors, filePath, 'action_bindings', experiment.action_bindings)
    for (const [index, binding] of experiment.action_bindings.entries()) {
      requireString(
        errors,
        `${filePath}.action_bindings[${index}]`,
        'scenario_id',
        binding.scenario_id,
      )
      requireString(
        errors,
        `${filePath}.action_bindings[${index}]`,
        'baseline_user_action_id',
        binding.baseline_user_action_id,
      )
      if (
        typeof binding.candidate_user_action_ids !== 'object' ||
        binding.candidate_user_action_ids === null ||
        Array.isArray(binding.candidate_user_action_ids)
      ) {
        errors.push(
          `${filePath}.action_bindings[${index}].candidate_user_action_ids must be an object`,
        )
      }
    }
  }
  return errors
}

function validateScoreSpecCollection(
  filePath: string,
  collection: EvalScoreSpecCollection,
): string[] {
  const errors: string[] = []
  requireArray(errors, filePath, 'score_specs', collection.score_specs)
  if (!Array.isArray(collection.score_specs)) return errors

  const seen = new Set<string>()
  for (const [index, spec] of collection.score_specs.entries()) {
    const objectName = `${filePath}.score_specs[${index}]`
    requireString(errors, objectName, 'score_spec_id', spec.score_spec_id)
    requireString(errors, objectName, 'subdimension', spec.subdimension)
    requireString(errors, objectName, 'formula', spec.formula)
    requireString(errors, objectName, 'version', spec.version)
    requireArray(errors, objectName, 'data_sources', spec.data_sources)
    requireArray(errors, objectName, 'evidence_requirements', spec.evidence_requirements)
    if (!scoreDimensions.has(spec.dimension)) {
      errors.push(`${objectName}.dimension has invalid value: ${spec.dimension}`)
    }
    if (!scoreDirections.has(spec.direction)) {
      errors.push(`${objectName}.direction has invalid value: ${spec.direction}`)
    }
    if (!automationLevels.has(spec.automation_level)) {
      errors.push(
        `${objectName}.automation_level has invalid value: ${spec.automation_level}`,
      )
    }
    if (seen.has(spec.score_spec_id)) {
      errors.push(`${objectName}.score_spec_id is duplicated: ${spec.score_spec_id}`)
    }
    seen.add(spec.score_spec_id)
  }
  return errors
}

function validateGatePolicy(filePath: string, gate: EvalGatePolicy): string[] {
  const errors: string[] = []
  requireString(errors, filePath, 'gate_policy_id', gate.gate_policy_id)
  requireString(errors, filePath, 'name', gate.name)
  requireArray(errors, filePath, 'rules', gate.rules)
  if (!Array.isArray(gate.rules)) return errors

  for (const [index, rule] of gate.rules.entries()) {
    const objectName = `${filePath}.rules[${index}]`
    requireString(errors, objectName, 'score_spec_id', rule.score_spec_id)
    requireString(errors, objectName, 'condition', rule.condition)
    if (!['hard_fail', 'soft_warning'].includes(rule.rule_type)) {
      errors.push(`${objectName}.rule_type has invalid value: ${rule.rule_type}`)
    }
    requireOptionalNumber(errors, objectName, 'threshold', rule.threshold)
  }
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
    errors.push(...validateExperiment(filePath, await readJson<EvalExperimentV21>(filePath)))
  }

  for (const filePath of await listJsonFiles(path.join(evalRoot, 'score-specs'))) {
    if (path.basename(filePath).startsWith('_')) continue
    errors.push(
      ...validateScoreSpecCollection(
        filePath,
        await readJson<EvalScoreSpecCollection>(filePath),
      ),
    )
  }

  for (const filePath of await listJsonFiles(path.join(evalRoot, 'gates'))) {
    if (path.basename(filePath).startsWith('_')) continue
    errors.push(...validateGatePolicy(filePath, await readJson<EvalGatePolicy>(filePath)))
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
