# V2 Run Comparison

## Understanding

- baseline_run: run_2026-05-02T165041469Z_session_memory_trigger_sensitive_baseline_default_f9b83353
- candidate_run: run_2026-05-02T165222048Z_session_memory_trigger_sensitive_candidate_session_memory_sparse_cd929218
- scenario: session_memory_trigger_sensitive
- baseline_variant: baseline_default
- candidate_variant: candidate_session_memory_sparse

## Expected Outcome

This report compares two V2 runs using score artifacts generated from V1 observability evidence.

## Design Rationale

Higher is better for capability and stability scores. Lower is better for explicit efficiency cost or latency scores.

## Summary

- regression_count: 0
- baseline_user_action_id: f9b83353-0650-4868-af08-c0ff7048f7b1
- candidate_user_action_id: cd929218-cfa1-4772-93ba-ae659d9ca0d9
- runtime_difference_observed: true

## Variant Effect Evidence

- baseline_policy_event_observed: true
- candidate_policy_event_observed: true
- candidate_variant_effect_observed: true
- baseline_policy_mode: default
- candidate_policy_mode: sparse
- baseline_session_memory_subagent_count: 2
- candidate_session_memory_subagent_count: 1

## Runtime Difference Summary

- Baseline session_memory policy was observed with mode=default.
- Candidate session_memory policy was observed with mode=sparse.
- Candidate sparse runtime markers were observed.
- A runtime difference was observed between baseline and candidate.
- Trigger details: baseline=[token_threshold_and_tool_threshold], candidate=[token_threshold_and_tool_threshold].

## Score Deltas

| score | baseline | candidate | delta | verdict |
| --- | ---: | ---: | ---: | --- |
| controllability.turn_limit_basic | 1 | 1 | 0 | unchanged |
| decision_quality.session_memory_policy_observed | 1 | 1 | 0 | unchanged |
| decision_quality.subagent_count_observed | 2 | 1 | -1 | improved |
| efficiency.total_billed_tokens | 440499 | 304723 | -135776 | improved |
| stability.recovery_absence | 1 | 1 | 0 | unchanged |
| task_success.main_chain_observed | 1 | 1 | 0 | unchanged |

## Interpretation Limits

- Candidate runtime effect was observed, but this comparison is still single-run and should not be treated as a full stability judgment.
- This compare report only uses trace-backed V1/V2 evidence and does not judge final answer quality by itself.
- Scenario note: This is a real runtime-difference scenario, not a smoke check. Success means the candidate policy is observed and interpretable in V1/V2 evidence.
