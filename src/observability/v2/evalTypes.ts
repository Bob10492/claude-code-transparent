export type EvalChangeLayer =
  | 'harness'
  | 'skill'
  | 'tool'
  | 'model'
  | 'mixed'

export type EvalExpectationType = 'rule' | 'structure' | 'manual_review'

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
  max_turn_count?: number
  max_total_billed_tokens?: number
  max_subagent_count?: number
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
  notes?: string
}

export interface EvalRun {
  run_id: string
  scenario_id: string
  variant_id: string
  started_at: string
  ended_at?: string
  status: EvalRunStatus
  entry_user_action_id?: string
  root_query_id?: string
  observability_db_ref?: string
  notes?: string
}

export interface EvalExpectation {
  expectation_id: string
  scenario_id: string
  expectation_type: EvalExpectationType
  expectation_body: string
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
  status: EvalExperimentStatus
}
