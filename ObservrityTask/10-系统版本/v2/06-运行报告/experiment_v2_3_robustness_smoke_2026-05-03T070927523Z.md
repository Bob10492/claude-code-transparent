# V2 Experiment Summary: v2_3_robustness_smoke

## Understanding

- experiment: v2_3_robustness_smoke
- mode: execute_harness
- baseline_variant: baseline_default
- candidate_variants: candidate_session_memory_sparse, candidate_eval_fixture_shadow
- scenario_count: 2
- score_specs: task_success.main_chain_observed, efficiency.total_billed_tokens, decision_quality.subagent_count_observed, stability.recovery_absence, controllability.turn_limit_basic
- gate_policy: default_v2_1_gate
- output_json: tests\evals\v2\experiment-runs\v2_3_robustness_smoke_2026-05-03T070927523Z.json

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

- execute_harness_smoke_minimal / candidate_session_memory_sparse: baseline_mode=unknown, candidate_mode=unknown, candidate_effect_observed=true, runtime_difference_observed=false
- execute_harness_smoke_minimal / candidate_eval_fixture_shadow: baseline_mode=unknown, candidate_mode=unknown, candidate_effect_observed=false, runtime_difference_observed=false
- execute_harness_smoke_minimal / candidate_session_memory_sparse: baseline_mode=unknown, candidate_mode=unknown, candidate_effect_observed=true, runtime_difference_observed=false
- execute_harness_smoke_minimal / candidate_eval_fixture_shadow: baseline_mode=unknown, candidate_mode=unknown, candidate_effect_observed=false, runtime_difference_observed=false
- robustness_smoke_minimal_alt / candidate_session_memory_sparse: baseline_mode=unknown, candidate_mode=unknown, candidate_effect_observed=true, runtime_difference_observed=false
- robustness_smoke_minimal_alt / candidate_eval_fixture_shadow: baseline_mode=unknown, candidate_mode=unknown, candidate_effect_observed=false, runtime_difference_observed=false
- robustness_smoke_minimal_alt / candidate_session_memory_sparse: baseline_mode=unknown, candidate_mode=unknown, candidate_effect_observed=true, runtime_difference_observed=false
- robustness_smoke_minimal_alt / candidate_eval_fixture_shadow: baseline_mode=unknown, candidate_mode=unknown, candidate_effect_observed=false, runtime_difference_observed=false

## Experiment Validity

- status: valid
- profile: smoke
- baseline_captured: true
- candidate_captured: true
- no_ambiguous_capture: true
- score_evidence_present: true
- variant_effect_observed: false
- runtime_difference_observed: false
- scenario_intent_matched: true
- reason: Smoke check remains healthy.

- No additional blockers or warnings.

## Runtime Difference Summary

