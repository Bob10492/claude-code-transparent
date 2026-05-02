# V2 Eval Workspace

This directory stores the local-first V2 evaluation system.

## Structure

- `scenarios/`: scenario manifests.
- `variants/`: baseline and candidate variant manifests.
- `experiments/`: experiment manifests.
- `score-specs/`: score definitions and evidence requirements.
- `gates/`: regression-risk gate policies.
- `runs/`: generated run records bound to V1 evidence.
- `scores/`: generated score artifacts.
- `experiment-runs/`: experiment-level JSON summaries.
- `verification-reports/`: runner verification reports.

## Modes

- `bind_existing`: V2.1 stable mode. You provide existing V1 `user_action_id` values through `action_bindings`.
- `execute_harness`: V2.2-alpha mode. The runner executes one scenario through the headless harness, injects eval context into V1 events, captures the generated `user_action_id` by `benchmark_run_id`, then reuses the same score/report/risk-verdict pipeline.

V2.2-alpha deliberately supports only 1 scenario, 1 baseline, 1 candidate, and `repeat_count=1`.

## Basic Commands

Validate manifests:

```powershell
bun run scripts/evals/v2_validate_manifests.ts
```

Validate generated experiment artifact schema:

```powershell
bun run scripts/evals/v2_validate_experiment_artifacts.ts
```

Run the V2.1 bind runner verification suite:

```powershell
bun run scripts/evals/v2_verify_bind_runner.ts
```

Run the V2.2-alpha execute_harness verification suite:

```powershell
bun run scripts/evals/v2_verify_execute_harness_alpha.ts
```

Run the current V2.1 sample:

```powershell
bun run scripts/evals/v2_run_experiment.ts --experiment session_memory_sparse_vs_default
```

Run the V2.2-alpha smoke manifest with automatic execution enabled:

```powershell
bun run scripts/evals/v2_run_experiment.ts --experiment tests/evals/v2/experiments/_experiment.execute_harness.smoke.json
```

Disable automatic execution and fall back to `bind_existing`:

```powershell
bun run scripts/evals/v2_run_experiment.ts --experiment tests/evals/v2/experiments/_experiment.execute_harness.smoke.json --disable-execute-harness
```

Equivalent environment switch:

```powershell
$env:V2_2_EXECUTE_HARNESS='0'
bun run scripts/evals/v2_run_experiment.ts --experiment tests/evals/v2/experiments/_experiment.execute_harness.smoke.json
```

## bind_existing Binding Shape

```json
[
  {
    "scenario_id": "cost_sensitive_task",
    "variant_id": "baseline_default",
    "entry_user_action_id": "<baseline_user_action_id>"
  },
  {
    "scenario_id": "cost_sensitive_task",
    "variant_id": "candidate_session_memory_sparse",
    "entry_user_action_id": "<candidate_user_action_id>"
  }
]
```

The runner still accepts the older nested binding shape for compatibility. New manifests should use the flat shape.

## execute_harness Binding Mechanism

The formal binding key is `benchmark_run_id`, not “latest user_action_id”.

Flow:

```text
experiment manifest
-> scenario prompt
-> variant apply v0
-> headless --print adapter
-> V1 events with eval context
-> DuckDB rebuild
-> benchmark_run_id -> unique user_action_id
-> V2 record/score/compare/risk_verdict/report
```

If capture returns zero matches, the run fails as `capture_failed`. If it returns multiple actions, the run fails as `ambiguous_capture`.

## Detailed Docs

```text
tests/evals/v2/V2.1-bind_existing-usage.md
tests/evals/v2/V2.2-execute_harness-alpha-usage.md
tests/evals/v2/experiment-runs/README.md
```

## Low-Level Debug Commands

Record one run manually:

```powershell
bun run scripts/evals/v2_record_run.ts --scenario tool_choice_sensitive --variant baseline_default --user-action-id <user_action_id> --snapshot-db
```

Compare two recorded runs manually:

```powershell
bun run scripts/evals/v2_compare_runs.ts --baseline-run <baseline_run_id> --candidate-run <candidate_run_id>
```

List recorded runs:

```powershell
bun run scripts/evals/v2_list_runs.ts --scenario tool_choice_sensitive
```
