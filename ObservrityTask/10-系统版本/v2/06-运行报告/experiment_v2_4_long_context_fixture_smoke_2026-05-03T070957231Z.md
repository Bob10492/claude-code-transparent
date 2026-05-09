# V2 Experiment Summary: v2_4_long_context_fixture_smoke

## Understanding

- experiment: v2_4_long_context_fixture_smoke
- mode: execute_harness
- baseline_variant: baseline_default
- candidate_variants: candidate_long_context_fixture_guarded
- scenario_count: 4
- score_specs: task_success.main_chain_observed, efficiency.total_billed_tokens, stability.recovery_absence, controllability.turn_limit_basic, context.retained_constraint_count, context.lost_constraint_count, context.constraint_retention_rate, context.retrieved_fact_hit_rate, context.distractor_confusion_count, context.total_prompt_input_tokens, context.compaction_trigger_count, context.compaction_saved_tokens, context.success_under_context_pressure, context.manual_review_required
- gate_policy: default_v2_1_gate
- output_json: tests\evals\v2\experiment-runs\v2_4_long_context_fixture_smoke_2026-05-03T070957231Z.json

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
- missing_or_inconclusive: 8
- risk_status: inconclusive
- scope: regression_risk_only
- final_experiment_judgment: false
- recommended_review_mode: manual_review

This section is a regression-risk gate, not a final judgment about whether the harness change is valuable.

## Variant Effect Evidence

- long_context_constraint_retention / candidate_long_context_fixture_guarded: baseline_mode=unknown, candidate_mode=unknown, candidate_effect_observed=false, runtime_difference_observed=false
- long_context_constraint_retention / candidate_long_context_fixture_guarded: baseline_mode=unknown, candidate_mode=unknown, candidate_effect_observed=false, runtime_difference_observed=false
- long_context_fact_retrieval / candidate_long_context_fixture_guarded: baseline_mode=unknown, candidate_mode=unknown, candidate_effect_observed=false, runtime_difference_observed=false
- long_context_fact_retrieval / candidate_long_context_fixture_guarded: baseline_mode=unknown, candidate_mode=unknown, candidate_effect_observed=false, runtime_difference_observed=false
- long_context_distractor_resistance / candidate_long_context_fixture_guarded: baseline_mode=unknown, candidate_mode=unknown, candidate_effect_observed=false, runtime_difference_observed=false
- long_context_distractor_resistance / candidate_long_context_fixture_guarded: baseline_mode=unknown, candidate_mode=unknown, candidate_effect_observed=false, runtime_difference_observed=false
- long_context_compaction_pressure / candidate_long_context_fixture_guarded: baseline_mode=unknown, candidate_mode=unknown, candidate_effect_observed=false, runtime_difference_observed=false
- long_context_compaction_pressure / candidate_long_context_fixture_guarded: baseline_mode=unknown, candidate_mode=unknown, candidate_effect_observed=false, runtime_difference_observed=false

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

- long_context_constraint_retention / candidate_long_context_fixture_guarded: Baseline session_memory policy was not observed in V1 events.
- long_context_constraint_retention / candidate_long_context_fixture_guarded: Candidate session_memory policy was not observed in V1 events.
- long_context_constraint_retention / candidate_long_context_fixture_guarded: At least one score dimension changed between baseline and candidate.
- long_context_constraint_retention / candidate_long_context_fixture_guarded: No stable runtime difference was observed yet; any score delta may still be execution noise rather than a proven harness effect.
- long_context_constraint_retention / candidate_long_context_fixture_guarded: Baseline session_memory policy was not observed in V1 events.
- long_context_constraint_retention / candidate_long_context_fixture_guarded: Candidate session_memory policy was not observed in V1 events.
- long_context_constraint_retention / candidate_long_context_fixture_guarded: At least one score dimension changed between baseline and candidate.
- long_context_constraint_retention / candidate_long_context_fixture_guarded: No stable runtime difference was observed yet; any score delta may still be execution noise rather than a proven harness effect.
- long_context_fact_retrieval / candidate_long_context_fixture_guarded: Baseline session_memory policy was not observed in V1 events.
- long_context_fact_retrieval / candidate_long_context_fixture_guarded: Candidate session_memory policy was not observed in V1 events.
- long_context_fact_retrieval / candidate_long_context_fixture_guarded: At least one score dimension changed between baseline and candidate.
- long_context_fact_retrieval / candidate_long_context_fixture_guarded: No stable runtime difference was observed yet; any score delta may still be execution noise rather than a proven harness effect.
- long_context_fact_retrieval / candidate_long_context_fixture_guarded: Baseline session_memory policy was not observed in V1 events.
- long_context_fact_retrieval / candidate_long_context_fixture_guarded: Candidate session_memory policy was not observed in V1 events.
- long_context_fact_retrieval / candidate_long_context_fixture_guarded: At least one score dimension changed between baseline and candidate.
- long_context_fact_retrieval / candidate_long_context_fixture_guarded: No stable runtime difference was observed yet; any score delta may still be execution noise rather than a proven harness effect.
- long_context_distractor_resistance / candidate_long_context_fixture_guarded: Baseline session_memory policy was not observed in V1 events.
- long_context_distractor_resistance / candidate_long_context_fixture_guarded: Candidate session_memory policy was not observed in V1 events.
- long_context_distractor_resistance / candidate_long_context_fixture_guarded: At least one score dimension changed between baseline and candidate.
- long_context_distractor_resistance / candidate_long_context_fixture_guarded: No stable runtime difference was observed yet; any score delta may still be execution noise rather than a proven harness effect.
- long_context_distractor_resistance / candidate_long_context_fixture_guarded: Baseline session_memory policy was not observed in V1 events.
- long_context_distractor_resistance / candidate_long_context_fixture_guarded: Candidate session_memory policy was not observed in V1 events.
- long_context_distractor_resistance / candidate_long_context_fixture_guarded: At least one score dimension changed between baseline and candidate.
- long_context_distractor_resistance / candidate_long_context_fixture_guarded: No stable runtime difference was observed yet; any score delta may still be execution noise rather than a proven harness effect.
- long_context_compaction_pressure / candidate_long_context_fixture_guarded: Baseline session_memory policy was not observed in V1 events.
- long_context_compaction_pressure / candidate_long_context_fixture_guarded: Candidate session_memory policy was not observed in V1 events.
- long_context_compaction_pressure / candidate_long_context_fixture_guarded: At least one score dimension changed between baseline and candidate.
- long_context_compaction_pressure / candidate_long_context_fixture_guarded: No stable runtime difference was observed yet; any score delta may still be execution noise rather than a proven harness effect.
- long_context_compaction_pressure / candidate_long_context_fixture_guarded: Baseline session_memory policy was not observed in V1 events.
- long_context_compaction_pressure / candidate_long_context_fixture_guarded: Candidate session_memory policy was not observed in V1 events.
- long_context_compaction_pressure / candidate_long_context_fixture_guarded: At least one score dimension changed between baseline and candidate.
- long_context_compaction_pressure / candidate_long_context_fixture_guarded: No stable runtime difference was observed yet; any score delta may still be execution noise rather than a proven harness effect.

