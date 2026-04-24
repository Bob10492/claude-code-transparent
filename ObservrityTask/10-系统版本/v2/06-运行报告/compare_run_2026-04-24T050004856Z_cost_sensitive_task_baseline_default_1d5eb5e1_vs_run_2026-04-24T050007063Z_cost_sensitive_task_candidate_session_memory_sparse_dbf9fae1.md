# V2 Run Comparison

## 理解清单

- baseline_run: run_2026-04-24T050004856Z_cost_sensitive_task_baseline_default_1d5eb5e1
- candidate_run: run_2026-04-24T050007063Z_cost_sensitive_task_candidate_session_memory_sparse_dbf9fae1
- scenario: cost_sensitive_task
- baseline_variant: baseline_default
- candidate_variant: candidate_session_memory_sparse

## 预期效果

This report compares the latest baseline and candidate runs for one scenario.

## 设计思路

Higher is better for capability and stability scores. Lower is better for explicit efficiency cost, latency, and subagent count evidence.

## Summary

- regression_count: 0
- baseline_user_action_id: 1d5eb5e1-2fe0-42fa-9450-7b05d6367976
- candidate_user_action_id: dbf9fae1-0a5a-4f50-aba7-02047ced9390

## Score Deltas

| score | baseline | candidate | delta | verdict |
| --- | ---: | ---: | ---: | --- |
| controllability.turn_limit_basic | 1 | 1 | 0 | unchanged |
| decision_quality.expected_tool_hit_rate | n/a | n/a | n/a | not_applicable |
| decision_quality.subagent_count_observed | 4 | 2 | -2 | improved |
| efficiency.total_billed_tokens | 400399 | 352691 | -47708 | improved |
| stability.recovery_absence | 1 | 1 | 0 | unchanged |
| stability.v1_closure_health | 1 | 1 | 0 | unchanged |
| task_success.main_chain_observed | 1 | 1 | 0 | unchanged |
