# V2.5 Beta Feedback Report: feedback_run_v2_4_long_context_real_smoke_beta_20260503T124541901Z_355a063b

## Understanding

- source_experiment_run: tests/evals/v2/experiment-runs/v2_4_long_context_real_smoke_2026-05-03T060617173Z.json
- source_reports:
  - ObservrityTask\10-系统版本\v2\06-运行报告\compare_run_2026-05-03T060601212Z_long_context_fact_retrieval_real_smoke_baseline_default_b963e6da_vs_run_2026-05-03T060616987Z_long_context_fact_retrieval_real_smoke_candidate_session_memory_sparse_96004ff8.md
  - ObservrityTask\10-系统版本\v2\06-运行报告\batch_experiment_v2_4_long_context_real_smoke_2026-05-03T060617173Z.md
  - ObservrityTask\10-系统版本\v2\06-运行报告\experiment_v2_4_long_context_real_smoke_2026-05-03T060617173Z.md
- generated_at: 2026-05-03T12:45:41.901Z
- this report is advisory only and does not apply code changes automatically

## Human Approval Card

- current_top_recommendation: tests/evals/v2/feedback/proposals/proposal_v2_4_long_context_real_smoke_add_long_context_output_parser_v0_20260503T124541901Z_5e4eee36.json
- why_now: This directly targets the two most important semantic nulls in the current real-smoke sample and does not require runtime harness changes.
- why_not_others_yet:
  - proposal_v2_4_long_context_real_smoke_tighten_real_smoke_expectations_v0_20260503T124541901Z_013f97a8: recommended_later - By itself it does not convert null semantic scores into formal evidence, so it is best staged after parser work begins.
  - proposal_v2_4_long_context_real_smoke_map_parser_output_to_context_scores_v0_20260503T124541901Z_6af2f3f2: blocked - This is blocked until a lightweight parser exists; there is nothing stable to bind before that.
  - proposal_v2_4_long_context_real_smoke_stabilize_feedback_input_contract_v0_20260503T124541901Z_30cd7b51: deferred - The current sample has a stronger semantic-evidence gap than a true contract-breakage gap, so this should remain deferred.
- approval_scope: Only scorer/report/evaluator files may change. No runtime harness policy changes are allowed in this proposal.
- do_not_touch: src/query.ts | src/services/SessionMemory/sessionMemory.ts | src/services/api/claude.ts
- next_experiment_plan_ref: tests/evals/v2/feedback/experiment-plans/experiment_plan_v2_4_long_context_real_smoke_candidate_long_context_output_parser_v0_20260503T124541901Z_346bd758.json
- success_criteria:
  - retrieved_fact_hit_rate is no longer null for real smoke.
  - constraint_retention_rate is no longer null for real smoke.
  - manual_review_required does not increase.
  - distractor_confusion_count remains 0.
- risks:
  - A parser that is too narrow can miss valid answers.
  - A parser that is too loose can create false positives.
- manual_review_boundary: Do not treat manual_review_required or needs_manual_review as automatic pass. Any approved proposal must preserve explicit human review for nuanced semantic checks.

## Proposal Queue

- top_recommendation:
  - tests/evals/v2/feedback/proposals/proposal_v2_4_long_context_real_smoke_add_long_context_output_parser_v0_20260503T124541901Z_5e4eee36.json
- recommended_now:
  - tests/evals/v2/feedback/proposals/proposal_v2_4_long_context_real_smoke_add_long_context_output_parser_v0_20260503T124541901Z_5e4eee36.json
- recommended_later:
  - tests/evals/v2/feedback/proposals/proposal_v2_4_long_context_real_smoke_tighten_real_smoke_expectations_v0_20260503T124541901Z_013f97a8.json
- deferred:
  - tests/evals/v2/feedback/proposals/proposal_v2_4_long_context_real_smoke_stabilize_feedback_input_contract_v0_20260503T124541901Z_30cd7b51.json
- blocked:
  - tests/evals/v2/feedback/proposals/proposal_v2_4_long_context_real_smoke_map_parser_output_to_context_scores_v0_20260503T124541901Z_6af2f3f2.json

