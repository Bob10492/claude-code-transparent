import { access, readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

type JsonRecord = Record<string, unknown>

const repoRoot = path.resolve(import.meta.dirname, '..', '..')
const feedbackRoot = path.join(repoRoot, 'tests', 'evals', 'v2', 'feedback')
const feedbackRunsRoot = path.join(feedbackRoot, 'runs')

const betaSeverity = new Set(['info', 'warning', 'blocking'])
const legacySeverity = new Set(['low', 'medium', 'high'])
const factOrInference = new Set(['fact', 'inference'])
const findingKinds = new Set([
  'missing_score',
  'manual_review_boundary',
  'runtime_observation_gap',
  'stability_gap',
  'execution_failure',
])
const scopes = new Set(['experiment', 'scenario', 'variant', 'run_group', 'run'])
const proposalTypes = new Set([
  'evaluator_improvement',
  'score_binding_improvement',
  'scenario_improvement',
  'feedback_contract_improvement',
  'harness_candidate_improvement',
])
const targetLayers = new Set([
  'evaluator',
  'scorer',
  'scenario',
  'harness',
  'report',
  'feedback_system',
  'mixed',
])
const priorities = new Set(['P0', 'P1', 'P2'])
const queueBuckets = new Set([
  'top_recommendation',
  'recommended_now',
  'recommended_later',
  'deferred',
  'blocked',
])
const confidenceValues = new Set(['low', 'medium', 'high'])

async function readJson(filePath: string): Promise<JsonRecord> {
  return JSON.parse(await readFile(filePath, 'utf8')) as JsonRecord
}

function requireString(errors: string[], objectName: string, fieldName: string, value: unknown) {
  if (typeof value !== 'string' || value.trim() === '') {
    errors.push(`${objectName}.${fieldName} must be a non-empty string`)
  }
}

function requireArray(errors: string[], objectName: string, fieldName: string, value: unknown) {
  if (!Array.isArray(value)) {
    errors.push(`${objectName}.${fieldName} must be an array`)
  }
}

function requireBoolean(
  errors: string[],
  objectName: string,
  fieldName: string,
  value: unknown,
) {
  if (typeof value !== 'boolean') {
    errors.push(`${objectName}.${fieldName} must be a boolean`)
  }
}

function requireObject(errors: string[], objectName: string, fieldName: string, value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    errors.push(`${objectName}.${fieldName} must be an object`)
  }
}

function requireStringArray(
  errors: string[],
  objectName: string,
  fieldName: string,
  value: unknown,
) {
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) {
    errors.push(`${objectName}.${fieldName} must be an array of strings`)
  }
}

function validateLegacyRun(filePath: string, artifact: JsonRecord): string[] {
  const errors: string[] = []
  requireString(errors, filePath, 'feedback_run_id', artifact.feedback_run_id)
  requireString(errors, filePath, 'generated_at', artifact.generated_at)
  requireString(errors, filePath, 'source_experiment_id', artifact.source_experiment_id)
  requireString(
    errors,
    filePath,
    'source_experiment_run_ref',
    artifact.source_experiment_run_ref,
  )
  requireArray(errors, filePath, 'finding_refs', artifact.finding_refs)
  requireArray(errors, filePath, 'hypothesis_refs', artifact.hypothesis_refs)
  requireArray(errors, filePath, 'proposal_refs', artifact.proposal_refs)
  requireArray(
    errors,
    filePath,
    'candidate_proposal_refs',
    artifact.candidate_proposal_refs,
  )
  requireArray(
    errors,
    filePath,
    'next_experiment_plan_refs',
    artifact.next_experiment_plan_refs,
  )
  requireString(errors, filePath, 'report_ref', artifact.report_ref)
  if (artifact.human_approval_required !== true) {
    errors.push(`${filePath}.human_approval_required must be true`)
  }
  if (artifact.status !== 'completed') {
    errors.push(`${filePath}.status must be completed`)
  }
  return errors
}

async function fileExists(relativePath: string): Promise<boolean> {
  try {
    await access(path.join(repoRoot, relativePath))
    return true
  } catch {
    return false
  }
}

