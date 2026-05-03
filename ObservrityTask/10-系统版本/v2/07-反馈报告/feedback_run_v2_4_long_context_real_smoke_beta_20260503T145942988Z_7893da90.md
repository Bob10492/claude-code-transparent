# V2.5 Beta Feedback Report: feedback_run_v2_4_long_context_real_smoke_beta_20260503T145942988Z_7893da90

## Understanding

- source_experiment_run: tests/evals/v2/experiment-runs/v2_4_long_context_real_smoke_2026-05-03T145644822Z.json
- source_reports:
  - ObservrityTask\10-系统版本\v2\06-运行报告\compare_run_2026-05-03T145624015Z_long_context_fact_retrieval_real_smoke_baseline_default_4015c73b_vs_run_2026-05-03T145644621Z_long_context_fact_retrieval_real_smoke_candidate_session_memory_sparse_54964348.md
  - ObservrityTask\10-系统版本\v2\06-运行报告\batch_experiment_v2_4_long_context_real_smoke_2026-05-03T145644822Z.md
  - ObservrityTask\10-系统版本\v2\06-运行报告\experiment_v2_4_long_context_real_smoke_2026-05-03T145644822Z.md
- generated_at: 2026-05-03T14:59:42.988Z
- this report is advisory only and does not apply code changes automatically

## Human Approval Card

- current_top_recommendation: tests/evals/v2/feedback/proposals/proposal_v2_4_long_context_real_smoke_tighten_real_smoke_expectations_v0_20260503T145942988Z_3851af91.json
- why_now: Semantic parsing is now present, so the next bottleneck is the real-smoke expectation contract and review-prompt precision.
- why_not_others_yet:
  - proposal_v2_4_long_context_real_smoke_stabilize_feedback_input_contract_v0_20260503T145942988Z_a0ba210d: deferred - The current sample has a stronger semantic-evidence gap than a true contract-breakage gap, so this should remain deferred.
- approval_scope: Only scenario manifests, expected facts, constraints, and manual review prompts may change.
- do_not_touch: src/query.ts | src/services/SessionMemory/sessionMemory.ts | runtime harness policy files
- next_experiment_plan_ref: tests/evals/v2/feedback/experiment-plans/experiment_plan_v2_4_long_context_real_smoke_candidate_long_context_expectation_contract_v0_20260503T145942988Z_62748519.json
- success_criteria:
  - Manual review prompts become more specific and lower-ambiguity.
  - Scenario intent remains matched.
  - No new flaky or failed run groups appear.
- risks:
  - Treating manual review signals as auto-pass would overstate evaluator certainty.
- manual_review_boundary: Do not treat manual_review_required or needs_manual_review as automatic pass. Any approved proposal must preserve explicit human review for nuanced semantic checks.

## Proposal Queue

- top_recommendation:
  - tests/evals/v2/feedback/proposals/proposal_v2_4_long_context_real_smoke_tighten_real_smoke_expectations_v0_20260503T145942988Z_3851af91.json
- recommended_now:
  - tests/evals/v2/feedback/proposals/proposal_v2_4_long_context_real_smoke_tighten_real_smoke_expectations_v0_20260503T145942988Z_3851af91.json
- recommended_later:
  - none
- deferred:
  - tests/evals/v2/feedback/proposals/proposal_v2_4_long_context_real_smoke_stabilize_feedback_input_contract_v0_20260503T145942988Z_a0ba210d.json
- blocked:
  - none

## Approval Contract

- blocking_findings:
  - none
- manual_judgement_required_findings:
  - tests/evals/v2/feedback/findings/finding_v2_4_long_context_real_smoke_long_context_review_verdict_needs_manual_review_20260503T145942988Z_3c7be194.json
  - tests/evals/v2/feedback/findings/finding_v2_4_long_context_real_smoke_manual_review_required_long_context_fact_retriev_20260503T145942988Z_7fb1e53a.json
- auto_resolvable_findings:
  - tests/evals/v2/feedback/findings/finding_v2_4_long_context_real_smoke_risk_verdict_inconclusive_20260503T145942988Z_e946246a.json
  - tests/evals/v2/feedback/findings/finding_v2_4_long_context_real_smoke_missing_score_count_positive_20260503T145942988Z_f7a7a853.json

## Findings

- finding_v2_4_long_context_real_smoke_long_context_review_verdict_needs_manual_review_20260503T145942988Z_3c7be194
  - type: long_context_review_verdict_needs_manual_review
  - kind: manual_review_boundary
  - severity: warning
  - scope: experiment
  - scope_ref: v2_4_long_context_real_smoke
  - summary: The experiment-level long_context_review_verdict remains needs_manual_review.
  - evidence_ref: tests/evals/v2/experiment-runs/v2_4_long_context_real_smoke_2026-05-03T145644822Z.json#/long_context_review_verdict
  - is_blocking: false
  - requires_manual_judgement: true
  - auto_resolvable: false
  - fact_or_inference: fact
