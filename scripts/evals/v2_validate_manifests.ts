import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

import type {
  EvalChangeLayer,
  EvalScenario,
  EvalVariant,
} from '../../src/observability/v2/evalTypes'
import type {
  EvalExperimentActionBinding,
  EvalExperimentFlatActionBinding,
  EvalExperimentNestedActionBinding,
  EvalExperimentV21,
  EvalGatePolicy,
  EvalGatePolicyRule,
  EvalScoreSpecCollection,
} from '../../src/observability/v2/evalExperimentTypes'
import { listImplementedScoreSpecIds } from './v2_score_registry'

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
const reportProfiles = new Set(['smoke', 'real_experiment'])
const evaluationIntents = new Set(['regression', 'exploration'])

interface ValidationContext {
  scenarioIds: Set<string>
  variantIds: Set<string>
  scoreSpecIds: Set<string>
  gatePolicyIds: Set<string>
}

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

function requireOptionalString(
  errors: string[],
  objectName: string,
  fieldName: string,
  value: unknown,
) {
  if (value !== undefined && typeof value !== 'string') {
    errors.push(`${objectName}.${fieldName} must be a string when present`)
  }
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

function isPlaceholderActionId(value: string): boolean {
  return value.startsWith('REPLACE_WITH_') || value.trim() === ''
}

function normalizeGateRules(gate: EvalGatePolicy): EvalGatePolicyRule[] {
  return [
    ...(gate.rules ?? []),
    ...(gate.hard_fail_rules ?? []).map(rule => ({
      ...rule,
      rule_type: 'hard_fail' as const,
    })),
    ...(gate.soft_warning_rules ?? []).map(rule => ({
      ...rule,
      rule_type: 'soft_warning' as const,
    })),
  ]
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
  if (scenario.expected_observations !== undefined) {
    requireArray(errors, filePath, 'expected_observations', scenario.expected_observations)
  }
  requireOptionalString(errors, filePath, 'evaluation_note', scenario.evaluation_note)
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

function validateExperiment(
  filePath: string,
  experiment: EvalExperimentV21,
  context?: ValidationContext,
): string[] {
  const errors: string[] = []
  requireString(errors, filePath, 'experiment_id', experiment.experiment_id)
  requireString(errors, filePath, 'name', experiment.name)
  requireString(errors, filePath, 'goal', experiment.goal)
  requireString(errors, filePath, 'baseline_variant_id', experiment.baseline_variant_id)
  requireString(errors, filePath, 'scenario_set_id', experiment.scenario_set_id)
  requireArray(errors, filePath, 'candidate_variant_ids', experiment.candidate_variant_ids)
  if (experiment.scenario_ids !== undefined) {
    requireArray(errors, filePath, 'scenario_ids', experiment.scenario_ids)
    for (const scenarioId of experiment.scenario_ids) {
      if (typeof scenarioId === 'string' && context && !context.scenarioIds.has(scenarioId)) {
        errors.push(`${filePath}.scenario_ids references unknown scenario_id: ${scenarioId}`)
      }
    }
  }
  if (context && !context.variantIds.has(experiment.baseline_variant_id)) {
    errors.push(
      `${filePath}.baseline_variant_id references unknown variant_id: ${experiment.baseline_variant_id}`,
    )
  }
  if (Array.isArray(experiment.candidate_variant_ids)) {
    for (const variantId of experiment.candidate_variant_ids) {
      if (typeof variantId === 'string' && context && !context.variantIds.has(variantId)) {
        errors.push(
          `${filePath}.candidate_variant_ids references unknown variant_id: ${variantId}`,
        )
      }
    }
  }
  if (
    experiment.repeat_count !== undefined &&
    (typeof experiment.repeat_count !== 'number' || experiment.repeat_count < 1)
  ) {
    errors.push(`${filePath}.repeat_count must be a positive number when present`)
  }
  if (experiment.score_spec_ids !== undefined) {
    requireArray(errors, filePath, 'score_spec_ids', experiment.score_spec_ids)
    for (const scoreSpecId of experiment.score_spec_ids) {
      if (
        typeof scoreSpecId === 'string' &&
        context &&
        !context.scoreSpecIds.has(scoreSpecId)
      ) {
        errors.push(
          `${filePath}.score_spec_ids references unknown score_spec_id: ${scoreSpecId}`,
        )
      }
    }
  }
  if (
    experiment.gate_policy_id !== undefined &&
    context &&
    !context.gatePolicyIds.has(experiment.gate_policy_id)
  ) {
    errors.push(
      `${filePath}.gate_policy_id references unknown gate_policy_id: ${experiment.gate_policy_id}`,
    )
  }
  if (
    experiment.mode !== undefined &&
    !experimentModes.has(experiment.mode)
  ) {
    errors.push(`${filePath}.mode has invalid value: ${experiment.mode}`)
  }
  if (
    experiment.report_profile !== undefined &&
    !reportProfiles.has(experiment.report_profile)
  ) {
    errors.push(`${filePath}.report_profile has invalid value: ${experiment.report_profile}`)
  }
  if (
    experiment.evaluation_intent !== undefined &&
    !evaluationIntents.has(experiment.evaluation_intent)
  ) {
    errors.push(
      `${filePath}.evaluation_intent has invalid value: ${experiment.evaluation_intent}`,
    )
  }
  if (experiment.action_bindings !== undefined) {
    requireArray(errors, filePath, 'action_bindings', experiment.action_bindings)
    for (const [index, binding] of experiment.action_bindings.entries()) {
      const objectName = `${filePath}.action_bindings[${index}]`
      requireString(
        errors,
        objectName,
        'scenario_id',
        binding.scenario_id,
      )
      if (
        typeof binding.scenario_id === 'string' &&
        context &&
        !context.scenarioIds.has(binding.scenario_id)
      ) {
        errors.push(`${objectName}.scenario_id references unknown scenario_id: ${binding.scenario_id}`)
      }

      if (isFlatActionBinding(binding)) {
        requireString(errors, objectName, 'variant_id', binding.variant_id)
        requireString(
          errors,
          objectName,
          'entry_user_action_id',
          binding.entry_user_action_id,
        )
        if (context && !context.variantIds.has(binding.variant_id)) {
          errors.push(`${objectName}.variant_id references unknown variant_id: ${binding.variant_id}`)
        }
        if (isPlaceholderActionId(binding.entry_user_action_id)) {
          errors.push(`${objectName}.entry_user_action_id still contains a placeholder`)
        }
        continue
      }

      if (isNestedActionBinding(binding)) {
        requireString(
          errors,
          objectName,
          'baseline_user_action_id',
          binding.baseline_user_action_id,
        )
        if (isPlaceholderActionId(binding.baseline_user_action_id)) {
          errors.push(`${objectName}.baseline_user_action_id still contains a placeholder`)
        }
        if (
          typeof binding.candidate_user_action_ids !== 'object' ||
          binding.candidate_user_action_ids === null ||
          Array.isArray(binding.candidate_user_action_ids)
        ) {
          errors.push(`${objectName}.candidate_user_action_ids must be an object`)
        } else {
          for (const [variantId, actionId] of Object.entries(binding.candidate_user_action_ids)) {
            if (context && !context.variantIds.has(variantId)) {
              errors.push(
                `${objectName}.candidate_user_action_ids references unknown variant_id: ${variantId}`,
              )
            }
            if (isPlaceholderActionId(actionId)) {
              errors.push(
                `${objectName}.candidate_user_action_ids.${variantId} still contains a placeholder`,
              )
            }
          }
        }
        continue
      }

      errors.push(
        `${objectName} must use either flat {scenario_id, variant_id, entry_user_action_id} or nested {scenario_id, baseline_user_action_id, candidate_user_action_ids} format`,
      )
    }
  }
  if ((experiment.mode ?? 'bind_existing') === 'bind_existing') {
    for (const scenarioId of experiment.scenario_ids ?? []) {
      const variantIds = [experiment.baseline_variant_id, ...experiment.candidate_variant_ids]
      for (const variantId of variantIds) {
        const hasBinding = (experiment.action_bindings ?? []).some(binding => {
          if (binding.scenario_id !== scenarioId) return false
          if (isFlatActionBinding(binding)) {
            return binding.variant_id === variantId && !isPlaceholderActionId(binding.entry_user_action_id)
          }
          if (isNestedActionBinding(binding)) {
            if (variantId === experiment.baseline_variant_id) {
              return !isPlaceholderActionId(binding.baseline_user_action_id)
            }
            const actionId = binding.candidate_user_action_ids[variantId]
            return typeof actionId === 'string' && !isPlaceholderActionId(actionId)
          }
          return false
        })
        if (!hasBinding) {
          errors.push(
            `${filePath}.action_bindings missing bind_existing user_action_id for scenario=${scenarioId}, variant=${variantId}`,
          )
        }
      }
    }
  }
  return errors
}

function validateScoreSpecCollection(
  filePath: string,
  collection: EvalScoreSpecCollection,
  implementedScoreSpecIds: Set<string>,
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
    if (
      (typeof spec.version !== 'string' || spec.version.trim() === '') &&
      typeof spec.version !== 'number'
    ) {
      errors.push(`${objectName}.version must be a non-empty string or number`)
    }
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
    if (!implementedScoreSpecIds.has(spec.score_spec_id)) {
      errors.push(`${objectName}.score_spec_id has no implemented scorer: ${spec.score_spec_id}`)
    }
    seen.add(spec.score_spec_id)
  }
  return errors
}

function validateGatePolicy(
  filePath: string,
  gate: EvalGatePolicy,
  context?: ValidationContext,
): string[] {
  const errors: string[] = []
  requireString(errors, filePath, 'gate_policy_id', gate.gate_policy_id)
  requireString(errors, filePath, 'name', gate.name)
  const rules = normalizeGateRules(gate)
  if (rules.length === 0) {
    errors.push(`${filePath} must define at least one gate rule`)
    return errors
  }

  for (const [index, rule] of rules.entries()) {
    const objectName = `${filePath}.rules[${index}]`
    requireString(errors, objectName, 'score_spec_id', rule.score_spec_id)
    requireString(errors, objectName, 'condition', rule.condition)
    if (!['hard_fail', 'soft_warning'].includes(rule.rule_type)) {
      errors.push(`${objectName}.rule_type has invalid value: ${rule.rule_type}`)
    }
    requireOptionalNumber(errors, objectName, 'threshold', rule.threshold)
    if (context && !context.scoreSpecIds.has(rule.score_spec_id)) {
      errors.push(`${objectName}.score_spec_id references unknown score_spec_id: ${rule.score_spec_id}`)
    }
  }
  return errors
}

async function validateAll(): Promise<string[]> {
  const errors: string[] = []
  const context: ValidationContext = {
    scenarioIds: new Set<string>(),
    variantIds: new Set<string>(),
    scoreSpecIds: new Set<string>(),
    gatePolicyIds: new Set<string>(),
  }
  const implementedScoreSpecIds = new Set(listImplementedScoreSpecIds())

  const scenarioFiles = await listJsonFiles(path.join(evalRoot, 'scenarios'))
  const variantFiles = await listJsonFiles(path.join(evalRoot, 'variants'))
  const experimentFiles = await listJsonFiles(path.join(evalRoot, 'experiments'))
  const scoreSpecFiles = await listJsonFiles(path.join(evalRoot, 'score-specs'))
  const gateFiles = await listJsonFiles(path.join(evalRoot, 'gates'))

  for (const filePath of scenarioFiles) {
    if (path.basename(filePath).startsWith('_')) continue
    if (path.basename(filePath) === 'first-batch-catalog.json') continue
    const scenario = await readJson<EvalScenario>(filePath)
    if (typeof scenario.scenario_id === 'string') context.scenarioIds.add(scenario.scenario_id)
    errors.push(...validateScenario(filePath, scenario))
  }

  for (const filePath of variantFiles) {
    if (path.basename(filePath).startsWith('_')) continue
    const variant = await readJson<EvalVariant>(filePath)
    if (typeof variant.variant_id === 'string') context.variantIds.add(variant.variant_id)
    errors.push(...validateVariant(filePath, variant))
  }

  for (const filePath of scoreSpecFiles) {
    if (path.basename(filePath).startsWith('_')) continue
    const collection = await readJson<EvalScoreSpecCollection>(filePath)
    for (const spec of collection.score_specs ?? []) {
      if (typeof spec.score_spec_id === 'string') {
        context.scoreSpecIds.add(spec.score_spec_id)
      }
    }
    errors.push(
      ...validateScoreSpecCollection(
        filePath,
        collection,
        implementedScoreSpecIds,
      ),
    )
  }

  for (const filePath of gateFiles) {
    if (path.basename(filePath).startsWith('_')) continue
    const gate = await readJson<EvalGatePolicy>(filePath)
    if (typeof gate.gate_policy_id === 'string') {
      context.gatePolicyIds.add(gate.gate_policy_id)
    }
  }

  for (const filePath of experimentFiles) {
    if (path.basename(filePath).startsWith('_')) continue
    errors.push(
      ...validateExperiment(
        filePath,
        await readJson<EvalExperimentV21>(filePath),
        context,
      ),
    )
  }

  for (const filePath of gateFiles) {
    if (path.basename(filePath).startsWith('_')) continue
    errors.push(
      ...validateGatePolicy(filePath, await readJson<EvalGatePolicy>(filePath), context),
    )
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
