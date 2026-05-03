# V2.5 Feedback Report: feedback_run_v2_4_long_context_real_smoke_alpha_20260503T103210763Z_9b46cb66

## Understanding

- source_experiment_run: tests/evals/v2/experiment-runs/v2_4_long_context_real_smoke_2026-05-03T060617173Z.json
- source_reports:
  - ObservrityTask\10-系统版本\v2\06-运行报告\compare_run_2026-05-03T060601212Z_long_context_fact_retrieval_real_smoke_baseline_default_b963e6da_vs_run_2026-05-03T060616987Z_long_context_fact_retrieval_real_smoke_candidate_session_memory_sparse_96004ff8.md
  - ObservrityTask\10-系统版本\v2\06-运行报告\batch_experiment_v2_4_long_context_real_smoke_2026-05-03T060617173Z.md
  - ObservrityTask\10-系统版本\v2\06-运行报告\experiment_v2_4_long_context_real_smoke_2026-05-03T060617173Z.md
- generated_at: 2026-05-03T10:32:10.763Z
- this report is advisory only and does not apply code changes automatically

## Findings

- finding_v2_4_long_context_real_smoke_long_context_review_verdict_needs_manual_review_20260503T103210763Z_aaceea39
  - type: long_context_review_verdict_needs_manual_review
  - severity: medium
  - summary: The experiment-level long_context_review_verdict remains needs_manual_review.
  - evidence_ref: tests/evals/v2/experiment-runs/v2_4_long_context_real_smoke_2026-05-03T060617173Z.json#/long_context_review_verdict
  - fact_or_inference: fact
- finding_v2_4_long_context_real_smoke_risk_verdict_inconclusive_20260503T103210763Z_28ef91e4
  - type: risk_verdict_inconclusive
  - severity: medium
  - summary: The regression-risk verdict is inconclusive for this experiment.
  - evidence_ref: tests/evals/v2/experiment-runs/v2_4_long_context_real_smoke_2026-05-03T060617173Z.json#/risk_verdict/status
  - fact_or_inference: fact
- finding_v2_4_long_context_real_smoke_missing_score_count_positive_20260503T103210763Z_5d5767ae
  - type: missing_score_count_positive
  - severity: medium
  - summary: The experiment still has 1 missing score(s).
  - evidence_ref: tests/evals/v2/experiment-runs/v2_4_long_context_real_smoke_2026-05-03T060617173Z.json#/risk_verdict/missing_score_count
  - fact_or_inference: fact
- finding_v2_4_long_context_real_smoke_constraint_retention_rate_missing_long_context_f_20260503T103210763Z_bd4fc15b
  - type: constraint_retention_rate_missing_long_context_fact_retrieval_real_smoke
  - severity: medium
  - summary: constraint_retention_rate_mean is null for long_context_fact_retrieval_real_smoke.
  - evidence_ref: tests/evals/v2/experiment-runs/v2_4_long_context_real_smoke_2026-05-03T060617173Z.json#/long_context_summary/0/constraint_retention_rate_mean
  - fact_or_inference: fact
- finding_v2_4_long_context_real_smoke_retrieved_fact_hit_rate_missing_long_context_fac_20260503T103210763Z_e7b6a006
  - type: retrieved_fact_hit_rate_missing_long_context_fact_retrieval_real_smoke
  - severity: medium
  - summary: retrieved_fact_hit_rate_mean is null for long_context_fact_retrieval_real_smoke.
  - evidence_ref: tests/evals/v2/experiment-runs/v2_4_long_context_real_smoke_2026-05-03T060617173Z.json#/long_context_summary/0/retrieved_fact_hit_rate_mean
  - fact_or_inference: fact
- finding_v2_4_long_context_real_smoke_manual_review_required_long_context_fact_retriev_20260503T103210763Z_acb6cee2
  - type: manual_review_required_long_context_fact_retrieval_real_smoke
  - severity: medium
  - summary: manual_review_required is true for long_context_fact_retrieval_real_smoke.
  - evidence_ref: tests/evals/v2/experiment-runs/v2_4_long_context_real_smoke_2026-05-03T060617173Z.json#/long_context_summary/0/manual_review_required
  - fact_or_inference: fact
- finding_v2_4_long_context_real_smoke_flaky_status_long_context_fact_retrieval_real_sm_20260503T103210763Z_f63fd723
  - type: flaky_status_long_context_fact_retrieval_real_smoke_baseline_default
  - severity: high
  - summary: flaky_status is inconclusive for long_context_fact_retrieval_real_smoke / baseline_default.
  - evidence_ref: tests/evals/v2/experiment-runs/v2_4_long_context_real_smoke_2026-05-03T060617173Z.json#/stability_summary/0/flaky_status
  - fact_or_inference: fact
