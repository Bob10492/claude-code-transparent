# V2 Experiment Artifact Schema

## 理解清单

- This directory stores experiment-level JSON summaries.
- V2.1 summaries are usually produced by `bind_existing`.
- V2.2 summaries may be produced by `execute_harness`, or by `execute_harness` disabled and falling back to `bind_existing`.
- V2.3 adds batch-oriented fields such as `run_group_refs`, `stability_summary`, and `flaky_scenarios`.
- V2.4 may additionally include `long_context_review_verdict` and `long_context_summary`.

## Required Top-Level Fields

| field | type | meaning |
| --- | --- | --- |
| `experiment_id` | string | Experiment id from the manifest. |
| `manifest_ref` | string | Manifest path used by the runner. |
| `generated_at` | string | ISO timestamp. |
| `mode` | string | Effective mode: `bind_existing` or `execute_harness`. |
| `report_profile` | string | `smoke` or `real_experiment`. |
| `evaluation_intent` | string or null | Usually `exploration` or `regression`. |
| `requested_mode` | string | Manifest-requested mode, when present in newer artifacts. |
| `automation_disabled` | boolean | Whether `execute_harness` was disabled and fallback was used. |
| `run_refs` | string[] | Generated V2 run JSON refs. |
| `score_refs` | string[] | Generated score JSON refs. |
| `report_refs` | string[] | Generated report refs. |
| `risk_verdict` | object | Regression-risk verdict. Not final experiment judgment. |
| `gate_verdict` | object | Compatibility alias for older readers. |
| `experiment_validity` | object | Whether the experiment is interpretable as a smoke check or real runtime-difference check. |
| `variant_effect_summary` | array | Candidate runtime-effect evidence summary. |
| `runtime_difference_summary` | string[] | Flattened human-readable difference signals. |
| `verdict_boundary` | string | Explicit boundary of verdict semantics. |
| `scorecard_summary` | array | Baseline vs candidate score changes. |
| `exploration_signals` | string[] | Automatic review hints. |
| `recommended_review_mode` | string | Suggested review mode. |
| `errors` | string[] | Hard failures or blocking runner errors. |
| `warnings` | string[] | Soft warnings, missing scores, or inconclusive signals. |

## V2.3 Batch Fields

Batch-oriented artifacts may include:

- `run_group_refs`
- `stability_summary`
- `flaky_scenarios`
- `run_failures`

These fields describe repeat aggregation and robustness status.

## V2.4 Long-Context Fields

Long-context artifacts may include:

- `long_context_review_verdict`
- `long_context_summary`

Meaning:

- `long_context_review_verdict`: overall review posture for the long-context experiment, such as `needs_manual_review`
- `long_context_summary`: aggregated retention, retrieval, distractor, compaction, and prompt-cost evidence by `scenario + candidate`

## Risk Verdict Shape

```json
{
  "status": "pass",
  "scope": "regression_risk_only",
  "is_final_experiment_judgment": false,
  "hard_fail_count": 0,
  "soft_warning_count": 0,
  "missing_score_count": 0,
  "inconclusive_count": 0,
  "candidate_count": 1,
  "notes": "This verdict is only a regression-risk gate result..."
}
```

Priority:

1. any hard fail -> `fail`
2. any missing score or inconclusive -> `inconclusive`
3. any soft warning -> `warning`
4. otherwise -> `pass`

## Runner Metadata

Newer artifacts include:

```json
{
  "runner": {
    "requested_mode": "execute_harness",
    "mode": "bind_existing",
    "automation_disabled": true,
    "fallback_reason": "execute_harness disabled by flag or environment; bind_existing fallback used"
  }
}
```

For actual V2.2+ automatic runs, `results[*].baseline_execution` and `results[*].candidates[*].candidate_execution` contain adapter result, capture result, `benchmark_run_id`, and `eval_run_id`.

Newer beta and later artifacts may also include:

- `results[*].candidates[*].experiment_validity`
- `results[*].candidates[*].variant_effect_summary`

so smoke and real experiments are not interpreted the same way.

## Boundary

`risk_verdict` answers only:

```text
Did this candidate trigger the current regression-risk gate policy?
```

It does not answer:

```text
Is this harness smarter?
Is this candidate worth exploring?
Should this change be kept long-term?
```
