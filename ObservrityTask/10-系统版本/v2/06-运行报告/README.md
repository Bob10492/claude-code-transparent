# V2 运行报告

当前目录用于保存由 V2 runner / scorer 生成的 run、compare、experiment 报告。

第一阶段报告的核心作用：

- 记录 `run_id`
- 绑定 `scenario_id`
- 绑定 `variant_id`
- 绑定 V1 的 `user_action_id`
- 展示从 V1 DuckDB 抽取的基础证据
- 展示第一批 rule / structure score

## 当前推荐入口：V2.1 实验闭环

现在日常跑评测，优先使用 experiment manifest：

```powershell
bun run scripts/evals/v2_validate_manifests.ts
bun run scripts/evals/v2_run_experiment.ts --experiment <experiment_id>
```

当前样例：

```powershell
bun run scripts/evals/v2_run_experiment.ts --experiment session_memory_sparse_vs_default
```

这会自动完成：

1. 根据 experiment manifest 找到 scenario、baseline variant、candidate variant 和 V1 `user_action_id` 绑定。
2. 调用 `v2_record_run.ts` 生成 baseline run 和 candidate run。
3. 生成每个 run 的 score。
4. 调用 `v2_compare_runs.ts` 生成 baseline vs candidate 对比报告。
5. 应用 gate policy。
6. 生成 experiment summary。

当前 V2.1 是 `bind_existing` 模式：它不会自动启动 harness 跑 prompt。你需要先通过真实 debug/使用过程产生 baseline 和 candidate 对应的 V1 `user_action_id`，再把它们写进 experiment manifest。

## 底层调试入口

如果只想手动登记一次 run，可以使用：

```powershell
bun run scripts/evals/v2_record_run.ts --scenario tool_choice_sensitive --variant baseline_default --user-action-id <user_action_id> --snapshot-db
```

如果只想手动比较两个 run，可以使用：

```powershell
bun run scripts/evals/v2_compare_runs.ts --baseline-run <baseline_run_id> --candidate-run <candidate_run_id>
```

查找 run：

```powershell
bun run scripts/evals/v2_list_runs.ts --scenario tool_choice_sensitive
```

按 scenario 自动比较最近的 baseline / candidate：

```powershell
bun run scripts/evals/v2_compare_scenario.ts --scenario tool_choice_sensitive --candidate candidate_tool_router_v2
```

## 最小使用例子：当前 V2.1

目标：测试某个改动是否让 agent 的运行效果变好。

1. 保持 dashboard watcher 运行。

```powershell
powershell -ExecutionPolicy Bypass -File E:\claude-code-transparent\scripts\observability\watch_dashboard.ps1
```

2. 在当前代码状态下跑一次 debug query，作为 baseline。

3. 记下 baseline 的 `user_action_id`。

4. 修改你想测试的 harness / skill / tool / model 配置，并确保 candidate variant 文件已存在。

5. 再跑同一个 debug query，作为 candidate。

6. 记下 candidate 的 `user_action_id`。

7. 准备或更新 experiment manifest，例如：

```json
{
  "experiment_id": "my_candidate_vs_default",
  "baseline_variant_id": "baseline_default",
  "candidate_variant_ids": ["candidate_tool_router_v2"],
  "scenario_ids": ["tool_choice_sensitive"],
  "score_spec_ids": [
    "task_success.main_chain_observed",
    "efficiency.total_billed_tokens",
    "decision_quality.subagent_count_observed",
    "stability.recovery_absence",
    "controllability.turn_limit_basic"
  ],
  "gate_policy_id": "default_v2_1_gate",
  "mode": "bind_existing",
  "action_bindings": [
    {
      "scenario_id": "tool_choice_sensitive",
      "variant_id": "baseline_default",
      "entry_user_action_id": "<baseline_user_action_id>"
    },
    {
      "scenario_id": "tool_choice_sensitive",
      "variant_id": "candidate_tool_router_v2",
      "entry_user_action_id": "<candidate_user_action_id>"
    }
  ]
}
```

保存到：

```text
tests/evals/v2/experiments/my_candidate_vs_default.json
```

8. 校验 manifest。

```powershell
bun run scripts/evals/v2_validate_manifests.ts
```

9. 一条命令跑完整实验。

```powershell
bun run scripts/evals/v2_run_experiment.ts --experiment my_candidate_vs_default
```

阅读 experiment 报告时，先看：

- `task_success.main_chain_observed`
- `decision_quality.expected_tool_hit_rate`
- `efficiency.total_billed_tokens`
- `stability.v1_closure_health`
- `stability.recovery_absence`
- `controllability.turn_limit_basic`
- `decision_quality.subagent_count_observed`

这些指标不是最终智能总分，而是第一阶段可追溯的 V1 证据评分。