- finding_v2_4_long_context_real_smoke_flaky_status_long_context_fact_retrieval_real_sm_20260503T103210763Z_2086d4ae
  - type: flaky_status_long_context_fact_retrieval_real_smoke_candidate_session_memory_sparse
  - severity: high
  - summary: flaky_status is inconclusive for long_context_fact_retrieval_real_smoke / candidate_session_memory_sparse.
  - evidence_ref: tests/evals/v2/experiment-runs/v2_4_long_context_real_smoke_2026-05-03T060617173Z.json#/stability_summary/1/flaky_status
  - fact_or_inference: fact

## Hypotheses

- hypothesis_v2_4_long_context_real_smoke_real_output_semantic_parser_missing_20260503T103210763Z_e3ed5d57
  - confidence: medium
  - based_on: finding_v2_4_long_context_real_smoke_constraint_retention_rate_missing_long_context_f_20260503T103210763Z_bd4fc15b, finding_v2_4_long_context_real_smoke_retrieved_fact_hit_rate_missing_long_context_fac_20260503T103210763Z_e7b6a006
  - hypothesis: The current real-smoke scorer lacks a lightweight semantic output parser, so fact retrieval and constraint retention cannot yet be auto-judged from runtime outputs.
  - risks: A parser that is too narrow can miss valid answers. | A parser that is too loose can create false positives.
  - fact_or_inference: inference
- hypothesis_v2_4_long_context_real_smoke_manual_review_boundary_still_open_20260503T103210763Z_a207056a
  - confidence: high
  - based_on: finding_v2_4_long_context_real_smoke_long_context_review_verdict_needs_manual_review_20260503T103210763Z_aaceea39, finding_v2_4_long_context_real_smoke_manual_review_required_long_context_fact_retriev_20260503T103210763Z_acb6cee2
  - hypothesis: The current long-context evaluation boundary is still partially manual because the system can observe structure and governance, but not fully resolve final semantic correctness in real smoke.
  - risks: Treating manual review signals as auto-pass would overstate evaluator certainty.
  - fact_or_inference: inference
- hypothesis_v2_4_long_context_real_smoke_gate_inconclusive_due_to_missing_semantic_scores_20260503T103210763Z_ac3b840c
  - confidence: medium
  - based_on: finding_v2_4_long_context_real_smoke_risk_verdict_inconclusive_20260503T103210763Z_28ef91e4, finding_v2_4_long_context_real_smoke_missing_score_count_positive_20260503T103210763Z_5d5767ae
  - hypothesis: The regression-risk gate is inconclusive mainly because some semantic long-context scores are still missing, not because the runner failed to execute.
  - risks: If missing semantic scores are ignored, risk gating may appear healthier than the evidence supports.
  - fact_or_inference: inference
- hypothesis_v2_4_long_context_real_smoke_runner_or_scenario_instability_20260503T103210763Z_21239a93
  - confidence: medium
  - based_on: finding_v2_4_long_context_real_smoke_flaky_status_long_context_fact_retrieval_real_sm_20260503T103210763Z_f63fd723, finding_v2_4_long_context_real_smoke_flaky_status_long_context_fact_retrieval_real_sm_20260503T103210763Z_2086d4ae
  - hypothesis: Observed instability suggests that runner mechanics or scenario contracts still need tightening before higher-trust automated feedback can be used.
  - risks: Pursuing harness changes before stabilizing the evaluator could hide platform issues behind candidate noise.
  - fact_or_inference: inference

## Improvement Proposals

- proposal_v2_4_long_context_real_smoke_add_long_context_output_parser_v0_20260503T103210763Z_19602146
  - type: evaluator_improvement
  - target_layer: scorer
  - description: Add a lightweight output parser for long-context real smoke so expected facts and retained constraints can be mapped to explicit score evidence.
  - expected_effect: Convert currently-null long-context semantic scores into rule-backed observed values where the output format is narrow enough.
  - risks: A parser that is too narrow can miss valid answers. | A parser that is too loose can create false positives.
  - requires_human_approval: true
- proposal_v2_4_long_context_real_smoke_tighten_real_smoke_expectations_v0_20260503T103210763Z_d022ab84
  - type: scenario_improvement
  - target_layer: scenario
  - description: Tighten long-context real-smoke expected facts, constraints, and review questions so the evaluator has clearer semantic anchors without pretending to be fully automatic.
  - expected_effect: Reduce avoidable manual-review ambiguity while preserving an explicit human-review boundary for nuanced outputs.
  - risks: Treating manual review signals as auto-pass would overstate evaluator certainty.
  - requires_human_approval: true
- proposal_v2_4_long_context_real_smoke_map_parser_output_to_context_scores_v0_20260503T103210763Z_a7718488
  - type: evaluator_improvement
  - target_layer: scorer
  - description: Map parser output into context score-spec fields so long-context risk gating can distinguish missing semantics from genuine regression risk.
  - expected_effect: Reduce inconclusive gate results caused purely by absent semantic score evidence.
  - risks: If missing semantic scores are ignored, risk gating may appear healthier than the evidence supports.
  - requires_human_approval: true
