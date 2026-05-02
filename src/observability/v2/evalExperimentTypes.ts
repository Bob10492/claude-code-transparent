import type { EvalExperiment, EvalScoreDimension } from './evalTypes'

export type EvalScoreDirection =
  | 'higher_is_better'
  | 'lower_is_better'
  | 'boolean_pass'
  | 'observed_only'

export type EvalAutomationLevel = 'automatic' | 'manual_review' | 'mixed'

export interface EvalScoreSpecThresholds {
  hard_fail_regression_pct?: number
  soft_warn_regression_pct?: number
  max_allowed_value?: number
  min_allowed_value?: number
}

export interface EvalScoreSpec {
  score_spec_id: string
  dimension: EvalScoreDimension
  subdimension: string
  direction: EvalScoreDirection
  formula: string
  data_sources: string[]
  evidence_requirements: string[]
  automation_level: EvalAutomationLevel
  thresholds?: EvalScoreSpecThresholds
  version: string | number
  notes?: string
}

export interface EvalScoreSpecCollection {
  score_specs: EvalScoreSpec[]
}

export interface EvalGatePolicyRule {
  score_spec_id: string
  rule_type: 'hard_fail' | 'soft_warning'
  condition: string
  threshold?: number
  notes?: string
}

export interface EvalGatePolicy {
  gate_policy_id: string
  name: string
  rules?: EvalGatePolicyRule[]
  hard_fail_rules?: Array<Omit<EvalGatePolicyRule, 'rule_type'>>
  soft_warning_rules?: Array<Omit<EvalGatePolicyRule, 'rule_type'>>
}

export interface EvalExperimentFlatActionBinding {
  scenario_id: string
  variant_id: string
  entry_user_action_id: string
}

export interface EvalExperimentNestedActionBinding {
  scenario_id: string
  baseline_user_action_id: string
  candidate_user_action_ids: Record<string, string>
}

export type EvalExperimentActionBinding =
  | EvalExperimentFlatActionBinding
  | EvalExperimentNestedActionBinding

export interface EvalExperimentExecutionConfig {
  adapter?: 'cli_print' | 'disabled'
  timeout_ms?: number
  max_turns?: number
  allow_fallback_to_bind_existing?: boolean
  require_config_snapshot?: boolean
  env?: Record<string, string | number | boolean>
  command?: string
  args?: string[]
}

export interface EvalExperimentV21 extends EvalExperiment {
  scenario_ids?: string[]
  repeat_count?: number
  score_spec_ids?: string[]
  gate_policy_id?: string
  mode?: 'bind_existing' | 'execute_harness'
  execution?: EvalExperimentExecutionConfig
  action_bindings?: EvalExperimentActionBinding[]
}