## Long Context Summary

- review_verdict: needs_manual_review
- note: This section evaluates constraint retention, fact retrieval, distractor resistance, and compaction behavior under context pressure.

| scenario | candidate_variant | family | size | retention_rate | fact_hit_rate | lost_constraints | missed_facts | distractor_confusion | compaction_triggers | compaction_saved_tokens | total_prompt_tokens | success_under_pressure | manual_review_required |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| long_context_compaction_pressure | candidate_long_context_fixture_guarded | compaction_pressure | large | 1 | 1 | 0 | 0 | 0 | 2 | 188 | 1230 | 1 | true |
| long_context_constraint_retention | candidate_long_context_fixture_guarded | constraint_retention | medium | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 1080 | 1 | true |
| long_context_distractor_resistance | candidate_long_context_fixture_guarded | distractor_resistance | medium | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 1110 | 1 | true |
| long_context_fact_retrieval | candidate_long_context_fixture_guarded | retrieval | medium | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 1130 | 1 | true |

### Semantic Interpretation

- long_context_compaction_pressure / candidate_long_context_fixture_guarded: Observed constraint retention remained at 100.0%.
- long_context_compaction_pressure / candidate_long_context_fixture_guarded: Observed fact retrieval hit rate is 100.0%.
- long_context_compaction_pressure / candidate_long_context_fixture_guarded: No distractor confusion was observed in the current evidence window.
- long_context_compaction_pressure / candidate_long_context_fixture_guarded: Compaction/tool-result governance was active with mean compaction trigger count 2.000 and mean saved tokens 188.
- long_context_compaction_pressure / candidate_long_context_fixture_guarded: Relative to baseline, candidate prompt-token delta mean is -400.000.
- long_context_compaction_pressure / candidate_long_context_fixture_guarded: Manual review remains open for 2 question(s).
- long_context_constraint_retention / candidate_long_context_fixture_guarded: Observed constraint retention remained at 100.0%.
- long_context_constraint_retention / candidate_long_context_fixture_guarded: Observed fact retrieval hit rate is 100.0%.
- long_context_constraint_retention / candidate_long_context_fixture_guarded: No distractor confusion was observed in the current evidence window.
- long_context_constraint_retention / candidate_long_context_fixture_guarded: Relative to baseline, candidate prompt-token delta mean is -190.000.
- long_context_constraint_retention / candidate_long_context_fixture_guarded: Manual review remains open for 2 question(s).
- long_context_distractor_resistance / candidate_long_context_fixture_guarded: Observed constraint retention remained at 100.0%.
- long_context_distractor_resistance / candidate_long_context_fixture_guarded: Observed fact retrieval hit rate is 100.0%.
- long_context_distractor_resistance / candidate_long_context_fixture_guarded: No distractor confusion was observed in the current evidence window.
- long_context_distractor_resistance / candidate_long_context_fixture_guarded: Relative to baseline, candidate prompt-token delta mean is -200.000.
- long_context_distractor_resistance / candidate_long_context_fixture_guarded: Manual review remains open for 2 question(s).
- long_context_fact_retrieval / candidate_long_context_fixture_guarded: Observed constraint retention remained at 100.0%.
- long_context_fact_retrieval / candidate_long_context_fixture_guarded: Observed fact retrieval hit rate is 100.0%.
- long_context_fact_retrieval / candidate_long_context_fixture_guarded: No distractor confusion was observed in the current evidence window.
- long_context_fact_retrieval / candidate_long_context_fixture_guarded: Relative to baseline, candidate prompt-token delta mean is -220.000.
- long_context_fact_retrieval / candidate_long_context_fixture_guarded: Manual review remains open for 2 question(s).

