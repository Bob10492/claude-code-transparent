# V2 Run Report: run_2026-05-03T060616987Z_long_context_fact_retrieval_real_smoke_candidate_session_memory_sparse_96004ff8

## 理解清单

- scenario: long_context_fact_retrieval_real_smoke (Long Context Fact Retrieval Real Smoke)
- variant: candidate_session_memory_sparse (Candidate Session Memory Sparse)
- run_group_id: group_v2_4_long_context_real_smoke_long_context_fact_retrieval_real_smoke_candidate_session_memory_sparse_2026-05-03T060545110Z
- repeat_index: 1
- user_action_id: 96004ff8-6b91-4663-a8a6-6576f9817519
- root_query_id: 8c4aba3b-52a5-40d6-86a5-df1a94ce1b7c
- observability_db_ref: .observability\v2-long-context-real-smoke.duckdb

## 预期效果

This report binds one V2 run back to V1 evidence, then emits phase-one rule and structure scores.

## 设计思路

The report does not judge final answer quality by itself. It records trace-backed facts that can support baseline vs candidate comparison.

## V1 Evidence

- binding_mode: fact_only
- bind_passed: true
- binding_failure_reason: n/a
- started_at: 2026-05-03T06:06:05.082Z
- duration_ms: 7506
- query_count: 3
- subagent_count: 1
- tool_call_count: 0
- total_prompt_input_tokens: 26887
- total_billed_tokens: 27189
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

## Long Context Evidence

- context_family: retrieval
- context_size_class: medium
- fixture_ref: tests/evals/v2/fixtures/long-context/fact-retrieval
- retained_constraints: none
- lost_constraints: none
- retrieved_facts: none
- missed_facts: none
- distractor_confusions: none
- compaction_trigger_count: 4
- compaction_saved_tokens: 0
- tool_result_budget_trigger_count: 2
- memory_or_subagent_count: 1
- success_under_context_pressure: n/a
- manual_review_questions: Did the answer really name src/entrypoints/cli.tsx rather than an archived entrypoint? | Did the answer preserve the four-bullet constraint without extra prose?

## Scores

- task_success.main_chain_observed: pass (1)
- efficiency.total_billed_tokens: observed (27189)
- decision_quality.session_memory_policy_observed: observed (1)
- stability.recovery_absence: pass (1)
- controllability.turn_limit_basic: pass (1)
- context.retained_constraint_count: observed (0)
- context.lost_constraint_count: observed (0)
- context.constraint_retention_rate: inconclusive (n/a)
- context.retrieved_fact_hit_rate: inconclusive (n/a)
- context.distractor_confusion_count: observed (0)
- context.total_prompt_input_tokens: observed (26887)
- context.compaction_trigger_count: observed (4)
- context.compaction_saved_tokens: observed (0)
- context.success_under_context_pressure: pass (1)
- context.manual_review_required: manual_review_required (1)
