# V2 Run Report: run_2026-05-02T152932165Z_execute_harness_smoke_minimal_baseline_default_4c910090

## 理解清单

- scenario: execute_harness_smoke_minimal (Execute Harness Smoke Minimal)
- variant: baseline_default (Baseline Default)
- user_action_id: 4c910090-8e06-4eac-bb7b-a30dc032b8ba
- root_query_id: 0427a8ad-c9de-47de-9918-df9225fe2afb
- observability_db_ref: .observability\observability_v1.duckdb

## 预期效果

This report binds one V2 run back to V1 evidence, then emits phase-one rule and structure scores.

## 设计思路

The report does not judge final answer quality by itself. It records trace-backed facts that can support baseline vs candidate comparison.

## V1 Evidence

- binding_mode: fact_only
- bind_passed: true
- binding_failure_reason: n/a
- started_at: 2026-05-02T15:29:18.180Z
- duration_ms: 10039
- query_count: 3
- subagent_count: 1
- tool_call_count: 0
- total_prompt_input_tokens: 26617
- total_billed_tokens: 26909
- root_turn_count: 1
- root_terminal_reason: completed
- recovery_count: 0

## Tools

- No tools observed

## Subagents

- session_memory: count=1, trigger=token_threshold_and_natural_break

## Variant Effect Evidence

- effect_type: session_memory_policy
- policy_event_observed: true
- variant_effect_observed: true
- session_memory_subagent_count: 1
- session_memory_trigger_details: token_threshold_and_natural_break
- reason: Session-memory runtime policy was observed from V1 events.

### Observed Policy

```json
{
  "mode": "default",
  "source": "config_snapshot_session_memory_policy",
  "gate_enabled": true,
  "force_enabled": true,
  "query_source_supported": true,
  "natural_break_only": false,
  "token_threshold_multiplier": 1,
  "tool_threshold_multiplier": 1,
  "minimum_message_tokens_to_init": 10000,
  "minimum_tokens_between_update": 5000,
  "tool_calls_between_updates": 6
}
```

## Scores

- task_success.main_chain_observed: pass (1)
- efficiency.total_billed_tokens: observed (26909)
- decision_quality.subagent_count_observed: observed (1)
- stability.recovery_absence: pass (1)
- controllability.turn_limit_basic: pass (1)
