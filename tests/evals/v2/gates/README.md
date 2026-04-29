# V2.1 Gate Semantics

## 理解清单

- gate 不是 scorer；gate 只解释 baseline 和 candidate 的 score 差异。
- gate policy 定义 hard fail 和 soft warning。
- runner 负责把每个 candidate 的 gate result 汇总成 experiment-level verdict。

## 预期效果

读 `gate_verdict.status` 时，应能得到稳定含义：

- `pass`：没有 hard fail、soft warning、missing score、inconclusive。
- `warning`：没有 hard fail，但至少有 soft warning。
- `fail`：至少有一个 hard fail。
- `inconclusive`：没有 hard fail，但存在 missing score 或无法判断的规则。

## 设计思路

V2.1 的 gate 语义要保守。缺失 score 不应被当作 pass；无法判断时应暴露为 `inconclusive`。

## Rule Types

| rule type | meaning | effect |
| --- | --- | --- |
| `hard_fail` | 不可接受的退化 | 任意触发时，experiment verdict 为 `fail`。 |
| `soft_warning` | 需要人工注意的退化 | 没有 hard fail 时，experiment verdict 为 `warning`。 |

## Missing Score

如果某条 gate rule 需要的 baseline 或 candidate score 缺失：

- 该 rule 的 verdict 是 `missing`。
- experiment `missing_score_count` 加 1。
- 如果没有 hard fail，则 experiment status 为 `inconclusive`。

## Inconclusive

如果 gate rule 无法被当前 runner 解释，或 score spec 不足以计算方向：

- 该 rule 的 verdict 是 `inconclusive`。
- experiment `inconclusive_count` 加 1。
- 如果没有 hard fail，则 experiment status 为 `inconclusive`。

## Multi-Candidate Summary

多 candidate 时，runner 按所有 candidate 的 gate results 汇总：

- 任一 candidate hard fail => 总 verdict `fail`。
- 无 hard fail，但任一 candidate missing/inconclusive => 总 verdict `inconclusive`。
- 无 hard fail/missing/inconclusive，但任一 candidate soft warning => 总 verdict `warning`。
- 所有 candidate 都 pass => 总 verdict `pass`。

## Current Supported Conditions

V2.1 runner 当前支持以下 condition 模式：

- `candidate < baseline`
- `candidate_regression_pct > <threshold>`
- `candidate_regression_pct > <threshold> and task_success_not_improved`

更复杂的 gate condition 应先写成文档和测试，再扩展 runner，不应默默当作 pass。
