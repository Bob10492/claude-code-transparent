# V2 Run Comparison

## Understanding

- baseline_run: run_2026-05-02T152932165Z_execute_harness_smoke_minimal_baseline_default_4c910090
- candidate_run: run_2026-05-02T152948229Z_execute_harness_smoke_minimal_candidate_session_memory_sparse_8b3d4e6e
- scenario: execute_harness_smoke_minimal
- baseline_variant: baseline_default
- candidate_variant: candidate_session_memory_sparse

## Expected Outcome

This report compares two V2 runs using score artifacts generated from V1 observability evidence.

## Design Rationale

Higher is better for capability and stability scores. Lower is better for explicit efficiency cost or latency scores.

## Summary

- regression_count: 0
- baseline_user_action_id: 4c910090-8e06-4eac-bb7b-a30dc032b8ba
- candidate_user_action_id: 8b3d4e6e-da29-4310-b5c3-ea43af1008e7
- runtime_difference_observed: true

## Variant Effect Evidence

- baseline_policy_event_observed: true
- candidate_policy_event_observed: true
- candidate_variant_effect_observed: true
- baseline_policy_mode: default
- candidate_policy_mode: sparse
- baseline_session_memory_subagent_count: 1
- candidate_session_memory_subagent_count: 1

## Runtime Difference Summary

- Baseline session_memory policy was observed with mode=default.
- Candidate session_memory policy was observed with mode=sparse.
- Candidate sparse runtime markers were observed.
- A runtime difference was observed between baseline and candidate.
- Trigger details: baseline=[token_threshold_and_natural_break], candidate=[token_threshold_and_natural_break].

## Score Deltas

| score | baseline | candidate | delta | verdict |
| --- | ---: | ---: | ---: | --- |
| controllability.turn_limit_basic | 1 | 1 | 0 | unchanged |
| decision_quality.subagent_count_observed | 1 | 1 | 0 | unchanged |
| efficiency.total_billed_tokens | 26909 | 26788 | -121 | improved |
| stability.recovery_absence | 1 | 1 | 0 | unchanged |
| task_success.main_chain_observed | 1 | 1 | 0 | unchanged |

## Interpretation Limits

- Candidate runtime effect was observed, but this comparison is still single-run and should not be treated as a full stability judgment.
- This compare report only uses trace-backed V1/V2 evidence and does not judge final answer quality by itself.
- Scenario note: n/a
