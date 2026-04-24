# V2 Run Report: run_2026-04-24T050007063Z_cost_sensitive_task_candidate_session_memory_sparse_dbf9fae1

## 理解清单

- scenario: cost_sensitive_task (Cost Sensitive Task)
- variant: candidate_session_memory_sparse (Candidate Session Memory Sparse)
- user_action_id: dbf9fae1-0a5a-4f50-aba7-02047ced9390
- root_query_id: f15ca52c-e702-448a-9cd8-8d5c942ff4e2
- observability_db_ref: .observability\observability_v1.duckdb

## 预期效果

This report binds one V2 run back to V1 evidence, then emits phase-one rule and structure scores.

## 设计思路

The report does not judge final answer quality by itself. It records trace-backed facts that can support baseline vs candidate comparison.

## V1 Evidence

- started_at: 2026-04-24T04:55:36.952Z
- duration_ms: 46081
- query_count: 3
- subagent_count: 2
- tool_call_count: 15
- total_prompt_input_tokens: 348534
- total_billed_tokens: 352691
- root_turn_count: 4
- root_terminal_reason: completed
- recovery_count: 0

## Tools

- Read: count=8, closed=8, failed=0
- Edit: count=5, closed=5, failed=0
- Glob: count=2, closed=2, failed=0

## Subagents

- extract_memories: count=1, trigger=post_turn_background_extraction
- session_memory: count=1, trigger=token_threshold_and_tool_threshold

## Scores

- task_success.main_chain_observed: pass (1)
- decision_quality.expected_tool_hit_rate: not_applicable (n/a)
- efficiency.total_billed_tokens: observed (352691)
- stability.v1_closure_health: pass (1)
- stability.recovery_absence: pass (1)
- controllability.turn_limit_basic: pass (1)
- decision_quality.subagent_count_observed: observed (2)
