# V2 Run Report: run_2026-05-02T051002218Z_execute_harness_smoke_minimal_candidate_session_memory_sparse_e55a0f28

## 理解清单

- scenario: execute_harness_smoke_minimal (Execute Harness Smoke Minimal)
- variant: candidate_session_memory_sparse (Candidate Session Memory Sparse)
- user_action_id: e55a0f28-057b-4007-a02e-cc33f5dbe118
- root_query_id: f921ca77-ab6b-4b0f-9822-6bc84591be15
- observability_db_ref: .observability\observability_v1.duckdb

## 预期效果

This report binds one V2 run back to V1 evidence, then emits phase-one rule and structure scores.

## 设计思路

The report does not judge final answer quality by itself. It records trace-backed facts that can support baseline vs candidate comparison.

## V1 Evidence

- binding_mode: fact_only
- bind_passed: true
- binding_failure_reason: n/a
- started_at: 2026-05-02T05:09:55.531Z
- duration_ms: 3239
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
