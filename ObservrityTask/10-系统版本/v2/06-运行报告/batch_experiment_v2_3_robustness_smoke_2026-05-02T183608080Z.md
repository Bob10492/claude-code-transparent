# V2.3 Batch Experiment Summary: v2_3_robustness_smoke

## Understanding

- experiment: v2_3_robustness_smoke
- mode: execute_harness
- scenario_count: 2
- candidate_count: 2
- repeat_count: 2
- output_json: tests\evals\v2\experiment-runs\v2_3_robustness_smoke_2026-05-02T183608080Z.json

## Batch Stability Table

| scenario | variant | repeats | success_rate | token_mean | token_stddev | duration_mean_ms | duration_stddev_ms | tool_variance | subagent_variance | turn_variance | recovery_rate | flaky_status |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| execute_harness_smoke_minimal | baseline_default | 2 | 1 | 110 | 0 | 10 | 0 | 0 | 0 | 0 | 0 | stable |
| execute_harness_smoke_minimal | candidate_eval_fixture_shadow | 2 | 1 | 105 | 0 | 10 | 0 | 0 | 0 | 0 | 0 | stable |
| execute_harness_smoke_minimal | candidate_session_memory_sparse | 2 | 1 | 100 | 0 | 10 | 0 | 0 | 0 | 0 | 0 | stable |
| robustness_smoke_minimal_alt | baseline_default | 2 | 1 | 110 | 0 | 10 | 0 | 0 | 0 | 0 | 0 | stable |
| robustness_smoke_minimal_alt | candidate_eval_fixture_shadow | 2 | 1 | 105 | 0 | 10 | 0 | 0 | 0 | 0 | 0 | stable |
| robustness_smoke_minimal_alt | candidate_session_memory_sparse | 2 | 1 | 100 | 0 | 10 | 0 | 0 | 0 | 0 | 0 | stable |

## Candidate Ranking

| rank | candidate_variant | scenario | success_rate | token_mean | flaky_status |
| ---: | --- | --- | ---: | ---: | --- |
| 1 | candidate_session_memory_sparse | execute_harness_smoke_minimal | 1 | 100 | stable |
| 2 | candidate_session_memory_sparse | robustness_smoke_minimal_alt | 1 | 100 | stable |
| 3 | candidate_eval_fixture_shadow | execute_harness_smoke_minimal | 1 | 105 | stable |
| 4 | candidate_eval_fixture_shadow | robustness_smoke_minimal_alt | 1 | 105 | stable |

## Flaky Scenario Notes

- No flaky run group detected by the current V2.3 heuristic.

## Run Failures

- No run failures recorded.

## Interpretation Limits

- V2.3 stability is based on repeat groups and trace-backed metrics; it is not a model-quality judge.
- Flaky status is a first-pass engineering signal based on failures and coarse variance, not a statistical proof.
