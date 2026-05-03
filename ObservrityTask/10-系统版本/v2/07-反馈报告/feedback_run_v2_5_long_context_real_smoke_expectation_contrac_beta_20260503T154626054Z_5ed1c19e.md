# V2.5 Beta Feedback Report: feedback_run_v2_5_long_context_real_smoke_expectation_contrac_beta_20260503T154626054Z_5ed1c19e

## Understanding

- source_experiment_run: tests/evals/v2/experiment-runs/v2_5_long_context_real_smoke_expectation_contract_v0_2026-05-03T153229792Z.json
- source_reports:
  - ObservrityTask\10-系统版本\v2\06-运行报告\compare_run_2026-05-03T153208617Z_long_context_fact_retrieval_real_smoke_contract_v0_baseline_default_0b6a625e_vs_run_2026-05-03T153229620Z_long_context_fact_retrieval_real_smoke_contract_v0_candidate_session_memory_sparse_a3fb1e0d.md
  - ObservrityTask\10-系统版本\v2\06-运行报告\batch_experiment_v2_5_long_context_real_smoke_expectation_contract_v0_2026-05-03T153229792Z.md
  - ObservrityTask\10-系统版本\v2\06-运行报告\experiment_v2_5_long_context_real_smoke_expectation_contract_v0_2026-05-03T153229792Z.md
- generated_at: 2026-05-03T15:46:26.054Z
- this report is advisory only and does not apply code changes automatically

## Human Approval Card

- current_top_recommendation: tests/evals/v2/feedback/proposals/proposal_v2_5_long_context_real_smoke_expectation_contrac_stabilize_feedback_input_contract_after_contract_20260503T154626054Z_75dd25e4.json
- why_now: The current source experiment already uses expectation_contract_v0, so repeating the same contract proposal would be a feedback-loop error rather than a useful next action.
- why_not_others_yet:
  - proposal_v2_5_long_context_real_smoke_expectation_contrac_stabilize_feedback_input_contract_v0_20260503T154626054Z_0bb87bd6: deferred - The current sample has a stronger semantic-evidence gap than a true contract-breakage gap, so this should remain deferred.
- approval_scope: Only feedback extraction rules, feedback taxonomy, and report/queue logic may change.
- do_not_touch: src/query.ts | src/services/SessionMemory/sessionMemory.ts | src/services/api/claude.ts
- next_experiment_plan_ref: tests/evals/v2/feedback/experiment-plans/experiment_plan_v2_5_long_context_real_smoke_expectation_contrac_candidate_feedback_input_contract_after_contract_20260503T154626054Z_2002193a.json
- success_criteria:
  - Feedback queue semantics become stable and easier to approve.
  - Top recommendation remains unique.
  - No new schema ambiguity appears in feedback artifacts.
- risks:
  - Treating manual review signals as auto-pass would overstate evaluator certainty.
- manual_review_boundary: Do not treat manual_review_required or needs_manual_review as automatic pass. Any approved proposal must preserve explicit human review for nuanced semantic checks.

## Proposal Queue

- top_recommendation:
  - tests/evals/v2/feedback/proposals/proposal_v2_5_long_context_real_smoke_expectation_contrac_stabilize_feedback_input_contract_after_contract_20260503T154626054Z_75dd25e4.json
- recommended_now:
  - tests/evals/v2/feedback/proposals/proposal_v2_5_long_context_real_smoke_expectation_contrac_stabilize_feedback_input_contract_after_contract_20260503T154626054Z_75dd25e4.json
- recommended_later:
  - none
- deferred:
  - tests/evals/v2/feedback/proposals/proposal_v2_5_long_context_real_smoke_expectation_contrac_stabilize_feedback_input_contract_v0_20260503T154626054Z_0bb87bd6.json
- blocked:
  - none

## Approval Contract

- blocking_findings:
  - none
