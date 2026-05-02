# V2 Experiment Artifact Schema

## 理解清单

- This directory stores experiment-level JSON summaries.
- V2.1 summaries are usually produced by `bind_existing`.
- V2.2 summaries may be produced by `execute_harness`, or by `execute_harness` disabled and falling back to `bind_existing`.
- The top-level schema is stable enough for regression checks and documentation.

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
| `final_decision` | null or object | Human final decision; runner keeps it `null`. |
| `errors` | string[] | Hard failures or blocking runner errors. |
| `warnings` | string[] | Soft warnings, missing scores, or inconclusive signals. |

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

For actual V2.2 automatic runs, `results[*].baseline_execution` and `results[*].candidates[*].candidate_execution` contain the adapter result, capture result, `benchmark_run_id`, and `eval_run_id`.

Newer beta artifacts also include `results[*].candidates[*].experiment_validity` and `results[*].candidates[*].variant_effect_summary` so smoke and real experiments are not interpreted the same way.

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