function validateFinding(filePath: string, finding: JsonRecord, strictBeta: boolean): string[] {
  const errors: string[] = []
  requireString(errors, filePath, 'finding_id', finding.finding_id)
  requireString(errors, filePath, 'source_experiment_id', finding.source_experiment_id)
  requireString(errors, filePath, 'source_report_ref', finding.source_report_ref)
  requireString(errors, filePath, 'finding_type', finding.finding_type)
  requireString(errors, filePath, 'summary', finding.summary)
  requireString(errors, filePath, 'evidence_ref', finding.evidence_ref)
  if (!factOrInference.has(String(finding.fact_or_inference)) || finding.fact_or_inference !== 'fact') {
    errors.push(`${filePath}.fact_or_inference must be fact`)
  }

  if (strictBeta) {
    if (!betaSeverity.has(String(finding.severity))) {
      errors.push(`${filePath}.severity has invalid beta value: ${finding.severity}`)
    }
    if (!findingKinds.has(String(finding.finding_kind))) {
      errors.push(`${filePath}.finding_kind has invalid value: ${finding.finding_kind}`)
    }
    if (!scopes.has(String(finding.scope))) {
      errors.push(`${filePath}.scope has invalid value: ${finding.scope}`)
    }
    requireString(errors, filePath, 'scope_ref', finding.scope_ref)
    requireBoolean(errors, filePath, 'is_blocking', finding.is_blocking)
    requireBoolean(
      errors,
      filePath,
      'requires_manual_judgement',
      finding.requires_manual_judgement,
    )
    requireBoolean(errors, filePath, 'auto_resolvable', finding.auto_resolvable)
  } else if (!legacySeverity.has(String(finding.severity))) {
    errors.push(`${filePath}.severity has invalid legacy value: ${finding.severity}`)
  }

  return errors
}

function validateHypothesis(
  filePath: string,
  hypothesis: JsonRecord,
  strictBeta: boolean,
): string[] {
  const errors: string[] = []
  requireString(errors, filePath, 'hypothesis_id', hypothesis.hypothesis_id)
  requireArray(errors, filePath, 'based_on_finding_ids', hypothesis.based_on_finding_ids)
  requireString(errors, filePath, 'hypothesis', hypothesis.hypothesis)
  requireArray(
    errors,
    filePath,
    'supporting_evidence_refs',
    hypothesis.supporting_evidence_refs,
  )
  requireArray(errors, filePath, 'risks', hypothesis.risks)
  if (!factOrInference.has(String(hypothesis.fact_or_inference)) || hypothesis.fact_or_inference !== 'inference') {
    errors.push(`${filePath}.fact_or_inference must be inference`)
  }
  if (!confidenceValues.has(String(hypothesis.confidence))) {
    errors.push(`${filePath}.confidence has invalid value: ${hypothesis.confidence}`)
  }

  if (strictBeta) {
    requireArray(errors, filePath, 'depends_on_finding_refs', hypothesis.depends_on_finding_refs)
    requireArray(errors, filePath, 'falsifiable_by', hypothesis.falsifiable_by)
  }

  return errors
}

function validateProposal(filePath: string, proposal: JsonRecord, strictBeta: boolean): string[] {
  const errors: string[] = []
  requireString(errors, filePath, 'proposal_id', proposal.proposal_id)
  requireArray(errors, filePath, 'based_on_hypothesis_ids', proposal.based_on_hypothesis_ids)
  requireString(errors, filePath, 'description', proposal.description)
  requireString(errors, filePath, 'expected_effect', proposal.expected_effect)
  requireArray(errors, filePath, 'risks', proposal.risks)
  if (proposal.requires_human_approval !== true) {
    errors.push(`${filePath}.requires_human_approval must be true`)
  }
  if (!proposalTypes.has(String(proposal.proposal_type))) {
    errors.push(`${filePath}.proposal_type has invalid value: ${proposal.proposal_type}`)
  }
  if (!targetLayers.has(String(proposal.target_layer))) {
    errors.push(`${filePath}.target_layer has invalid value: ${proposal.target_layer}`)
  }

  if (strictBeta) {
    requireArray(errors, filePath, 'based_on_finding_ids', proposal.based_on_finding_ids)
    if (!priorities.has(String(proposal.priority))) {
      errors.push(`${filePath}.priority has invalid value: ${proposal.priority}`)
    }
    if (!queueBuckets.has(String(proposal.queue_bucket))) {
      errors.push(`${filePath}.queue_bucket has invalid value: ${proposal.queue_bucket}`)
    }
    requireString(errors, filePath, 'why_now', proposal.why_now)
    if (proposal.why_not_now !== null && proposal.why_not_now !== undefined) {
      requireString(errors, filePath, 'why_not_now', proposal.why_not_now)
    }
    requireArray(errors, filePath, 'blocking_finding_ids', proposal.blocking_finding_ids)
    requireArray(
      errors,
      filePath,
      'manual_judgement_finding_ids',
      proposal.manual_judgement_finding_ids,
    )
  }

  return errors
}

