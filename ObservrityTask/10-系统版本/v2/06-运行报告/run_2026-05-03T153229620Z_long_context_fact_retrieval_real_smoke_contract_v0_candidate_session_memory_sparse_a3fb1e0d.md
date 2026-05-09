# V2 Run Report: run_2026-05-03T153229620Z_long_context_fact_retrieval_real_smoke_contract_v0_candidate_session_memory_sparse_a3fb1e0d

## 理解清单

- scenario: long_context_fact_retrieval_real_smoke_contract_v0 (Long Context Fact Retrieval Real Smoke Contract v0)
- variant: candidate_session_memory_sparse (Candidate Session Memory Sparse)
- run_group_id: group_v2_5_long_context_real_smoke_expectation_contract_v0_long_context_fact_retrieval_real_smoke_contract_v0_candidate_session_memory_sparse_2026-05-03T1531436
- repeat_index: 1
- user_action_id: a3fb1e0d-6260-4f43-a830-70b723a236ae
- root_query_id: 679f208c-b47b-4fce-a8de-8888ad163c39
- observability_db_ref: .observability\v2-long-context-real-smoke.duckdb

## 预期效果

This report binds one V2 run back to V1 evidence, then emits phase-one rule and structure scores.

## 设计思路

The report does not judge final answer quality by itself. It records trace-backed facts that can support baseline vs candidate comparison.

## V1 Evidence

- binding_mode: fact_only
- bind_passed: true
- binding_failure_reason: n/a
- started_at: 2026-05-03T15:32:12.356Z
- duration_ms: 12781
- query_count: 3
- subagent_count: 1
- tool_call_count: 0
- total_prompt_input_tokens: 27007
- total_billed_tokens: 27372
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
- retained_constraints: four_bullets_only, read_only_task
- lost_constraints: none
- retrieved_facts: cli_entrypoint_cli_tsx, capture_key_benchmark_run_id, experiment_summary_dir
- missed_facts: none
- distractor_confusions: none
- compaction_trigger_count: 4
- compaction_saved_tokens: 0
- tool_result_budget_trigger_count: 2
- memory_or_subagent_count: 1
- success_under_context_pressure: n/a
- manual_review_questions: Did bullet 1 include the exact literal `src/entrypoints/cli.tsx` and avoid any archived or paraphrased entrypoint? | Did bullet 4 explicitly include the sentence `Do not modify files.` with no extra prose before the first bullet or after the fourth bullet?

## Scores

- task_success.main_chain_observed: pass (1)
- efficiency.total_billed_tokens: observed (27372)
- decision_quality.session_memory_policy_observed: observed (1)
- stability.recovery_absence: pass (1)
- controllability.turn_limit_basic: pass (1)
- context.retained_constraint_count: observed (2)
- context.lost_constraint_count: observed (0)
- context.constraint_retention_rate: pass (1)
- context.retrieved_fact_hit_rate: pass (1)
- context.distractor_confusion_count: observed (0)
- context.total_prompt_input_tokens: observed (27007)
- context.compaction_trigger_count: observed (4)
- context.compaction_saved_tokens: observed (0)
- context.success_under_context_pressure: pass (1)
- context.manual_review_required: manual_review_required (1)
