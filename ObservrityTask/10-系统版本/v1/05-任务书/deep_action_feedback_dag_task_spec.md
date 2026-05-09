# 任务书：基于 V1 可观测系统建设单个 user_action_id 的富证据反馈链路与复杂 DAG

## 0. 任务定位

本任务不是建设完整 V2 评测平台，也不是归因某个平台效果更好。

本任务只做一件事：

> 在当前仓库已有 V1 可观测系统基础上，为单个或少量连续 `user_action_id` 生成一份比现有 `explain_action.ps1` 更丰富的“富证据链路报告”和“复杂 DAG”。

现有 `explain_action.ps1` 已能生成 action 级 Markdown + Mermaid，展示 `user_action / query / turn / tool / subagent` 的基础链路。本任务要在此基础上补充：

- 阶段级时间线；
- 每个阶段对应的真实 turn/query/tool；
- 关键 snapshot 内容解析；
- Agent prompt / Bash command / Write content / Edit diff 摘要；
- 文件产物链；
- 问题与修复链；
- 更复杂、更可读的阶段级 DAG。

最终目标是：

> 不只看到 DAG 上“调用了 Bash / Write / Edit”，而是能看到这些工具调用在业务上做了什么、为什么做、产出了什么、耗时多少、证据来自哪里。

---

## 1. 现有仓库依据

本任务必须忠实依赖现有仓库能力。

README 已说明本地可观测系统 V1 支持把一次 `user_action` 展开成 `query / turn / tool / subagent`，看主线程和子链路 token 成本、链路完整性、subagent 触发原因，并自动生成 Mermaid flowchart。

V1 深度研究报告也明确：当前系统以 `.observability/*.jsonl + snapshots/*.json + DuckDB` 为事实源，定位是本地 agent 调试系统，能把一次 `user_action` 展开成主线程 query、subagent query、turn、tool call、snapshot 的完整事实链。

当前仓库已有：

- `scripts/observability/explain_action.ps1`
- `scripts/observability/read_timeline.ps1`
- `scripts/observability/build_duckdb_etl.ts`

其中：

- `explain_action.ps1` 已经读取 `user_actions / queries / turns / subagents / tools / usage_facts / events_raw`，生成基础 Markdown + Mermaid；
- `read_timeline.ps1` 已能按 `UserActionId / QueryId / SubagentId` 输出时间线；
- `build_duckdb_etl.ts` 已经构建 `events_raw / queries / turns / tools / subagents / snapshots_index / usage_facts` 等事实表。

仓库 V2 文档强调：

- V1 已解决“看见发生了什么”；
- V2 不应重复建设日志层；
- 新能力应优先复用 V1 数据；
- 只有当评测目标需要额外证据时，才做最小必要增量埋点。

本任务遵守该原则：第一版不改运行时埋点，先基于已有事件和 snapshot 做富证据报告。

---

## 2. 本任务不做什么

为了防止 scope 膨胀，本任务明确不做：

1. 不做完整 V2 benchmark runner；
2. 不做 baseline vs candidate 对比；
3. 不做远端 dashboard；
4. 不做全自动质量评分平台；
5. 不改 query loop 主流程；
6. 不新增大量 runtime 埋点；
7. 不做 GPT 网页端效果归因；
8. 不要求一次性支持所有任务类型。

第一版只支持：

> 单个 `user_action_id` 的深度复盘与复杂 DAG 生成。

---

## 3. 建议新增命令

新增脚本：

```powershell
scripts\observability\deep_explain_action.ps1
```

调用方式：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\observability\deep_explain_action.ps1 -UserActionId <id>
```

支持最近一次：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\observability\deep_explain_action.ps1 -Latest
```

