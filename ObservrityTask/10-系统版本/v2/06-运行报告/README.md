# V2 运行报告

当前目录用于保存由 V2 runner / scorer 生成的单次 run 报告。

第一阶段报告的核心作用：

- 记录 `run_id`
- 绑定 `scenario_id`
- 绑定 `variant_id`
- 绑定 V1 的 `user_action_id`
- 展示从 V1 DuckDB 抽取的基础证据
- 展示第一批 rule / structure score

生成入口：

```powershell
bun run scripts/evals/v2_record_run.ts --scenario tool_choice_sensitive --variant baseline_default --latest --snapshot-db
```

对比入口：

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

## 最小使用例子

目标：测试某个改动是否让 agent 的运行效果变好。

1. 保持 dashboard watcher 运行。

```powershell
powershell -ExecutionPolicy Bypass -File E:\claude-code-transparent\scripts\observability\watch_dashboard.ps1
```

2. 在当前代码状态下跑一次 debug query，作为 baseline。

3. 把刚才那次 action 登记成 baseline run。

```powershell
bun run scripts/evals/v2_record_run.ts --scenario tool_choice_sensitive --variant baseline_default --latest --snapshot-db
```

4. 修改你想测试的 harness / skill / tool / model 配置。

5. 再跑同一个 debug query，作为 candidate。

6. 准备一个 candidate variant 文件，例如：

```json
{
  "variant_id": "candidate_tool_router_v2",
  "name": "Candidate Tool Router V2",
  "description": "Test whether the new tool routing policy reduces unnecessary tool calls.",
  "change_layer": "tool",
  "base_variant_id": "baseline_default",
  "git_commit": "HEAD",
  "config_snapshot_ref": "manual",
  "notes": "Single-variable candidate for tool routing behavior."
}
```

保存到：

```text
tests/evals/v2/variants/candidate_tool_router_v2.json
```

7. 把第二次 action 登记成 candidate run。

```powershell
bun run scripts/evals/v2_record_run.ts --scenario tool_choice_sensitive --variant candidate_tool_router_v2 --latest --snapshot-db
```

8. 用两个 run id 生成对比报告。

```powershell
bun run scripts/evals/v2_compare_runs.ts --baseline-run <baseline_run_id> --candidate-run <candidate_run_id>
```

阅读对比报告时，先看：

- `task_success.main_chain_observed`
- `decision_quality.expected_tool_hit_rate`
- `efficiency.total_billed_tokens`
- `stability.v1_closure_health`
- `stability.recovery_absence`
- `controllability.turn_limit_basic`
- `decision_quality.subagent_count_observed`

这些指标不是最终智能总分，而是第一阶段可追溯的 V1 证据评分。
