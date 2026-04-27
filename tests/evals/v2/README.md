# V2 Eval Workspace

This directory holds the local-first working skeleton for observability V2.

Structure:

- `scenarios/`
  - machine-readable scenario manifests
- `variants/`
  - variant manifests
- `experiments/`
  - experiment manifests
- `score-specs/`
  - score definitions: dimension, formula, direction, evidence requirements
- `gates/`
  - regression gate policies
- `experiment-runs/`
  - generated experiment-level summaries
- `scores/`
  - optional manual review or exported score artifacts
- `runs/`
  - generated run records that bind V2 evaluation to V1 evidence

Recommended V2.1 usage order:

1. Pick or create a `scenario` under `scenarios/`.
2. Define the baseline and candidate `variant` manifests under `variants/`.
3. Produce real V1 traces first. Current V2.1 is `bind_existing`, so you must already have one baseline `user_action_id` and one candidate `user_action_id`.
4. Create or edit an experiment manifest under `experiments/`, including:
   - `scenario_ids`
   - `baseline_variant_id`
   - `candidate_variant_ids`
   - `mode: "bind_existing"`
   - `action_bindings`
5. Validate all manifests.
6. Run the experiment runner.
7. Read the generated run, score, comparison, gate, and experiment summary artifacts.

Validate manifests:

```powershell
bun run scripts/evals/v2_validate_manifests.ts
```

Run the current sample V2.1 experiment:

```powershell
bun run scripts/evals/v2_run_experiment.ts --experiment session_memory_sparse_vs_default
```

Current V2.1 mode is `bind_existing`. It does not execute the harness by itself yet. Instead, it binds existing V1 `user_action_id` traces into V2 runs, records scores, compares baseline vs candidate, applies the configured gate policy, and writes an experiment summary under `experiment-runs/` plus a Markdown report under `ObservrityTask/10-系统版本/v2/06-运行报告/`.

Lower-level commands are still available when you want to debug one step at a time.

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

Compare the latest baseline/candidate runs for one scenario:

```powershell
bun run scripts/evals/v2_compare_scenario.ts --scenario tool_choice_sensitive --candidate candidate_tool_router_v2
```
