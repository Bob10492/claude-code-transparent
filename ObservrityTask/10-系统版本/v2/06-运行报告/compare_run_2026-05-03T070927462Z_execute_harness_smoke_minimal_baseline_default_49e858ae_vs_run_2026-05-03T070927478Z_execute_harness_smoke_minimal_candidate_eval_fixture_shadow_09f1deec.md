# Synthetic Compare: run_2026-05-03T070927462Z_execute_harness_smoke_minimal_baseline_default_49e858ae vs run_2026-05-03T070927478Z_execute_harness_smoke_minimal_candidate_eval_fixture_shadow_09f1deec

## Scorecard

| score | baseline | candidate | delta | interpretation |
| --- | ---: | ---: | ---: | --- |
| controllability.turn_limit_basic | 1 | 1 | 0 | unchanged |
| decision_quality.subagent_count_observed | 0 | 0 | 0 | unchanged |
| efficiency.total_billed_tokens | 110 | 105 | -5 | improved |
| stability.recovery_absence | 1 | 1 | 0 | unchanged |
| task_success.main_chain_observed | 1 | 1 | 0 | unchanged |

## Variant Effect Summary

- scenario: execute_harness_smoke_minimal
- candidate_variant: candidate_eval_fixture_shadow
- baseline_policy_mode: unknown
- candidate_policy_mode: unknown
- candidate_variant_effect_observed: false
- runtime_difference_observed: false

- Baseline session_memory policy was not observed in V1 events.
- Candidate session_memory policy was not observed in V1 events.
- At least one score dimension changed between baseline and candidate.
- No stable runtime difference was observed yet; any score delta may still be execution noise rather than a proven harness effect.
