export type EvalChangeLayer =
  | 'harness'
  | 'skill'
  | 'tool'
  | 'model'
  | 'mixed'

export type EvalExpectationType = 'rule' | 'structure' | 'manual_review'
  | 'retained_constraint'
  | 'retrieved_fact'
  | 'forbidden_confusion'
  | 'context_budget'

export type EvalRunStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'

export type EvalExperimentStatus =
  | 'draft'
  | 'ready'
  | 'running'
  | 'completed'
  | 'archived'

export type EvalScoreDimension =
  | 'task_success'
  | 'decision_quality'
  | 'efficiency'
  | 'stability'
  | 'controllability'
  | 'context'

export type EvalFeedbackSeverity = 'info' | 'warning' | 'blocking'

export type EvalFeedbackFactOrInference = 'fact' | 'inference'

export type EvalFeedbackFindingKind =
  | 'missing_score'
  | 'manual_review_boundary'
  | 'runtime_observation_gap'
  | 'stability_gap'
  | 'execution_failure'

export type EvalFeedbackScope =
  | 'experiment'
  | 'scenario'
  | 'variant'
  | 'run_group'
  | 'run'

export type EvalFeedbackPriority = 'P0' | 'P1' | 'P2'

export type EvalFeedbackQueueBucket =
  | 'top_recommendation'
  | 'recommended_now'
  | 'recommended_later'
  | 'deferred'
  | 'blocked'

export type EvalFeedbackProposalType =
  | 'evaluator_improvement'
  | 'score_binding_improvement'
  | 'scenario_improvement'
  | 'feedback_contract_improvement'
  | 'harness_candidate_improvement'

export type EvalFeedbackTargetLayer =
  | 'evaluator'
  | 'scorer'
  | 'scenario'
  | 'harness'
  | 'report'
  | 'feedback_system'
  | 'mixed'

export type EvalContextSizeClass = 'small' | 'medium' | 'large'

export interface EvalLongContextProfile {
  context_family:
    | 'constraint_retention'
    | 'retrieval'
    | 'distractor_resistance'
    | 'compaction_pressure'
  context_size_class: EvalContextSizeClass
  fixture_ref: string
  expected_retained_constraints: string[]
  expected_retrieved_facts: string[]
  distractor_refs: string[]
  forbidden_confusions: string[]
  manual_review_questions: string[]
}

export type EvalExpectationBody = Record<string, unknown>

export interface EvalScenarioExpectation {
  expectation_id: string
  expectation_type: EvalExpectationType
  expectation_body: EvalExpectationBody
  severity: 'low' | 'medium' | 'high'
}

export interface EvalScenario {
  scenario_id: string
  name: string
  description: string
  input_prompt: string
  tags: string[]
  expected_artifacts: string[]
  expected_tools: string[]
  expected_skills: string[]
  expected_constraints: string[]
  expected_observations?: string[]
  evaluation_note?: string
  max_turn_count?: number
  max_total_billed_tokens?: number
  max_subagent_count?: number
  expected_facts?: string[]
  forbidden_confusions?: string[]
  manual_review_questions?: string[]
  context_profile_ref?: string
  long_context_profile?: EvalLongContextProfile
  expectations?: EvalScenarioExpectation[]
  owner: string
  status: 'draft' | 'ready' | 'archived'
}

export interface EvalVariant {
  variant_id: string
  name: string
  description: string
  change_layer: EvalChangeLayer
  base_variant_id?: string
  git_commit?: string
  config_snapshot_ref?: string
  env_overrides?: Record<string, string | number | boolean>
  model_config?: {
    model?: string
    max_turns?: number
    thinking?: 'enabled' | 'adaptive' | 'disabled'
    max_budget_usd?: number
  }
  feature_gates?: Record<string, string | number | boolean>
  notes?: string
}

export interface EvalRun {
  run_id: string
  scenario_id: string
  variant_id: string
  run_group_id?: string
  repeat_index?: number
  started_at: string
  ended_at?: string
  status: EvalRunStatus
  entry_user_action_id?: string
  root_query_id?: string
  observability_db_ref?: string
  binding?: EvalRunBinding
  notes?: string
}