支持指定输出目录：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\observability\deep_explain_action.ps1 -UserActionId <id> -OutputDir ObservrityTask\action-reports\deep
```

可选 TypeScript 实现：

```bash
bun scripts/observability/deep_explain_action.ts --user-action-id <id>
```

推荐实现方式：

- PowerShell 作为入口；
- TypeScript 做复杂 JSON/snapshot 解析；
- PowerShell 调用 Bun 脚本。

---

## 4. 交付物

针对一个 `user_action_id`，输出目录建议为：

```text
ObservrityTask/action-reports/deep/user_action_<short_id>/
```

需要生成：

```text
deep_report.md
rich_stage_flow.mmd
debug_chain_flow.mmd
phase_timeline_mapping.csv
tool_calls_rich.csv
artifact_chain.csv
snapshot_evidence_index.csv
```

### 4.1 deep_report.md

主报告，包含：

- 一句话总结；
- Basics；
- Query / Subagent 概览；
- 阶段级时间线；
- 复杂 DAG；
- Agent 分工；
- 工具调用语义复盘；
- 文件产物链；
- 问题与修复链；
- 证据索引；
- 当前报告可信度与缺失信息。

### 4.2 rich_stage_flow.mmd

阶段级 Mermaid，不再逐 turn 平铺，而是展示：

```text
输入读取
→ 子 agent 派生
→ 并行解析
→ 脚本生成
→ 脚本迭代
→ compact
→ 后期修复
→ 终检
→ 输出
```

每个节点包含：

- 时间范围；
- turn 范围；
- 工具组合；
- 关键做法；
- 输出；
- 问题或修复。

### 4.3 debug_chain_flow.mmd

问题修复链路 Mermaid，展示：

```text
发现问题
→ 定位根因
→ 修改脚本
→ 重跑
→ 检查
→ 是否通过
```

适合查看后半段为什么有大量 `Edit/Bash/Read`。

### 4.4 phase_timeline_mapping.csv

阶段映射表字段：

```text
phase_id, phase_name, start_local, end_local, duration_ms,
query_ids, turn_range, tool_counts, main_outputs, problems, evidence_refs
```

### 4.5 tool_calls_rich.csv

工具调用增强表字段：

```text
query_id, agent_name, turn_id, tool_name, detected_at, completed_at,
duration_ms, success, input_summary, output_summary, command_or_path,
intent_inferred, produced_files, touched_files, snapshot_refs
```

### 4.6 artifact_chain.csv

文件产物链字段：

```text
artifact_path, artifact_type, first_seen_phase, created_by_tool,
modified_by_tools, evidence_refs
```

### 4.7 snapshot_evidence_index.csv

证据索引字段：

```text
evidence_id, snapshot_ref, category, query_id, turn_id,
extracted_fields, summary
```

---

## 5. 实现任务拆解

## Phase A：复用现有 V1 查询

### A1. 增加入口脚本

新增：

```text
scripts/observability/deep_explain_action.ps1
```

职责：

1. 接收 `-UserActionId` / `-Latest`；
2. 定位 repo root；
3. 检查 DuckDB；
4. 解析输出目录；
5. 调用 TypeScript 分析器；
6. 打印生成的报告路径。

### A2. 复用 `explain_action.ps1` 查询逻辑

可以直接参考现有 `explain_action.ps1` 的 SQL，读取：

```sql
select * from user_actions where user_action_id = ?;
select * from queries where user_action_id = ? order by started_at_ms;
select * from turns where user_action_id = ? order by started_at_ms;
select * from tools where user_action_id = ? order by detected_at_ms;
select * from subagents where user_action_id = ? order by spawned_at_ms;
select * from usage_facts where user_action_id = ? and is_authoritative;
select * from events_raw where user_action_id = ? order by ts_wall_ms, event_idx;
select * from snapshots_index;
```

验收：

- 能对任意已有 `user_action_id` 生成基础 JSON dump；
- 与 `explain_action.ps1` 的 Basics 数字一致。

---

## Phase B：读取 snapshot 并抽取工具参数

### B1. 建立 snapshot reader

新增：

```text
scripts/observability/lib/snapshot_reader.ts
```

职责：

- 根据 `.observability/snapshots/<file>.json` 读取 JSON；
- 支持不存在文件时返回 missing；
- 支持按 category 识别：
  - request
  - response
  - state_after_turn
  - state_before_turn
  - messages_stage

### B2. 抽取 response 中的 tool_use

新增：

```text
scripts/observability/lib/tool_use_extractor.ts
```

需要支持从 response snapshot 提取：

- assistant text 摘要；
- tool_use 数组；
- tool name；
- tool input；
- tool_use id；
- 对应 turn/query。

工具输入提取重点：

#### Agent

```text
description
prompt
run_in_background
```

#### Bash

```text
command
description
timeout
```

#### Read

```text
file_path
offset
limit
```

#### Write

```text
file_path
content
```

#### Edit

```text
file_path
old_string
new_string
replace_all
```

### B3. 抽取 after_turn 中的工具结果

支持提取：

- Bash stdout/stderr；
- error；
- 文件存在性输出；
- 生成路径；
- 检查结果；
- 简短摘要。

验收：

- 能还原两个 Agent 的 description/prompt；
- 能还原 Bash command；
- 能还原 Write/Edit 涉及的文件与关键内容；
- 生成 `tool_calls_rich.csv`。

---

## Phase C：推断业务阶段

新增：

```text
scripts/observability/lib/phase_infer.ts
```

第一版规则基于通用信号，不做复杂 AI 判断。

### C1. 通用阶段规则

| 阶段 | 规则 |
|---|---|
| action_start | user_action 开始到第一轮工具调用前 |
| initial_read | 主线程早期 Read |
| spawn_subagents | 同一 turn 出现 Agent 工具 |
| subagent_work | 非 main_thread query |
| main_preparation | 主线程早期 Bash/Read，且尚未出现 Write |
| script_generation | 出现 Write 且文件扩展名为 `.py/.js/.ts/.ps1` |
| script_execution | Bash command 执行上述脚本 |
| inspection | Read 或 Bash 中出现 check/inspect/list/grep/scan |
| repair | Edit 或 Bash 中出现 fix/replace/patch |
| compact | query_source / agent_name 指向 compact 或 compaction |
| final_check | 后期检查最终 artifact |
| completion | TaskUpdate/end_turn/query.terminated |

### C2. PPT 任务轻量规则

若检测到 `.docx`、`.pptx`、`pptx`、`python-pptx`、`PptxGenJS`、`slides` 等信号，则启用 `ppt_deck` 规则。

额外阶段：

| 阶段 | 规则 |
|---|---|
| thesis_parse | command/prompt 包含 docx/python-docx/Word |
| template_parse | command/prompt 包含 pptx/python-pptx/template |
| media_extract | command 包含 word/media 或 ZipFile |
| image_caption_map | command/text 包含 blip/rels/caption/imageXX |
| deck_build | command 包含 pptxgenjs/create_ppt/generate_ppt |
| layout_check | command/text 包含 overlap/out-of-bounds |
| template_residue_cleanup | text 包含 BFZ/GDC/可逆SOFC/叶先圆 等旧词 |
| ppt_save_fix | text 包含 file lock/readonly/copy2/save |

验收：

- 能输出 `phase_timeline_mapping.csv`；
- 每个阶段至少有时间范围、turn 范围、工具组合；
- 对 PPT 样本能生成 10 到 20 个阶段，而不是 80 个 turn。

---

## Phase D：文件产物链追踪

新增：

```text
scripts/observability/lib/artifact_tracker.ts
```

### D1. 从工具输入输出中识别路径

识别：

- Windows 路径：`C:\...`
- POSIX 路径：`/mnt/data/...`
- 相对路径：`generate_ppt.py`
- 常见后缀：
  - `.docx`
  - `.pptx`
  - `.txt`
  - `.json`
  - `.py`
  - `.js`
  - `.csv`
  - `.md`

### D2. 文件分类

| 类型 | 例子 |
|---|---|
| input | 原始 `.docx`、`.pptx`、对齐样本 |
| intermediate | `thesis_extract.txt`、`ppt_analysis.txt` |
| script | `generate_ppt.py`、`create_defense_ppt.js` |
| final | 最终 `.pptx` |
| report | 检查报告、warnings |

### D3. 追踪 first_seen / modified_by

根据 tool_calls_rich 中的工具类型：

- Read：seen；
- Write：created；
- Edit：modified；
- Bash：可能 created/modified/checked，需要从 command/stdout 识别。

验收：

- 生成 `artifact_chain.csv`；
- PPT 案例能看到输入文件、中间文件、脚本版本、最终 PPT。

---

## Phase E：生成复杂 Mermaid

新增：

```text
scripts/observability/lib/mermaid_rich_graph.ts
```

### E1. rich_stage_flow.mmd

节点结构建议：

```text
阶段名
时间范围 / 耗时
turn 范围
工具组合
关键动作
输出 / 问题
```

节点类型：

- input
- main
- subagent
- compact
- script
- issue
- fix
- output

### E2. debug_chain_flow.mmd

从 phase 中筛选：

- problems 非空；
- fixes 非空；
- Edit 密集；
- Bash 失败或检查失败；
- 出现关键词：error / fail / residue / readonly / lock / replace / fix。

输出问题修复链。

### E3. 保留现有 detailed DAG 链接

`deep_report.md` 中应同时引用：

- 现有 explain_action 的 Mermaid Detailed DAG；
- 新的 rich_stage_flow；
- 新的 debug_chain_flow。

验收：

- Mermaid 可被 Mermaid Live Editor 解析；
- 节点数控制在 15 到 40 个；
- 不再出现 80 个 turn 完全平铺导致不可读。

---

## Phase F：生成 deep_report.md

新增：

```text
scripts/observability/lib/deep_report_writer.ts
```

报告结构：

```markdown
# Deep Action Report