- finding_v2_4_long_context_real_smoke_risk_verdict_inconclusive_20260503T145942988Z_e946246a
  - type: risk_verdict_inconclusive
  - kind: missing_score
  - severity: warning
  - scope: experiment
  - scope_ref: v2_4_long_context_real_smoke
  - summary: The regression-risk verdict is inconclusive for this experiment.
  - evidence_ref: tests/evals/v2/experiment-runs/v2_4_long_context_real_smoke_2026-05-03T145644822Z.json#/risk_verdict/status
  - is_blocking: false
  - requires_manual_judgement: false
  - auto_resolvable: true
  - fact_or_inference: fact
- finding_v2_4_long_context_real_smoke_missing_score_count_positive_20260503T145942988Z_f7a7a853
  - type: missing_score_count_positive
  - kind: missing_score
  - severity: warning
  - scope: experiment
  - scope_ref: v2_4_long_context_real_smoke
  - summary: The experiment still has 1 missing score(s).
  - evidence_ref: tests/evals/v2/experiment-runs/v2_4_long_context_real_smoke_2026-05-03T145644822Z.json#/risk_verdict/missing_score_count
  - is_blocking: false
  - requires_manual_judgement: false
  - auto_resolvable: true
  - fact_or_inference: fact
- finding_v2_4_long_context_real_smoke_manual_review_required_long_context_fact_retriev_20260503T145942988Z_7fb1e53a
  - type: manual_review_required_long_context_fact_retrieval_real_smoke
  - kind: manual_review_boundary
  - severity: warning
  - scope: scenario
  - scope_ref: long_context_fact_retrieval_real_smoke
  - summary: manual_review_required is true for long_context_fact_retrieval_real_smoke.
  - evidence_ref: tests/evals/v2/experiment-runs/v2_4_long_context_real_smoke_2026-05-03T145644822Z.json#/long_context_summary/0/manual_review_required
  - is_blocking: false
  - requires_manual_judgement: true
  - auto_resolvable: false
  - fact_or_inference: fact
- finding_v2_4_long_context_real_smoke_flaky_status_long_context_fact_retrieval_real_sm_20260503T145942988Z_69707008
  - type: flaky_status_long_context_fact_retrieval_real_smoke_baseline_default
  - kind: stability_gap
  - severity: warning
  - scope: variant
  - scope_ref: long_context_fact_retrieval_real_smoke:baseline_default
  - summary: flaky_status is inconclusive for long_context_fact_retrieval_real_smoke / baseline_default.
  - evidence_ref: tests/evals/v2/experiment-runs/v2_4_long_context_real_smoke_2026-05-03T145644822Z.json#/stability_summary/0/flaky_status
  - is_blocking: false
  - requires_manual_judgement: false
  - auto_resolvable: false
  - fact_or_inference: fact
- finding_v2_4_long_context_real_smoke_flaky_status_long_context_fact_retrieval_real_sm_20260503T145942988Z_6ac48f97
  - type: flaky_status_long_context_fact_retrieval_real_smoke_candidate_session_memory_sparse
  - kind: stability_gap
  - severity: warning
  - scope: variant
  - scope_ref: long_context_fact_retrieval_real_smoke:candidate_session_memory_sparse
  - summary: flaky_status is inconclusive for long_context_fact_retrieval_real_smoke / candidate_session_memory_sparse.
  - evidence_ref: tests/evals/v2/experiment-runs/v2_4_long_context_real_smoke_2026-05-03T145644822Z.json#/stability_summary/1/flaky_status
  - is_blocking: false
  - requires_manual_judgement: false
  - auto_resolvable: false
  - fact_or_inference: fact

## Hypotheses

- hypothesis_v2_4_long_context_real_smoke_manual_review_boundary_still_open_20260503T145942988Z_2aa4b447
  - confidence: high
  - based_on: finding_v2_4_long_context_real_smoke_long_context_review_verdict_needs_manual_review_20260503T145942988Z_3c7be194, finding_v2_4_long_context_real_smoke_manual_review_required_long_context_fact_retriev_20260503T145942988Z_7fb1e53a
  - depends_on_finding_refs: tests/evals/v2/experiment-runs/v2_4_long_context_real_smoke_2026-05-03T145644822Z.json#/long_context_review_verdict | tests/evals/v2/experiment-runs/v2_4_long_context_real_smoke_2026-05-03T145644822Z.json#/long_context_summary/0/manual_review_required
  - hypothesis: The current long-context evaluation boundary is still partially manual because the system can observe structure and governance, but cannot yet fully resolve final semantic correctness in real smoke.
  - falsifiable_by: Tighten real-smoke expectations and review prompts, then rerun and confirm whether manual-review scope shrinks without pretending to be fully automatic.
  - risks: Treating manual review signals as auto-pass would overstate evaluator certainty.
  - fact_or_inference: inference