- execute_harness_smoke_minimal / candidate_session_memory_sparse: Baseline session_memory policy was not observed in V1 events.
- execute_harness_smoke_minimal / candidate_session_memory_sparse: Candidate session_memory policy was not observed in V1 events.
- execute_harness_smoke_minimal / candidate_session_memory_sparse: Candidate sparse-policy markers were observed in runtime evidence.
- execute_harness_smoke_minimal / candidate_session_memory_sparse: At least one score dimension changed between baseline and candidate.
- execute_harness_smoke_minimal / candidate_session_memory_sparse: No stable runtime difference was observed yet; any score delta may still be execution noise rather than a proven harness effect.
- execute_harness_smoke_minimal / candidate_eval_fixture_shadow: Baseline session_memory policy was not observed in V1 events.
- execute_harness_smoke_minimal / candidate_eval_fixture_shadow: Candidate session_memory policy was not observed in V1 events.
- execute_harness_smoke_minimal / candidate_eval_fixture_shadow: At least one score dimension changed between baseline and candidate.
- execute_harness_smoke_minimal / candidate_eval_fixture_shadow: No stable runtime difference was observed yet; any score delta may still be execution noise rather than a proven harness effect.
- execute_harness_smoke_minimal / candidate_session_memory_sparse: Baseline session_memory policy was not observed in V1 events.
- execute_harness_smoke_minimal / candidate_session_memory_sparse: Candidate session_memory policy was not observed in V1 events.
- execute_harness_smoke_minimal / candidate_session_memory_sparse: Candidate sparse-policy markers were observed in runtime evidence.
- execute_harness_smoke_minimal / candidate_session_memory_sparse: At least one score dimension changed between baseline and candidate.
- execute_harness_smoke_minimal / candidate_session_memory_sparse: No stable runtime difference was observed yet; any score delta may still be execution noise rather than a proven harness effect.
- execute_harness_smoke_minimal / candidate_eval_fixture_shadow: Baseline session_memory policy was not observed in V1 events.
- execute_harness_smoke_minimal / candidate_eval_fixture_shadow: Candidate session_memory policy was not observed in V1 events.
- execute_harness_smoke_minimal / candidate_eval_fixture_shadow: At least one score dimension changed between baseline and candidate.
- execute_harness_smoke_minimal / candidate_eval_fixture_shadow: No stable runtime difference was observed yet; any score delta may still be execution noise rather than a proven harness effect.
- robustness_smoke_minimal_alt / candidate_session_memory_sparse: Baseline session_memory policy was not observed in V1 events.
- robustness_smoke_minimal_alt / candidate_session_memory_sparse: Candidate session_memory policy was not observed in V1 events.
- robustness_smoke_minimal_alt / candidate_session_memory_sparse: Candidate sparse-policy markers were observed in runtime evidence.
- robustness_smoke_minimal_alt / candidate_session_memory_sparse: At least one score dimension changed between baseline and candidate.
- robustness_smoke_minimal_alt / candidate_session_memory_sparse: No stable runtime difference was observed yet; any score delta may still be execution noise rather than a proven harness effect.
- robustness_smoke_minimal_alt / candidate_eval_fixture_shadow: Baseline session_memory policy was not observed in V1 events.
- robustness_smoke_minimal_alt / candidate_eval_fixture_shadow: Candidate session_memory policy was not observed in V1 events.
- robustness_smoke_minimal_alt / candidate_eval_fixture_shadow: At least one score dimension changed between baseline and candidate.
- robustness_smoke_minimal_alt / candidate_eval_fixture_shadow: No stable runtime difference was observed yet; any score delta may still be execution noise rather than a proven harness effect.
- robustness_smoke_minimal_alt / candidate_session_memory_sparse: Baseline session_memory policy was not observed in V1 events.
- robustness_smoke_minimal_alt / candidate_session_memory_sparse: Candidate session_memory policy was not observed in V1 events.
- robustness_smoke_minimal_alt / candidate_session_memory_sparse: Candidate sparse-policy markers were observed in runtime evidence.
- robustness_smoke_minimal_alt / candidate_session_memory_sparse: At least one score dimension changed between baseline and candidate.
- robustness_smoke_minimal_alt / candidate_session_memory_sparse: No stable runtime difference was observed yet; any score delta may still be execution noise rather than a proven harness effect.
- robustness_smoke_minimal_alt / candidate_eval_fixture_shadow: Baseline session_memory policy was not observed in V1 events.
- robustness_smoke_minimal_alt / candidate_eval_fixture_shadow: Candidate session_memory policy was not observed in V1 events.
- robustness_smoke_minimal_alt / candidate_eval_fixture_shadow: At least one score dimension changed between baseline and candidate.
- robustness_smoke_minimal_alt / candidate_eval_fixture_shadow: No stable runtime difference was observed yet; any score delta may still be execution noise rather than a proven harness effect.



## V2.3 Batch Robustness

- batch_report: ObservrityTask\10-系统版本\v2\06-运行报告\batch_experiment_v2_3_robustness_smoke_2026-05-03T070927523Z.md
- run_group_count: 6
- run_failure_count: 0

| scenario | variant | repeats | success_rate | token_mean | token_stddev | flaky_status |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| execute_harness_smoke_minimal | baseline_default | 2 | 1 | 110 | 0 | stable |
| execute_harness_smoke_minimal | candidate_eval_fixture_shadow | 2 | 1 | 105 | 0 | stable |
| execute_harness_smoke_minimal | candidate_session_memory_sparse | 2 | 1 | 100 | 0 | stable |
| robustness_smoke_minimal_alt | baseline_default | 2 | 1 | 110 | 0 | stable |
| robustness_smoke_minimal_alt | candidate_eval_fixture_shadow | 2 | 1 | 105 | 0 | stable |
| robustness_smoke_minimal_alt | candidate_session_memory_sparse | 2 | 1 | 100 | 0 | stable |

