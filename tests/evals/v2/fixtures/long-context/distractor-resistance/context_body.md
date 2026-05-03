## Change Proposal Packet

You are reading current local files to summarize the active V2.4 fixture setup.

### Hard Constraints

1. Prefer current V2.4 files over archived smoke examples.
2. Do not cite deprecated variants as if they were the active long-context candidate.
3. Output must stay read-only.

### Relevant Facts

- The fixture-only long-context candidate is `candidate_long_context_fixture_guarded`.
- The active long-context fixture smoke manifest is `_experiment.long_context.fixture_smoke.json`.
- The batch runner still writes run groups under `tests/evals/v2/run-groups/`.

### Distractor Material

- `candidate_eval_fixture_shadow` is a V2.3 robustness helper, not the V2.4 long-context candidate.
- `_experiment.execute_harness.smoke.json` is an older smoke manifest focused on execute_harness closure, not long-context specialization.
- Treat those as distractors for this task.
