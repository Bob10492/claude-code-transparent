# V2 Run Comparison

## Understanding

- baseline_run: run_2026-05-02T183555972Z_execute_harness_smoke_minimal_baseline_default_604a7b67
- candidate_run: run_2026-05-02T183558138Z_execute_harness_smoke_minimal_candidate_eval_fixture_shadow_f8573444
- scenario: execute_harness_smoke_minimal
- baseline_variant: baseline_default
- candidate_variant: candidate_eval_fixture_shadow

## Expected Outcome

This report compares two V2 runs using score artifacts generated from V1 observability evidence.

## Design Rationale

Higher is better for capability and stability scores. Lower is better for explicit efficiency cost or latency scores.

## Summary

- regression_count: 0
- baseline_user_action_id: 604a7b67-9437-43a4-aeee-45e84f75fef1
- candidate_user_action_id: f8573444-aa1c-4c0f-980b-81d8d1e5ddcb
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
| efficiency.total_billed_tokens | 110 | 105 | -5 | improved |
| stability.recovery_absence | 1 | 1 | 0 | unchanged |
| task_success.main_chain_observed | 1 | 1 | 0 | unchanged |

## Interpretation Limits

- Candidate runtime effect was not observed cleanly enough; score deltas may be noise rather than proof of harness value.
- This compare report only uses trace-backed V1/V2 evidence and does not judge final answer quality by itself.
- Scenario note: n/a
