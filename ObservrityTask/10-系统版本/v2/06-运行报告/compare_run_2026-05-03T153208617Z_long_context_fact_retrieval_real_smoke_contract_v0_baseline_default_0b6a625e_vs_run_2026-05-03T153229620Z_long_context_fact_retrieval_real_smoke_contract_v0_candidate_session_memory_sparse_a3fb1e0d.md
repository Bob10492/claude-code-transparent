# V2 Run Comparison

## Understanding

- baseline_run: run_2026-05-03T153208617Z_long_context_fact_retrieval_real_smoke_contract_v0_baseline_default_0b6a625e
- candidate_run: run_2026-05-03T153229620Z_long_context_fact_retrieval_real_smoke_contract_v0_candidate_session_memory_sparse_a3fb1e0d
- scenario: long_context_fact_retrieval_real_smoke_contract_v0
- baseline_variant: baseline_default
- candidate_variant: candidate_session_memory_sparse

## Expected Outcome

This report compares two V2 runs using score artifacts generated from V1 observability evidence.

## Design Rationale

Higher is better for capability and stability scores. Lower is better for explicit efficiency cost or latency scores.

## Summary

- regression_count: 0
- baseline_user_action_id: 0b6a625e-d7ce-4afc-b42d-fdaf6df5654e
- candidate_user_action_id: a3fb1e0d-6260-4f43-a830-70b723a236ae
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
| context.compaction_saved_tokens | 0 | 0 | 0 | unchanged |
| context.compaction_trigger_count | 4 | 4 | 0 | unchanged |
| context.constraint_retention_rate | 1 | 1 | 0 | unchanged |
| context.distractor_confusion_count | 0 | 0 | 0 | unchanged |
| context.lost_constraint_count | 0 | 0 | 0 | unchanged |
| context.manual_review_required | 1 | 1 | 0 | unchanged |
| context.retained_constraint_count | 2 | 2 | 0 | unchanged |
| context.retrieved_fact_hit_rate | 1 | 1 | 0 | unchanged |
| context.success_under_context_pressure | 1 | 1 | 0 | unchanged |
| context.total_prompt_input_tokens | 27007 | 27007 | 0 | unchanged |
| controllability.turn_limit_basic | 1 | 1 | 0 | unchanged |
| decision_quality.session_memory_policy_observed | 1 | 1 | 0 | unchanged |
| efficiency.total_billed_tokens | 27436 | 27372 | -64 | improved |
| stability.recovery_absence | 1 | 1 | 0 | unchanged |
| task_success.main_chain_observed | 1 | 1 | 0 | unchanged |

## Interpretation Limits

- Candidate runtime effect was observed, but this comparison is still single-run and should not be treated as a full stability judgment.
- This compare report only uses trace-backed V1/V2 evidence and does not judge final answer quality by itself.
- Scenario note: n/a