- manual_judgement_required_findings:
  - tests/evals/v2/feedback/findings/finding_v2_5_long_context_real_smoke_expectation_contrac_long_context_review_verdict_needs_manual_review_20260503T154626054Z_72a1d044.json
  - tests/evals/v2/feedback/findings/finding_v2_5_long_context_real_smoke_expectation_contrac_manual_review_required_long_context_fact_retriev_20260503T154626054Z_5550e925.json
- auto_resolvable_findings:
  - tests/evals/v2/feedback/findings/finding_v2_5_long_context_real_smoke_expectation_contrac_risk_verdict_inconclusive_20260503T154626054Z_7e7d8ae0.json
  - tests/evals/v2/feedback/findings/finding_v2_5_long_context_real_smoke_expectation_contrac_missing_score_count_positive_20260503T154626054Z_797c63b8.json

## Findings

- finding_v2_5_long_context_real_smoke_expectation_contrac_long_context_review_verdict_needs_manual_review_20260503T154626054Z_72a1d044
  - type: long_context_review_verdict_needs_manual_review
  - kind: manual_review_boundary
  - severity: warning
  - scope: experiment
  - scope_ref: v2_5_long_context_real_smoke_expectation_contract_v0
  - summary: The experiment-level long_context_review_verdict remains needs_manual_review.
  - evidence_ref: tests/evals/v2/experiment-runs/v2_5_long_context_real_smoke_expectation_contract_v0_2026-05-03T153229792Z.json#/long_context_review_verdict
  - is_blocking: false
  - requires_manual_judgement: true
  - auto_resolvable: false
  - fact_or_inference: fact
- finding_v2_5_long_context_real_smoke_expectation_contrac_risk_verdict_inconclusive_20260503T154626054Z_7e7d8ae0
  - type: risk_verdict_inconclusive
  - kind: missing_score
  - severity: warning
  - scope: experiment
  - scope_ref: v2_5_long_context_real_smoke_expectation_contract_v0
  - summary: The regression-risk verdict is inconclusive for this experiment.
  - evidence_ref: tests/evals/v2/experiment-runs/v2_5_long_context_real_smoke_expectation_contract_v0_2026-05-03T153229792Z.json#/risk_verdict/status
  - is_blocking: false
  - requires_manual_judgement: false
  - auto_resolvable: true
  - fact_or_inference: fact
- finding_v2_5_long_context_real_smoke_expectation_contrac_missing_score_count_positive_20260503T154626054Z_797c63b8
  - type: missing_score_count_positive
  - kind: missing_score
  - severity: warning
  - scope: experiment
  - scope_ref: v2_5_long_context_real_smoke_expectation_contract_v0
  - summary: The experiment still has 1 missing score(s).
  - evidence_ref: tests/evals/v2/experiment-runs/v2_5_long_context_real_smoke_expectation_contract_v0_2026-05-03T153229792Z.json#/risk_verdict/missing_score_count
  - is_blocking: false
  - requires_manual_judgement: false
  - auto_resolvable: true
  - fact_or_inference: fact
- finding_v2_5_long_context_real_smoke_expectation_contrac_manual_review_required_long_context_fact_retriev_20260503T154626054Z_5550e925
  - type: manual_review_required_long_context_fact_retrieval_real_smoke_contract_v0
  - kind: manual_review_boundary
  - severity: warning
  - scope: scenario
  - scope_ref: long_context_fact_retrieval_real_smoke_contract_v0
  - summary: manual_review_required is true for long_context_fact_retrieval_real_smoke_contract_v0.
  - evidence_ref: tests/evals/v2/experiment-runs/v2_5_long_context_real_smoke_expectation_contract_v0_2026-05-03T153229792Z.json#/long_context_summary/0/manual_review_required
  - is_blocking: false
  - requires_manual_judgement: true
  - auto_resolvable: false
  - fact_or_inference: fact
