# V2 反馈报告目录

这个目录放的是 `V2.5 feedback` 自动生成的 Markdown 报告。

## 先说清楚这个目录的定位

这里不是最终结论目录。

这里存的是：

- 系统自动整理出来的 `finding / hypothesis / proposal / approval card`

你应该把它理解成：

- 自动辅助阅读层

而不是：

- 自动替你做决定

## 当前推荐阅读顺序

1. 先看 [../01-总览/V2.5版本项目介绍与阅读指南.md](../01-%E6%80%BB%E8%A7%88/V2.5%E7%89%88%E6%9C%AC%E9%A1%B9%E7%9B%AE%E4%BB%8B%E7%BB%8D%E4%B8%8E%E9%98%85%E8%AF%BB%E6%8C%87%E5%8D%97.md)
2. 再看 [../../../../tests/evals/v2/V2.5-feedback-loop-usage.md](../../../../tests/evals/v2/V2.5-feedback-loop-usage.md)
3. 再确认 [../08-人工结论/README.md](../08-%E4%BA%BA%E5%B7%A5%E7%BB%93%E8%AE%BA/README.md) 里的人工主输出路径
4. 然后优先看最新这份：
   - [feedback_run_v2_5_long_context_real_smoke_expectation_contrac_beta_20260503T154626054Z_5ed1c19e.md](./feedback_run_v2_5_long_context_real_smoke_expectation_contrac_beta_20260503T154626054Z_5ed1c19e.md)

## 当前建议怎么读

先看：

- `top_recommendation`
- `why_now`
- `why_not_others_yet`
- `approval_scope`
- `manual_review_boundary`

再看：

- `findings`
- `hypotheses`
- `proposal queue`

## 一个重要原则

这个目录里的内容默认都不应该直接当成最终结论。

尤其是：

- `hypothesis`
- `proposal`

它们是辅助你人工分析的材料，不是自动拍板结果。

## 为什么这里也不建议手动移动旧报告

原因和 `06-运行报告` 一样：

- `tests/evals/v2/feedback/runs/*.json` 里会直接写 `report_ref`

所以这里的整理方式也是：

- 保持自动生成文件原位
- 靠 `README` 和上层总览文件收口
