# V2 Run Report: run_2026-04-30T021205319Z_cost_sensitive_task_baseline_default_1d5eb5e1

## 理解清单

- scenario: cost_sensitive_task (Cost Sensitive Task)
- variant: baseline_default (Baseline Default)
- user_action_id: 1d5eb5e1-2fe0-42fa-9450-7b05d6367976
- root_query_id: 15ecf197-b1c6-47e2-8d94-df1f88f0d822
- observability_db_ref: .observability\observability_v1.duckdb

## 预期效果

This report binds one V2 run back to V1 evidence, then emits phase-one rule and structure scores.

## 设计思路

The report does not judge final answer quality by itself. It records trace-backed facts that can support baseline vs candidate comparison.

## V1 Evidence

- binding_mode: fact_only
- bind_passed: true
- binding_failure_reason: n/a
- started_at: 2026-04-24T04:48:30.824Z
- duration_ms: 88207
- query_count: 5
- subagent_count: 4
- tool_call_count: 22
- total_prompt_input_tokens: 397412
- total_billed_tokens: 400399
- root_turn_count: 4
- root_terminal_reason: completed
- recovery_count: 0

## Tools

- Edit: count=11, closed=11, failed=0
- Read: count=5, closed=5, failed=0
- Write: count=3, closed=3, failed=0
- Glob: count=3, closed=3, failed=0

## Subagents

- prompt_suggestion: count=1, trigger=suggestion_generation_allowed
- extract_memories: count=1, trigger=post_turn_background_extraction
- session_memory: count=1, trigger=token_threshold_and_natural_break
- session_memory: count=1, trigger=token_threshold_and_tool_threshold

## Scores

- task_success.main_chain_observed: pass (1)
- efficiency.total_billed_tokens: observed (400399)
- decision_quality.subagent_count_observed: observed (4)
- stability.recovery_absence: pass (1)
- controllability.turn_limit_basic: pass (1)