### Run Failures

- No run failures recorded.

## Scorecard Summary

| scenario | candidate_variant | score | baseline | candidate | delta | interpretation |
| --- | --- | --- | ---: | ---: | ---: | --- |
| execute_harness_smoke_minimal | candidate_session_memory_sparse | controllability.turn_limit_basic | 1 | 1 | 0 | unchanged |
| execute_harness_smoke_minimal | candidate_session_memory_sparse | decision_quality.subagent_count_observed | 0 | 0 | 0 | unchanged |
| execute_harness_smoke_minimal | candidate_session_memory_sparse | efficiency.total_billed_tokens | 110 | 100 | -10 | improved |
| execute_harness_smoke_minimal | candidate_session_memory_sparse | stability.recovery_absence | 1 | 1 | 0 | unchanged |
| execute_harness_smoke_minimal | candidate_session_memory_sparse | task_success.main_chain_observed | 1 | 1 | 0 | unchanged |
| execute_harness_smoke_minimal | candidate_eval_fixture_shadow | controllability.turn_limit_basic | 1 | 1 | 0 | unchanged |
| execute_harness_smoke_minimal | candidate_eval_fixture_shadow | decision_quality.subagent_count_observed | 0 | 0 | 0 | unchanged |
| execute_harness_smoke_minimal | candidate_eval_fixture_shadow | efficiency.total_billed_tokens | 110 | 105 | -5 | improved |
| execute_harness_smoke_minimal | candidate_eval_fixture_shadow | stability.recovery_absence | 1 | 1 | 0 | unchanged |
| execute_harness_smoke_minimal | candidate_eval_fixture_shadow | task_success.main_chain_observed | 1 | 1 | 0 | unchanged |
| execute_harness_smoke_minimal | candidate_session_memory_sparse | controllability.turn_limit_basic | 1 | 1 | 0 | unchanged |
| execute_harness_smoke_minimal | candidate_session_memory_sparse | decision_quality.subagent_count_observed | 0 | 0 | 0 | unchanged |
| execute_harness_smoke_minimal | candidate_session_memory_sparse | efficiency.total_billed_tokens | 110 | 100 | -10 | improved |
| execute_harness_smoke_minimal | candidate_session_memory_sparse | stability.recovery_absence | 1 | 1 | 0 | unchanged |
| execute_harness_smoke_minimal | candidate_session_memory_sparse | task_success.main_chain_observed | 1 | 1 | 0 | unchanged |
| execute_harness_smoke_minimal | candidate_eval_fixture_shadow | controllability.turn_limit_basic | 1 | 1 | 0 | unchanged |
| execute_harness_smoke_minimal | candidate_eval_fixture_shadow | decision_quality.subagent_count_observed | 0 | 0 | 0 | unchanged |
| execute_harness_smoke_minimal | candidate_eval_fixture_shadow | efficiency.total_billed_tokens | 110 | 105 | -5 | improved |
| execute_harness_smoke_minimal | candidate_eval_fixture_shadow | stability.recovery_absence | 1 | 1 | 0 | unchanged |
| execute_harness_smoke_minimal | candidate_eval_fixture_shadow | task_success.main_chain_observed | 1 | 1 | 0 | unchanged |
| robustness_smoke_minimal_alt | candidate_session_memory_sparse | controllability.turn_limit_basic | 1 | 1 | 0 | unchanged |
| robustness_smoke_minimal_alt | candidate_session_memory_sparse | decision_quality.subagent_count_observed | 0 | 0 | 0 | unchanged |
| robustness_smoke_minimal_alt | candidate_session_memory_sparse | efficiency.total_billed_tokens | 110 | 100 | -10 | improved |
| robustness_smoke_minimal_alt | candidate_session_memory_sparse | stability.recovery_absence | 1 | 1 | 0 | unchanged |
| robustness_smoke_minimal_alt | candidate_session_memory_sparse | task_success.main_chain_observed | 1 | 1 | 0 | unchanged |
| robustness_smoke_minimal_alt | candidate_eval_fixture_shadow | controllability.turn_limit_basic | 1 | 1 | 0 | unchanged |
| robustness_smoke_minimal_alt | candidate_eval_fixture_shadow | decision_quality.subagent_count_observed | 0 | 0 | 0 | unchanged |
| robustness_smoke_minimal_alt | candidate_eval_fixture_shadow | efficiency.total_billed_tokens | 110 | 105 | -5 | improved |
| robustness_smoke_minimal_alt | candidate_eval_fixture_shadow | stability.recovery_absence | 1 | 1 | 0 | unchanged |
| robustness_smoke_minimal_alt | candidate_eval_fixture_shadow | task_success.main_chain_observed | 1 | 1 | 0 | unchanged |
| robustness_smoke_minimal_alt | candidate_session_memory_sparse | controllability.turn_limit_basic | 1 | 1 | 0 | unchanged |
| robustness_smoke_minimal_alt | candidate_session_memory_sparse | decision_quality.subagent_count_observed | 0 | 0 | 0 | unchanged |
| robustness_smoke_minimal_alt | candidate_session_memory_sparse | efficiency.total_billed_tokens | 110 | 100 | -10 | improved |
| robustness_smoke_minimal_alt | candidate_session_memory_sparse | stability.recovery_absence | 1 | 1 | 0 | unchanged |
| robustness_smoke_minimal_alt | candidate_session_memory_sparse | task_success.main_chain_observed | 1 | 1 | 0 | unchanged |
| robustness_smoke_minimal_alt | candidate_eval_fixture_shadow | controllability.turn_limit_basic | 1 | 1 | 0 | unchanged |
| robustness_smoke_minimal_alt | candidate_eval_fixture_shadow | decision_quality.subagent_count_observed | 0 | 0 | 0 | unchanged |
| robustness_smoke_minimal_alt | candidate_eval_fixture_shadow | efficiency.total_billed_tokens | 110 | 105 | -5 | improved |
| robustness_smoke_minimal_alt | candidate_eval_fixture_shadow | stability.recovery_absence | 1 | 1 | 0 | unchanged |
| robustness_smoke_minimal_alt | candidate_eval_fixture_shadow | task_success.main_chain_observed | 1 | 1 | 0 | unchanged |

