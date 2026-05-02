# V2 Run Report: run_2026-05-02T170310924Z_session_memory_trigger_sensitive_candidate_session_memory_sparse_b118c7c4

## 理解清单

- scenario: session_memory_trigger_sensitive (Session Memory Trigger Sensitive)
- variant: candidate_session_memory_sparse (Candidate Session Memory Sparse)
- user_action_id: b118c7c4-18df-4ff0-b506-5b5454418b48
- root_query_id: e5deb781-955f-4cbd-8194-62d79cd14bc7
- observability_db_ref: .observability\observability_v1.duckdb

## 预期效果

This report binds one V2 run back to V1 evidence, then emits phase-one rule and structure scores.

## 设计思路

The report does not judge final answer quality by itself. It records trace-backed facts that can support baseline vs candidate comparison.

## V1 Evidence

- binding_mode: fact_only
- bind_passed: true
- binding_failure_reason: n/a
- started_at: 2026-05-02T16:59:20.101Z
- duration_ms: 83227
- query_count: 2
- subagent_count: 1
- tool_call_count: 12
- total_prompt_input_tokens: 300391
- total_billed_tokens: 303392
- root_turn_count: 5
- root_terminal_reason: completed
- recovery_count: 0

## Tools

- Read: count=12, closed=12, failed=0

## Subagents

- session_memory: count=1, trigger=token_threshold_and_tool_threshold

## Variant Effect Evidence

- effect_type: session_memory_policy
- policy_event_observed: true
- variant_effect_observed: true
- session_memory_subagent_count: 1
- session_memory_trigger_details: token_threshold_and_tool_threshold
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
- decision_quality.session_memory_policy_observed: observed (1)
- efficiency.total_billed_tokens: observed (303392)
- decision_quality.subagent_count_observed: observed (1)
- stability.recovery_absence: pass (1)
- controllability.turn_limit_basic: pass (1)
