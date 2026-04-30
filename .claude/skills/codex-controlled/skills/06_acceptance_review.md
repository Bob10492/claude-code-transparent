---
title: 验收与 Checkpoint Review
type: reference
description: Use after implementation to review goal fit, evidence, risks, validation results, and checkpoint choices before any next phase.
---

# Skill: 验收与 Checkpoint Review

## 目标

在 Codex 完成一轮实现后，不直接继续，而是审查：

- 是否完成本轮目标
- 是否产生漂移
- 是否证据充分
- 是否可以进入下一 phase

---

## 验收输入

- 修改文件列表
- 自查结果
- 运行命令
- 输出 artifacts
- errors/warnings
- run/report/score/gate 结果
- 未完成项
- 风险项

---

## 验收维度

### 1. 目标匹配

- 本轮目标是否完成
- 是否做了本轮不做的事情
- 是否出现 scope creep

### 2. 证据充分

- 是否有运行命令
- 是否有输出文件
- 是否有 report
- 是否有 evidence_ref
- 是否有 errors/warnings 说明

### 3. 事实优先

- 是否基于真实数据
- 是否使用了推断口径
- 推断是否明确标注

### 4. 风险暴露

- 未完成项是否说清
- 风险是否可接受
- 是否需要用户拍板

---

## Checkpoint 卡片

```md
## Checkpoint

### 本轮目标
...

### 实际完成
...

### 修改文件
...

### 验证结果
...

### 未完成项
...

### 风险项
...

### 是否满足验收
- [ ] ...

### 下一步候选 A
...

### 下一步候选 B
...

### 是否等待用户拍板
是
```

---

## 硬规则

- 没有 checkpoint，不算完成
- 用户未拍板，不得继续
- 如果 Codex 想自动进入下一 phase，判定为执行意图漂移