## Approval Contract

- blocking_findings:
  - none
- manual_judgement_required_findings:
  - tests/evals/v2/feedback/findings/finding_v2_4_long_context_real_smoke_long_context_review_verdict_needs_manual_review_20260503T124541901Z_4fbdb97e.json
  - tests/evals/v2/feedback/findings/finding_v2_4_long_context_real_smoke_manual_review_required_long_context_fact_retriev_20260503T124541901Z_efe417a8.json
- auto_resolvable_findings:
  - tests/evals/v2/feedback/findings/finding_v2_4_long_context_real_smoke_risk_verdict_inconclusive_20260503T124541901Z_72968af2.json
  - tests/evals/v2/feedback/findings/finding_v2_4_long_context_real_smoke_missing_score_count_positive_20260503T124541901Z_70cd437b.json
  - tests/evals/v2/feedback/findings/finding_v2_4_long_context_real_smoke_constraint_retention_rate_missing_long_context_f_20260503T124541901Z_b497c06c.json
  - tests/evals/v2/feedback/findings/finding_v2_4_long_context_real_smoke_retrieved_fact_hit_rate_missing_long_context_fac_20260503T124541901Z_2f6593de.json

## Findings

- finding_v2_4_long_context_real_smoke_long_context_review_verdict_needs_manual_review_20260503T124541901Z_4fbdb97e
  - type: long_context_review_verdict_needs_manual_review
  - kind: manual_review_boundary
  - severity: warning
  - scope: experiment
  - scope_ref: v2_4_long_context_real_smoke
  - summary: The experiment-level long_context_review_verdict remains needs_manual_review.
  - evidence_ref: tests/evals/v2/experiment-runs/v2_4_long_context_real_smoke_2026-05-03T060617173Z.json#/long_context_review_verdict
  - is_blocking: false
  - requires_manual_judgement: true
  - auto_resolvable: false
  - fact_or_inference: fact
- finding_v2_4_long_context_real_smoke_risk_verdict_inconclusive_20260503T124541901Z_72968af2
  - type: risk_verdict_inconclusive
  - kind: missing_score
  - severity: warning
  - scope: experiment
  - scope_ref: v2_4_long_context_real_smoke
  - summary: The regression-risk verdict is inconclusive for this experiment.
  - evidence_ref: tests/evals/v2/experiment-runs/v2_4_long_context_real_smoke_2026-05-03T060617173Z.json#/risk_verdict/status
  - is_blocking: false
  - requires_manual_judgement: false
  - auto_resolvable: true
  - fact_or_inference: fact
- finding_v2_4_long_context_real_smoke_missing_score_count_positive_20260503T124541901Z_70cd437b
  - type: missing_score_count_positive
  - kind: missing_score
  - severity: warning
  - scope: experiment
  - scope_ref: v2_4_long_context_real_smoke
  - summary: The experiment still has 1 missing score(s).
  - evidence_ref: tests/evals/v2/experiment-runs/v2_4_long_context_real_smoke_2026-05-03T060617173Z.json#/risk_verdict/missing_score_count
  - is_blocking: false
  - requires_manual_judgement: false
  - auto_resolvable: true
  - fact_or_inference: fact
- finding_v2_4_long_context_real_smoke_constraint_retention_rate_missing_long_context_f_20260503T124541901Z_b497c06c
  - type: constraint_retention_rate_missing_long_context_fact_retrieval_real_smoke
  - kind: missing_score
  - severity: warning
  - scope: scenario
  - scope_ref: long_context_fact_retrieval_real_smoke
  - summary: constraint_retention_rate_mean is null for long_context_fact_retrieval_real_smoke.
  - evidence_ref: tests/evals/v2/experiment-runs/v2_4_long_context_real_smoke_2026-05-03T060617173Z.json#/long_context_summary/0/constraint_retention_rate_mean
  - is_blocking: false
  - requires_manual_judgement: false
  - auto_resolvable: true
  - fact_or_inference: fact