- finding_v2_5_long_context_real_smoke_expectation_contrac_flaky_status_long_context_fact_retrieval_real_sm_20260503T154626054Z_537428d4
  - type: flaky_status_long_context_fact_retrieval_real_smoke_contract_v0_baseline_default
  - kind: stability_gap
  - severity: warning
  - scope: variant
  - scope_ref: long_context_fact_retrieval_real_smoke_contract_v0:baseline_default
  - summary: flaky_status is inconclusive for long_context_fact_retrieval_real_smoke_contract_v0 / baseline_default.
  - evidence_ref: tests/evals/v2/experiment-runs/v2_5_long_context_real_smoke_expectation_contract_v0_2026-05-03T153229792Z.json#/stability_summary/0/flaky_status
  - is_blocking: false
  - requires_manual_judgement: false
  - auto_resolvable: false
  - fact_or_inference: fact
- finding_v2_5_long_context_real_smoke_expectation_contrac_flaky_status_long_context_fact_retrieval_real_sm_20260503T154626054Z_1e601052
  - type: flaky_status_long_context_fact_retrieval_real_smoke_contract_v0_candidate_session_memory_sparse
  - kind: stability_gap
  - severity: warning
  - scope: variant
  - scope_ref: long_context_fact_retrieval_real_smoke_contract_v0:candidate_session_memory_sparse
  - summary: flaky_status is inconclusive for long_context_fact_retrieval_real_smoke_contract_v0 / candidate_session_memory_sparse.
  - evidence_ref: tests/evals/v2/experiment-runs/v2_5_long_context_real_smoke_expectation_contract_v0_2026-05-03T153229792Z.json#/stability_summary/1/flaky_status
  - is_blocking: false
  - requires_manual_judgement: false
  - auto_resolvable: false
  - fact_or_inference: fact

## Hypotheses

- hypothesis_v2_5_long_context_real_smoke_expectation_contrac_manual_review_boundary_persisted_after_contract__20260503T154626054Z_46855661
  - confidence: high
  - based_on: finding_v2_5_long_context_real_smoke_expectation_contrac_long_context_review_verdict_needs_manual_review_20260503T154626054Z_72a1d044, finding_v2_5_long_context_real_smoke_expectation_contrac_manual_review_required_long_context_fact_retriev_20260503T154626054Z_5550e925
  - depends_on_finding_refs: tests/evals/v2/experiment-runs/v2_5_long_context_real_smoke_expectation_contract_v0_2026-05-03T153229792Z.json#/long_context_review_verdict | tests/evals/v2/experiment-runs/v2_5_long_context_real_smoke_expectation_contract_v0_2026-05-03T153229792Z.json#/long_context_summary/0/manual_review_required
  - hypothesis: The tightened expectation contract is already in place, but manual review still remains open. The next bottleneck is feedback-loop deduplication and proposal stability, not another copy of the same scenario-contract recommendation.
  - falsifiable_by: Re-run feedback on the same expectation-contract artifact and confirm the queue no longer repeats the same expectation-contract recommendation as top priority. | Verify the next top recommendation, if any, shifts to feedback-system stabilization rather than a duplicate scenario contract.
  - risks: Treating manual review signals as auto-pass would overstate evaluator certainty.
  - fact_or_inference: inference
- hypothesis_v2_5_long_context_real_smoke_expectation_contrac_runner_or_scenario_instability_20260503T154626054Z_d615b243
  - confidence: medium
  - based_on: finding_v2_5_long_context_real_smoke_expectation_contrac_flaky_status_long_context_fact_retrieval_real_sm_20260503T154626054Z_537428d4, finding_v2_5_long_context_real_smoke_expectation_contrac_flaky_status_long_context_fact_retrieval_real_sm_20260503T154626054Z_1e601052
  - depends_on_finding_refs: tests/evals/v2/experiment-runs/v2_5_long_context_real_smoke_expectation_contract_v0_2026-05-03T153229792Z.json#/stability_summary/0/flaky_status | tests/evals/v2/experiment-runs/v2_5_long_context_real_smoke_expectation_contract_v0_2026-05-03T153229792Z.json#/stability_summary/1/flaky_status
  - hypothesis: Observed instability suggests that runner mechanics or scenario contracts still need tightening before higher-trust automated feedback can be used.
  - falsifiable_by: Increase repeat_count for the real smoke input and inspect whether flaky_status remains inconclusive or converges to stable.
  - risks: Pursuing harness changes before stabilizing the evaluator could hide platform issues behind candidate noise.
  - fact_or_inference: inference

