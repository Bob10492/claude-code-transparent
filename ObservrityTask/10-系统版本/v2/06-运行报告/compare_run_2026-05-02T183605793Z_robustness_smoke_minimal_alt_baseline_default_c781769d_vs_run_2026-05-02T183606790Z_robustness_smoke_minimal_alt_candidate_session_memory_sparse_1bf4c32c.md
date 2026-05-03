# V2 Run Comparison

## Understanding

- baseline_run: run_2026-05-02T183605793Z_robustness_smoke_minimal_alt_baseline_default_c781769d
- candidate_run: run_2026-05-02T183606790Z_robustness_smoke_minimal_alt_candidate_session_memory_sparse_1bf4c32c
- scenario: robustness_smoke_minimal_alt
- baseline_variant: baseline_default
- candidate_variant: candidate_session_memory_sparse

## Expected Outcome

This report compares two V2 runs using score artifacts generated from V1 observability evidence.

## Design Rationale

Higher is better for capability and stability scores. Lower is better for explicit efficiency cost or latency scores.

## Summary

- regression_count: 0
- baseline_user_action_id: c781769d-13e2-4389-89bb-80fd0fa48cc9
- candidate_user_action_id: 1bf4c32c-3dbe-4ab7-906d-7ff0dabd68c3
- runtime_difference_observed: false

## Variant Effect Evidence

- baseline_policy_event_observed: false
- candidate_policy_event_observed: false
- candidate_variant_effect_observed: false
- baseline_policy_mode: unknown
- candidate_policy_mode: unknown
- baseline_session_memory_subagent_count: 0
- candidate_session_memory_subagent_count: 0

## Runtime Difference Summary

- Baseline session_memory policy was not observed.
- Candidate session_memory policy was not observed.
- Candidate sparse runtime markers were not observed.
- No stable runtime difference was observed between baseline and candidate.
- Trigger details: baseline=[none], candidate=[none].

## Score Deltas

| score | baseline | candidate | delta | verdict |
| --- | ---: | ---: | ---: | --- |
| controllability.turn_limit_basic | 1 | 1 | 0 | unchanged |
| decision_quality.subagent_count_observed | 0 | 0 | 0 | unchanged |
| efficiency.total_billed_tokens | 110 | 100 | -10 | improved |
| stability.recovery_absence | 1 | 1 | 0 | unchanged |
| task_success.main_chain_observed | 1 | 1 | 0 | unchanged |

## Interpretation Limits

- Candidate runtime effect was not observed cleanly enough; score deltas may be noise rather than proof of harness value.
- This compare report only uses trace-backed V1/V2 evidence and does not judge final answer quality by itself.
- Scenario note: This is a runner smoke scenario, not a qualitative harness evaluation.