- finding_v2_4_long_context_real_smoke_retrieved_fact_hit_rate_missing_long_context_fac_20260503T124541901Z_2f6593de
  - type: retrieved_fact_hit_rate_missing_long_context_fact_retrieval_real_smoke
  - kind: missing_score
  - severity: warning
  - scope: scenario
  - scope_ref: long_context_fact_retrieval_real_smoke
  - summary: retrieved_fact_hit_rate_mean is null for long_context_fact_retrieval_real_smoke.
  - evidence_ref: tests/evals/v2/experiment-runs/v2_4_long_context_real_smoke_2026-05-03T060617173Z.json#/long_context_summary/0/retrieved_fact_hit_rate_mean
  - is_blocking: false
  - requires_manual_judgement: false
  - auto_resolvable: true
  - fact_or_inference: fact
- finding_v2_4_long_context_real_smoke_manual_review_required_long_context_fact_retriev_20260503T124541901Z_efe417a8
  - type: manual_review_required_long_context_fact_retrieval_real_smoke
  - kind: manual_review_boundary
  - severity: warning
  - scope: scenario
  - scope_ref: long_context_fact_retrieval_real_smoke
  - summary: manual_review_required is true for long_context_fact_retrieval_real_smoke.
  - evidence_ref: tests/evals/v2/experiment-runs/v2_4_long_context_real_smoke_2026-05-03T060617173Z.json#/long_context_summary/0/manual_review_required
  - is_blocking: false
  - requires_manual_judgement: true
  - auto_resolvable: false
  - fact_or_inference: fact
- finding_v2_4_long_context_real_smoke_flaky_status_long_context_fact_retrieval_real_sm_20260503T124541901Z_534c0740
  - type: flaky_status_long_context_fact_retrieval_real_smoke_baseline_default
  - kind: stability_gap
  - severity: warning
  - scope: variant
  - scope_ref: long_context_fact_retrieval_real_smoke:baseline_default
  - summary: flaky_status is inconclusive for long_context_fact_retrieval_real_smoke / baseline_default.
  - evidence_ref: tests/evals/v2/experiment-runs/v2_4_long_context_real_smoke_2026-05-03T060617173Z.json#/stability_summary/0/flaky_status
  - is_blocking: false
  - requires_manual_judgement: false
  - auto_resolvable: false
  - fact_or_inference: fact
- finding_v2_4_long_context_real_smoke_flaky_status_long_context_fact_retrieval_real_sm_20260503T124541901Z_02dccdee
  - type: flaky_status_long_context_fact_retrieval_real_smoke_candidate_session_memory_sparse
  - kind: stability_gap
  - severity: warning
  - scope: variant
  - scope_ref: long_context_fact_retrieval_real_smoke:candidate_session_memory_sparse
  - summary: flaky_status is inconclusive for long_context_fact_retrieval_real_smoke / candidate_session_memory_sparse.
  - evidence_ref: tests/evals/v2/experiment-runs/v2_4_long_context_real_smoke_2026-05-03T060617173Z.json#/stability_summary/1/flaky_status
  - is_blocking: false
  - requires_manual_judgement: false
  - auto_resolvable: false
  - fact_or_inference: fact

## Hypotheses

- hypothesis_v2_4_long_context_real_smoke_real_output_semantic_parser_missing_20260503T124541901Z_569976b8
  - confidence: medium
  - based_on: finding_v2_4_long_context_real_smoke_constraint_retention_rate_missing_long_context_f_20260503T124541901Z_b497c06c, finding_v2_4_long_context_real_smoke_retrieved_fact_hit_rate_missing_long_context_fac_20260503T124541901Z_2f6593de
  - depends_on_finding_refs: tests/evals/v2/experiment-runs/v2_4_long_context_real_smoke_2026-05-03T060617173Z.json#/long_context_summary/0/constraint_retention_rate_mean | tests/evals/v2/experiment-runs/v2_4_long_context_real_smoke_2026-05-03T060617173Z.json#/long_context_summary/0/retrieved_fact_hit_rate_mean
  - hypothesis: The current real-smoke evaluator lacks a lightweight semantic output parser, so fact retrieval and constraint retention cannot yet be auto-judged from runtime outputs.
  - falsifiable_by: Implement a lightweight real-smoke output parser and rerun long_context_fact_retrieval_real_smoke. | Verify retrieved_fact_hit_rate and constraint_retention_rate become non-null without inflating distractor_confusion_count.
  - risks: A parser that is too narrow can miss valid answers. | A parser that is too loose can create false positives.
  - fact_or_inference: inference
