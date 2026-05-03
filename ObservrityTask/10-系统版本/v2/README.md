# V2

本目录用于承载可观测系统 `V2` 的版本说明、任务书、数据模型、Scenario/Variant 设计与运行报告。

## 理解清单

- `V2` 的核心目标不是“看日志”，而是“基于 V1 事实证据做正式评测”。
- 当前最值得先理解的稳定状态已经推进到 `V2.5 beta`。
- `V2.5 beta` 的关键成果是：在 `V2.4` 真实评测已经可运行的基础上，系统开始把评测结果转成结构化反馈建议、proposal queue 与人工拍板卡，但仍然不自动改代码。

## 预期效果

如果你第一次进入这个目录，读完这里列出的入口文档后，应该能快速知道：

1. 当前系统发展到了哪一步。
2. 你应该从哪份文档开始读。
3. V2.4 的 fixture smoke 和 real smoke 应该怎么跑。
4. V2.5 的 feedback loop beta 应该怎么跑。
4. 运行结果应该去哪里看。

## 设计思路

这份 README 只做导航，不重复展开所有实现细节。

详细内容分别落在：

- `01-总览`：讲系统是什么
- `tests/evals/v2`：讲系统怎么跑
- `06-运行报告`：看实验结果

## 当前推荐入口

优先阅读这三份：

1. [01-总览/V2.5版本项目介绍与阅读指南.md](./01-%E6%80%BB%E8%A7%88/V2.5%E7%89%88%E6%9C%AC%E9%A1%B9%E7%9B%AE%E4%BB%8B%E7%BB%8D%E4%B8%8E%E9%98%85%E8%AF%BB%E6%8C%87%E5%8D%97.md)
2. [tests/evals/v2/README.md](../../../tests/evals/v2/README.md)
3. [tests/evals/v2/V2.5-feedback-loop-usage.md](../../../tests/evals/v2/V2.5-feedback-loop-usage.md)

这三份文档分别回答：

- `V2.5` 到底是什么
- 当前系统该怎么运行
- V2.5 feedback loop 怎么跑

## 目录结构

- `01-总览`
  - 当前阶段的总览、北极星、阅读指南
- `02-实施任务书`
  - 各阶段任务书与后续规划
- `03-数据模型`
  - `scenario / variant / experiment / run / score` 等抽象说明
- `04-Scenario集`
  - 评测场景设计
- `05-Variant与实验`
  - variant 与 experiment 的组织规范
- `06-运行报告`
  - 运行后生成的人类可读报告

## 当前阅读顺序

1. [01-总览/V2.5版本项目介绍与阅读指南.md](./01-%E6%80%BB%E8%A7%88/V2.5%E7%89%88%E6%9C%AC%E9%A1%B9%E7%9B%AE%E4%BB%8B%E7%BB%8D%E4%B8%8E%E9%98%85%E8%AF%BB%E6%8C%87%E5%8D%97.md)
2. [01-总览/可观测系统V2北极星与评测模型草案.md](./01-%E6%80%BB%E8%A7%88/%E5%8F%AF%E8%A7%82%E6%B5%8B%E7%B3%BB%E7%BB%9FV2%E5%8C%97%E6%9E%81%E6%98%9F%E4%B8%8E%E8%AF%84%E6%B5%8B%E6%A8%A1%E5%9E%8B%E8%8D%89%E6%A1%88.md)
3. [tests/evals/v2/README.md](../../../tests/evals/v2/README.md)
4. [tests/evals/v2/V2.4-long-context-usage.md](../../../tests/evals/v2/V2.4-long-context-usage.md)
5. [tests/evals/v2/V2.5-feedback-loop-usage.md](../../../tests/evals/v2/V2.5-feedback-loop-usage.md)
6. [03-数据模型](./03-%E6%95%B0%E6%8D%AE%E6%A8%A1%E5%9E%8B/)
7. [04-Scenario集](./04-Scenario%E9%9B%86/)
8. [05-Variant与实验](./05-Variant%E4%B8%8E%E5%AE%9E%E9%AA%8C/)
9. [06-运行报告](./06-%E8%BF%90%E8%A1%8C%E6%8A%A5%E5%91%8A/)
10. [07-反馈报告](./07-%E5%8F%8D%E9%A6%88%E6%8A%A5%E5%91%8A/)

## 当前最重要的三条运行路径

### V2.4 fixture smoke

```powershell
bun run scripts/evals/v2_run_experiment.ts --experiment tests/evals/v2/experiments/_experiment.long_context.fixture_smoke.json
```

### V2.4 verifier

```powershell
bun run scripts/evals/v2_verify_long_context.ts
```

### V2.4 real smoke

```powershell
bun run scripts/evals/v2_run_experiment.ts --experiment tests/evals/v2/experiments/_experiment.long_context.real_smoke.json
```

### V2.5 feedback loop beta

```powershell
bun run scripts/evals/v2_run_feedback.ts --experiment-run tests/evals/v2/experiment-runs/v2_4_long_context_real_smoke_2026-05-03T060617173Z.json
```

```powershell
bun run scripts/evals/v2_validate_feedback_artifacts.ts
```

## 最新状态

当前 `V2.5 beta` 已经具备：

- `V2.3` 的 batch / repeat / run_group / stability_summary
- 4 个长上下文 scenario family
- `context.*` score-spec
- `long_context` run 证据
- `long_context_summary`
- `long_context_review_verdict`
- `feedback/findings`
- `feedback/hypotheses`
- `feedback/proposals`
- `feedback/candidate-proposals`
- `feedback/next experiment plans`
- `feedback/proposal queue`
- `feedback/approval card`
- `feedback artifact validator`

这意味着：
系统已经不只是“能跑批量实验并解释长上下文”，而是开始能把这些结果转成结构化反馈建议，供你拍板下一轮改动。
