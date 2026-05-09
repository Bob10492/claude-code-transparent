# 人工结论：v2_5_long_context_real_smoke_expectation_contract_v0

## 元信息

- 结论状态：待分析
- experiment_id：v2_5_long_context_real_smoke_expectation_contract_v0
- source_experiment_run_ref：tests/evals/v2/experiment-runs/v2_5_long_context_real_smoke_expectation_contract_v0_2026-05-03T153229792Z.json
- manifest_ref：tests\evals\v2\experiments\_experiment.long_context.real_smoke.expectation_contract_v0.json
- generated_at：2026-05-04T08:07:13.320Z

## 实验对象

- baseline_variant_id：baseline_default
- candidate_variant_ids：candidate_session_memory_sparse
- scenario_ids：long_context_fact_retrieval_real_smoke_contract_v0

## 自动事实摘要

- experiment_validity：valid
- experiment_validity_reason：Real experiment remains interpretable.
- long_context_review_verdict：needs_manual_review
- risk_verdict_status：inconclusive
- risk_missing_score_count：1

## Long Context 摘要

- long_context_fact_retrieval_real_smoke_contract_v0 / candidate_session_memory_sparse: retention=1, retrieval=1, distractor_confusion=0, compaction_trigger=4, total_prompt_input_tokens=27007, manual_review_required=yes

## Runtime Difference 摘要

- long_context_fact_retrieval_real_smoke_contract_v0 / candidate_session_memory_sparse: runtime_difference_observed=true, baseline_policy_mode=default, candidate_policy_mode=sparse

## Score 变化摘要

- efficiency.total_billed_tokens: baseline=27436, candidate=27372, delta=-64, interpretation=improved

## 原始报告入口

- ObservrityTask/10-系统版本/v2/06-运行报告/compare_run_2026-05-03T153208617Z_long_context_fact_retrieval_real_smoke_contract_v0_baseline_default_0b6a625e_vs_run_2026-05-03T153229620Z_long_context_fact_retrieval_real_smoke_contract_v0_candidate_session_memory_sparse_a3fb1e0d.md
- ObservrityTask/10-系统版本/v2/06-运行报告/batch_experiment_v2_5_long_context_real_smoke_expectation_contract_v0_2026-05-03T153229792Z.md
- ObservrityTask/10-系统版本/v2/06-运行报告/experiment_v2_5_long_context_real_smoke_expectation_contract_v0_2026-05-03T153229792Z.md

## Feedback 附录入口

- ObservrityTask/10-系统版本/v2/07-反馈报告/feedback_run_v2_5_long_context_real_smoke_expectation_contrac_beta_20260503T154626054Z_5ed1c19e.md
- ObservrityTask/10-系统版本/v2/07-反馈报告/feedback_run_v2_5_long_context_real_smoke_expectation_contrac_beta_20260503T153244784Z_57470f65.md

## 我当前关注的问题

- 

## 我看到的关键事实

- 

## 我的人工判断

- 

## 是否接受 candidate

- 待定

## 下一步动作

- 

## 备注

- 这份文件是人工主导的结论层。
- feedback 报告是附录层，只作参考，不直接替代人工判断。
