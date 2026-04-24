# V2 Eval Workspace

This directory holds the local-first working skeleton for observability V2.

Structure:

- `scenarios/`
  - machine-readable scenario manifests
- `variants/`
  - variant manifests
- `experiments/`
  - experiment manifests
- `scores/`
  - optional manual review or exported score artifacts
- `runs/`
  - generated run records that bind V2 evaluation to V1 evidence

Recommended usage order:

1. Start from `scenarios/_scenario.template.json`
2. Define `variants/_variant.template.json`
3. Compose an experiment from `experiments/_experiment.template.json`
4. Bind every future run back to V1 evidence using:
   - `entry_user_action_id`
   - `root_query_id`
   - `observability_db_ref`

Phase-one run recording:

```powershell
bun run scripts/evals/v2_record_run.ts --scenario tool_choice_sensitive --variant baseline_default --latest --snapshot-db
```

Phase-one run comparison:

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

Validate manifests:

```powershell
bun run scripts/evals/v2_validate_manifests.ts
```