### Manual Review Notes

- long_context_compaction_pressure / candidate_long_context_fixture_guarded: Did the answer keep the exact three required headings?
- long_context_compaction_pressure / candidate_long_context_fixture_guarded: Did the answer stay on current compaction signals instead of archived names?
- long_context_constraint_retention / candidate_long_context_fixture_guarded: Did the answer remain valid JSON instead of drifting into prose?
- long_context_constraint_retention / candidate_long_context_fixture_guarded: Did the answer preserve owner=v2-platform while staying read-only?
- long_context_distractor_resistance / candidate_long_context_fixture_guarded: Did the answer clearly distinguish the V2.4 candidate from the V2.3 fixture helper?
- long_context_distractor_resistance / candidate_long_context_fixture_guarded: Did the answer avoid treating the old execute_harness smoke as the long-context manifest?
- long_context_fact_retrieval / candidate_long_context_fixture_guarded: Did the answer really name src/entrypoints/cli.tsx rather than an archived entrypoint?
- long_context_fact_retrieval / candidate_long_context_fixture_guarded: Did the answer preserve the four-bullet constraint without extra prose?

### Interpretation Limits

- Automatic long-context scores are strongest in fixture_trace mode.
- Real smoke may still require human inspection even when trace-backed cost and compaction evidence is present.


## V2.3 Batch Robustness

- batch_report: ObservrityTask\10-系统版本\v2\06-运行报告\batch_experiment_v2_4_long_context_fixture_smoke_2026-05-03T070957231Z.md
- run_group_count: 8
- run_failure_count: 0

| scenario | variant | repeats | success_rate | token_mean | token_stddev | flaky_status |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| long_context_compaction_pressure | baseline_default | 2 | 1 | 1640 | 0 | stable |
| long_context_compaction_pressure | candidate_long_context_fixture_guarded | 2 | 1 | 1240 | 0 | stable |
| long_context_constraint_retention | baseline_default | 2 | 1 | 1280 | 0 | stable |
| long_context_constraint_retention | candidate_long_context_fixture_guarded | 2 | 1 | 1090 | 0 | stable |
| long_context_distractor_resistance | baseline_default | 2 | 1 | 1320 | 0 | stable |
| long_context_distractor_resistance | candidate_long_context_fixture_guarded | 2 | 1 | 1120 | 0 | stable |
| long_context_fact_retrieval | baseline_default | 2 | 1 | 1360 | 0 | stable |
| long_context_fact_retrieval | candidate_long_context_fixture_guarded | 2 | 1 | 1140 | 0 | stable |

### Run Failures

- No run failures recorded.

## Scorecard Summary

