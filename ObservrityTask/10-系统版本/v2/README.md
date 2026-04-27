# V2

本目录用于承载可观测系统 V2 的设计、评测模型、实验框架与后续实现文档。

目录结构：

- `01-总览`
  - 北极星、目标、抽象模型
- `02-实施任务书`
  - 可直接开工的阶段性任务书
- `03-数据模型`
  - 核心对象与关系定稿
- `04-Scenario集`
  - 第一批 benchmark 场景
- `05-Variant与实验`
  - variant / experiment 组织规范
- `06-运行报告`
  - V2 run 生成的证据报告

V2.1 新增了 manifest 驱动的实验闭环：

```powershell
bun run scripts/evals/v2_run_experiment.ts --experiment session_memory_sparse_vs_default
```

当前 runner 是 `bind_existing` 模式：它不会自动启动 harness 跑 prompt，而是把已经存在的 V1 `user_action_id` 绑定成 baseline/candidate run，然后自动生成 score、comparison report、gate 结果和 experiment summary。这是从“单次 run 对比”走向“实验闭环”的第一步。

## 当前评测执行顺序

如果你现在要跑一次评测，推荐顺序是：

1. 选定一个 `scenario`，确认它已经存在于 `tests/evals/v2/scenarios/`。
2. 选定 baseline 和 candidate `variant`，确认它们已经存在于 `tests/evals/v2/variants/`。
3. 分别真实运行 baseline 和 candidate，拿到两个 V1 `user_action_id`。
4. 把这两个 `user_action_id` 写入 `tests/evals/v2/experiments/<experiment>.json` 的 `action_bindings`。
5. 运行 manifest 校验：

```powershell
bun run scripts/evals/v2_validate_manifests.ts
```

6. 运行实验：

```powershell
bun run scripts/evals/v2_run_experiment.ts --experiment <experiment_id>
```

7. 阅读输出：
   - `tests/evals/v2/runs/`：baseline/candidate run 绑定记录
   - `tests/evals/v2/scores/`：每个 run 的 score
   - `tests/evals/v2/experiment-runs/`：实验级 JSON summary
   - `06-运行报告/`：面向人阅读的 run、compare、experiment 报告

旧的 `v2_record_run.ts` 和 `v2_compare_runs.ts` 仍然保留，但它们现在更适合作为底层调试命令；日常推荐入口是 `v2_run_experiment.ts`。

当前建议阅读顺序：

1. [01-总览/可观测系统V2北极星与评测模型草案.md](./01-%E6%80%BB%E8%A7%88/%E5%8F%AF%E8%A7%82%E6%B5%8B%E7%B3%BB%E7%BB%9FV2%E5%8C%97%E6%9E%81%E6%98%9F%E4%B8%8E%E8%AF%84%E6%B5%8B%E6%A8%A1%E5%9E%8B%E8%8D%89%E6%A1%88.md)
2. [02-实施任务书/可观测系统V2第一阶段实施任务书.md](./02-%E5%AE%9E%E6%96%BD%E4%BB%BB%E5%8A%A1%E4%B9%A6/%E5%8F%AF%E8%A7%82%E6%B5%8B%E7%B3%BB%E7%BB%9FV2%E7%AC%AC%E4%B8%80%E9%98%B6%E6%AE%B5%E5%AE%9E%E6%96%BD%E4%BB%BB%E5%8A%A1%E4%B9%A6.md)
3. [02-实施任务书/可观测系统V2第一阶段执行清单.md](./02-%E5%AE%9E%E6%96%BD%E4%BB%BB%E5%8A%A1%E4%B9%A6/%E5%8F%AF%E8%A7%82%E6%B5%8B%E7%B3%BB%E7%BB%9FV2%E7%AC%AC%E4%B8%80%E9%98%B6%E6%AE%B5%E6%89%A7%E8%A1%8C%E6%B8%85%E5%8D%95.md)
4. [03-数据模型/V2评测数据模型定稿.md](./03-%E6%95%B0%E6%8D%AE%E6%A8%A1%E5%9E%8B/V2%E8%AF%84%E6%B5%8B%E6%95%B0%E6%8D%AE%E6%A8%A1%E5%9E%8B%E5%AE%9A%E7%A8%BF.md)
5. [04-Scenario集/第一批Scenario候选集.md](./04-Scenario%E9%9B%86/%E7%AC%AC%E4%B8%80%E6%89%B9Scenario%E5%80%99%E9%80%89%E9%9B%86.md)
6. [05-Variant与实验/Variant组织规范.md](./05-Variant%E4%B8%8E%E5%AE%9E%E9%AA%8C/Variant%E7%BB%84%E7%BB%87%E8%A7%84%E8%8C%83.md)
7. [06-运行报告/README.md](./06-%E8%BF%90%E8%A1%8C%E6%8A%A5%E5%91%8A/README.md)