- proposal_v2_4_long_context_real_smoke_stabilize_feedback_input_contract_v0_20260503T103210763Z_b0a56fb4
  - type: scenario_improvement
  - target_layer: scenario
  - description: Stabilize the upstream scenario or runner contract before trusting automated feedback suggestions for this branch of evaluation.
  - expected_effect: Reduce flaky or failed inputs before turning feedback artifacts into candidate work items.
  - risks: Pursuing harness changes before stabilizing the evaluator could hide platform issues behind candidate noise.
  - requires_human_approval: true

## Candidate Variant Proposals

- candidate_proposal_v2_4_long_context_real_smoke_candidate_long_context_output_parser_v0_20260503T103210763Z_c72924f7
  - variant_name: candidate_long_context_output_parser_v0
  - change_layer: scorer
  - implementation_scope: Only scorer/report/evaluator files may change. No runtime harness policy changes are allowed in this proposal.
  - do_not_touch: src/query.ts | src/services/SessionMemory/sessionMemory.ts | src/services/api/claude.ts
- candidate_proposal_v2_4_long_context_real_smoke_candidate_long_context_expectation_contract_v0_20260503T103210763Z_7f0974ed
  - variant_name: candidate_long_context_expectation_contract_v0
  - change_layer: scenario
  - implementation_scope: Only scenario manifests, expected facts, constraints, and manual review prompts may change.
  - do_not_touch: src/query.ts | src/services/SessionMemory/sessionMemory.ts | runtime harness policy files
- candidate_proposal_v2_4_long_context_real_smoke_candidate_long_context_score_binding_v0_20260503T103210763Z_d3a111b9
  - variant_name: candidate_long_context_score_binding_v0
  - change_layer: scorer
  - implementation_scope: Only scorer/report/evaluator files may change. No runtime harness policy changes are allowed in this proposal.
  - do_not_touch: src/query.ts | src/services/SessionMemory/sessionMemory.ts | src/services/api/claude.ts
- candidate_proposal_v2_4_long_context_real_smoke_candidate_feedback_input_contract_v0_20260503T103210763Z_2d4e45cb
  - variant_name: candidate_feedback_input_contract_v0
  - change_layer: scenario
  - implementation_scope: Only scenario manifests, expected facts, constraints, and manual review prompts may change.
  - do_not_touch: src/query.ts | src/services/SessionMemory/sessionMemory.ts | runtime harness policy files

## Next Experiment Plans

- experiment_plan_v2_4_long_context_real_smoke_candidate_long_context_output_parser_v0_20260503T103210763Z_4d4bb400
  - candidate_variant_id: candidate_long_context_output_parser_v0
  - scenario_ids: long_context_fact_retrieval_real_smoke
  - repeat_count: 2
  - success_criteria: retrieved_fact_hit_rate is no longer null for real smoke. | constraint_retention_rate is no longer null for real smoke. | manual_review_required does not increase. | distractor_confusion_count remains 0.
  - failure_criteria: Parser introduces false positives against distractor-resistant scenarios. | Manual review requirement increases or semantic scores become contradictory.
  - manual_review_required: true
- experiment_plan_v2_4_long_context_real_smoke_candidate_long_context_expectation_contract_v0_20260503T103210763Z_6f16a48e
  - candidate_variant_id: candidate_long_context_expectation_contract_v0
  - scenario_ids: long_context_fact_retrieval_real_smoke
  - repeat_count: 1
  - success_criteria: Manual review prompts become more specific and lower-ambiguity. | Scenario intent remains matched. | No new flaky or failed run groups appear.
  - failure_criteria: Scenario contract changes erase the current runtime-difference evidence. | Long-context intent becomes less specific or more brittle.
  - manual_review_required: true
- experiment_plan_v2_4_long_context_real_smoke_candidate_long_context_score_binding_v0_20260503T103210763Z_f6ca0f37
  - candidate_variant_id: candidate_long_context_score_binding_v0
  - scenario_ids: long_context_fact_retrieval_real_smoke
  - repeat_count: 2
  - success_criteria: retrieved_fact_hit_rate is no longer null for real smoke. | constraint_retention_rate is no longer null for real smoke. | manual_review_required does not increase. | distractor_confusion_count remains 0.
  - failure_criteria: Parser introduces false positives against distractor-resistant scenarios. | Manual review requirement increases or semantic scores become contradictory.
  - manual_review_required: true
- experiment_plan_v2_4_long_context_real_smoke_candidate_feedback_input_contract_v0_20260503T103210763Z_d1610f7f
  - candidate_variant_id: candidate_feedback_input_contract_v0
  - scenario_ids: long_context_fact_retrieval_real_smoke
  - repeat_count: 1
  - success_criteria: Manual review prompts become more specific and lower-ambiguity. | Scenario intent remains matched. | No new flaky or failed run groups appear.
  - failure_criteria: Scenario contract changes erase the current runtime-difference evidence. | Long-context intent becomes less specific or more brittle.
  - manual_review_required: true

## Human Approval Required

- yes
- no proposal in this report has been auto-implemented
- findings are facts; hypotheses and proposals are reviewable inferences
