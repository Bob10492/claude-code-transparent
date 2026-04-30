---
title: 受控执行
type: reference
description: Use after user approval to execute one minimal closed-loop task without scope creep, fake capabilities, or unplanned file changes.
---

# Skill: 受控执行（Controlled Execution）

## 目标

在用户已经拍板后，Codex 只执行一个最小闭环任务，避免范围扩大和架构漂移。

---

## 执行前要求

必须已有：

- 明确任务书 / Spec Bundle
- 用户拍板
- 通过理解清单
- 通过 Preflight / Hygiene Gate
- 明确本轮不做什么
- 明确最小验证清单

---

## 执行原则

### 1. 一次只做一个最小闭环

例如：

- 只实现 bind_existing runner
- 只固化 experiment-run schema
- 只新增 score-spec 校验
- 只修 freshness
- 只补一个指标

不得顺手扩展。

---

### 2. 只改计划内文件

如果需要修改计划外文件，必须暂停说明：

```md
计划外修改需求：
为什么需要：
不改会怎样：
是否等待确认：
```

---

### 3. 不伪造能力

如果某能力尚无真实入口，例如 headless harness execution adapter，不得假装实现。  
应明确报错或留 scaffold。

---

### 4. 事实优先

正式结果必须能回溯到事实证据：

- run_id
- user_action_id
- observability_db_ref
- evidence_ref

无证据不得进入正式 score / compare / gate。

---

## 完成后输出

```md
## 执行完成摘要

### 修改文件
- ...

### 实现内容
- ...

### 未完成项
- ...

### 风险
- ...

### 验证命令
- ...

### 最小验证清单
- [ ] ...
```

然后进入 Acceptance Review。
