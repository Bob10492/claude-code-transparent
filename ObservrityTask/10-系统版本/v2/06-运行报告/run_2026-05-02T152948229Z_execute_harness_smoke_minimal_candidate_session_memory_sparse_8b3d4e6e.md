# V2 Run Report: run_2026-05-02T152948229Z_execute_harness_smoke_minimal_candidate_session_memory_sparse_8b3d4e6e

## 理解清单

- scenario: execute_harness_smoke_minimal (Execute Harness Smoke Minimal)
- variant: candidate_session_memory_sparse (Candidate Session Memory Sparse)
- user_action_id: 8b3d4e6e-da29-4310-b5c3-ea43af1008e7
- root_query_id: f45606a1-8e56-472c-a415-294fd7d73193
- observability_db_ref: .observability\observability_v1.duckdb

## 预期效果

This report binds one V2 run back to V1 evidence, then emits phase-one rule and structure scores.

## 设计思路

The report does not judge final answer quality by itself. It records trace-backed facts that can support baseline vs candidate comparison.

## V1 Evidence

- binding_mode: fact_only
- bind_passed: true
- binding_failure_reason: n/a
- started_at: 2026-05-02T15:29:36.203Z
- duration_ms: 7764
- query_count: 3
- subagent_count: 1
- tool_call_count: 0
- total_prompt_input_tokens: 26617
- total_billed_tokens: 26788
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
  "mode": "sparse",
  "source": "config_snapshot_session_memory_policy",
  "gate_enabled": true,
  "force_enabled": true,
  "query_source_supported": true,
  "natural_break_only": true,
  "token_threshold_multiplier": 2,
  "tool_threshold_multiplier": 2,
  "minimum_message_tokens_to_init": 20000,
  "minimum_tokens_between_update": 10000,
  "tool_calls_between_updates": 12
}
```

## Scores

- task_success.main_chain_observed: pass (1)
- efficiency.total_billed_tokens: observed (26788)
- decision_quality.subagent_count_observed: observed (1)
- stability.recovery_absence: pass (1)
- controllability.turn_limit_basic: pass (1)