function validateCandidateProposal(filePath: string, artifact: JsonRecord): string[] {
  const errors: string[] = []
  requireString(errors, filePath, 'candidate_proposal_id', artifact.candidate_proposal_id)
  requireString(errors, filePath, 'based_on_proposal_id', artifact.based_on_proposal_id)
  requireString(errors, filePath, 'change_layer', artifact.change_layer)
  requireString(errors, filePath, 'variant_name', artifact.variant_name)
  requireString(errors, filePath, 'implementation_scope', artifact.implementation_scope)
  requireStringArray(errors, filePath, 'do_not_touch', artifact.do_not_touch)
  requireObject(errors, filePath, 'suggested_manifest_patch', artifact.suggested_manifest_patch)
  return errors
}

function validateExperimentPlan(filePath: string, artifact: JsonRecord): string[] {
  const errors: string[] = []
  requireString(errors, filePath, 'next_experiment_plan_id', artifact.next_experiment_plan_id)
  requireString(errors, filePath, 'based_on_proposal_id', artifact.based_on_proposal_id)
  requireStringArray(errors, filePath, 'scenario_ids', artifact.scenario_ids)
  requireString(errors, filePath, 'baseline_variant_id', artifact.baseline_variant_id)
  requireString(errors, filePath, 'candidate_variant_id', artifact.candidate_variant_id)
  if (typeof artifact.repeat_count !== 'number') {
    errors.push(`${filePath}.repeat_count must be a number`)
  }
  requireStringArray(errors, filePath, 'success_criteria', artifact.success_criteria)
  requireStringArray(errors, filePath, 'failure_criteria', artifact.failure_criteria)
  requireBoolean(errors, filePath, 'manual_review_required', artifact.manual_review_required)
  return errors
}

