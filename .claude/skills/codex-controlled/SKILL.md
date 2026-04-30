---
name: codex-controlled
description: Use for controlled Codex collaboration workflows: requirement framing, discussion, layered explanation, preflight hygiene, controlled execution, acceptance review, and coaching checkpoints.
---

# Skill: Codex 协作主控调度器（Master Orchestrator）

## 目标

本文件是项目内所有 Codex/Agent 协作 skill 的**总调度器**。  
它不负责承载所有细节，而是负责判断当前任务应进入哪种模式，并调用对应的子 skill。

核心目标：

- 防止任务漂移
- 防止未经用户拍板自动推进
- 防止文档蓝图和当前代码真相混淆
- 防止用用户不懂的术语解释用户不懂的术语
- 让 Codex 既能执行，也能帮助用户逐步掌握验证、命令、排查、架构理解能力

---

## 最高原则

### 1. 当前代码与当前运行结果是真相

当同时存在：

- 当前源码
- 当前运行日志
- 当前数据库
- 当前观测结果
- PDF / 任务书 / 设计稿 / 历史总结 / 心得文档

默认优先级为：

1. 当前源码与当前运行结果
2. 当前日志 / 数据库 / 观测事实
3. 当前任务书
4. PDF / 上游分析 / 历史总结 / 心得

不得默认文档与当前项目完全一致。

---

### 2. 用户理解优先于执行速度

如果用户还不能理解：

- 本轮目标
- 思路来源
- 设计选择
- 约束条件
- 架构设计点
- 风险
- 验收口径

则不得进入写代码 / 写文件 / 自动推进下一 phase。

---

### 3. Checkpoint 是唯一推进闸门

每个 phase 结束后，必须等待用户拍板。  
未经用户明确批准，不得：

- 自动进入下一 phase
- 顺手补 unrelated 功能
- 从“能跑”扩展成“全系统完成”
- 用“建议继续”替代“等待确认”

---

### 4. 事实 / 推断 / 不确定点必须分离

输出必须区分：

- 【事实】来自源码、日志、文档原文、当前运行结果
- 【推断】基于调用链、命名、行为的合理判断
- 【不确定点】需要用户确认或进一步查看源码

不得把推断包装成事实。

---

## 模式选择

收到任务后，先判断当前进入哪种模式。

| 模式 | 何时使用 | 调用子 skill |
|---|---|---|
| Framing / 定格 | 需求混乱、不确定本轮边界 | `01_requirement_framing.md` |
| Discussion / 讨论 | 用户和 agent 对方案理解不一致，需要反复澄清 | `02_discussion_mode.md` |
| Explanation / 分层解释 | 用户看不懂术语、代码结构、文档必要性 | `03_layered_explanation.md` |
| Preflight / 卫生检查 | 涉及日志、ETL、指标、数据、实验、runner | `04_preflight_hygiene.md` |
| Execution / 受控执行 | 已拍板，可以写代码或文件 | `05_controlled_execution.md` |
| Review / 验收复盘 | Codex 已执行，需自查、验收、checkpoint | `06_acceptance_review.md` |
| Coaching / 教练式学习 | 用户希望掌握命令、验证、排查能力 | `07_coach_mode.md` |

---

## 默认 Phase

### Phase 0：问题定格

输出：

- 本轮目标
- 真实约束
- 输入材料
- 输出形式
- 冲突处理要求
- 本轮不做
- 应进入哪种模式

禁止写代码。

---

### Phase 1：理解与讨论

如果用户不能完全理解方案，进入 Discussion 或 Explanation 模式。

目标不是“说服用户”，而是双方把：

- 概念
- 约束
- 分歧
- 方案
- 风险
- 验收口径

说清楚。

未通过不得进入执行。

---

### Phase 2：Spec Bundle

如果已经明确要执行，输出统一 Spec Bundle：

- 背景解读
- 强制要求
- 验收标准
- 冲突处理规则
- Checkpoint 规则
- 本轮不做

---

### Phase 3：Preflight / Hygiene Gate

任何涉及以下内容的任务必须先做卫生检查：

- 日志
- 指标
- ETL
- dashboard
- runner
- scorer
- gate
- 数据清洗
- schema
- 实验平台

Preflight 未通过，禁止实现。

---

### Phase 4：Execution Plan

输出：

- 修改哪些文件
- 不修改哪些文件
- 本轮最小闭环
- 修改顺序
- 验证顺序
- 风险点
- 失败时停下条件

---

### Phase 5：Controlled Execution

一次只做一个最小闭环任务。  
禁止顺手扩展。

---

### Phase 6：Self-check

完成后输出：

- 修改摘要
- 自查结果
- 未通过项
- 风险项
- 严格口径 / 推断口径
- 最小验证清单
- 下一步候选 A/B

---

### Phase 7：Human Review

等待用户拍板。  
没有用户批准，不得自动继续。

---

## 冲突处理模板

如果发现文档与当前项目冲突，必须暂停：

```md
冲突点：
文档中的描述：
当前项目中的实际情况：
我的判断：
候选处理方案 A：
候选处理方案 B：
我暂停在这里等待确认：
```

---

## 最短提问模板

用户可用以下格式发起任务：

```md
本轮目标：
真实约束：
输入材料：
输出形式：
冲突处理要求：
本轮不做：
是否先做理解清单：
是否需要 Preflight / Hygiene Gate：
我希望你用 Level 几的教练式辅助：
```

---

## 子 skill 调用规则

- 如果用户说“我没理解”，优先调用 `02_discussion_mode.md` 或 `03_layered_explanation.md`
- 如果用户说“请执行”，但尚未经过理解清单，必须先回到理解阶段
- 如果任务涉及数据/日志/指标/实验，必须调用 `04_preflight_hygiene.md`
- 如果已经写代码，必须调用 `06_acceptance_review.md`
- 如果涉及命令或验证，必须调用 `07_coach_mode.md`
