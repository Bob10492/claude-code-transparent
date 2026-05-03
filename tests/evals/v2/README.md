# V2 Eval Workspace

This directory stores the local-first V2 evaluation system.

## Recommended Overview

If you want the project-level explanation first, start here:

```text
ObservrityTask/10-系统版本/v2/01-总览/V2.5版本项目介绍与阅读指南.md
```

## Current Web Sync Note

If you need the latest handoff note for the web GPT workflow, use:

```text
ObservrityTask/10-系统版本/v2/01-总览/V2.3-V2.5当前状态同步稿（网页端）.md
```

Use this README after that when you want the concrete execution entrypoints and folder-level technical view.

## Structure

- `scenarios/`: scenario manifests.
- `fixtures/`: reusable evaluation context packets and expected data.
- `variants/`: baseline and candidate variant manifests.
- `experiments/`: experiment manifests.
- `score-specs/`: score definitions and evidence requirements.
- `feedback/`: generated feedback-loop artifacts such as findings, hypotheses, proposals, and next experiment plans.
- `gates/`: regression-risk gate policies.
- `runs/`: generated run records bound to V1 evidence.
- `scores/`: generated score artifacts.
- `run-groups/`: repeat aggregation artifacts.
- `experiment-runs/`: experiment-level JSON summaries.
- `verification-reports/`: runner verification reports.

## Modes

- `bind_existing`: V2.1 stable mode. You provide existing V1 `user_action_id` values through `action_bindings`.
- `execute_harness`: V2.2+ mode. The runner executes scenarios through the headless harness, injects eval context into V1 events, captures generated `user_action_id` values by `benchmark_run_id`, then reuses the same score/report/risk-verdict pipeline.

Version layering:

- `V2.2.5`: real-experiment closure
- `V2.3`: batch / repeat / run_group / stability summary / flaky status
- `V2.4`: long-context scenario families, `context.*` score-specs, `long_context` run evidence, and `long_context_summary`
- `V2.5`: feedback loop beta, turning experiment reports into structured findings, hypotheses, proposals, proposal queues, and approval-ready next-step plans

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

Run the V2.4 long-context verifier:

```powershell
bun run scripts/evals/v2_verify_long_context.ts
```

Run the V2.5 feedback loop beta on an experiment-run summary:

```powershell
bun run scripts/evals/v2_run_feedback.ts --experiment-run tests/evals/v2/experiment-runs/v2_4_long_context_real_smoke_2026-05-03T060617173Z.json
```

Validate generated V2.5 feedback artifact schema:

```powershell
bun run scripts/evals/v2_validate_feedback_artifacts.ts
```

## Main Experiment Entry Points

Run the V2.2 execute_harness smoke:

```powershell
bun run scripts/evals/v2_run_experiment.ts --experiment tests/evals/v2/experiments/_experiment.execute_harness.smoke.json
```

Run the V2.2-beta real runtime-difference experiment:

```powershell
bun run scripts/evals/v2_run_experiment.ts --experiment tests/evals/v2/experiments/session_memory_runtime_sparse_vs_default.json
```

Run the V2.2.5 manual `bind_existing` fallback experiment:

```powershell
bun run scripts/evals/v2_run_experiment.ts --experiment tests/evals/v2/experiments/session_memory_runtime_sparse_vs_default_manual.bind_existing.json
```

Run the V2.3 no-cost robustness smoke:

```powershell
bun run scripts/evals/v2_run_experiment.ts --experiment tests/evals/v2/experiments/_experiment.robustness.smoke.json
```

Run the V2.4 no-cost long-context fixture smoke:

```powershell
bun run scripts/evals/v2_run_experiment.ts --experiment tests/evals/v2/experiments/_experiment.long_context.fixture_smoke.json
```

Run the V2.4 small real-model long-context smoke:

```powershell
bun run scripts/evals/v2_run_experiment.ts --experiment tests/evals/v2/experiments/_experiment.long_context.real_smoke.json
```

Run the V2.5 tightened real-smoke expectation-contract follow-up:

```powershell
bun run scripts/evals/v2_run_experiment.ts --experiment tests/evals/v2/experiments/_experiment.long_context.real_smoke.expectation_contract_v0.json
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

## Interpretation

- `smoke`: validates execution, capture, and artifact generation health.
- `real_experiment`: asks whether a candidate produced an interpretable runtime difference in a real path.
- `run_group`: groups repeats for one `scenario_id + variant_id` and reports success rate, token/duration variance, recovery rate, and flaky status.
- `long_context_summary`: aggregates long-context retention, retrieval, distractor resistance, compaction evidence, and manual-review hints by `scenario + candidate`.
- `feedback run`: converts a completed experiment summary into `findings -> hypotheses -> proposals -> proposal queue -> candidate draft -> next experiment plan`, while keeping human approval as a hard gate.

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

The formal binding key is `benchmark_run_id`, not "latest user_action_id".

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
tests/evals/v2/V2.2.5-real-experiment-closure.md
tests/evals/v2/V2.3-batch-robustness-usage.md
tests/evals/v2/V2.4-long-context-usage.md
tests/evals/v2/V2.5-feedback-loop-usage.md
tests/evals/v2/experiment-runs/README.md
ObservrityTask/10-系统版本/v2/01-总览/V2.4版本项目介绍与阅读指南.md
ObservrityTask/10-系统版本/v2/01-总览/V2.5版本项目介绍与阅读指南.md
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

## Project Overviews

```text
ObservrityTask/10-系统版本/v2/01-总览/V2.2.5版本项目介绍与阅读指南.md
ObservrityTask/10-系统版本/v2/01-总览/V2.3版本项目介绍与阅读指南.md
ObservrityTask/10-系统版本/v2/01-总览/V2.4版本项目介绍与阅读指南.md
ObservrityTask/10-系统版本/v2/01-总览/V2.5版本项目介绍与阅读指南.md
```
