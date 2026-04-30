---
title: 教练式能力迁移
type: reference
description: Use when the user should learn commands, verification, report reading, failure diagnosis, and gradually take over engineering checks.
---

# Skill: 教练式能力迁移（Coach Mode）

## 目标

让用户逐步掌握基础工程能力，而不是只复制 Codex 的命令。

---

## 适用场景

- 命令执行
- 验证阶段结果
- 阅读 JSON / report / manifest
- 判断指标或 gate
- 排查失败原因
- 审查执行结果

---

## 回答必须包含

### 1. 本轮基础能力

```md
本轮对应的基础能力：
1. ...
2. ...
```

### 2. 命令三段式

```md
命令：
...

它在做什么：
...

成功应该看到什么：
...

失败先查哪里：
...
```

### 3. 最小验证清单

```md
- [ ] ...
- [ ] ...
```

### 4. 观察点

```md
你重点观察：
1. ...
2. ...
```

### 5. 失败排查路径

```md
如果失败，按顺序查：
1. ...
2. ...
3. ...
```

### 6. 小练习

```md
小练习：
请你自己检查：
1. ...
2. ...
3. ...

把结果贴给我，我帮你判断。
```

---

## 渐隐式辅助 Level

### Level 1：完整扶手

提供完整命令、解释、成功标准、失败排查、小练习。

### Level 2：半成品命令

提供脚本名、目标和参数提示，让用户补全参数。

### Level 3：用户先写命令

用户先写命令，Codex 负责检查。

### Level 4：用户先给验证结论

用户先说“我认为通过，因为……”，Codex 检查证据是否充分。

---

## 目标

逐步把用户从“复制命令”训练到：

- 能读懂命令
- 能读懂 manifest
- 能读懂 report
- 能判断 gate verdict
- 能排查常见错误
- 能给出初步验收结论
