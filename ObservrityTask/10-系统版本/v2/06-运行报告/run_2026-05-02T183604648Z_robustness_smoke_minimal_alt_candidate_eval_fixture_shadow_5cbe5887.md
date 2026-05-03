# V2 Run Report: run_2026-05-02T183604648Z_robustness_smoke_minimal_alt_candidate_eval_fixture_shadow_5cbe5887

## 理解清单

- scenario: robustness_smoke_minimal_alt (Robustness Smoke Minimal Alt)
- variant: candidate_eval_fixture_shadow (Candidate Eval Fixture Shadow)
- run_group_id: group_v2_3_robustness_smoke_robustness_smoke_minimal_alt_candidate_eval_fixture_shadow_2026-05-02T183554916Z
- repeat_index: 1
- user_action_id: 5cbe5887-4214-4541-acf8-6333218aed6d
- root_query_id: 8987783a-22a5-4b21-8e59-2f87b4de19af
- observability_db_ref: .observability\v2-robustness-smoke.duckdb

## 预期效果

This report binds one V2 run back to V1 evidence, then emits phase-one rule and structure scores.

## 设计思路

The report does not judge final answer quality by itself. It records trace-backed facts that can support baseline vs candidate comparison.

## V1 Evidence

- binding_mode: fact_only
- bind_passed: true
- binding_failure_reason: n/a
- started_at: 2026-05-02T18:36:03.663Z
- duration_ms: 10
- query_count: 1
- subagent_count: 0
- tool_call_count: 0
- total_prompt_input_tokens: 95
- total_billed_tokens: 105
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

## Scores

- task_success.main_chain_observed: pass (1)
- efficiency.total_billed_tokens: observed (105)
- decision_quality.subagent_count_observed: observed (0)
- stability.recovery_absence: pass (1)
- controllability.turn_limit_basic: pass (1)