## Exploration Signals

- 1 score dimension(s) changed; inspect the scorecard before treating the risk verdict as the final answer.

## Runs

| scenario | repeat | baseline_run | candidate_variant | candidate_run | experiment_validity | risk_gate | compare_report |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| execute_harness_smoke_minimal | 1 | run_2026-05-03T070927462Z_execute_harness_smoke_minimal_baseline_default_49e858ae | candidate_session_memory_sparse | run_2026-05-03T070927467Z_execute_harness_smoke_minimal_candidate_session_memory_sparse_1e5948a5 | valid | 0/4 not passed | ObservrityTask\10-系统版本\v2\06-运行报告\compare_run_2026-05-03T070927462Z_execute_harness_smoke_minimal_baseline_default_49e858ae_vs_run_2026-05-03T070927467Z_execute_harness_smoke_minimal_candidate_session_memory_sparse_1e5948a5.md |
| execute_harness_smoke_minimal | 1 | run_2026-05-03T070927462Z_execute_harness_smoke_minimal_baseline_default_49e858ae | candidate_eval_fixture_shadow | run_2026-05-03T070927478Z_execute_harness_smoke_minimal_candidate_eval_fixture_shadow_09f1deec | valid | 0/4 not passed | ObservrityTask\10-系统版本\v2\06-运行报告\compare_run_2026-05-03T070927462Z_execute_harness_smoke_minimal_baseline_default_49e858ae_vs_run_2026-05-03T070927478Z_execute_harness_smoke_minimal_candidate_eval_fixture_shadow_09f1deec.md |
| execute_harness_smoke_minimal | 2 | run_2026-05-03T070927484Z_execute_harness_smoke_minimal_baseline_default_8600f149 | candidate_session_memory_sparse | run_2026-05-03T070927487Z_execute_harness_smoke_minimal_candidate_session_memory_sparse_862641d4 | valid | 0/4 not passed | ObservrityTask\10-系统版本\v2\06-运行报告\compare_run_2026-05-03T070927484Z_execute_harness_smoke_minimal_baseline_default_8600f149_vs_run_2026-05-03T070927487Z_execute_harness_smoke_minimal_candidate_session_memory_sparse_862641d4.md |
| execute_harness_smoke_minimal | 2 | run_2026-05-03T070927484Z_execute_harness_smoke_minimal_baseline_default_8600f149 | candidate_eval_fixture_shadow | run_2026-05-03T070927491Z_execute_harness_smoke_minimal_candidate_eval_fixture_shadow_61d3ed8d | valid | 0/4 not passed | ObservrityTask\10-系统版本\v2\06-运行报告\compare_run_2026-05-03T070927484Z_execute_harness_smoke_minimal_baseline_default_8600f149_vs_run_2026-05-03T070927491Z_execute_harness_smoke_minimal_candidate_eval_fixture_shadow_61d3ed8d.md |
| robustness_smoke_minimal_alt | 1 | run_2026-05-03T070927496Z_robustness_smoke_minimal_alt_baseline_default_231de0ad | candidate_session_memory_sparse | run_2026-05-03T070927499Z_robustness_smoke_minimal_alt_candidate_session_memory_sparse_c53e147c | valid | 0/4 not passed | ObservrityTask\10-系统版本\v2\06-运行报告\compare_run_2026-05-03T070927496Z_robustness_smoke_minimal_alt_baseline_default_231de0ad_vs_run_2026-05-03T070927499Z_robustness_smoke_minimal_alt_candidate_session_memory_sparse_c53e147c.md |
| robustness_smoke_minimal_alt | 1 | run_2026-05-03T070927496Z_robustness_smoke_minimal_alt_baseline_default_231de0ad | candidate_eval_fixture_shadow | run_2026-05-03T070927505Z_robustness_smoke_minimal_alt_candidate_eval_fixture_shadow_1afeb0f4 | valid | 0/4 not passed | ObservrityTask\10-系统版本\v2\06-运行报告\compare_run_2026-05-03T070927496Z_robustness_smoke_minimal_alt_baseline_default_231de0ad_vs_run_2026-05-03T070927505Z_robustness_smoke_minimal_alt_candidate_eval_fixture_shadow_1afeb0f4.md |
| robustness_smoke_minimal_alt | 2 | run_2026-05-03T070927510Z_robustness_smoke_minimal_alt_baseline_default_5ee185bf | candidate_session_memory_sparse | run_2026-05-03T070927513Z_robustness_smoke_minimal_alt_candidate_session_memory_sparse_242dc6f0 | valid | 0/4 not passed | ObservrityTask\10-系统版本\v2\06-运行报告\compare_run_2026-05-03T070927510Z_robustness_smoke_minimal_alt_baseline_default_5ee185bf_vs_run_2026-05-03T070927513Z_robustness_smoke_minimal_alt_candidate_session_memory_sparse_242dc6f0.md |
| robustness_smoke_minimal_alt | 2 | run_2026-05-03T070927510Z_robustness_smoke_minimal_alt_baseline_default_5ee185bf | candidate_eval_fixture_shadow | run_2026-05-03T070927518Z_robustness_smoke_minimal_alt_candidate_eval_fixture_shadow_59258ce7 | valid | 0/4 not passed | ObservrityTask\10-系统版本\v2\06-运行报告\compare_run_2026-05-03T070927510Z_robustness_smoke_minimal_alt_baseline_default_5ee185bf_vs_run_2026-05-03T070927518Z_robustness_smoke_minimal_alt_candidate_eval_fixture_shadow_59258ce7.md |