| scenario | candidate_variant | score | baseline | candidate | delta | interpretation |
| --- | --- | --- | ---: | ---: | ---: | --- |
| long_context_constraint_retention | candidate_long_context_fixture_guarded | context.compaction_saved_tokens | 0 | 0 | 0 | unchanged |
| long_context_constraint_retention | candidate_long_context_fixture_guarded | context.compaction_trigger_count | 0 | 0 | 0 | unchanged |
| long_context_constraint_retention | candidate_long_context_fixture_guarded | context.constraint_retention_rate | 0.666667 | 1 | 0.333333 | improved |
| long_context_constraint_retention | candidate_long_context_fixture_guarded | context.distractor_confusion_count | 0 | 0 | 0 | unchanged |
| long_context_constraint_retention | candidate_long_context_fixture_guarded | context.lost_constraint_count | 1 | 0 | -1 | improved |
| long_context_constraint_retention | candidate_long_context_fixture_guarded | context.manual_review_required | 1 | 1 | 0 | unchanged |
| long_context_constraint_retention | candidate_long_context_fixture_guarded | context.retained_constraint_count | 2 | 3 | 1 | improved |
| long_context_constraint_retention | candidate_long_context_fixture_guarded | context.retrieved_fact_hit_rate | 1 | 1 | 0 | unchanged |
| long_context_constraint_retention | candidate_long_context_fixture_guarded | context.success_under_context_pressure | 1 | 1 | 0 | unchanged |
| long_context_constraint_retention | candidate_long_context_fixture_guarded | context.total_prompt_input_tokens | 1270 | 1080 | -190 | improved |
| long_context_constraint_retention | candidate_long_context_fixture_guarded | controllability.turn_limit_basic | 1 | 1 | 0 | unchanged |
| long_context_constraint_retention | candidate_long_context_fixture_guarded | efficiency.total_billed_tokens | 1280 | 1090 | -190 | improved |
| long_context_constraint_retention | candidate_long_context_fixture_guarded | stability.recovery_absence | 1 | 1 | 0 | unchanged |
| long_context_constraint_retention | candidate_long_context_fixture_guarded | task_success.main_chain_observed | 1 | 1 | 0 | unchanged |
| long_context_constraint_retention | candidate_long_context_fixture_guarded | context.compaction_saved_tokens | 0 | 0 | 0 | unchanged |
| long_context_constraint_retention | candidate_long_context_fixture_guarded | context.compaction_trigger_count | 0 | 0 | 0 | unchanged |
| long_context_constraint_retention | candidate_long_context_fixture_guarded | context.constraint_retention_rate | 0.666667 | 1 | 0.333333 | improved |
| long_context_constraint_retention | candidate_long_context_fixture_guarded | context.distractor_confusion_count | 0 | 0 | 0 | unchanged |
| long_context_constraint_retention | candidate_long_context_fixture_guarded | context.lost_constraint_count | 1 | 0 | -1 | improved |
| long_context_constraint_retention | candidate_long_context_fixture_guarded | context.manual_review_required | 1 | 1 | 0 | unchanged |
| long_context_constraint_retention | candidate_long_context_fixture_guarded | context.retained_constraint_count | 2 | 3 | 1 | improved |
| long_context_constraint_retention | candidate_long_context_fixture_guarded | context.retrieved_fact_hit_rate | 1 | 1 | 0 | unchanged |
| long_context_constraint_retention | candidate_long_context_fixture_guarded | context.success_under_context_pressure | 1 | 1 | 0 | unchanged |
| long_context_constraint_retention | candidate_long_context_fixture_guarded | context.total_prompt_input_tokens | 1270 | 1080 | -190 | improved |
| long_context_constraint_retention | candidate_long_context_fixture_guarded | controllability.turn_limit_basic | 1 | 1 | 0 | unchanged |
| long_context_constraint_retention | candidate_long_context_fixture_guarded | efficiency.total_billed_tokens | 1280 | 1090 | -190 | improved |
| long_context_constraint_retention | candidate_long_context_fixture_guarded | stability.recovery_absence | 1 | 1 | 0 | unchanged |
| long_context_constraint_retention | candidate_long_context_fixture_guarded | task_success.main_chain_observed | 1 | 1 | 0 | unchanged |
| long_context_fact_retrieval | candidate_long_context_fixture_guarded | context.compaction_saved_tokens | 0 | 0 | 0 | unchanged |
| long_context_fact_retrieval | candidate_long_context_fixture_guarded | context.compaction_trigger_count | 0 | 0 | 0 | unchanged |
| long_context_fact_retrieval | candidate_long_context_fixture_guarded | context.constraint_retention_rate | 1 | 1 | 0 | unchanged |
| long_context_fact_retrieval | candidate_long_context_fixture_guarded | context.distractor_confusion_count | 0 | 0 | 0 | unchanged |
| long_context_fact_retrieval | candidate_long_context_fixture_guarded | context.lost_constraint_count | 0 | 0 | 0 | unchanged |
| long_context_fact_retrieval | candidate_long_context_fixture_guarded | context.manual_review_required | 1 | 1 | 0 | unchanged |
| long_context_fact_retrieval | candidate_long_context_fixture_guarded | context.retained_constraint_count | 2 | 2 | 0 | unchanged |
| long_context_fact_retrieval | candidate_long_context_fixture_guarded | context.retrieved_fact_hit_rate | 0.666667 | 1 | 0.333333 | improved |
| long_context_fact_retrieval | candidate_long_context_fixture_guarded | context.success_under_context_pressure | 1 | 1 | 0 | unchanged |
| long_context_fact_retrieval | candidate_long_context_fixture_guarded | context.total_prompt_input_tokens | 1350 | 1130 | -220 | improved |
| long_context_fact_retrieval | candidate_long_context_fixture_guarded | controllability.turn_limit_basic | 1 | 1 | 0 | unchanged |
| long_context_fact_retrieval | candidate_long_context_fixture_guarded | efficiency.total_billed_tokens | 1360 | 1140 | -220 | improved |
| long_context_fact_retrieval | candidate_long_context_fixture_guarded | stability.recovery_absence | 1 | 1 | 0 | unchanged |
| long_context_fact_retrieval | candidate_long_context_fixture_guarded | task_success.main_chain_observed | 1 | 1 | 0 | unchanged |
| long_context_fact_retrieval | candidate_long_context_fixture_guarded | context.compaction_saved_tokens | 0 | 0 | 0 | unchanged |
| long_context_fact_retrieval | candidate_long_context_fixture_guarded | context.compaction_trigger_count | 0 | 0 | 0 | unchanged |
| long_context_fact_retrieval | candidate_long_context_fixture_guarded | context.constraint_retention_rate | 1 | 1 | 0 | unchanged |
| long_context_fact_retrieval | candidate_long_context_fixture_guarded | context.distractor_confusion_count | 0 | 0 | 0 | unchanged |
| long_context_fact_retrieval | candidate_long_context_fixture_guarded | context.lost_constraint_count | 0 | 0 | 0 | unchanged |
| long_context_fact_retrieval | candidate_long_context_fixture_guarded | context.manual_review_required | 1 | 1 | 0 | unchanged |
| long_context_fact_retrieval | candidate_long_context_fixture_guarded | context.retained_constraint_count | 2 | 2 | 0 | unchanged |
| long_context_fact_retrieval | candidate_long_context_fixture_guarded | context.retrieved_fact_hit_rate | 0.666667 | 1 | 0.333333 | improved |
| long_context_fact_retrieval | candidate_long_context_fixture_guarded | context.success_under_context_pressure | 1 | 1 | 0 | unchanged |
| long_context_fact_retrieval | candidate_long_context_fixture_guarded | context.total_prompt_input_tokens | 1350 | 1130 | -220 | improved |
| long_context_fact_retrieval | candidate_long_context_fixture_guarded | controllability.turn_limit_basic | 1 | 1 | 0 | unchanged |
| long_context_fact_retrieval | candidate_long_context_fixture_guarded | efficiency.total_billed_tokens | 1360 | 1140 | -220 | improved |
| long_context_fact_retrieval | candidate_long_context_fixture_guarded | stability.recovery_absence | 1 | 1 | 0 | unchanged |
| long_context_fact_retrieval | candidate_long_context_fixture_guarded | task_success.main_chain_observed | 1 | 1 | 0 | unchanged |
| long_context_distractor_resistance | candidate_long_context_fixture_guarded | context.compaction_saved_tokens | 0 | 0 | 0 | unchanged |
| long_context_distractor_resistance | candidate_long_context_fixture_guarded | context.compaction_trigger_count | 0 | 0 | 0 | unchanged |
| long_context_distractor_resistance | candidate_long_context_fixture_guarded | context.constraint_retention_rate | 1 | 1 | 0 | unchanged |
| long_context_distractor_resistance | candidate_long_context_fixture_guarded | context.distractor_confusion_count | 1 | 0 | -1 | improved |
| long_context_distractor_resistance | candidate_long_context_fixture_guarded | context.lost_constraint_count | 0 | 0 | 0 | unchanged |
| long_context_distractor_resistance | candidate_long_context_fixture_guarded | context.manual_review_required | 1 | 1 | 0 | unchanged |
| long_context_distractor_resistance | candidate_long_context_fixture_guarded | context.retained_constraint_count | 2 | 2 | 0 | unchanged |
| long_context_distractor_resistance | candidate_long_context_fixture_guarded | context.retrieved_fact_hit_rate | 1 | 1 | 0 | unchanged |
| long_context_distractor_resistance | candidate_long_context_fixture_guarded | context.success_under_context_pressure | 1 | 1 | 0 | unchanged |
| long_context_distractor_resistance | candidate_long_context_fixture_guarded | context.total_prompt_input_tokens | 1310 | 1110 | -200 | improved |
| long_context_distractor_resistance | candidate_long_context_fixture_guarded | controllability.turn_limit_basic | 1 | 1 | 0 | unchanged |
| long_context_distractor_resistance | candidate_long_context_fixture_guarded | efficiency.total_billed_tokens | 1320 | 1120 | -200 | improved |
| long_context_distractor_resistance | candidate_long_context_fixture_guarded | stability.recovery_absence | 1 | 1 | 0 | unchanged |
| long_context_distractor_resistance | candidate_long_context_fixture_guarded | task_success.main_chain_observed | 1 | 1 | 0 | unchanged |
| long_context_distractor_resistance | candidate_long_context_fixture_guarded | context.compaction_saved_tokens | 0 | 0 | 0 | unchanged |
| long_context_distractor_resistance | candidate_long_context_fixture_guarded | context.compaction_trigger_count | 0 | 0 | 0 | unchanged |
| long_context_distractor_resistance | candidate_long_context_fixture_guarded | context.constraint_retention_rate | 1 | 1 | 0 | unchanged |
| long_context_distractor_resistance | candidate_long_context_fixture_guarded | context.distractor_confusion_count | 1 | 0 | -1 | improved |
| long_context_distractor_resistance | candidate_long_context_fixture_guarded | context.lost_constraint_count | 0 | 0 | 0 | unchanged |
| long_context_distractor_resistance | candidate_long_context_fixture_guarded | context.manual_review_required | 1 | 1 | 0 | unchanged |
| long_context_distractor_resistance | candidate_long_context_fixture_guarded | context.retained_constraint_count | 2 | 2 | 0 | unchanged |
| long_context_distractor_resistance | candidate_long_context_fixture_guarded | context.retrieved_fact_hit_rate | 1 | 1 | 0 | unchanged |
| long_context_distractor_resistance | candidate_long_context_fixture_guarded | context.success_under_context_pressure | 1 | 1 | 0 | unchanged |
| long_context_distractor_resistance | candidate_long_context_fixture_guarded | context.total_prompt_input_tokens | 1310 | 1110 | -200 | improved |
| long_context_distractor_resistance | candidate_long_context_fixture_guarded | controllability.turn_limit_basic | 1 | 1 | 0 | unchanged |
| long_context_distractor_resistance | candidate_long_context_fixture_guarded | efficiency.total_billed_tokens | 1320 | 1120 | -200 | improved |
| long_context_distractor_resistance | candidate_long_context_fixture_guarded | stability.recovery_absence | 1 | 1 | 0 | unchanged |
| long_context_distractor_resistance | candidate_long_context_fixture_guarded | task_success.main_chain_observed | 1 | 1 | 0 | unchanged |
| long_context_compaction_pressure | candidate_long_context_fixture_guarded | context.compaction_saved_tokens | 42 | 188 | 146 | observed |
| long_context_compaction_pressure | candidate_long_context_fixture_guarded | context.compaction_trigger_count | 2 | 2 | 0 | unchanged |
| long_context_compaction_pressure | candidate_long_context_fixture_guarded | context.constraint_retention_rate | 0.666667 | 1 | 0.333333 | improved |
| long_context_compaction_pressure | candidate_long_context_fixture_guarded | context.distractor_confusion_count | 0 | 0 | 0 | unchanged |
| long_context_compaction_pressure | candidate_long_context_fixture_guarded | context.lost_constraint_count | 1 | 0 | -1 | improved |
| long_context_compaction_pressure | candidate_long_context_fixture_guarded | context.manual_review_required | 1 | 1 | 0 | unchanged |
| long_context_compaction_pressure | candidate_long_context_fixture_guarded | context.retained_constraint_count | 2 | 3 | 1 | improved |
| long_context_compaction_pressure | candidate_long_context_fixture_guarded | context.retrieved_fact_hit_rate | 0.666667 | 1 | 0.333333 | improved |
| long_context_compaction_pressure | candidate_long_context_fixture_guarded | context.success_under_context_pressure | 0 | 1 | 1 | improved |
| long_context_compaction_pressure | candidate_long_context_fixture_guarded | context.total_prompt_input_tokens | 1630 | 1230 | -400 | improved |
| long_context_compaction_pressure | candidate_long_context_fixture_guarded | controllability.turn_limit_basic | 1 | 1 | 0 | unchanged |
| long_context_compaction_pressure | candidate_long_context_fixture_guarded | efficiency.total_billed_tokens | 1640 | 1240 | -400 | improved |
| long_context_compaction_pressure | candidate_long_context_fixture_guarded | stability.recovery_absence | 1 | 1 | 0 | unchanged |
| long_context_compaction_pressure | candidate_long_context_fixture_guarded | task_success.main_chain_observed | 1 | 1 | 0 | unchanged |
| long_context_compaction_pressure | candidate_long_context_fixture_guarded | context.compaction_saved_tokens | 42 | 188 | 146 | observed |
| long_context_compaction_pressure | candidate_long_context_fixture_guarded | context.compaction_trigger_count | 2 | 2 | 0 | unchanged |
| long_context_compaction_pressure | candidate_long_context_fixture_guarded | context.constraint_retention_rate | 0.666667 | 1 | 0.333333 | improved |
| long_context_compaction_pressure | candidate_long_context_fixture_guarded | context.distractor_confusion_count | 0 | 0 | 0 | unchanged |
| long_context_compaction_pressure | candidate_long_context_fixture_guarded | context.lost_constraint_count | 1 | 0 | -1 | improved |
| long_context_compaction_pressure | candidate_long_context_fixture_guarded | context.manual_review_required | 1 | 1 | 0 | unchanged |
| long_context_compaction_pressure | candidate_long_context_fixture_guarded | context.retained_constraint_count | 2 | 3 | 1 | improved |
| long_context_compaction_pressure | candidate_long_context_fixture_guarded | context.retrieved_fact_hit_rate | 0.666667 | 1 | 0.333333 | improved |
| long_context_compaction_pressure | candidate_long_context_fixture_guarded | context.success_under_context_pressure | 0 | 1 | 1 | improved |
| long_context_compaction_pressure | candidate_long_context_fixture_guarded | context.total_prompt_input_tokens | 1630 | 1230 | -400 | improved |
| long_context_compaction_pressure | candidate_long_context_fixture_guarded | controllability.turn_limit_basic | 1 | 1 | 0 | unchanged |
| long_context_compaction_pressure | candidate_long_context_fixture_guarded | efficiency.total_billed_tokens | 1640 | 1240 | -400 | improved |
| long_context_compaction_pressure | candidate_long_context_fixture_guarded | stability.recovery_absence | 1 | 1 | 0 | unchanged |
| long_context_compaction_pressure | candidate_long_context_fixture_guarded | task_success.main_chain_observed | 1 | 1 | 0 | unchanged |

