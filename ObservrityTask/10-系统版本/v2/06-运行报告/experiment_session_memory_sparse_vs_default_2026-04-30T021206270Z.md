# V2.1 Experiment Summary: session_memory_sparse_vs_default

## 理解清单

- experiment: session_memory_sparse_vs_default
- mode: bind_existing
- baseline_variant: baseline_default
- candidate_variants: candidate_session_memory_sparse
- scenario_count: 1
- score_specs: task_success.main_chain_observed, efficiency.total_billed_tokens, decision_quality.subagent_count_observed, stability.recovery_absence, controllability.turn_limit_basic
- gate_policy: default_v2_1_gate
- output_json: tests\evals\v2\experiment-runs\session_memory_sparse_vs_default_2026-04-30T021206270Z.json

## 预期效果

This summary records a manifest-driven V2.1 experiment run. In bind-existing mode, every generated V2 run is backed by an existing V1 user_action_id.

## 设计思路

V2.1 intentionally does not execute the harness automatically. It turns existing V1 traces into comparable V2 runs, then runs scorer, comparison, and regression-risk gate scripts.

## Risk Verdict

- hard_failures: 0
- soft_warnings: 0
- missing_or_inconclusive: 0
- risk_status: passed
- scope: regression_risk_only
- final_experiment_judgment: false
- recommended_review_mode: regression_review

This section is a regression-risk gate, not a final judgment about whether the harness change is valuable.

## Scorecard Summary

| scenario | candidate_variant | score | baseline | candidate | delta | interpretation |
| --- | --- | --- | ---: | ---: | ---: | --- |
| cost_sensitive_task | candidate_session_memory_sparse | controllability.turn_limit_basic | 1 | 1 | 0 | unchanged |
| cost_sensitive_task | candidate_session_memory_sparse | decision_quality.subagent_count_observed | 4 | 2 | -2 | improved |
| cost_sensitive_task | candidate_session_memory_sparse | efficiency.total_billed_tokens | 400399 | 352691 | -47708 | improved |
| cost_sensitive_task | candidate_session_memory_sparse | stability.recovery_absence | 1 | 1 | 0 | unchanged |
| cost_sensitive_task | candidate_session_memory_sparse | task_success.main_chain_observed | 1 | 1 | 0 | unchanged |

## Exploration Signals

- 2 score dimension(s) changed; inspect the scorecard before treating the risk verdict as the final answer.

## Runs

| scenario | repeat | baseline_run | candidate_variant | candidate_run | risk_gate | compare_report |
| --- | ---: | --- | --- | --- | --- | --- |
| cost_sensitive_task | 1 | run_2026-04-30T021205319Z_cost_sensitive_task_baseline_default_1d5eb5e1 | candidate_session_memory_sparse | run_2026-04-30T021206101Z_cost_sensitive_task_candidate_session_memory_sparse_dbf9fae1 | 0/4 not passed | ObservrityTask\10-系统版本\v2\06-运行报告\compare_run_2026-04-30T021205319Z_cost_sensitive_task_baseline_default_1d5eb5e1_vs_run_2026-04-30T021206101Z_cost_sensitive_task_candidate_session_memory_sparse_dbf9fae1.md |

## Risk Gate Details

| scenario | candidate_variant | rule_type | score_spec | verdict | regression_pct |
| --- | --- | --- | --- | --- | ---: |
| cost_sensitive_task | candidate_session_memory_sparse | hard_fail | task_success.main_chain_observed | pass | 0 |
| cost_sensitive_task | candidate_session_memory_sparse | hard_fail | efficiency.total_billed_tokens | pass | 0 |
| cost_sensitive_task | candidate_session_memory_sparse | soft_warning | efficiency.total_billed_tokens | pass | 0 |
| cost_sensitive_task | candidate_session_memory_sparse | soft_warning | decision_quality.subagent_count_observed | pass | 0 |
