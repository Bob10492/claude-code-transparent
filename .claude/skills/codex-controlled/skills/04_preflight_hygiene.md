---
title: Preflight / Hygiene Gate
type: reference
description: Use before work involving logs, metrics, ETL, dashboards, runners, scorers, gates, schemas, data cleaning, or evaluation experiments.
---

# Skill: Preflight / Hygiene Gate

## 目标

在任何涉及日志、指标、ETL、dashboard、runner、scorer、gate、schema、数据清洗、评测实验的任务前，先确认系统状态是否干净、输入是否可信、历史数据是否会污染结果。

---

## 适用场景

- 可观测系统
- 指标计算
- 数据库重建
- dashboard
- V2 experiment runner
- score / gate
- schema migration
- 旧日志清洗
- baseline vs candidate 对比

---

## 必查项

### 1. 数据新鲜度

- 当前事件文件是否最新
- 数据库是否过期
- summary/dashboard 是否读旧库
- 是否需要 rebuild

### 2. 数据污染

- 是否混入旧版本日志
- 是否混入旧 schema
- 是否存在旧 run / score / report 被误用
- 是否需要归档/清洗

### 3. 引用闭合

- snapshot_ref 是否存在
- user_action_id 是否存在
- run 是否绑定 V1 事实证据
- score 是否有 evidence_ref
- gate 是否有 score 输入

### 4. Schema 兼容

- manifest 字段是否和 validator 一致
- score-spec 是否存在
- gate policy 是否存在
- experiment 引用是否有效

### 5. 影响分析

- 影响哪些模块
- 影响哪些指标
- 影响哪些报表
- 影响哪些已有结论
- 是否造成局部正确、全局错误

---

## 输出模板

```md
## Preflight / Hygiene Gate

### 数据新鲜度
- 结果：
- 证据：
- 是否通过：

### 数据污染
- 结果：
- 证据：
- 是否通过：

### 引用闭合
- 结果：
- 证据：
- 是否通过：

### Schema 兼容
- 结果：
- 证据：
- 是否通过：

### Impact Analysis
- 影响模块：
- 影响指标：
- 影响报表：
- 影响已有结论：
- 风险：

### 结论
- 通过 / 不通过
- 如果不通过，必须先处理：
```

---

## 硬规则

Preflight 不通过，不得进入实现。