## Exploration Signals

- 5 score dimension(s) changed; inspect the scorecard before treating the risk verdict as the final answer.
- 3 score dimension(s) changed; inspect the scorecard before treating the risk verdict as the final answer.
- 8 score dimension(s) changed; inspect the scorecard before treating the risk verdict as the final answer.

## Runs

| scenario | repeat | baseline_run | candidate_variant | candidate_run | experiment_validity | risk_gate | compare_report |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| long_context_constraint_retention | 1 | run_2026-05-03T070957132Z_long_context_constraint_retention_baseline_default_a928b6b2 | candidate_long_context_fixture_guarded | run_2026-05-03T070957141Z_long_context_constraint_retention_candidate_long_context_fixture_guarded_4be1715e | valid | 1/4 not passed | ObservrityTask\10-系统版本\v2\06-运行报告\compare_run_2026-05-03T070957132Z_long_context_constraint_retention_baseline_default_a928b6b2_vs_run_2026-05-03T070957141Z_long_context_constraint_retention_candidate_long_context_fixture_guarded_4be1715e.md |
| long_context_constraint_retention | 2 | run_2026-05-03T070957154Z_long_context_constraint_retention_baseline_default_fa3b48d1 | candidate_long_context_fixture_guarded | run_2026-05-03T070957158Z_long_context_constraint_retention_candidate_long_context_fixture_guarded_6124af22 | valid | 1/4 not passed | ObservrityTask\10-系统版本\v2\06-运行报告\compare_run_2026-05-03T070957154Z_long_context_constraint_retention_baseline_default_fa3b48d1_vs_run_2026-05-03T070957158Z_long_context_constraint_retention_candidate_long_context_fixture_guarded_6124af22.md |
| long_context_fact_retrieval | 1 | run_2026-05-03T070957165Z_long_context_fact_retrieval_baseline_default_fdcab6c9 | candidate_long_context_fixture_guarded | run_2026-05-03T070957170Z_long_context_fact_retrieval_candidate_long_context_fixture_guarded_1abcd4c9 | valid | 1/4 not passed | ObservrityTask\10-系统版本\v2\06-运行报告\compare_run_2026-05-03T070957165Z_long_context_fact_retrieval_baseline_default_fdcab6c9_vs_run_2026-05-03T070957170Z_long_context_fact_retrieval_candidate_long_context_fixture_guarded_1abcd4c9.md |
| long_context_fact_retrieval | 2 | run_2026-05-03T070957176Z_long_context_fact_retrieval_baseline_default_70401d6d | candidate_long_context_fixture_guarded | run_2026-05-03T070957183Z_long_context_fact_retrieval_candidate_long_context_fixture_guarded_6d06184d | valid | 1/4 not passed | ObservrityTask\10-系统版本\v2\06-运行报告\compare_run_2026-05-03T070957176Z_long_context_fact_retrieval_baseline_default_70401d6d_vs_run_2026-05-03T070957183Z_long_context_fact_retrieval_candidate_long_context_fixture_guarded_6d06184d.md |
| long_context_distractor_resistance | 1 | run_2026-05-03T070957189Z_long_context_distractor_resistance_baseline_default_4d94c847 | candidate_long_context_fixture_guarded | run_2026-05-03T070957194Z_long_context_distractor_resistance_candidate_long_context_fixture_guarded_23354a67 | valid | 1/4 not passed | ObservrityTask\10-系统版本\v2\06-运行报告\compare_run_2026-05-03T070957189Z_long_context_distractor_resistance_baseline_default_4d94c847_vs_run_2026-05-03T070957194Z_long_context_distractor_resistance_candidate_long_context_fixture_guarded_23354a67.md |
| long_context_distractor_resistance | 2 | run_2026-05-03T070957200Z_long_context_distractor_resistance_baseline_default_0f2affa1 | candidate_long_context_fixture_guarded | run_2026-05-03T070957205Z_long_context_distractor_resistance_candidate_long_context_fixture_guarded_a3fd72c9 | valid | 1/4 not passed | ObservrityTask\10-系统版本\v2\06-运行报告\compare_run_2026-05-03T070957200Z_long_context_distractor_resistance_baseline_default_0f2affa1_vs_run_2026-05-03T070957205Z_long_context_distractor_resistance_candidate_long_context_fixture_guarded_a3fd72c9.md |
| long_context_compaction_pressure | 1 | run_2026-05-03T070957212Z_long_context_compaction_pressure_baseline_default_c9cab754 | candidate_long_context_fixture_guarded | run_2026-05-03T070957216Z_long_context_compaction_pressure_candidate_long_context_fixture_guarded_6488e757 | valid | 1/4 not passed | ObservrityTask\10-系统版本\v2\06-运行报告\compare_run_2026-05-03T070957212Z_long_context_compaction_pressure_baseline_default_c9cab754_vs_run_2026-05-03T070957216Z_long_context_compaction_pressure_candidate_long_context_fixture_guarded_6488e757.md |
| long_context_compaction_pressure | 2 | run_2026-05-03T070957222Z_long_context_compaction_pressure_baseline_default_31b412ce | candidate_long_context_fixture_guarded | run_2026-05-03T070957227Z_long_context_compaction_pressure_candidate_long_context_fixture_guarded_8c630899 | valid | 1/4 not passed | ObservrityTask\10-系统版本\v2\06-运行报告\compare_run_2026-05-03T070957222Z_long_context_compaction_pressure_baseline_default_31b412ce_vs_run_2026-05-03T070957227Z_long_context_compaction_pressure_candidate_long_context_fixture_guarded_8c630899.md |

