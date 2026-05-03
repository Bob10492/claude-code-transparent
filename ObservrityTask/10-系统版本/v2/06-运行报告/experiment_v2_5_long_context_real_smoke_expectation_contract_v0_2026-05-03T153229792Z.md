# V2 Experiment Summary: v2_5_long_context_real_smoke_expectation_contract_v0

## Understanding

- experiment: v2_5_long_context_real_smoke_expectation_contract_v0
- mode: execute_harness
- baseline_variant: baseline_default
- candidate_variants: candidate_session_memory_sparse
- scenario_count: 1
- score_specs: task_success.main_chain_observed, efficiency.total_billed_tokens, decision_quality.session_memory_policy_observed, stability.recovery_absence, controllability.turn_limit_basic, context.retained_constraint_count, context.lost_constraint_count, context.constraint_retention_rate, context.retrieved_fact_hit_rate, context.distractor_confusion_count, context.total_prompt_input_tokens, context.compaction_trigger_count, context.compaction_saved_tokens, context.success_under_context_pressure, context.manual_review_required
- gate_policy: default_v2_1_gate
- output_json: tests\evals\v2\experiment-runs\v2_5_long_context_real_smoke_expectation_contract_v0_2026-05-03T153229792Z.json

## Expected Outcome

This summary records a manifest-driven V2 experiment run. In bind_existing mode, V2 binds existing V1 traces. In execute_harness mode, V2 executes the scenario first, then captures the generated user_action_id through benchmark_run_id.

## Design Rationale

The runner always scores only trace-backed V1 facts. V2.2-beta adds runtime-effect evidence and experiment-validity semantics so smoke and real experiments are not confused with each other.

## Long Context Review

- requested_mode: execute_harness
- review_verdict: needs_manual_review
- note: This profile focuses on whether long-context pressure preserves constraints, facts, and governance signals.

## Risk Verdict

- hard_failures: 0
- soft_warnings: 0
- missing_or_inconclusive: 1
- risk_status: inconclusive
- scope: regression_risk_only
- final_experiment_judgment: false
- recommended_review_mode: manual_review

This section is a regression-risk gate, not a final judgment about whether the harness change is valuable.

## Variant Effect Evidence

- long_context_fact_retrieval_real_smoke_contract_v0 / candidate_session_memory_sparse: baseline_mode=default, candidate_mode=sparse, candidate_effect_observed=true, runtime_difference_observed=true

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

- long_context_fact_retrieval_real_smoke_contract_v0 / candidate_session_memory_sparse: Baseline session_memory policy was observed with mode=default.
- long_context_fact_retrieval_real_smoke_contract_v0 / candidate_session_memory_sparse: Candidate session_memory policy was observed with mode=sparse.
- long_context_fact_retrieval_real_smoke_contract_v0 / candidate_session_memory_sparse: Candidate sparse-policy markers were observed in runtime evidence.
- long_context_fact_retrieval_real_smoke_contract_v0 / candidate_session_memory_sparse: Observed baseline and candidate session_memory policies differ.
- long_context_fact_retrieval_real_smoke_contract_v0 / candidate_session_memory_sparse: At least one score dimension changed between baseline and candidate.

## Long Context Summary

- review_verdict: needs_manual_review
- note: This section evaluates constraint retention, fact retrieval, distractor resistance, and compaction behavior under context pressure.

| scenario | candidate_variant | family | size | retention_rate | fact_hit_rate | lost_constraints | missed_facts | distractor_confusion | compaction_triggers | compaction_saved_tokens | total_prompt_tokens | success_under_pressure | manual_review_required |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| long_context_fact_retrieval_real_smoke_contract_v0 | candidate_session_memory_sparse | retrieval | medium | 1 | 1 | 0 | 0 | 0 | 4 | 0 | 27007 | n/a | true |

### Semantic Interpretation

- long_context_fact_retrieval_real_smoke_contract_v0 / candidate_session_memory_sparse: Observed constraint retention remained at 100.0%.
- long_context_fact_retrieval_real_smoke_contract_v0 / candidate_session_memory_sparse: Observed fact retrieval hit rate is 100.0%.
- long_context_fact_retrieval_real_smoke_contract_v0 / candidate_session_memory_sparse: No distractor confusion was observed in the current evidence window.
- long_context_fact_retrieval_real_smoke_contract_v0 / candidate_session_memory_sparse: Compaction/tool-result governance was active with mean compaction trigger count 4.000 and mean saved tokens 0.
- long_context_fact_retrieval_real_smoke_contract_v0 / candidate_session_memory_sparse: Relative to baseline, candidate prompt-token delta mean is 0.000.
- long_context_fact_retrieval_real_smoke_contract_v0 / candidate_session_memory_sparse: Manual review remains open for 2 question(s).

### Manual Review Notes

- long_context_fact_retrieval_real_smoke_contract_v0 / candidate_session_memory_sparse: Did bullet 1 include the exact literal `src/entrypoints/cli.tsx` and avoid any archived or paraphrased entrypoint?
- long_context_fact_retrieval_real_smoke_contract_v0 / candidate_session_memory_sparse: Did bullet 4 explicitly include the sentence `Do not modify files.` with no extra prose before the first bullet or after the fourth bullet?

### Interpretation Limits

- Automatic long-context scores are strongest in fixture_trace mode.
- Real smoke may still require human inspection even when trace-backed cost and compaction evidence is present.


## V2.3 Batch Robustness

