# V2 运行报告目录

这个目录放的是 `V2 runner / scorer / compare / summary` 自动生成的人类可读报告。

## 先说最重要的整理原则

这个目录里的很多文件 **不要随便手动移动**。

原因很简单：

- `tests/evals/v2/experiment-runs/*.json` 里会直接写 `report_refs`
- `tests/evals/v2/feedback/runs/*.json` 里也会直接写 `source_report_refs` 或 `report_ref`

所以这里的整理方式不是“把生成报告到处搬”，而是：

- 保持生成文件原位
- 通过 `README` 和 `阅读入口` 文件收口

## 推荐入口

先看：

- [00-阅读入口.md](./00-%E9%98%85%E8%AF%BB%E5%85%A5%E5%8F%A3.md)
- [报告解读](./%E6%8A%A5%E5%91%8A%E8%A7%A3%E8%AF%BB/)

## 当前最值得先读的报告

- V2.3
  - [batch_experiment_v2_3_robustness_smoke_2026-05-03T070927523Z.md](./batch_experiment_v2_3_robustness_smoke_2026-05-03T070927523Z.md)
- V2.4 fixture
  - [batch_experiment_v2_4_long_context_fixture_smoke_2026-05-03T070957231Z.md](./batch_experiment_v2_4_long_context_fixture_smoke_2026-05-03T070957231Z.md)
- V2.4 real
  - [batch_experiment_v2_4_long_context_real_smoke_2026-05-03T145644822Z.md](./batch_experiment_v2_4_long_context_real_smoke_2026-05-03T145644822Z.md)
- V2.5 expectation contract
  - [batch_experiment_v2_5_long_context_real_smoke_expectation_contract_v0_2026-05-03T153229792Z.md](./batch_experiment_v2_5_long_context_real_smoke_expectation_contract_v0_2026-05-03T153229792Z.md)

## 这个目录里三类常见文件怎么理解

- `run_*.md`
  - 单次 run 的报告
- `compare_run_*.md`
  - baseline vs candidate 的对比
- `batch_experiment_*.md` / `experiment_*.md`
  - 一整场实验的摘要入口

## 日常建议

- 平时先看 `batch_experiment_*.md`
- 不够时再看 `compare_run_*.md`
- 还不够时再去看 `tests/evals/v2/runs/*.json`
