# V2.1 ScoreSpec And Scorer Mapping

## 理解清单

- `score-specs/*.json` 定义“哪些分数是正式分数”。
- `scripts/evals/v2_record_run.ts` 目前负责实际计算这些分数。
- V2.1 当前不是公式解释器；score formula 仍由脚本中的 scorer implementation 实现。

## 预期效果

当 experiment manifest 声明 `score_spec_ids` 时：

- 每个声明的 `score_spec_id` 必须有对应 scorer。
- runner 只输出 manifest 声明过的 score。
- 如果声明了没有实现的 score，`v2_record_run.ts` 必须失败。
- 未声明的临时 score 不得进入正式 score artifact。

## 设计思路

V2.1 先固化 contract，再逐步演进实现。当前 contract 是：

```text
score_spec_id -> implemented scorer in scripts/evals/v2_record_run.ts
```

后续可以把公式解析、规则执行、外部 scorer registry 拆出去，但本轮不做。

## Current Mapping

| score_spec_id | implementation | data source | current boundary |
| --- | --- | --- | --- |
| `task_success.main_chain_observed` | `buildScores()` in `scripts/evals/v2_record_run.ts` | V1 `queries` + run binding | 判断是否存在 `main_thread` root query。 |
| `efficiency.total_billed_tokens` | `buildScores()` in `scripts/evals/v2_record_run.ts` | V1 `user_actions.total_billed_tokens` | 只记录事实值，不单独判断好坏。 |
| `decision_quality.subagent_count_observed` | `buildScores()` in `scripts/evals/v2_record_run.ts` | V1 `subagents` | 只记录数量事实；是否好坏交给 compare/gate 结合任务成功判断。 |
| `stability.recovery_absence` | `buildScores()` in `scripts/evals/v2_record_run.ts` | V1 `recoveries` | 无 recovery 为 1，有 recovery 为 0。 |
| `controllability.turn_limit_basic` | `buildScores()` in `scripts/evals/v2_record_run.ts` | V1 `queries.turn_count` + scenario limit | 当前使用 scenario `max_turn_count`，缺省为 8。 |

## Not Formal In V2.1

`v2_record_run.ts` 内部还能计算一些辅助分数，例如：

- `decision_quality.expected_tool_hit_rate`
- `efficiency.total_billed_token_budget`
- `stability.v1_closure_health`
- `controllability.subagent_count_budget`

这些只有在 experiment manifest 的 `score_spec_ids` 中显式声明并有 score-spec 文件支持时，才应进入正式 experiment score artifact。

## Failure Rules

- experiment 引用不存在的 `score_spec_id`：runner 失败。
- score-spec 存在但 scorer 未实现：record_run 失败。
- scorer 产生了未声明 score：runner 通过 `--score-spec-ids` 过滤，不写入正式 score artifact。

## V2.1 Boundary

当前 `formula` 字段是解释说明，不是自动执行语言。V2.1-stable 的重点是让 score contract 可验证，而不是实现通用公式引擎。
