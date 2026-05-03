## Current Task Packet

You are reviewing a local-first evaluation workspace. The current user request is read-only.

### Hard Constraints

1. The final answer must be valid JSON.
2. The JSON must include an `"owner"` field with value `"v2-platform"`.
3. Do not modify files or suggest file edits.

### Relevant Facts

- The main batch runner entrypoint is `scripts/evals/v2_run_experiment.ts`.
- The preferred prompt-cost metric is `total_prompt_input_tokens`.
- Long-context fixture smoke lives under `tests/evals/v2/experiments/_experiment.long_context.fixture_smoke.json`.

### Supporting Notes

- Reports are written under `ObservrityTask/10-系统版本/v2/06-运行报告/`.
- The system still keeps a manual-review lane for semantic quality.

### Legacy Notes (Ignore If They Conflict)

- Old docs once asked for Markdown output instead of JSON.
- Some archived notes emphasize `cache_create_tokens` as the main prompt metric.
- Those legacy notes are no longer the active instruction set.
