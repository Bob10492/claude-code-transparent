# V2.1 Experiment Artifact Schema

## 理解清单

- 本目录保存 experiment-level JSON summary。
- 这些 JSON 是 V2.1 runner 的稳定回归证据。
- V2.1-stable 要求每个新 summary 都包含固定顶层 schema，不能只依赖历史的 `experiment/results` 内部结构。

## 预期效果

读取任意 `tests/evals/v2/experiment-runs/*.json` 时，应能快速回答：

- 这次实验来自哪个 manifest。
- 使用的是哪个 mode。
- 生成了哪些 run / score / report artifact。
- gate 最终是 pass、warning、fail 还是 inconclusive。
- 是否存在错误或警告。

## 设计思路

顶层字段用于机器读取和回归判断；保留 `experiment`、`runner`、`results` 用于人工追溯和向后兼容。

## Required Top-Level Fields

| field | type | meaning |
| --- | --- | --- |
| `experiment_id` | string | 实验 ID，来自 manifest。 |
| `manifest_ref` | string | 本次 runner 读取的 manifest 路径。 |
| `generated_at` | ISO timestamp string | summary 生成时间。 |
| `mode` | string | 当前只允许 `bind_existing`；`execute_harness` 会被明确阻塞。 |
| `run_refs` | string[] | 本次生成的 V2 run JSON 路径。 |
| `score_refs` | string[] | 本次生成的 score JSON 路径。 |
| `report_refs` | string[] | 本次生成的 compare / experiment Markdown report 路径。 |
| `gate_verdict` | object | 聚合后的 gate 结论。 |
| `errors` | string[] | hard fail 或 runner 级错误摘要。成功但 gate hard fail 时也可非空。 |
| `warnings` | string[] | soft warning、missing score、inconclusive 等非阻塞问题。 |

## Gate Verdict Shape

```json
{
  "status": "pass",
  "hard_fail_count": 0,
  "soft_warning_count": 0,
  "missing_score_count": 0,
  "inconclusive_count": 0,
  "candidate_count": 1
}
```

`status` 的优先级：

1. 任意 hard fail => `fail`
2. 任意 missing score 或 inconclusive => `inconclusive`
3. 任意 soft warning => `warning`
4. 其他情况 => `pass`

## Backward Compatibility

V2.1 仍保留以下字段：

- `experiment`
- `runner`
- `results`
- `created_at`

这些字段可以用于人工阅读，但新脚本应优先依赖顶层稳定 schema。
