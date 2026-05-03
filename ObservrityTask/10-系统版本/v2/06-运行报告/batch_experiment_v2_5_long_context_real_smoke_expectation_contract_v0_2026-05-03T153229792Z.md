# V2.4 Long-Context Experiment Summary: v2_5_long_context_real_smoke_expectation_contract_v0

## Understanding

- experiment: v2_5_long_context_real_smoke_expectation_contract_v0
- mode: execute_harness
- scenario_count: 1
- candidate_count: 1
- repeat_count: 1
- output_json: tests\evals\v2\experiment-runs\v2_5_long_context_real_smoke_expectation_contract_v0_2026-05-03T153229792Z.json

## Batch Stability Table

| scenario | variant | repeats | success_rate | token_mean | token_stddev | duration_mean_ms | duration_stddev_ms | tool_variance | subagent_variance | turn_variance | recovery_rate | flaky_status |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| long_context_fact_retrieval_real_smoke_contract_v0 | baseline_default | 1 | 1 | 27436 | 0 | 15546 | 0 | 0 | 0 | 0 | 0 | inconclusive |
| long_context_fact_retrieval_real_smoke_contract_v0 | candidate_session_memory_sparse | 1 | 1 | 27372 | 0 | 12781 | 0 | 0 | 0 | 0 | 0 | inconclusive |

## Candidate Ranking

| rank | candidate_variant | scenario | success_rate | token_mean | flaky_status |
| ---: | --- | --- | ---: | ---: | --- |
| 1 | candidate_session_memory_sparse | long_context_fact_retrieval_real_smoke_contract_v0 | 1 | 27372 | inconclusive |

## Flaky Scenario Notes

- long_context_fact_retrieval_real_smoke_contract_v0 / baseline_default: inconclusive
- long_context_fact_retrieval_real_smoke_contract_v0 / candidate_session_memory_sparse: inconclusive

## Run Failures

- No run failures recorded.

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


## Interpretation Limits

- V2.3 stability is based on repeat groups and trace-backed metrics; it is not a model-quality judge.
- Flaky status is a first-pass engineering signal based on failures and coarse variance, not a statistical proof.
