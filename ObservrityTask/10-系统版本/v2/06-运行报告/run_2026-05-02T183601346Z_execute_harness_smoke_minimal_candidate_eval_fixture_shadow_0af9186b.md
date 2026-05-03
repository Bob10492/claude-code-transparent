# V2 Run Report: run_2026-05-02T183601346Z_execute_harness_smoke_minimal_candidate_eval_fixture_shadow_0af9186b

## 理解清单

- scenario: execute_harness_smoke_minimal (Execute Harness Smoke Minimal)
- variant: candidate_eval_fixture_shadow (Candidate Eval Fixture Shadow)
- run_group_id: group_v2_3_robustness_smoke_execute_harness_smoke_minimal_candidate_eval_fixture_shadow_2026-05-02T183554916Z
- repeat_index: 2
- user_action_id: 0af9186b-081f-43a8-be0f-7f4f67c17416
- root_query_id: a59382a2-80e4-4593-80f2-e416634ff888
- observability_db_ref: .observability\v2-robustness-smoke.duckdb

## 预期效果

This report binds one V2 run back to V1 evidence, then emits phase-one rule and structure scores.

## 设计思路

The report does not judge final answer quality by itself. It records trace-backed facts that can support baseline vs candidate comparison.

## V1 Evidence

- binding_mode: fact_only
- bind_passed: true
- binding_failure_reason: n/a
- started_at: 2026-05-02T18:36:00.396Z
- duration_ms: 10
- query_count: 1
- subagent_count: 0
- tool_call_count: 0
- total_prompt_input_tokens: 95
- total_billed_tokens: 105
- root_turn_count: 1
- root_terminal_reason: fixture_completed
- recovery_count: 0

## Tools

- No tools observed

## Subagents

- No subagents observed

## Variant Effect Evidence

- effect_type: session_memory_policy
- policy_event_observed: false
- variant_effect_observed: false
- session_memory_subagent_count: 0
- session_memory_trigger_details: none
- reason: No session-memory policy observation event was found for this run.

### Observed Policy

```json
null
```

## Scores

- task_success.main_chain_observed: pass (1)
- efficiency.total_billed_tokens: observed (105)
- decision_quality.subagent_count_observed: observed (0)
- stability.recovery_absence: pass (1)
- controllability.turn_limit_basic: pass (1)
