# V2 Experiment Summary: execute_harness_smoke

## 理解清单

- experiment: execute_harness_smoke
- mode: execute_harness
- baseline_variant: baseline_default
- candidate_variants: candidate_session_memory_sparse
- scenario_count: 1
- score_specs: task_success.main_chain_observed, efficiency.total_billed_tokens, decision_quality.subagent_count_observed, stability.recovery_absence, controllability.turn_limit_basic
- gate_policy: default_v2_1_gate
- output_json: tests\evals\v2\experiment-runs\execute_harness_smoke_2026-05-02T132328195Z.json

## 预期效果

This summary records a manifest-driven V2 experiment run. In bind_existing mode, V2 binds existing V1 traces. In execute_harness mode, V2.2-alpha executes the scenario first, then captures the generated user_action_id through benchmark_run_id.

## 设计思路

The runner always scores only trace-backed V1 facts. V2.2-alpha adds an execution front half, but the score/compare/gate back half is the same fact-only pipeline used by V2.1.

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
| execute_harness_smoke_minimal | candidate_session_memory_sparse | controllability.turn_limit_basic | 1 | 1 | 0 | unchanged |
| execute_harness_smoke_minimal | candidate_session_memory_sparse | decision_quality.subagent_count_observed | 0 | 0 | 0 | unchanged |
| execute_harness_smoke_minimal | candidate_session_memory_sparse | efficiency.total_billed_tokens | 26628 | 26628 | 0 | unchanged |
| execute_harness_smoke_minimal | candidate_session_memory_sparse | stability.recovery_absence | 1 | 1 | 0 | unchanged |
| execute_harness_smoke_minimal | candidate_session_memory_sparse | task_success.main_chain_observed | 1 | 1 | 0 | unchanged |

## Exploration Signals

- No exploratory signal was derived from the current automatic scorecard; manual review may still find qualitative differences.

## Runs

| scenario | repeat | baseline_run | candidate_variant | candidate_run | risk_gate | compare_report |
| --- | ---: | --- | --- | --- | --- | --- |
| execute_harness_smoke_minimal | 1 | run_2026-05-02T132317110Z_execute_harness_smoke_minimal_baseline_default_1e3c516e | candidate_session_memory_sparse | run_2026-05-02T132328037Z_execute_harness_smoke_minimal_candidate_session_memory_sparse_0acb35d4 | 0/4 not passed | ObservrityTask\10-系统版本\v2\06-运行报告\compare_run_2026-05-02T132317110Z_execute_harness_smoke_minimal_baseline_default_1e3c516e_vs_run_2026-05-02T132328037Z_execute_harness_smoke_minimal_candidate_session_memory_sparse_0acb35d4.md |

## Risk Gate Details

| scenario | candidate_variant | rule_type | score_spec | verdict | regression_pct |
| --- | --- | --- | --- | --- | ---: |
| execute_harness_smoke_minimal | candidate_session_memory_sparse | hard_fail | task_success.main_chain_observed | pass | 0 |
| execute_harness_smoke_minimal | candidate_session_memory_sparse | hard_fail | efficiency.total_billed_tokens | pass | 0 |
| execute_harness_smoke_minimal | candidate_session_memory_sparse | soft_warning | efficiency.total_billed_tokens | pass | 0 |
| execute_harness_smoke_minimal | candidate_session_memory_sparse | soft_warning | decision_quality.subagent_count_observed | pass | 0 |