## Risk Gate Details

| scenario | candidate_variant | rule_type | score_spec | verdict | regression_pct |
| --- | --- | --- | --- | --- | ---: |
| long_context_constraint_retention | candidate_long_context_fixture_guarded | hard_fail | task_success.main_chain_observed | pass | 0 |
| long_context_constraint_retention | candidate_long_context_fixture_guarded | hard_fail | efficiency.total_billed_tokens | pass | 0 |
| long_context_constraint_retention | candidate_long_context_fixture_guarded | soft_warning | efficiency.total_billed_tokens | pass | 0 |
| long_context_constraint_retention | candidate_long_context_fixture_guarded | soft_warning | decision_quality.subagent_count_observed | missing | n/a |
| long_context_constraint_retention | candidate_long_context_fixture_guarded | hard_fail | task_success.main_chain_observed | pass | 0 |
| long_context_constraint_retention | candidate_long_context_fixture_guarded | hard_fail | efficiency.total_billed_tokens | pass | 0 |
| long_context_constraint_retention | candidate_long_context_fixture_guarded | soft_warning | efficiency.total_billed_tokens | pass | 0 |
| long_context_constraint_retention | candidate_long_context_fixture_guarded | soft_warning | decision_quality.subagent_count_observed | missing | n/a |
| long_context_fact_retrieval | candidate_long_context_fixture_guarded | hard_fail | task_success.main_chain_observed | pass | 0 |
| long_context_fact_retrieval | candidate_long_context_fixture_guarded | hard_fail | efficiency.total_billed_tokens | pass | 0 |
| long_context_fact_retrieval | candidate_long_context_fixture_guarded | soft_warning | efficiency.total_billed_tokens | pass | 0 |
| long_context_fact_retrieval | candidate_long_context_fixture_guarded | soft_warning | decision_quality.subagent_count_observed | missing | n/a |
| long_context_fact_retrieval | candidate_long_context_fixture_guarded | hard_fail | task_success.main_chain_observed | pass | 0 |
| long_context_fact_retrieval | candidate_long_context_fixture_guarded | hard_fail | efficiency.total_billed_tokens | pass | 0 |
| long_context_fact_retrieval | candidate_long_context_fixture_guarded | soft_warning | efficiency.total_billed_tokens | pass | 0 |
| long_context_fact_retrieval | candidate_long_context_fixture_guarded | soft_warning | decision_quality.subagent_count_observed | missing | n/a |
| long_context_distractor_resistance | candidate_long_context_fixture_guarded | hard_fail | task_success.main_chain_observed | pass | 0 |
| long_context_distractor_resistance | candidate_long_context_fixture_guarded | hard_fail | efficiency.total_billed_tokens | pass | 0 |
| long_context_distractor_resistance | candidate_long_context_fixture_guarded | soft_warning | efficiency.total_billed_tokens | pass | 0 |
| long_context_distractor_resistance | candidate_long_context_fixture_guarded | soft_warning | decision_quality.subagent_count_observed | missing | n/a |
| long_context_distractor_resistance | candidate_long_context_fixture_guarded | hard_fail | task_success.main_chain_observed | pass | 0 |
| long_context_distractor_resistance | candidate_long_context_fixture_guarded | hard_fail | efficiency.total_billed_tokens | pass | 0 |
| long_context_distractor_resistance | candidate_long_context_fixture_guarded | soft_warning | efficiency.total_billed_tokens | pass | 0 |
| long_context_distractor_resistance | candidate_long_context_fixture_guarded | soft_warning | decision_quality.subagent_count_observed | missing | n/a |
| long_context_compaction_pressure | candidate_long_context_fixture_guarded | hard_fail | task_success.main_chain_observed | pass | 0 |
| long_context_compaction_pressure | candidate_long_context_fixture_guarded | hard_fail | efficiency.total_billed_tokens | pass | 0 |
| long_context_compaction_pressure | candidate_long_context_fixture_guarded | soft_warning | efficiency.total_billed_tokens | pass | 0 |
| long_context_compaction_pressure | candidate_long_context_fixture_guarded | soft_warning | decision_quality.subagent_count_observed | missing | n/a |
| long_context_compaction_pressure | candidate_long_context_fixture_guarded | hard_fail | task_success.main_chain_observed | pass | 0 |
| long_context_compaction_pressure | candidate_long_context_fixture_guarded | hard_fail | efficiency.total_billed_tokens | pass | 0 |
| long_context_compaction_pressure | candidate_long_context_fixture_guarded | soft_warning | efficiency.total_billed_tokens | pass | 0 |
| long_context_compaction_pressure | candidate_long_context_fixture_guarded | soft_warning | decision_quality.subagent_count_observed | missing | n/a |

## Interpretation Limits

- Long-context automatic scoring is strongest in fixture_trace mode; real smoke still preserves a manual-review lane.
- Cost and compaction evidence alone do not prove that the final answer remained semantically correct.