## Improvement Proposals

- proposal_v2_5_long_context_real_smoke_expectation_contrac_stabilize_feedback_input_contract_after_contract_20260503T154626054Z_75dd25e4
  - type: feedback_contract_improvement
  - target_layer: feedback_system
  - priority: P1
  - queue_bucket: top_recommendation
  - description: Stabilize the feedback input contract so an already-realized expectation-contract follow-up is detected and not re-recommended as the next top proposal.
  - expected_effect: Prevent proposal-loop duplication and keep approval cards aligned with the true next unresolved bottleneck.
  - why_now: The current source experiment already uses expectation_contract_v0, so repeating the same contract proposal would be a feedback-loop error rather than a useful next action.
  - why_not_now: n/a
  - blocking_finding_ids: none
  - manual_judgement_finding_ids: finding_v2_5_long_context_real_smoke_expectation_contrac_long_context_review_verdict_needs_manual_review_20260503T154626054Z_72a1d044 | finding_v2_5_long_context_real_smoke_expectation_contrac_manual_review_required_long_context_fact_retriev_20260503T154626054Z_5550e925
  - risks: Treating manual review signals as auto-pass would overstate evaluator certainty.
  - requires_human_approval: true
- proposal_v2_5_long_context_real_smoke_expectation_contrac_stabilize_feedback_input_contract_v0_20260503T154626054Z_0bb87bd6
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

- candidate_proposal_v2_5_long_context_real_smoke_expectation_contrac_candidate_feedback_input_contract_after_contract_20260503T154626054Z_b4723ba2
  - variant_name: candidate_feedback_input_contract_after_contract_v0
  - change_layer: feedback_system
  - implementation_scope: Only feedback extraction rules, feedback taxonomy, and report/queue logic may change.
  - do_not_touch: src/query.ts | src/services/SessionMemory/sessionMemory.ts | src/services/api/claude.ts
- candidate_proposal_v2_5_long_context_real_smoke_expectation_contrac_candidate_feedback_input_contract_v0_20260503T154626054Z_9131c8e3
  - variant_name: candidate_feedback_input_contract_v0
  - change_layer: feedback_system
  - implementation_scope: Only feedback extraction rules, feedback taxonomy, and report/queue logic may change.
  - do_not_touch: src/query.ts | src/services/SessionMemory/sessionMemory.ts | src/services/api/claude.ts

## Next Experiment Plans

- experiment_plan_v2_5_long_context_real_smoke_expectation_contrac_candidate_feedback_input_contract_after_contract_20260503T154626054Z_2002193a
  - candidate_variant_id: candidate_feedback_input_contract_after_contract_v0
  - scenario_ids: long_context_fact_retrieval_real_smoke_contract_v0
  - repeat_count: 1
  - success_criteria: Feedback queue semantics become stable and easier to approve. | Top recommendation remains unique. | No new schema ambiguity appears in feedback artifacts.
  - failure_criteria: Feedback queue becomes contradictory or unstable across equivalent inputs. | Manual review and human approval boundaries become harder to distinguish.
  - manual_review_required: true
- experiment_plan_v2_5_long_context_real_smoke_expectation_contrac_candidate_feedback_input_contract_v0_20260503T154626054Z_7c0d5a2f
  - candidate_variant_id: candidate_feedback_input_contract_v0
  - scenario_ids: long_context_fact_retrieval_real_smoke_contract_v0
  - repeat_count: 1
  - success_criteria: Feedback queue semantics become stable and easier to approve. | Top recommendation remains unique. | No new schema ambiguity appears in feedback artifacts.
  - failure_criteria: Feedback queue becomes contradictory or unstable across equivalent inputs. | Manual review and human approval boundaries become harder to distinguish.
  - manual_review_required: true

## Human Approval Required

- yes
- no proposal in this report has been auto-implemented
- findings are facts; hypotheses and proposals are reviewable inferences
