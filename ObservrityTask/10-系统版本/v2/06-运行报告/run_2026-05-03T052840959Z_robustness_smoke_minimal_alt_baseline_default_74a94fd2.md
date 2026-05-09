# V2 Run Report: run_2026-05-03T052840959Z_robustness_smoke_minimal_alt_baseline_default_74a94fd2

## 理解清单

- scenario: robustness_smoke_minimal_alt (Robustness Smoke Minimal Alt)
- variant: baseline_default (Baseline Default)
- run_group_id: group_v2_3_robustness_smoke_robustness_smoke_minimal_alt_baseline_default_2026-05-03T052829979Z
- repeat_index: 1
- user_action_id: 74a94fd2-d995-4f78-a5c2-48f1ac521f88
- root_query_id: b552f9a9-653e-49d2-82cb-2e51986816b7
- observability_db_ref: .observability\v2-robustness-smoke.duckdb

## 预期效果

This report binds one V2 run back to V1 evidence, then emits phase-one rule and structure scores.

## 设计思路

The report does not judge final answer quality by itself. It records trace-backed facts that can support baseline vs candidate comparison.

## V1 Evidence

- binding_mode: fact_only
- bind_passed: true
- binding_failure_reason: n/a
- started_at: 2026-05-03T05:28:39.486Z
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
