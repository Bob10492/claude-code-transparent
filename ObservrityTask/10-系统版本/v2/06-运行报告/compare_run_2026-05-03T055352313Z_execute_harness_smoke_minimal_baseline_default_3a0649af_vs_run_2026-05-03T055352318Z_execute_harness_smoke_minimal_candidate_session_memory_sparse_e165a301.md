# Synthetic Compare: run_2026-05-03T055352313Z_execute_harness_smoke_minimal_baseline_default_3a0649af vs run_2026-05-03T055352318Z_execute_harness_smoke_minimal_candidate_session_memory_sparse_e165a301

## Scorecard

| score | baseline | candidate | delta | interpretation |
| --- | ---: | ---: | ---: | --- |
| controllability.turn_limit_basic | 1 | 1 | 0 | unchanged |
| decision_quality.subagent_count_observed | 0 | 0 | 0 | unchanged |
| efficiency.total_billed_tokens | 110 | 100 | -10 | improved |
| stability.recovery_absence | 1 | 1 | 0 | unchanged |
| task_success.main_chain_observed | 1 | 1 | 0 | unchanged |

## Variant Effect Summary

- scenario: execute_harness_smoke_minimal
- candidate_variant: candidate_session_memory_sparse
- baseline_policy_mode: unknown
- candidate_policy_mode: unknown
- candidate_variant_effect_observed: true
- runtime_difference_observed: false

- Baseline session_memory policy was not observed in V1 events.
- Candidate session_memory policy was not observed in V1 events.
- Candidate sparse-policy markers were observed in runtime evidence.
- At least one score dimension changed between baseline and candidate.
- No stable runtime difference was observed yet; any score delta may still be execution noise rather than a proven harness effect.