## 1. 一句话总结
## 2. Basics
## 3. Query / Agent 分工
## 4. 阶段级时间线
## 5. 富证据复杂 DAG
## 6. 工具调用语义复盘
## 7. 文件产物链
## 8. 问题与修复链
## 9. Snapshot 证据索引
## 10. 缺失信息与可信度
```

### F1. Agent 分工

自动从 Agent tool input 中提取：

- description；
- prompt 摘要；
- child query_id；
- 运行时间；
- 工具数；
- 输出摘要。

### F2. 工具调用语义复盘

按工具分组：

- Read：读了什么；
- Bash：跑了什么；
- Write：写了什么；
- Edit：改了什么；
- Agent：派生了什么；
- Task：更新了什么状态。

### F3. 缺失信息

如果没有 snapshot，必须明确写：

```text
无法还原 Bash command，因为缺少 response snapshot。
```

不能假装知道。

验收：

- 报告能在一个 Markdown 中解释“这个 action 内部发生了什么”；
- 报告中每个关键判断都有 evidence_ref；
- 缺失信息明确标注。

---

## 6. Codex 实施建议

建议给本地 Codex 的任务 prompt：

```text
你需要在当前仓库的 V1 可观测系统基础上实现 deep_explain_action。
不要改 query loop，不要新增运行时埋点。
优先复用 scripts/observability/explain_action.ps1、read_timeline.ps1、build_duckdb_etl.ts 的事实表。
目标是为单个 user_action_id 生成富证据报告与复杂 Mermaid DAG。

