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
- risk gate 最终是 pass、warning、fail 还是 inconclusive。
- 是否存在错误或警告。
- 是否存在 scorecard 变化、探索信号、推荐复盘模式。

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
| `risk_verdict` | object | 聚合后的回归风险结论；不是最终实验判断。 |
| `gate_verdict` | object | 兼容旧脚本的别名；新代码应优先读 `risk_verdict`。 |
| `verdict_boundary` | string | 明确说明 verdict 只代表 regression risk。 |
| `scorecard_summary` | array | baseline vs candidate 的多指标变化摘要。 |
| `exploration_signals` | string[] | 自动提取的探索复盘提示。 |
| `recommended_review_mode` | string | 建议复盘模式：`regression_review` / `manual_review` / `exploratory_review`。 |
| `final_decision` | null or object | 人类最终决策；runner 默认保持 `null`。 |
| `errors` | string[] | hard fail 或 runner 级错误摘要。成功但 gate hard fail 时也可非空。 |
| `warnings` | string[] | soft warning、missing score、inconclusive 等非阻塞问题。 |

## Risk Verdict Shape

```json
{
  "status": "pass",
  "scope": "regression_risk_only",
  "is_final_experiment_judgment": false,
  "hard_fail_count": 0,
  "soft_warning_count": 0,
  "missing_score_count": 0,
  "inconclusive_count": 0,
  "candidate_count": 1,
  "notes": "This verdict is only a regression-risk gate result..."
}
```

`status` 的优先级：

1. 任意 hard fail => `fail`
2. 任意 missing score 或 inconclusive => `inconclusive`
3. 任意 soft warning => `warning`
4. 其他情况 => `pass`

## Verdict Boundary

`risk_verdict` 只回答：

```text
这个 candidate 有没有触发当前 gate policy 已知的回归风险？
```

它不回答：

```text
这个 harness 是否更聪明？
这个 candidate 是否有探索价值？
这个改动是否应被长期保留？
```

因此新的 summary 会同时输出：

- `scorecard_summary`
- `exploration_signals`
- `recommended_review_mode`
- `final_decision`

最终判断应由人类结合这些材料完成。

## Backward Compatibility

V2.1 仍保留以下字段：

- `experiment`
- `runner`
- `results`
- `created_at`
- `gate_verdict`

这些字段可以用于人工阅读或兼容历史脚本，但新脚本应优先依赖 `risk_verdict` 和其他顶层稳定 schema。