- batch_report: ObservrityTask\10-系统版本\v2\06-运行报告\batch_experiment_v2_5_long_context_real_smoke_expectation_contract_v0_2026-05-03T153229792Z.md
- run_group_count: 2
- run_failure_count: 0

| scenario | variant | repeats | success_rate | token_mean | token_stddev | flaky_status |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| long_context_fact_retrieval_real_smoke_contract_v0 | baseline_default | 1 | 1 | 27436 | 0 | inconclusive |
| long_context_fact_retrieval_real_smoke_contract_v0 | candidate_session_memory_sparse | 1 | 1 | 27372 | 0 | inconclusive |

### Run Failures

- No run failures recorded.

## Scorecard Summary

| scenario | candidate_variant | score | baseline | candidate | delta | interpretation |
| --- | --- | --- | ---: | ---: | ---: | --- |
| long_context_fact_retrieval_real_smoke_contract_v0 | candidate_session_memory_sparse | context.compaction_saved_tokens | 0 | 0 | 0 | unchanged |
| long_context_fact_retrieval_real_smoke_contract_v0 | candidate_session_memory_sparse | context.compaction_trigger_count | 4 | 4 | 0 | unchanged |
| long_context_fact_retrieval_real_smoke_contract_v0 | candidate_session_memory_sparse | context.constraint_retention_rate | 1 | 1 | 0 | unchanged |
| long_context_fact_retrieval_real_smoke_contract_v0 | candidate_session_memory_sparse | context.distractor_confusion_count | 0 | 0 | 0 | unchanged |
| long_context_fact_retrieval_real_smoke_contract_v0 | candidate_session_memory_sparse | context.lost_constraint_count | 0 | 0 | 0 | unchanged |
| long_context_fact_retrieval_real_smoke_contract_v0 | candidate_session_memory_sparse | context.manual_review_required | 1 | 1 | 0 | unchanged |
| long_context_fact_retrieval_real_smoke_contract_v0 | candidate_session_memory_sparse | context.retained_constraint_count | 2 | 2 | 0 | unchanged |
| long_context_fact_retrieval_real_smoke_contract_v0 | candidate_session_memory_sparse | context.retrieved_fact_hit_rate | 1 | 1 | 0 | unchanged |
| long_context_fact_retrieval_real_smoke_contract_v0 | candidate_session_memory_sparse | context.success_under_context_pressure | 1 | 1 | 0 | unchanged |
| long_context_fact_retrieval_real_smoke_contract_v0 | candidate_session_memory_sparse | context.total_prompt_input_tokens | 27007 | 27007 | 0 | unchanged |
| long_context_fact_retrieval_real_smoke_contract_v0 | candidate_session_memory_sparse | controllability.turn_limit_basic | 1 | 1 | 0 | unchanged |
| long_context_fact_retrieval_real_smoke_contract_v0 | candidate_session_memory_sparse | decision_quality.session_memory_policy_observed | 1 | 1 | 0 | unchanged |
| long_context_fact_retrieval_real_smoke_contract_v0 | candidate_session_memory_sparse | efficiency.total_billed_tokens | 27436 | 27372 | -64 | improved |
| long_context_fact_retrieval_real_smoke_contract_v0 | candidate_session_memory_sparse | stability.recovery_absence | 1 | 1 | 0 | unchanged |
| long_context_fact_retrieval_real_smoke_contract_v0 | candidate_session_memory_sparse | task_success.main_chain_observed | 1 | 1 | 0 | unchanged |

## Exploration Signals

- 1 score dimension(s) changed; inspect the scorecard before treating the risk verdict as the final answer.
- A real runtime difference was observed between baseline and candidate; inspect policy evidence before reading score deltas.

## Runs

| scenario | repeat | baseline_run | candidate_variant | candidate_run | experiment_validity | risk_gate | compare_report |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| long_context_fact_retrieval_real_smoke_contract_v0 | 1 | run_2026-05-03T153208617Z_long_context_fact_retrieval_real_smoke_contract_v0_baseline_default_0b6a625e | candidate_session_memory_sparse | run_2026-05-03T153229620Z_long_context_fact_retrieval_real_smoke_contract_v0_candidate_session_memory_sparse_a3fb1e0d | valid | 1/4 not passed | ObservrityTask\10-系统版本\v2\06-运行报告\compare_run_2026-05-03T153208617Z_long_context_fact_retrieval_real_smoke_contract_v0_baseline_default_0b6a625e_vs_run_2026-05-03T153229620Z_long_context_fact_retrieval_real_smoke_contract_v0_candidate_session_memory_sparse_a3fb1e0d.md |

## Risk Gate Details

| scenario | candidate_variant | rule_type | score_spec | verdict | regression_pct |
| --- | --- | --- | --- | --- | ---: |
| long_context_fact_retrieval_real_smoke_contract_v0 | candidate_session_memory_sparse | hard_fail | task_success.main_chain_observed | pass | 0 |
| long_context_fact_retrieval_real_smoke_contract_v0 | candidate_session_memory_sparse | hard_fail | efficiency.total_billed_tokens | pass | 0 |
| long_context_fact_retrieval_real_smoke_contract_v0 | candidate_session_memory_sparse | soft_warning | efficiency.total_billed_tokens | pass | 0 |
| long_context_fact_retrieval_real_smoke_contract_v0 | candidate_session_memory_sparse | soft_warning | decision_quality.subagent_count_observed | missing | n/a |

## Interpretation Limits

- Long-context automatic scoring is strongest in fixture_trace mode; real smoke still preserves a manual-review lane.
- Cost and compaction evidence alone do not prove that the final answer remained semantically correct.
