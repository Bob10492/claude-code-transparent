# V2 Run Report: run_2026-05-02T132328037Z_execute_harness_smoke_minimal_candidate_session_memory_sparse_0acb35d4

## 理解清单

- scenario: execute_harness_smoke_minimal (Execute Harness Smoke Minimal)
- variant: candidate_session_memory_sparse (Candidate Session Memory Sparse)
- user_action_id: 0acb35d4-75b8-4219-86fc-ad5f291bc9ff
- root_query_id: a3751c61-21ef-410c-a46f-bc117accc262
- observability_db_ref: .observability\observability_v1.duckdb

## 预期效果

This report binds one V2 run back to V1 evidence, then emits phase-one rule and structure scores.

## 设计思路

The report does not judge final answer quality by itself. It records trace-backed facts that can support baseline vs candidate comparison.

## V1 Evidence

- binding_mode: fact_only
- bind_passed: true
- binding_failure_reason: n/a
- started_at: 2026-05-02T13:23:20.784Z
- duration_ms: 3599
- query_count: 2
- subagent_count: 0
- tool_call_count: 0
- total_prompt_input_tokens: 26626
- total_billed_tokens: 26628
- root_turn_count: 1
- root_terminal_reason: completed
- recovery_count: 0

## Tools

- No tools observed

## Subagents

- No subagents observed

## Scores

- task_success.main_chain_observed: pass (1)
- efficiency.total_billed_tokens: observed (26628)
- decision_quality.subagent_count_observed: observed (0)
- stability.recovery_absence: pass (1)
- controllability.turn_limit_basic: pass (1)
