# V2 Experiment Summary: session_memory_runtime_sparse_vs_default

## Understanding

- experiment: session_memory_runtime_sparse_vs_default
- mode: execute_harness
- baseline_variant: baseline_default
- candidate_variants: candidate_session_memory_sparse
- scenario_count: 1
- score_specs: task_success.main_chain_observed, decision_quality.session_memory_policy_observed, efficiency.total_billed_tokens, decision_quality.subagent_count_observed, stability.recovery_absence, controllability.turn_limit_basic
- gate_policy: default_v2_1_gate
- output_json: tests\evals\v2\experiment-runs\session_memory_runtime_sparse_vs_default_2026-05-02T165222245Z.json

## Expected Outcome

This summary records a manifest-driven V2 experiment run. In bind_existing mode, V2 binds existing V1 traces. In execute_harness mode, V2 executes the scenario first, then captures the generated user_action_id through benchmark_run_id.

## Design Rationale

The runner always scores only trace-backed V1 facts. V2.2-beta adds runtime-effect evidence and experiment-validity semantics so smoke and real experiments are not confused with each other.

## Real Experiment

- requested_mode: execute_harness
- evaluation_intent: exploration
- candidate_runtime_effect_observed: true
- runtime_difference_observed: true
- note: This profile asks whether the candidate changed runtime behavior in an interpretable way.

## Risk Verdict

- hard_failures: 0
- soft_warnings: 0
- missing_or_inconclusive: 0
- risk_status: pass
- scope: regression_risk_only
- final_experiment_judgment: false
- recommended_review_mode: regression_review

This section is a regression-risk gate, not a final judgment about whether the harness change is valuable.

## Variant Effect Evidence

- session_memory_trigger_sensitive / candidate_session_memory_sparse: baseline_mode=default, candidate_mode=sparse, candidate_effect_observed=true, runtime_difference_observed=true

## Experiment Validity

- status: valid
- profile: real_experiment
- baseline_captured: true
- candidate_captured: true
- no_ambiguous_capture: true
- score_evidence_present: true
- variant_effect_observed: true
- runtime_difference_observed: true
- scenario_intent_matched: true
- reason: Real experiment remains interpretable.

- No additional blockers or warnings.

## Runtime Difference Summary

- session_memory_trigger_sensitive / candidate_session_memory_sparse: Baseline session_memory policy was observed with mode=default.
- session_memory_trigger_sensitive / candidate_session_memory_sparse: Candidate session_memory policy was observed with mode=sparse.
- session_memory_trigger_sensitive / candidate_session_memory_sparse: Candidate sparse-policy markers were observed in runtime evidence.
- session_memory_trigger_sensitive / candidate_session_memory_sparse: Observed baseline and candidate session_memory policies differ.
- session_memory_trigger_sensitive / candidate_session_memory_sparse: Session_memory subagent count changed from 2 to 1.
- session_memory_trigger_sensitive / candidate_session_memory_sparse: At least one score dimension changed between baseline and candidate.

## Scorecard Summary

| scenario | candidate_variant | score | baseline | candidate | delta | interpretation |
| --- | --- | --- | ---: | ---: | ---: | --- |
| session_memory_trigger_sensitive | candidate_session_memory_sparse | controllability.turn_limit_basic | 1 | 1 | 0 | unchanged |
| session_memory_trigger_sensitive | candidate_session_memory_sparse | decision_quality.session_memory_policy_observed | 1 | 1 | 0 | unchanged |
| session_memory_trigger_sensitive | candidate_session_memory_sparse | decision_quality.subagent_count_observed | 2 | 1 | -1 | improved |
| session_memory_trigger_sensitive | candidate_session_memory_sparse | efficiency.total_billed_tokens | 440499 | 304723 | -135776 | improved |
| session_memory_trigger_sensitive | candidate_session_memory_sparse | stability.recovery_absence | 1 | 1 | 0 | unchanged |
| session_memory_trigger_sensitive | candidate_session_memory_sparse | task_success.main_chain_observed | 1 | 1 | 0 | unchanged |

## Exploration Signals

- 2 score dimension(s) changed; inspect the scorecard before treating the risk verdict as the final answer.
- A real runtime difference was observed between baseline and candidate; inspect policy evidence before reading score deltas.

## Runs

| scenario | repeat | baseline_run | candidate_variant | candidate_run | experiment_validity | risk_gate | compare_report |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| session_memory_trigger_sensitive | 1 | run_2026-05-02T165041469Z_session_memory_trigger_sensitive_baseline_default_f9b83353 | candidate_session_memory_sparse | run_2026-05-02T165222048Z_session_memory_trigger_sensitive_candidate_session_memory_sparse_cd929218 | valid | 0/4 not passed | ObservrityTask\10-系统版本\v2\06-运行报告\compare_run_2026-05-02T165041469Z_session_memory_trigger_sensitive_baseline_default_f9b83353_vs_run_2026-05-02T165222048Z_session_memory_trigger_sensitive_candidate_session_memory_sparse_cd929218.md |

## Risk Gate Details

| scenario | candidate_variant | rule_type | score_spec | verdict | regression_pct |
| --- | --- | --- | --- | --- | ---: |
| session_memory_trigger_sensitive | candidate_session_memory_sparse | hard_fail | task_success.main_chain_observed | pass | 0 |
| session_memory_trigger_sensitive | candidate_session_memory_sparse | hard_fail | efficiency.total_billed_tokens | pass | 0 |
| session_memory_trigger_sensitive | candidate_session_memory_sparse | soft_warning | efficiency.total_billed_tokens | pass | 0 |
| session_memory_trigger_sensitive | candidate_session_memory_sparse | soft_warning | decision_quality.subagent_count_observed | pass | 0 |

## Interpretation Limits

- This real experiment remains single-scenario and single-run; it is not yet a stability study.
- Candidate runtime effect was observed, but qualitative harness value still needs broader experiments.