export interface EvalRunBinding {
  binding_mode: 'fact_only'
  entry_user_action_id: string
  root_query_id: string
  observability_db_ref: string
  events_file_ref?: string
  snapshot_bundle_ref?: string
  dag_ref?: string
  bind_passed: boolean
  binding_failure_reason: string | null
}

export interface EvalExpectation {
  expectation_id: string
  scenario_id: string
  expectation_type: EvalExpectationType
  expectation_body: EvalExpectationBody
  severity: 'low' | 'medium' | 'high'
}

export interface EvalScore {
  score_id: string
  run_id: string
  dimension: EvalScoreDimension
  subdimension: string
  score_value: number | null
  score_label: string
  evidence_ref?: string
  reason?: string
}

export interface EvalExperiment {
  experiment_id: string
  name: string
  goal: string
  baseline_variant_id: string
  candidate_variant_ids: string[]
  scenario_set_id: string
  report_profile?: 'smoke' | 'real_experiment'
  evaluation_intent?: 'regression' | 'exploration'
  status: EvalExperimentStatus
}

export interface EvalFinding {
  finding_id: string
  source_experiment_id: string
  source_report_ref: string
  finding_type: string
  finding_kind: EvalFeedbackFindingKind
  severity: EvalFeedbackSeverity
  scope: EvalFeedbackScope
  scope_ref: string
  summary: string
  evidence_ref: string
  is_blocking: boolean
  requires_manual_judgement: boolean
  auto_resolvable: boolean
  fact_or_inference: 'fact'
}

export interface EvalHypothesis {
  hypothesis_id: string
  based_on_finding_ids: string[]
  depends_on_finding_refs: string[]
  hypothesis: string
  confidence: 'low' | 'medium' | 'high'
  falsifiable_by: string[]
  supporting_evidence_refs: string[]
  risks: string[]
  fact_or_inference: 'inference'
}

export interface EvalImprovementProposal {
  proposal_id: string
  based_on_hypothesis_ids: string[]
  based_on_finding_ids: string[]
  proposal_type: EvalFeedbackProposalType
  target_layer: EvalFeedbackTargetLayer
  priority: EvalFeedbackPriority
  queue_bucket: EvalFeedbackQueueBucket
  description: string
  expected_effect: string
  why_now: string
  why_not_now: string | null
  blocking_finding_ids: string[]
  manual_judgement_finding_ids: string[]
  risks: string[]
  requires_human_approval: true
}

export interface EvalCandidateVariantProposal {
  candidate_proposal_id: string
  based_on_proposal_id: string
  change_layer: EvalFeedbackTargetLayer
  variant_name: string
  implementation_scope: string
  do_not_touch: string[]
  suggested_manifest_patch: Record<string, unknown>
}

export interface EvalNextExperimentPlan {
  next_experiment_plan_id: string
  based_on_proposal_id: string
  scenario_ids: string[]
  baseline_variant_id: string
  candidate_variant_id: string
  repeat_count: number
  success_criteria: string[]
  failure_criteria: string[]
  manual_review_required: boolean
}

export interface EvalFeedbackProposalQueue {
  top_recommendation_proposal_ref: string | null
  recommended_now_proposal_refs: string[]
  recommended_later_proposal_refs: string[]
  deferred_proposal_refs: string[]
  blocked_proposal_refs: string[]
}

export interface EvalFeedbackApprovalCard {
  current_top_recommendation_proposal_ref: string | null
  why_now: string
  why_not_others_yet: string[]
  approval_scope: string
  do_not_touch: string[]
  next_experiment_plan_ref: string | null
  success_criteria: string[]
  risks: string[]
  manual_review_boundary: string
}

export interface EvalFeedbackRun {
  feedback_run_id: string
  taxonomy_version: string
  generated_at: string
  source_experiment_id: string
  source_experiment_run_ref: string
  source_report_refs: string[]
  finding_refs: string[]
  hypothesis_refs: string[]
  proposal_refs: string[]
  candidate_proposal_refs: string[]
  next_experiment_plan_refs: string[]
  proposal_queue: EvalFeedbackProposalQueue
  blocking_finding_refs: string[]
  manual_judgement_required_finding_refs: string[]
  auto_resolvable_finding_refs: string[]
  approval_card: EvalFeedbackApprovalCard
  report_ref: string
  human_approval_required: true
  status: 'completed'
}