请新增：
- scripts/observability/deep_explain_action.ps1
- scripts/observability/deep_explain_action.ts
- scripts/observability/lib/snapshot_reader.ts
- scripts/observability/lib/tool_use_extractor.ts
- scripts/observability/lib/phase_infer.ts
- scripts/observability/lib/artifact_tracker.ts
- scripts/observability/lib/mermaid_rich_graph.ts
- scripts/observability/lib/deep_report_writer.ts

输出：
- deep_report.md
- rich_stage_flow.mmd
- debug_chain_flow.mmd
- phase_timeline_mapping.csv
- tool_calls_rich.csv
- artifact_chain.csv
- snapshot_evidence_index.csv

验收：
1. -Latest 能运行；
2. 指定 UserActionId 能运行；
3. Basics 与 explain_action.ps1 一致；
4. 能从 response snapshot 抽出 Agent prompt、Bash command、Write/Edit 参数；
5. 能生成阶段级复杂 DAG；
6. 能生成文件产物链；
7. 缺 snapshot 时有明确 warning，不崩溃。
```

---

## 7. 最小验收样本

建议用你已经分析过的 PPT action 作为第一验收样本。

预期应能还原：

- 主线程；
- 两个 fork agent；
- compact；
- Agent 1 的 Word 论文读取任务；
- Agent 2 的 PPT 模板分析任务；
- 多版生成脚本；
- 后期 Edit/Bash 修复链；
- 最终 PPT 输出；
- 阶段级 timeline。

---

## 8. 验收标准

### 必须通过

- `deep_explain_action.ps1 -Latest` 可执行；
- 输出目录创建成功；
- `deep_report.md` 存在；
- `rich_stage_flow.mmd` 存在；
- `tool_calls_rich.csv` 存在；
- `phase_timeline_mapping.csv` 存在；
- 报告 Basics 与 `explain_action.ps1` 一致；
- 若 snapshot 存在，能提取工具参数；
- 若 snapshot 缺失，报告中说明缺失。

### 建议通过

- 对 PPT action 能正确识别阶段；
- 能识别 input/intermediate/script/final artifacts；
- 能识别 dense repair section；
- Mermaid 可渲染；
- 节点数不爆炸。

### 暂不要求

- 自动评分；
- baseline/candidate 对比；
- V2 scenario/run/score 数据库；
- UI dashboard；
- 模型裁判。

---

## 9. 后续演进方向

完成本任务后，再进入下一阶段：

1. 增加 `Scenario` 参数；
2. 增加 `ppt_deck` 专用 analyzer；
3. 增加质量评分；
4. 增加多 action 对比；
5. 再接入 V2 的 `scenario / variant / run / score`。

本任务是反馈系统的第一块积木：

> 先让系统能把一个 action 讲清楚，再让系统评价它好不好，最后再让系统比较哪种做法更好。
