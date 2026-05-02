# V2 Run Comparison

## 理解清单

- baseline_run: run_2026-05-02T132317110Z_execute_harness_smoke_minimal_baseline_default_1e3c516e
- candidate_run: run_2026-05-02T132328037Z_execute_harness_smoke_minimal_candidate_session_memory_sparse_0acb35d4
- scenario: execute_harness_smoke_minimal
- baseline_variant: baseline_default
- candidate_variant: candidate_session_memory_sparse

## 预期效果

This report compares two V2 runs using score artifacts generated from V1 observability evidence.

## 设计思路

Higher is better for capability and stability scores. Lower is better for explicit efficiency cost or latency scores.

## Summary

- regression_count: 0
- baseline_user_action_id: 1e3c516e-125b-4575-b3ee-5e7e6b45a8ed
- candidate_user_action_id: 0acb35d4-75b8-4219-86fc-ad5f291bc9ff

## Score Deltas

| score | baseline | candidate | delta | verdict |
| --- | ---: | ---: | ---: | --- |
| controllability.turn_limit_basic | 1 | 1 | 0 | unchanged |
| decision_quality.subagent_count_observed | 0 | 0 | 0 | unchanged |
| efficiency.total_billed_tokens | 26628 | 26628 | 0 | unchanged |
| stability.recovery_absence | 1 | 1 | 0 | unchanged |
| task_success.main_chain_observed | 1 | 1 | 0 | unchanged |
