# V2.4 Long-Context Experiment Summary: v2_4_long_context_fixture_smoke

## Understanding

- experiment: v2_4_long_context_fixture_smoke
- mode: execute_harness
- scenario_count: 4
- candidate_count: 1
- repeat_count: 2
- output_json: tests\evals\v2\experiment-runs\v2_4_long_context_fixture_smoke_2026-05-03T070957231Z.json

## Batch Stability Table

| scenario | variant | repeats | success_rate | token_mean | token_stddev | duration_mean_ms | duration_stddev_ms | tool_variance | subagent_variance | turn_variance | recovery_rate | flaky_status |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| long_context_compaction_pressure | baseline_default | 2 | 1 | 1640 | 0 | 10 | 0 | 0 | 0 | 0 | 0 | stable |
| long_context_compaction_pressure | candidate_long_context_fixture_guarded | 2 | 1 | 1240 | 0 | 10 | 0 | 0 | 0 | 0 | 0 | stable |
| long_context_constraint_retention | baseline_default | 2 | 1 | 1280 | 0 | 10 | 0 | 0 | 0 | 0 | 0 | stable |
| long_context_constraint_retention | candidate_long_context_fixture_guarded | 2 | 1 | 1090 | 0 | 10 | 0 | 0 | 0 | 0 | 0 | stable |
| long_context_distractor_resistance | baseline_default | 2 | 1 | 1320 | 0 | 10 | 0 | 0 | 0 | 0 | 0 | stable |
| long_context_distractor_resistance | candidate_long_context_fixture_guarded | 2 | 1 | 1120 | 0 | 10 | 0 | 0 | 0 | 0 | 0 | stable |
| long_context_fact_retrieval | baseline_default | 2 | 1 | 1360 | 0 | 10 | 0 | 0 | 0 | 0 | 0 | stable |
| long_context_fact_retrieval | candidate_long_context_fixture_guarded | 2 | 1 | 1140 | 0 | 10 | 0 | 0 | 0 | 0 | 0 | stable |

## Candidate Ranking

| rank | candidate_variant | scenario | success_rate | token_mean | flaky_status |
| ---: | --- | --- | ---: | ---: | --- |
| 1 | candidate_long_context_fixture_guarded | long_context_constraint_retention | 1 | 1090 | stable |
| 2 | candidate_long_context_fixture_guarded | long_context_distractor_resistance | 1 | 1120 | stable |
| 3 | candidate_long_context_fixture_guarded | long_context_fact_retrieval | 1 | 1140 | stable |
| 4 | candidate_long_context_fixture_guarded | long_context_compaction_pressure | 1 | 1240 | stable |

## Flaky Scenario Notes

- No flaky run group detected by the current V2.3 heuristic.

## Run Failures

- No run failures recorded.

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


## Interpretation Limits

- V2.3 stability is based on repeat groups and trace-backed metrics; it is not a model-quality judge.
- Flaky status is a first-pass engineering signal based on failures and coarse variance, not a statistical proof.
