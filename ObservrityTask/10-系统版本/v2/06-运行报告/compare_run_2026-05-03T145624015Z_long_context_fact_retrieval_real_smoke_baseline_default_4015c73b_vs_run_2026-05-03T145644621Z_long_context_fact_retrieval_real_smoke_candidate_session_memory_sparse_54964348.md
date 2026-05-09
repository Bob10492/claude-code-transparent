# V2 Run Comparison

## Understanding

- baseline_run: run_2026-05-03T145624015Z_long_context_fact_retrieval_real_smoke_baseline_default_4015c73b
- candidate_run: run_2026-05-03T145644621Z_long_context_fact_retrieval_real_smoke_candidate_session_memory_sparse_54964348
- scenario: long_context_fact_retrieval_real_smoke
- baseline_variant: baseline_default
- candidate_variant: candidate_session_memory_sparse

## Expected Outcome

This report compares two V2 runs using score artifacts generated from V1 observability evidence.

## Design Rationale

Higher is better for capability and stability scores. Lower is better for explicit efficiency cost or latency scores.

## Summary

- regression_count: 0
- baseline_user_action_id: 4015c73b-f268-4487-b8b7-d4be1cfba5bf
- candidate_user_action_id: 54964348-774a-43ae-8c23-d3ba6f961894
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
| context.total_prompt_input_tokens | 26887 | 26887 | 0 | unchanged |
| controllability.turn_limit_basic | 1 | 1 | 0 | unchanged |
| decision_quality.session_memory_policy_observed | 1 | 1 | 0 | unchanged |
| efficiency.total_billed_tokens | 27189 | 27189 | 0 | unchanged |
| stability.recovery_absence | 1 | 1 | 0 | unchanged |
| task_success.main_chain_observed | 1 | 1 | 0 | unchanged |

## Interpretation Limits

- Candidate runtime effect was observed, but this comparison is still single-run and should not be treated as a full stability judgment.
- This compare report only uses trace-backed V1/V2 evidence and does not judge final answer quality by itself.
- Scenario note: n/a
