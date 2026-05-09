# V2 Run Report: run_2026-05-03T052010168Z_execute_harness_smoke_minimal_baseline_default_cb8962ff

## 理解清单

- scenario: execute_harness_smoke_minimal (Execute Harness Smoke Minimal)
- variant: baseline_default (Baseline Default)
- run_group_id: group_v2_3_robustness_smoke_execute_harness_smoke_minimal_baseline_default_2026-05-03T052003966Z
- repeat_index: 2
- user_action_id: cb8962ff-28a7-4925-b136-be419d6758d6
- root_query_id: 9368d468-2c79-4ff3-a59d-2723431e911d
- observability_db_ref: .observability\v2-robustness-smoke.duckdb

## 预期效果

This report binds one V2 run back to V1 evidence, then emits phase-one rule and structure scores.

## 设计思路

The report does not judge final answer quality by itself. It records trace-backed facts that can support baseline vs candidate comparison.

## V1 Evidence

- binding_mode: fact_only
- bind_passed: true
- binding_failure_reason: n/a
- started_at: 2026-05-03T05:20:08.754Z
- duration_ms: 10
- query_count: 1
- subagent_count: 0
- tool_call_count: 0
- total_prompt_input_tokens: 100
- total_billed_tokens: 110
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

## Long Context Evidence

- No long-context evidence attached to this run.

## Scores

- task_success.main_chain_observed: pass (1)
- efficiency.total_billed_tokens: observed (110)
- decision_quality.subagent_count_observed: observed (0)
- stability.recovery_absence: pass (1)
- controllability.turn_limit_basic: pass (1)
