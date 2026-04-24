# 第一批 Scenario 候选集

## 0. 理解清单

- 第一批 scenario 的目标不是覆盖所有任务，而是搭出第一套可比较、可复现、可解释的 benchmark 基线。
- 第一批 scenario 必须同时覆盖：
  - 完成度
  - 决策质量
  - 效率
  - 稳定性
  - 可控性
- 第一批 scenario 也必须能触达：
  - harness 行为
  - skill 行为
  - tool 行为
  - model 行为

## 1. 预期效果

第一批 scenario 集落地后，V2 第一阶段就不再是空框架，而会有一组真正能跑的 benchmark 骨架。

这批场景至少能支持你回答：

- 某次架构改动有没有明显提升完成率
- 某个 skill 是否命中更准
- 某个 tool 是否更常被正确使用
- 某个模型是否只是更贵但没有更好

## 2. 设计思路

- 第一批 scenario 数量控制在 8 到 12 个，优先覆盖能力面，而不是追求海量。
- 每个 scenario 至少要有：
  - 1 条规则型 expectation
  - 1 条结构型 expectation
- 第一批场景描述以“任务目标 + 观察重点”为主，便于后续转成机器可执行 manifest。

## 3. 第一批候选

1. `readme_summary`
   - 类型：阅读理解
   - 重点：任务完成度、基础成本

2. `code_symbol_locate`
   - 类型：代码定位
   - 重点：tool 选择是否合理

3. `single_file_fix`
   - 类型：单文件修改
   - 重点：完成度、可控性

4. `multi_file_change`
   - 类型：多文件修改
   - 重点：结构稳定性、成本

5. `tool_choice_sensitive`
   - 类型：工具选择敏感
   - 重点：决策质量

6. `memory_branch_sensitive`
   - 类型：subagent / memory 敏感
   - 重点：subagent 触发与成本放大

7. `loop_risk_task`
   - 类型：容易绕路或循环
   - 重点：稳定性、turn 约束

8. `cost_sensitive_task`
   - 类型：成本敏感
   - 重点：效率 tradeoff

## 4. 当前机器可用落地

这批候选已经同步落地为第一版机器目录骨架：

- [tests/evals/v2/scenarios/first-batch-catalog.json](/abs/path/E:/claude-code/tests/evals/v2/scenarios/first-batch-catalog.json:1)
- [tests/evals/v2/scenarios/_scenario.template.json](/abs/path/E:/claude-code/tests/evals/v2/scenarios/_scenario.template.json:1)