- hypothesis_v2_4_long_context_real_smoke_runner_or_scenario_instability_20260503T145942988Z_01fd35e0
  - confidence: medium
  - based_on: finding_v2_4_long_context_real_smoke_flaky_status_long_context_fact_retrieval_real_sm_20260503T145942988Z_69707008, finding_v2_4_long_context_real_smoke_flaky_status_long_context_fact_retrieval_real_sm_20260503T145942988Z_6ac48f97
  - depends_on_finding_refs: tests/evals/v2/experiment-runs/v2_4_long_context_real_smoke_2026-05-03T145644822Z.json#/stability_summary/0/flaky_status | tests/evals/v2/experiment-runs/v2_4_long_context_real_smoke_2026-05-03T145644822Z.json#/stability_summary/1/flaky_status
  - hypothesis: Observed instability suggests that runner mechanics or scenario contracts still need tightening before higher-trust automated feedback can be used.
  - falsifiable_by: Increase repeat_count for the real smoke input and inspect whether flaky_status remains inconclusive or converges to stable.
  - risks: Pursuing harness changes before stabilizing the evaluator could hide platform issues behind candidate noise.
  - fact_or_inference: inference

## Improvement Proposals

- proposal_v2_4_long_context_real_smoke_tighten_real_smoke_expectations_v0_20260503T145942988Z_3851af91
  - type: scenario_improvement
  - target_layer: scenario
  - priority: P1
  - queue_bucket: top_recommendation
  - description: Tighten long-context real-smoke expected facts, constraints, and review questions so the evaluator has clearer semantic anchors without pretending to be fully automatic.
  - expected_effect: Reduce avoidable manual-review ambiguity while preserving an explicit human-review boundary for nuanced outputs.
  - why_now: Semantic parsing is now present, so the next bottleneck is the real-smoke expectation contract and review-prompt precision.
  - why_not_now: n/a
  - blocking_finding_ids: none
  - manual_judgement_finding_ids: finding_v2_4_long_context_real_smoke_long_context_review_verdict_needs_manual_review_20260503T145942988Z_3c7be194 | finding_v2_4_long_context_real_smoke_manual_review_required_long_context_fact_retriev_20260503T145942988Z_7fb1e53a
  - risks: Treating manual review signals as auto-pass would overstate evaluator certainty.
  - requires_human_approval: true
- proposal_v2_4_long_context_real_smoke_stabilize_feedback_input_contract_v0_20260503T145942988Z_a0ba210d
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

- candidate_proposal_v2_4_long_context_real_smoke_candidate_long_context_expectation_contract_v0_20260503T145942988Z_1bdb5652
  - variant_name: candidate_long_context_expectation_contract_v0
  - change_layer: scenario
  - implementation_scope: Only scenario manifests, expected facts, constraints, and manual review prompts may change.
  - do_not_touch: src/query.ts | src/services/SessionMemory/sessionMemory.ts | runtime harness policy files
- candidate_proposal_v2_4_long_context_real_smoke_candidate_feedback_input_contract_v0_20260503T145942988Z_829a2c3a
  - variant_name: candidate_feedback_input_contract_v0
  - change_layer: feedback_system
  - implementation_scope: Only feedback extraction rules, feedback taxonomy, and report/queue logic may change.
  - do_not_touch: src/query.ts | src/services/SessionMemory/sessionMemory.ts | src/services/api/claude.ts

## Next Experiment Plans

- experiment_plan_v2_4_long_context_real_smoke_candidate_long_context_expectation_contract_v0_20260503T145942988Z_62748519
  - candidate_variant_id: candidate_long_context_expectation_contract_v0
  - scenario_ids: long_context_fact_retrieval_real_smoke
  - repeat_count: 1
  - success_criteria: Manual review prompts become more specific and lower-ambiguity. | Scenario intent remains matched. | No new flaky or failed run groups appear.
  - failure_criteria: Scenario contract changes erase the current runtime-difference evidence. | Long-context intent becomes less specific or more brittle.
  - manual_review_required: true
- experiment_plan_v2_4_long_context_real_smoke_candidate_feedback_input_contract_v0_20260503T145942988Z_1e6a3fb4
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
