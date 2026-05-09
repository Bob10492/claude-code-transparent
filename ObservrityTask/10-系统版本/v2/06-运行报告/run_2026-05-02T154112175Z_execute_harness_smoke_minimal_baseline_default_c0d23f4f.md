# V2 Run Report: run_2026-05-02T154112175Z_execute_harness_smoke_minimal_baseline_default_c0d23f4f

## 理解清单

- scenario: execute_harness_smoke_minimal (Execute Harness Smoke Minimal)
- variant: baseline_default (Baseline Default)
- user_action_id: c0d23f4f-866f-4b5f-8c58-8f08a2fb5d1f
- root_query_id: e1d80afe-d6e8-4cd0-b4ad-0f78c9adfea7
- observability_db_ref: .observability\observability_v1.duckdb

## 预期效果

This report binds one V2 run back to V1 evidence, then emits phase-one rule and structure scores.

## 设计思路

The report does not judge final answer quality by itself. It records trace-backed facts that can support baseline vs candidate comparison.

## V1 Evidence

- binding_mode: fact_only
- bind_passed: true
- binding_failure_reason: n/a
- started_at: 2026-05-02T15:40:56.804Z
- duration_ms: 11022
- query_count: 3
- subagent_count: 1
- tool_call_count: 0
- total_prompt_input_tokens: 26617
- total_billed_tokens: 26976
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
- efficiency.total_billed_tokens: observed (26976)
- decision_quality.subagent_count_observed: observed (1)
- stability.recovery_absence: pass (1)
- controllability.turn_limit_basic: pass (1)
