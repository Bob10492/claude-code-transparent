# V2 Run Report: run_2026-05-02T165041469Z_session_memory_trigger_sensitive_baseline_default_f9b83353

## 理解清单

- scenario: session_memory_trigger_sensitive (Session Memory Trigger Sensitive)
- variant: baseline_default (Baseline Default)
- user_action_id: f9b83353-0650-4868-af08-c0ff7048f7b1
- root_query_id: 5477a647-edbf-46d0-9dd5-906ffd1aa288
- observability_db_ref: .observability\observability_v1.duckdb

## 预期效果

This report binds one V2 run back to V1 evidence, then emits phase-one rule and structure scores.

## 设计思路

The report does not judge final answer quality by itself. It records trace-backed facts that can support baseline vs candidate comparison.

## V1 Evidence

- binding_mode: fact_only
- bind_passed: true
- binding_failure_reason: n/a
- started_at: 2026-05-02T16:49:13.981Z
- duration_ms: 81846
- query_count: 3
- subagent_count: 2
- tool_call_count: 21
- total_prompt_input_tokens: 431495
- total_billed_tokens: 440499
- root_turn_count: 5
- root_terminal_reason: completed
- recovery_count: 0

## Tools

- Read: count=13, closed=13, failed=0
- Edit: count=8, closed=8, failed=0

## Subagents

- session_memory: count=2, trigger=token_threshold_and_tool_threshold

## Variant Effect Evidence

- effect_type: session_memory_policy
- policy_event_observed: true
- variant_effect_observed: true
- session_memory_subagent_count: 2
- session_memory_trigger_details: token_threshold_and_tool_threshold
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
- decision_quality.session_memory_policy_observed: observed (1)
- efficiency.total_billed_tokens: observed (440499)
- decision_quality.subagent_count_observed: observed (2)
- stability.recovery_absence: pass (1)
- controllability.turn_limit_basic: pass (1)
