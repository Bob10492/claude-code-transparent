# V2 Run Comparison

## Understanding

- baseline_run: run_2026-05-03T054515896Z_long_context_constraint_retention_baseline_default_75ffb5f8
- candidate_run: run_2026-05-03T054515906Z_long_context_constraint_retention_candidate_long_context_fixture_guarded_b1c79e38
- scenario: long_context_constraint_retention
- baseline_variant: baseline_default
- candidate_variant: candidate_long_context_fixture_guarded

## Expected Outcome

This report compares two V2 runs using score artifacts generated from V1 observability evidence.

## Design Rationale

Higher is better for capability and stability scores. Lower is better for explicit efficiency cost or latency scores.

## Summary

- regression_count: 0
- baseline_user_action_id: 75ffb5f8-3f35-4a6b-9320-b9a74303d396
- candidate_user_action_id: b1c79e38-15a7-4721-938f-cbf469725656
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
- Trigger details: baseline=[long_context_constraint_retention], candidate=[long_context_constraint_retention].

## Score Deltas

| score | baseline | candidate | delta | verdict |
| --- | ---: | ---: | ---: | --- |
| context.compaction_saved_tokens | 0 | 0 | 0 | unchanged |
| context.compaction_trigger_count | 0 | 0 | 0 | unchanged |
| context.constraint_retention_rate | 0.666667 | 1 | 0.333333 | improved |
| context.distractor_confusion_count | 0 | 0 | 0 | unchanged |
| context.lost_constraint_count | 1 | 0 | -1 | changed |
| context.manual_review_required | 1 | 1 | 0 | unchanged |
| context.retained_constraint_count | 2 | 3 | 1 | changed |
| context.retrieved_fact_hit_rate | 1 | 1 | 0 | unchanged |
| context.success_under_context_pressure | 1 | 1 | 0 | unchanged |
| context.total_prompt_input_tokens | 1270 | 1080 | -190 | changed |
| controllability.turn_limit_basic | 1 | 1 | 0 | unchanged |
| efficiency.total_billed_tokens | 1280 | 1090 | -190 | improved |
| stability.recovery_absence | 1 | 1 | 0 | unchanged |
| task_success.main_chain_observed | 1 | 1 | 0 | unchanged |

## Interpretation Limits

- Candidate runtime effect was not observed cleanly enough; score deltas may be noise rather than proof of harness value.
- This compare report only uses trace-backed V1/V2 evidence and does not judge final answer quality by itself.
- Scenario note: n/a