## Risk Gate Details

| scenario | candidate_variant | rule_type | score_spec | verdict | regression_pct |
| --- | --- | --- | --- | --- | ---: |
| execute_harness_smoke_minimal | candidate_session_memory_sparse | hard_fail | task_success.main_chain_observed | pass | 0 |
| execute_harness_smoke_minimal | candidate_session_memory_sparse | hard_fail | efficiency.total_billed_tokens | pass | 0 |
| execute_harness_smoke_minimal | candidate_session_memory_sparse | soft_warning | efficiency.total_billed_tokens | pass | 0 |
| execute_harness_smoke_minimal | candidate_session_memory_sparse | soft_warning | decision_quality.subagent_count_observed | pass | 0 |
| execute_harness_smoke_minimal | candidate_eval_fixture_shadow | hard_fail | task_success.main_chain_observed | pass | 0 |
| execute_harness_smoke_minimal | candidate_eval_fixture_shadow | hard_fail | efficiency.total_billed_tokens | pass | 0 |
| execute_harness_smoke_minimal | candidate_eval_fixture_shadow | soft_warning | efficiency.total_billed_tokens | pass | 0 |
| execute_harness_smoke_minimal | candidate_eval_fixture_shadow | soft_warning | decision_quality.subagent_count_observed | pass | 0 |
| execute_harness_smoke_minimal | candidate_session_memory_sparse | hard_fail | task_success.main_chain_observed | pass | 0 |
| execute_harness_smoke_minimal | candidate_session_memory_sparse | hard_fail | efficiency.total_billed_tokens | pass | 0 |
| execute_harness_smoke_minimal | candidate_session_memory_sparse | soft_warning | efficiency.total_billed_tokens | pass | 0 |
| execute_harness_smoke_minimal | candidate_session_memory_sparse | soft_warning | decision_quality.subagent_count_observed | pass | 0 |
| execute_harness_smoke_minimal | candidate_eval_fixture_shadow | hard_fail | task_success.main_chain_observed | pass | 0 |
| execute_harness_smoke_minimal | candidate_eval_fixture_shadow | hard_fail | efficiency.total_billed_tokens | pass | 0 |
| execute_harness_smoke_minimal | candidate_eval_fixture_shadow | soft_warning | efficiency.total_billed_tokens | pass | 0 |
| execute_harness_smoke_minimal | candidate_eval_fixture_shadow | soft_warning | decision_quality.subagent_count_observed | pass | 0 |
| robustness_smoke_minimal_alt | candidate_session_memory_sparse | hard_fail | task_success.main_chain_observed | pass | 0 |
| robustness_smoke_minimal_alt | candidate_session_memory_sparse | hard_fail | efficiency.total_billed_tokens | pass | 0 |
| robustness_smoke_minimal_alt | candidate_session_memory_sparse | soft_warning | efficiency.total_billed_tokens | pass | 0 |
| robustness_smoke_minimal_alt | candidate_session_memory_sparse | soft_warning | decision_quality.subagent_count_observed | pass | 0 |
| robustness_smoke_minimal_alt | candidate_eval_fixture_shadow | hard_fail | task_success.main_chain_observed | pass | 0 |
| robustness_smoke_minimal_alt | candidate_eval_fixture_shadow | hard_fail | efficiency.total_billed_tokens | pass | 0 |
| robustness_smoke_minimal_alt | candidate_eval_fixture_shadow | soft_warning | efficiency.total_billed_tokens | pass | 0 |
| robustness_smoke_minimal_alt | candidate_eval_fixture_shadow | soft_warning | decision_quality.subagent_count_observed | pass | 0 |
| robustness_smoke_minimal_alt | candidate_session_memory_sparse | hard_fail | task_success.main_chain_observed | pass | 0 |
| robustness_smoke_minimal_alt | candidate_session_memory_sparse | hard_fail | efficiency.total_billed_tokens | pass | 0 |
| robustness_smoke_minimal_alt | candidate_session_memory_sparse | soft_warning | efficiency.total_billed_tokens | pass | 0 |
| robustness_smoke_minimal_alt | candidate_session_memory_sparse | soft_warning | decision_quality.subagent_count_observed | pass | 0 |
| robustness_smoke_minimal_alt | candidate_eval_fixture_shadow | hard_fail | task_success.main_chain_observed | pass | 0 |
| robustness_smoke_minimal_alt | candidate_eval_fixture_shadow | hard_fail | efficiency.total_billed_tokens | pass | 0 |
| robustness_smoke_minimal_alt | candidate_eval_fixture_shadow | soft_warning | efficiency.total_billed_tokens | pass | 0 |
| robustness_smoke_minimal_alt | candidate_eval_fixture_shadow | soft_warning | decision_quality.subagent_count_observed | pass | 0 |

## Interpretation Limits

- Smoke only proves the automatic execute_harness -> capture -> run/score/report loop is healthy.
- Smoke does not prove a candidate harness change is beneficial.