async function validateBetaRun(filePath: string, artifact: JsonRecord): Promise<string[]> {
  const errors: string[] = []
  requireString(errors, filePath, 'taxonomy_version', artifact.taxonomy_version)
  requireString(errors, filePath, 'feedback_run_id', artifact.feedback_run_id)
  requireString(errors, filePath, 'generated_at', artifact.generated_at)
  requireString(errors, filePath, 'source_experiment_id', artifact.source_experiment_id)
  requireString(
    errors,
    filePath,
    'source_experiment_run_ref',
    artifact.source_experiment_run_ref,
  )
  requireStringArray(errors, filePath, 'source_report_refs', artifact.source_report_refs)
  requireStringArray(errors, filePath, 'finding_refs', artifact.finding_refs)
  requireStringArray(errors, filePath, 'hypothesis_refs', artifact.hypothesis_refs)
  requireStringArray(errors, filePath, 'proposal_refs', artifact.proposal_refs)
  requireStringArray(
    errors,
    filePath,
    'candidate_proposal_refs',
    artifact.candidate_proposal_refs,
  )
  requireStringArray(
    errors,
    filePath,
    'next_experiment_plan_refs',
    artifact.next_experiment_plan_refs,
  )
  requireString(errors, filePath, 'report_ref', artifact.report_ref)
  requireStringArray(errors, filePath, 'blocking_finding_refs', artifact.blocking_finding_refs)
  requireStringArray(
    errors,
    filePath,
    'manual_judgement_required_finding_refs',
    artifact.manual_judgement_required_finding_refs,
  )
  requireStringArray(
    errors,
    filePath,
    'auto_resolvable_finding_refs',
    artifact.auto_resolvable_finding_refs,
  )
  if (artifact.human_approval_required !== true) {
    errors.push(`${filePath}.human_approval_required must be true`)
  }
  if (artifact.status !== 'completed') {
    errors.push(`${filePath}.status must be completed`)
  }

  requireObject(errors, filePath, 'proposal_queue', artifact.proposal_queue)
  requireObject(errors, filePath, 'approval_card', artifact.approval_card)
  if (errors.length > 0) return errors

  const proposalQueue = artifact.proposal_queue as JsonRecord
  if (
    proposalQueue.top_recommendation_proposal_ref !== null &&
    proposalQueue.top_recommendation_proposal_ref !== undefined
  ) {
    requireString(
      errors,
      `${filePath}.proposal_queue`,
      'top_recommendation_proposal_ref',
      proposalQueue.top_recommendation_proposal_ref,
    )
  }
  requireStringArray(
    errors,
    `${filePath}.proposal_queue`,
    'recommended_now_proposal_refs',
    proposalQueue.recommended_now_proposal_refs,
  )
  requireStringArray(
    errors,
    `${filePath}.proposal_queue`,
    'recommended_later_proposal_refs',
    proposalQueue.recommended_later_proposal_refs,
  )
  requireStringArray(
    errors,
    `${filePath}.proposal_queue`,
    'deferred_proposal_refs',
    proposalQueue.deferred_proposal_refs,
  )
  requireStringArray(
    errors,
    `${filePath}.proposal_queue`,
    'blocked_proposal_refs',
    proposalQueue.blocked_proposal_refs,
  )

  const approvalCard = artifact.approval_card as JsonRecord
  if (
    approvalCard.current_top_recommendation_proposal_ref !== null &&
    approvalCard.current_top_recommendation_proposal_ref !== undefined
  ) {
    requireString(
      errors,
      `${filePath}.approval_card`,
      'current_top_recommendation_proposal_ref',
      approvalCard.current_top_recommendation_proposal_ref,
    )
  }
  requireString(errors, `${filePath}.approval_card`, 'why_now', approvalCard.why_now)
  requireStringArray(
    errors,
    `${filePath}.approval_card`,
    'why_not_others_yet',
    approvalCard.why_not_others_yet,
  )
  requireString(
    errors,
    `${filePath}.approval_card`,
    'approval_scope',
    approvalCard.approval_scope,
  )
  requireStringArray(
    errors,
    `${filePath}.approval_card`,
    'do_not_touch',
    approvalCard.do_not_touch,
  )
  if (
    approvalCard.next_experiment_plan_ref !== null &&
    approvalCard.next_experiment_plan_ref !== undefined
  ) {
    requireString(
      errors,
      `${filePath}.approval_card`,
      'next_experiment_plan_ref',
      approvalCard.next_experiment_plan_ref,
    )
  }
  requireStringArray(
    errors,
    `${filePath}.approval_card`,
    'success_criteria',
    approvalCard.success_criteria,
  )
  requireStringArray(errors, `${filePath}.approval_card`, 'risks', approvalCard.risks)
  requireString(
    errors,
    `${filePath}.approval_card`,
    'manual_review_boundary',
    approvalCard.manual_review_boundary,
  )

  const proposalRefs = artifact.proposal_refs as string[]
  const findingRefs = artifact.finding_refs as string[]
  const hypothesisRefs = artifact.hypothesis_refs as string[]
  const candidateProposalRefs = artifact.candidate_proposal_refs as string[]
  const nextPlanRefs = artifact.next_experiment_plan_refs as string[]

  if (proposalRefs.length > 0 && proposalQueue.top_recommendation_proposal_ref == null) {
    errors.push(`${filePath}.proposal_queue.top_recommendation_proposal_ref must exist when proposals exist`)
  }
  if (
    typeof proposalQueue.top_recommendation_proposal_ref === 'string' &&
    !proposalRefs.includes(proposalQueue.top_recommendation_proposal_ref)
  ) {
    errors.push(`${filePath}.proposal_queue.top_recommendation_proposal_ref must reference proposal_refs`)
  }
  if (
    typeof approvalCard.current_top_recommendation_proposal_ref === 'string' &&
    approvalCard.current_top_recommendation_proposal_ref !== proposalQueue.top_recommendation_proposal_ref
  ) {
    errors.push(`${filePath}.approval_card.current_top_recommendation_proposal_ref must match proposal_queue.top_recommendation_proposal_ref`)
  }
  if (
    typeof approvalCard.next_experiment_plan_ref === 'string' &&
    !nextPlanRefs.includes(approvalCard.next_experiment_plan_ref)
  ) {
    errors.push(`${filePath}.approval_card.next_experiment_plan_ref must reference next_experiment_plan_refs`)
  }

  for (const ref of [
    ...proposalQueue.recommended_now_proposal_refs as string[],
    ...proposalQueue.recommended_later_proposal_refs as string[],
    ...proposalQueue.deferred_proposal_refs as string[],
    ...proposalQueue.blocked_proposal_refs as string[],
  ]) {
    if (!proposalRefs.includes(ref)) {
      errors.push(`${filePath}.proposal_queue contains unknown proposal ref: ${ref}`)
    }
  }

  for (const ref of [
    ...(artifact.blocking_finding_refs as string[]),
    ...(artifact.manual_judgement_required_finding_refs as string[]),
    ...(artifact.auto_resolvable_finding_refs as string[]),
  ]) {
    if (!findingRefs.includes(ref)) {
      errors.push(`${filePath} feedback finding bucket contains unknown finding ref: ${ref}`)
    }
  }

  if (!(await fileExists(String(artifact.report_ref)))) {
    errors.push(`${filePath}.report_ref does not exist: ${artifact.report_ref}`)
  }

  const proposalArtifacts = new Map<string, JsonRecord>()
  for (const ref of proposalRefs) {
    if (!(await fileExists(ref))) {
      errors.push(`${filePath} missing referenced proposal file: ${ref}`)
      continue
    }
    const proposal = await readJson(path.join(repoRoot, ref))
    proposalArtifacts.set(ref, proposal)
    errors.push(...validateProposal(ref, proposal, true))
  }

  const topBucketCount = [...proposalArtifacts.values()].filter(
    proposal => proposal.queue_bucket === 'top_recommendation',
  ).length
  if (proposalArtifacts.size > 0 && topBucketCount !== 1) {
    errors.push(`${filePath} must have exactly one proposal with queue_bucket=top_recommendation`)
  }

  for (const ref of findingRefs) {
    if (!(await fileExists(ref))) {
      errors.push(`${filePath} missing referenced finding file: ${ref}`)
      continue
    }
    errors.push(...validateFinding(ref, await readJson(path.join(repoRoot, ref)), true))
  }

  for (const ref of hypothesisRefs) {
    if (!(await fileExists(ref))) {
      errors.push(`${filePath} missing referenced hypothesis file: ${ref}`)
      continue
    }
    errors.push(...validateHypothesis(ref, await readJson(path.join(repoRoot, ref)), true))
  }

  for (const ref of candidateProposalRefs) {
    if (!(await fileExists(ref))) {
      errors.push(`${filePath} missing referenced candidate proposal file: ${ref}`)
      continue
    }
    errors.push(
      ...validateCandidateProposal(ref, await readJson(path.join(repoRoot, ref))),
    )
  }

  for (const ref of nextPlanRefs) {
    if (!(await fileExists(ref))) {
      errors.push(`${filePath} missing referenced next experiment plan file: ${ref}`)
      continue
    }
    errors.push(...validateExperimentPlan(ref, await readJson(path.join(repoRoot, ref))))
  }

  return errors
}

const entries = await readdir(feedbackRunsRoot, { withFileTypes: true }).catch(() => [])
const runFiles = entries
  .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
  .map(entry => path.join(feedbackRunsRoot, entry.name))

const errors: string[] = []
for (const filePath of runFiles) {
  const artifact = await readJson(filePath)
  if (artifact.taxonomy_version === 'v2_5_beta') {
    errors.push(...(await validateBetaRun(filePath, artifact)))
  } else {
    errors.push(...validateLegacyRun(filePath, artifact))
  }
}

if (errors.length > 0) {
  console.error('V2 feedback artifact schema validation failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(`V2 feedback artifact schema validation passed: ${runFiles.length} file(s).`)