- hypothesis_v2_4_long_context_real_smoke_manual_review_boundary_still_open_20260503T124541901Z_54cd7243
  - confidence: high
  - based_on: finding_v2_4_long_context_real_smoke_long_context_review_verdict_needs_manual_review_20260503T124541901Z_4fbdb97e, finding_v2_4_long_context_real_smoke_manual_review_required_long_context_fact_retriev_20260503T124541901Z_efe417a8
  - depends_on_finding_refs: tests/evals/v2/experiment-runs/v2_4_long_context_real_smoke_2026-05-03T060617173Z.json#/long_context_review_verdict | tests/evals/v2/experiment-runs/v2_4_long_context_real_smoke_2026-05-03T060617173Z.json#/long_context_summary/0/manual_review_required
  - hypothesis: The current long-context evaluation boundary is still partially manual because the system can observe structure and governance, but cannot yet fully resolve final semantic correctness in real smoke.
  - falsifiable_by: Tighten real-smoke expectations and review prompts, then rerun and confirm whether manual-review scope shrinks without pretending to be fully automatic.
  - risks: Treating manual review signals as auto-pass would overstate evaluator certainty.
  - fact_or_inference: inference
- hypothesis_v2_4_long_context_real_smoke_gate_inconclusive_due_to_missing_semantic_scores_20260503T124541901Z_f3494c13
  - confidence: medium
  - based_on: finding_v2_4_long_context_real_smoke_risk_verdict_inconclusive_20260503T124541901Z_72968af2, finding_v2_4_long_context_real_smoke_missing_score_count_positive_20260503T124541901Z_70cd437b
  - depends_on_finding_refs: tests/evals/v2/experiment-runs/v2_4_long_context_real_smoke_2026-05-03T060617173Z.json#/risk_verdict/status | tests/evals/v2/experiment-runs/v2_4_long_context_real_smoke_2026-05-03T060617173Z.json#/risk_verdict/missing_score_count
  - hypothesis: The regression-risk gate is inconclusive mainly because semantic long-context scores are still missing, not because the runner failed to execute.
  - falsifiable_by: After parser output is bound into context scores, rerun the same real smoke and confirm whether risk_verdict becomes more decisive without hiding uncertainty.
  - risks: If missing semantic scores are ignored, risk gating may appear healthier than the evidence supports.
  - fact_or_inference: inference
- hypothesis_v2_4_long_context_real_smoke_runner_or_scenario_instability_20260503T124541901Z_e6e1981e
  - confidence: medium
  - based_on: finding_v2_4_long_context_real_smoke_flaky_status_long_context_fact_retrieval_real_sm_20260503T124541901Z_534c0740, finding_v2_4_long_context_real_smoke_flaky_status_long_context_fact_retrieval_real_sm_20260503T124541901Z_02dccdee
  - depends_on_finding_refs: tests/evals/v2/experiment-runs/v2_4_long_context_real_smoke_2026-05-03T060617173Z.json#/stability_summary/0/flaky_status | tests/evals/v2/experiment-runs/v2_4_long_context_real_smoke_2026-05-03T060617173Z.json#/stability_summary/1/flaky_status
  - hypothesis: Observed instability suggests that runner mechanics or scenario contracts still need tightening before higher-trust automated feedback can be used.
  - falsifiable_by: Increase repeat_count for the real smoke input and inspect whether flaky_status remains inconclusive or converges to stable.
  - risks: Pursuing harness changes before stabilizing the evaluator could hide platform issues behind candidate noise.
  - fact_or_inference: inference

## Improvement Proposals

