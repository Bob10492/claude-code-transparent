# Variant 组织规范

## 0. 理解清单

- V2 能否保持高抽象，关键不在指标，而在 `variant` 是否被定义清楚。
- `variant` 必须成为统一实验对象，而不是只服务某一类改动。
- 任何 harness / skill / tool / model 改动，都应优先收敛为 variant。

## 1. 预期效果

Variant 规范定下来后，后续实验会更清楚：

- baseline 是什么
- candidate 改了什么
- 这次改动属于哪一层
- 是否是单变量改动

这会直接决定后续比较报告能不能有解释力。

## 2. 设计思路

- `variant` 用来表达一套系统配置快照，而不是只表达单个参数。
- 第一阶段鼓励“小改动 variant”，反对一次打包太多变化。
- 每个 variant 都必须能明确回答：
  - 改了哪一层
  - 相对哪个 baseline
  - 对应哪个 git commit / config snapshot

## 3. 第一阶段规则

### 3.1 baseline

第一阶段至少定义一个默认 baseline：

- `baseline_default`

要求：

- 对应当前主线可运行版本
- 有清晰 git commit
- 有清晰配置快照引用

### 3.2 candidate

第一阶段建议只接受四类候选：

- 1 个 harness candidate
- 1 个 skill candidate
- 1 个 tool candidate
- 1 个 model candidate

### 3.3 单变量优先

若一次改动同时涉及多层，必须明确标记：

- `change_layer = mixed`

但第一阶段应尽量避免把大量 mixed variant 当常态。

## 4. 当前机器可用落地

模板文件已经落地：

- [tests/evals/v2/variants/_variant.template.json](/abs/path/E:/claude-code/tests/evals/v2/variants/_variant.template.json:1)
- [tests/evals/v2/variants/baseline.template.json](/abs/path/E:/claude-code/tests/evals/v2/variants/baseline.template.json:1)
- [tests/evals/v2/experiments/_experiment.template.json](/abs/path/E:/claude-code/tests/evals/v2/experiments/_experiment.template.json:1)
