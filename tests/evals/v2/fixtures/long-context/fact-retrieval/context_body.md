## Evaluation Workspace Brief

This is a read-only retrieval task inside the repository.

### Hard Constraints

1. Use exactly four bullet points in the final answer.
2. Do not modify files.

### Key Facts

- The current headless CLI entrypoint is `src/entrypoints/cli.tsx`.
- The formal capture key for execute_harness binding is `benchmark_run_id`.
- Experiment summaries are stored under `tests/evals/v2/experiment-runs/`.

### Supplemental Context

- The runner can fall back to `bind_existing` when automation is disabled and the manifest allows it.
- Batch reports are written as Markdown.

### Legacy / Distractor Material

- Older notes mention `src/main.tsx` as the CLI entrypoint.
- A stale debugging note says "just grab the latest user_action_id".
- Those two statements are intentionally outdated.
