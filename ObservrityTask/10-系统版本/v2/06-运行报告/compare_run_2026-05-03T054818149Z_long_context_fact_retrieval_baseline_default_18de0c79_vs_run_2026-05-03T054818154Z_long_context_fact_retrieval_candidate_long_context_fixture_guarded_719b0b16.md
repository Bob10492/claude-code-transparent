# Synthetic Compare: run_2026-05-03T054818149Z_long_context_fact_retrieval_baseline_default_18de0c79 vs run_2026-05-03T054818154Z_long_context_fact_retrieval_candidate_long_context_fixture_guarded_719b0b16

## Scorecard

| score | baseline | candidate | delta | interpretation |
| --- | ---: | ---: | ---: | --- |
| context.compaction_saved_tokens | 0 | 0 | 0 | unchanged |
| context.compaction_trigger_count | 0 | 0 | 0 | unchanged |
| context.constraint_retention_rate | 1 | 1 | 0 | unchanged |
| context.distractor_confusion_count | 0 | 0 | 0 | unchanged |
| context.lost_constraint_count | 0 | 0 | 0 | unchanged |
| context.manual_review_required | 1 | 1 | 0 | unchanged |
| context.retained_constraint_count | 2 | 2 | 0 | unchanged |
| context.retrieved_fact_hit_rate | 0.666667 | 1 | 0.333333 | improved |
| context.success_under_context_pressure | 1 | 1 | 0 | unchanged |
| context.total_prompt_input_tokens | 1350 | 1130 | -220 | improved |
| controllability.turn_limit_basic | 1 | 1 | 0 | unchanged |
| efficiency.total_billed_tokens | 1360 | 1140 | -220 | improved |
| stability.recovery_absence | 1 | 1 | 0 | unchanged |
| task_success.main_chain_observed | 1 | 1 | 0 | unchanged |

## Variant Effect Summary

- scenario: long_context_fact_retrieval
- candidate_variant: candidate_long_context_fixture_guarded
- baseline_policy_mode: unknown
- candidate_policy_mode: unknown
- candidate_variant_effect_observed: false
- runtime_difference_observed: false

- Baseline session_memory policy was not observed in V1 events.
- Candidate session_memory policy was not observed in V1 events.
- At least one score dimension changed between baseline and candidate.
- No stable runtime difference was observed yet; any score delta may still be execution noise rather than a proven harness effect.
