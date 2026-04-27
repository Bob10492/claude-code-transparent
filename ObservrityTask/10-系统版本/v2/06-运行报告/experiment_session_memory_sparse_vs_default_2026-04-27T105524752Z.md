# V2.1 Experiment Summary: session_memory_sparse_vs_default

## 理解清单

- experiment: session_memory_sparse_vs_default
- mode: bind_existing
- baseline_variant: baseline_default
- candidate_variants: candidate_session_memory_sparse
- scenario_count: 1
- output_json: tests\evals\v2\experiment-runs\session_memory_sparse_vs_default_2026-04-27T105524752Z.json

## 预期效果

This summary records a manifest-driven V2.1 experiment run. In bind-existing mode, every generated V2 run is backed by an existing V1 user_action_id.

## 设计思路

V2.1 intentionally does not execute the harness automatically. It turns existing V1 traces into comparable V2 runs, then runs the existing scorer and comparison scripts.

## Verdict

- hard_failures: 0
- soft_warnings: 0
- gate_status: passed

## Runs

| scenario | repeat | baseline_run | candidate_variant | candidate_run | gate | compare_report |
| --- | ---: | --- | --- | --- | --- | --- |
| cost_sensitive_task | 1 | run_2026-04-27T105508448Z_cost_sensitive_task_baseline_default_1d5eb5e1 | candidate_session_memory_sparse | run_2026-04-27T105524538Z_cost_sensitive_task_candidate_session_memory_sparse_dbf9fae1 | 0/4 failed | ObservrityTask\10-系统版本\v2\06-运行报告\compare_run_2026-04-27T105508448Z_cost_sensitive_task_baseline_default_1d5eb5e1_vs_run_2026-04-27T105524538Z_cost_sensitive_task_candidate_session_memory_sparse_dbf9fae1.md |

## Gate Results

| scenario | candidate_variant | rule_type | score_spec | result | regression_pct |
| --- | --- | --- | --- | --- | ---: |
| cost_sensitive_task | candidate_session_memory_sparse | hard_fail | task_success.main_chain_observed | pass | 0 |
| cost_sensitive_task | candidate_session_memory_sparse | hard_fail | efficiency.total_billed_tokens | pass | 0 |
| cost_sensitive_task | candidate_session_memory_sparse | soft_warning | efficiency.total_billed_tokens | pass | 0 |
| cost_sensitive_task | candidate_session_memory_sparse | soft_warning | decision_quality.subagent_count_observed | pass | 0 |