- proposal_v2_4_long_context_real_smoke_add_long_context_output_parser_v0_20260503T124541901Z_5e4eee36
  - type: evaluator_improvement
  - target_layer: evaluator
  - priority: P0
  - queue_bucket: top_recommendation
  - description: Add a lightweight output parser for long-context real smoke so expected facts and retained constraints can be mapped to explicit score evidence.
  - expected_effect: Convert currently-null long-context semantic scores into rule-backed observed values where the output format is narrow enough.
  - why_now: This directly targets the two most important semantic nulls in the current real-smoke sample and does not require runtime harness changes.
  - why_not_now: n/a
  - blocking_finding_ids: none
  - manual_judgement_finding_ids: none
  - risks: A parser that is too narrow can miss valid answers. | A parser that is too loose can create false positives.
  - requires_human_approval: true
- proposal_v2_4_long_context_real_smoke_tighten_real_smoke_expectations_v0_20260503T124541901Z_013f97a8
  - type: scenario_improvement
  - target_layer: scenario
  - priority: P1
  - queue_bucket: recommended_later
  - description: Tighten long-context real-smoke expected facts, constraints, and review questions so the evaluator has clearer semantic anchors without pretending to be fully automatic.
  - expected_effect: Reduce avoidable manual-review ambiguity while preserving an explicit human-review boundary for nuanced outputs.
  - why_now: This is the cleanest way to narrow manual review once semantic evidence collection improves.
  - why_not_now: By itself it does not convert null semantic scores into formal evidence, so it is best staged after parser work begins.
  - blocking_finding_ids: none
  - manual_judgement_finding_ids: finding_v2_4_long_context_real_smoke_long_context_review_verdict_needs_manual_review_20260503T124541901Z_4fbdb97e | finding_v2_4_long_context_real_smoke_manual_review_required_long_context_fact_retriev_20260503T124541901Z_efe417a8
  - risks: Treating manual review signals as auto-pass would overstate evaluator certainty.
  - requires_human_approval: true
- proposal_v2_4_long_context_real_smoke_map_parser_output_to_context_scores_v0_20260503T124541901Z_6af2f3f2
  - type: score_binding_improvement
  - target_layer: scorer
  - priority: P1
  - queue_bucket: blocked
  - description: Map parser output into context score-spec fields so long-context risk gating can distinguish missing semantics from genuine regression risk.
  - expected_effect: Reduce inconclusive gate results caused purely by absent semantic score evidence.
  - why_now: The gate cannot become more informative until parser output is formally bound into context scores.
  - why_not_now: This is blocked until a lightweight parser exists; there is nothing stable to bind before that.
  - blocking_finding_ids: none
  - manual_judgement_finding_ids: none
  - risks: If missing semantic scores are ignored, risk gating may appear healthier than the evidence supports.
  - requires_human_approval: true
- proposal_v2_4_long_context_real_smoke_stabilize_feedback_input_contract_v0_20260503T124541901Z_30cd7b51
  - type: feedback_contract_improvement
  - target_layer: feedback_system
  - priority: P2
  - queue_bucket: deferred
  - description: Stabilize the upstream scenario or feedback input contract before trusting automated feedback suggestions for this branch of evaluation.
  - expected_effect: Reduce noisy or ambiguous inputs before turning feedback artifacts into concrete candidate work items.
  - why_now: This keeps the feedback system honest when stability evidence is weak or under-sampled.
  - why_not_now: The current sample has a stronger semantic-evidence gap than a true contract-breakage gap, so this should remain deferred.
  - blocking_finding_ids: none
  - manual_judgement_finding_ids: none
  - risks: Pursuing harness changes before stabilizing the evaluator could hide platform issues behind candidate noise.
  - requires_human_approval: true

## Candidate Variant Proposals

- candidate_proposal_v2_4_long_context_real_smoke_candidate_long_context_output_parser_v0_20260503T124541901Z_d4ec8978
  - variant_name: candidate_long_context_output_parser_v0
  - change_layer: evaluator
  - implementation_scope: Only scorer/report/evaluator files may change. No runtime harness policy changes are allowed in this proposal.
  - do_not_touch: src/query.ts | src/services/SessionMemory/sessionMemory.ts | src/services/api/claude.ts
