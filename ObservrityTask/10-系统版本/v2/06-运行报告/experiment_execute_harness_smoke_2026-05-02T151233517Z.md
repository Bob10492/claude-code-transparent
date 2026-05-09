# V2 Experiment Summary: execute_harness_smoke

## Understanding

- experiment: execute_harness_smoke
- mode: execute_harness
- baseline_variant: baseline_default
- candidate_variants: candidate_session_memory_sparse
- scenario_count: 1
- score_specs: task_success.main_chain_observed, efficiency.total_billed_tokens, decision_quality.subagent_count_observed, stability.recovery_absence, controllability.turn_limit_basic
- gate_policy: default_v2_1_gate
- output_json: tests\evals\v2\experiment-runs\execute_harness_smoke_2026-05-02T151233517Z.json

## Expected Outcome

This summary records a manifest-driven V2 experiment run. In bind_existing mode, V2 binds existing V1 traces. In execute_harness mode, V2 executes the scenario first, then captures the generated user_action_id through benchmark_run_id.

## Design Rationale

The runner always scores only trace-backed V1 facts. V2.2-beta adds runtime-effect evidence and experiment-validity semantics so smoke and real experiments are not confused with each other.

## Smoke Check

- requested_mode: execute_harness
- execute_harness_loop_closed: true
- note: This profile validates the automatic pipeline, not harness value.

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

- execute_harness_smoke_minimal / candidate_session_memory_sparse: baseline_mode=default, candidate_mode=sparse, candidate_effect_observed=true, runtime_difference_observed=true

## Experiment Validity

- status: valid
- profile: smoke
- baseline_captured: true
- candidate_captured: true
- no_ambiguous_capture: true
- score_evidence_present: true
- variant_effect_observed: true
- runtime_difference_observed: true
- scenario_intent_matched: true
- reason: Smoke check remains healthy.

- No additional blockers or warnings.

## Runtime Difference Summary

- execute_harness_smoke_minimal / candidate_session_memory_sparse: Baseline session_memory policy was observed with mode=default.
- execute_harness_smoke_minimal / candidate_session_memory_sparse: Candidate session_memory policy was observed with mode=sparse.
- execute_harness_smoke_minimal / candidate_session_memory_sparse: Candidate sparse-policy markers were observed in runtime evidence.
- execute_harness_smoke_minimal / candidate_session_memory_sparse: Observed baseline and candidate session_memory policies differ.

## Scorecard Summary

| scenario | candidate_variant | score | baseline | candidate | delta | interpretation |
| --- | --- | --- | ---: | ---: | ---: | --- |
| execute_harness_smoke_minimal | candidate_session_memory_sparse | controllability.turn_limit_basic | 1 | 1 | 0 | unchanged |
| execute_harness_smoke_minimal | candidate_session_memory_sparse | decision_quality.subagent_count_observed | 1 | 1 | 0 | unchanged |
| execute_harness_smoke_minimal | candidate_session_memory_sparse | efficiency.total_billed_tokens | 26628 | 26628 | 0 | unchanged |
| execute_harness_smoke_minimal | candidate_session_memory_sparse | stability.recovery_absence | 1 | 1 | 0 | unchanged |
| execute_harness_smoke_minimal | candidate_session_memory_sparse | task_success.main_chain_observed | 1 | 1 | 0 | unchanged |

## Exploration Signals

- A real runtime difference was observed between baseline and candidate; inspect policy evidence before reading score deltas.

## Runs

| scenario | repeat | baseline_run | candidate_variant | candidate_run | experiment_validity | risk_gate | compare_report |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| execute_harness_smoke_minimal | 1 | run_2026-05-02T151221799Z_execute_harness_smoke_minimal_baseline_default_9d0393b9 | candidate_session_memory_sparse | run_2026-05-02T151233323Z_execute_harness_smoke_minimal_candidate_session_memory_sparse_1b6e0b9d | valid | 0/4 not passed | ObservrityTask\10-系统版本\v2\06-运行报告\compare_run_2026-05-02T151221799Z_execute_harness_smoke_minimal_baseline_default_9d0393b9_vs_run_2026-05-02T151233323Z_execute_harness_smoke_minimal_candidate_session_memory_sparse_1b6e0b9d.md |

## Risk Gate Details

| scenario | candidate_variant | rule_type | score_spec | verdict | regression_pct |
| --- | --- | --- | --- | --- | ---: |
| execute_harness_smoke_minimal | candidate_session_memory_sparse | hard_fail | task_success.main_chain_observed | pass | 0 |
| execute_harness_smoke_minimal | candidate_session_memory_sparse | hard_fail | efficiency.total_billed_tokens | pass | 0 |
| execute_harness_smoke_minimal | candidate_session_memory_sparse | soft_warning | efficiency.total_billed_tokens | pass | 0 |
| execute_harness_smoke_minimal | candidate_session_memory_sparse | soft_warning | decision_quality.subagent_count_observed | pass | 0 |

## Interpretation Limits

- Smoke only proves the automatic execute_harness -> capture -> run/score/report loop is healthy.
- Smoke does not prove a candidate harness change is beneficial.
