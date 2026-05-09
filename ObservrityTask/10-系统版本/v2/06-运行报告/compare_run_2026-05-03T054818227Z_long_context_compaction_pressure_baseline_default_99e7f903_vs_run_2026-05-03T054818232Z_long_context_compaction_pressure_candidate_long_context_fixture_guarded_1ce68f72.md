# Synthetic Compare: run_2026-05-03T054818227Z_long_context_compaction_pressure_baseline_default_99e7f903 vs run_2026-05-03T054818232Z_long_context_compaction_pressure_candidate_long_context_fixture_guarded_1ce68f72

## Scorecard

| score | baseline | candidate | delta | interpretation |
| --- | ---: | ---: | ---: | --- |
| context.compaction_saved_tokens | 42 | 188 | 146 | observed |
| context.compaction_trigger_count | 2 | 2 | 0 | unchanged |
| context.constraint_retention_rate | 0.666667 | 1 | 0.333333 | improved |
| context.distractor_confusion_count | 0 | 0 | 0 | unchanged |
| context.lost_constraint_count | 1 | 0 | -1 | improved |
| context.manual_review_required | 1 | 1 | 0 | unchanged |
| context.retained_constraint_count | 2 | 3 | 1 | improved |
| context.retrieved_fact_hit_rate | 0.666667 | 1 | 0.333333 | improved |
| context.success_under_context_pressure | 0 | 1 | 1 | improved |
| context.total_prompt_input_tokens | 1630 | 1230 | -400 | improved |
| controllability.turn_limit_basic | 1 | 1 | 0 | unchanged |
| efficiency.total_billed_tokens | 1640 | 1240 | -400 | improved |
| stability.recovery_absence | 1 | 1 | 0 | unchanged |
| task_success.main_chain_observed | 1 | 1 | 0 | unchanged |

## Variant Effect Summary

- scenario: long_context_compaction_pressure
- candidate_variant: candidate_long_context_fixture_guarded
- baseline_policy_mode: unknown
- candidate_policy_mode: unknown
- candidate_variant_effect_observed: false
- runtime_difference_observed: false

- Baseline session_memory policy was not observed in V1 events.
- Candidate session_memory policy was not observed in V1 events.
- At least one score dimension changed between baseline and candidate.
- No stable runtime difference was observed yet; any score delta may still be execution noise rather than a proven harness effect.