- candidate_proposal_v2_4_long_context_real_smoke_candidate_long_context_expectation_contract_v0_20260503T124541901Z_d326279e
  - variant_name: candidate_long_context_expectation_contract_v0
  - change_layer: scenario
  - implementation_scope: Only scenario manifests, expected facts, constraints, and manual review prompts may change.
  - do_not_touch: src/query.ts | src/services/SessionMemory/sessionMemory.ts | runtime harness policy files
- candidate_proposal_v2_4_long_context_real_smoke_candidate_long_context_score_binding_v0_20260503T124541901Z_b0296355
  - variant_name: candidate_long_context_score_binding_v0
  - change_layer: scorer
  - implementation_scope: Only scorer/report/evaluator files may change. No runtime harness policy changes are allowed in this proposal.
  - do_not_touch: src/query.ts | src/services/SessionMemory/sessionMemory.ts | src/services/api/claude.ts
- candidate_proposal_v2_4_long_context_real_smoke_candidate_feedback_input_contract_v0_20260503T124541901Z_66e07dac
  - variant_name: candidate_feedback_input_contract_v0
  - change_layer: feedback_system
  - implementation_scope: Only feedback extraction rules, feedback taxonomy, and report/queue logic may change.
  - do_not_touch: src/query.ts | src/services/SessionMemory/sessionMemory.ts | src/services/api/claude.ts

## Next Experiment Plans

- experiment_plan_v2_4_long_context_real_smoke_candidate_long_context_output_parser_v0_20260503T124541901Z_346bd758
  - candidate_variant_id: candidate_long_context_output_parser_v0
  - scenario_ids: long_context_fact_retrieval_real_smoke
  - repeat_count: 2
  - success_criteria: retrieved_fact_hit_rate is no longer null for real smoke. | constraint_retention_rate is no longer null for real smoke. | manual_review_required does not increase. | distractor_confusion_count remains 0.
  - failure_criteria: Parser introduces false positives against distractor-resistant scenarios. | Manual review requirement increases or semantic scores become contradictory.
  - manual_review_required: true
- experiment_plan_v2_4_long_context_real_smoke_candidate_long_context_expectation_contract_v0_20260503T124541901Z_06010de6
  - candidate_variant_id: candidate_long_context_expectation_contract_v0
  - scenario_ids: long_context_fact_retrieval_real_smoke
  - repeat_count: 1
  - success_criteria: Manual review prompts become more specific and lower-ambiguity. | Scenario intent remains matched. | No new flaky or failed run groups appear.
  - failure_criteria: Scenario contract changes erase the current runtime-difference evidence. | Long-context intent becomes less specific or more brittle.
  - manual_review_required: true
- experiment_plan_v2_4_long_context_real_smoke_candidate_long_context_score_binding_v0_20260503T124541901Z_415a96a3
  - candidate_variant_id: candidate_long_context_score_binding_v0
  - scenario_ids: long_context_fact_retrieval_real_smoke
  - repeat_count: 2
  - success_criteria: retrieved_fact_hit_rate is no longer null for real smoke. | constraint_retention_rate is no longer null for real smoke. | manual_review_required does not increase. | distractor_confusion_count remains 0.
  - failure_criteria: Parser introduces false positives against distractor-resistant scenarios. | Manual review requirement increases or semantic scores become contradictory.
  - manual_review_required: true
- experiment_plan_v2_4_long_context_real_smoke_candidate_feedback_input_contract_v0_20260503T124541901Z_0b77bb8b
  - candidate_variant_id: candidate_feedback_input_contract_v0
  - scenario_ids: long_context_fact_retrieval_real_smoke
  - repeat_count: 1
  - success_criteria: Feedback queue semantics become stable and easier to approve. | Top recommendation remains unique. | No new schema ambiguity appears in feedback artifacts.
  - failure_criteria: Feedback queue becomes contradictory or unstable across equivalent inputs. | Manual review and human approval boundaries become harder to distinguish.
  - manual_review_required: true

## Human Approval Required

- yes
- no proposal in this report has been auto-implemented
- findings are facts; hypotheses and proposals are reviewable inferences
