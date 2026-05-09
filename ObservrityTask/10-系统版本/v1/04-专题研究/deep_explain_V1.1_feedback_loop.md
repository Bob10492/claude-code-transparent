# Deep Explain V1.1：富证据反馈回路开发总结

## 开发背景

V1 基础版 `explain_action` 能生成单层 Mermaid 流程图 + min/mid 细节的 action report，但面对复杂 action（60+ phases、121 tool calls、大量 subagent 嵌套）时：
- Mermaid 图 99KB / 1675 行 / 500+ 节点，无法在网页端渲染
- 没有分阶段、分层次的可读结构
- Agent prompt 内容被误判为 problem，大量误报 repair chain
- artifact 缺乏分类，模板 PPT 和最终产物混为一谈

## V1.1 核心能力

### 分层输出系统

从"一个巨大不可渲染的 Mermaid" 重构为 `overview + phase chunks + debug flow + artifact flow + graph index` 五层结构：

| 层级 | 文件 | 适用场景 | 典型大小 |
|---|---|---|---|
| Overview | `rich_stage_flow.overview.mmd` | 5 分钟快速概览 | 13KB / 63 nodes |
| Phase Details | `rich_stage_flow.part_XX_phase_YY_ZZ.mmd` | 30 分钟分阶段深入 | 10-18KB / 49-87 nodes |
| Full | `rich_stage_flow.full.mmd` | 取证分析 | ~92KB / 473 nodes（标记为不可渲染） |
| Debug | `debug_chain_flow.mmd` | 修复链路追踪 | ~2KB / 16 nodes |
| Artifact | `artifact_flow.mmd` | 产物流转链 | ~4.5KB / 29 nodes |

### 新增文件

- `graph_manifest.json` — 所有图的 size/line/node/edge/subgraph 统计，标记不可渲染图
- `graph_index.md` — 图索引入口，附带阅读路径建议（5-min / 30-min / Forensics）
- `artifact_flow.mmd` — input → intermediate → script → final 产物链

### 降噪修复

| 问题 | 修复前 | 修复后 |
|---|---|---|
| repair chain 误报 | ~22+（含 Agent prompt 误判） | 2（仅真实 Python traceback） |
| detected_problem 误报 | ~15+ 次 | 0 次 |
| turn fallback 交叉污染 | 所有 turn 启用 | 仅单工具 turn 启用 |
| 低价值结果污染 | Fork started / Async agent launched 被计入 result | 自动过滤 |

### 制品分类

| 分类规则 | 示例 |
|---|---|
| `input` | 模板 PPT、论文 docx、对齐样本 txt |
| `intermediate` | `ppt_analysis.txt`、`thesis_extract.txt`、`XXX_v4.pptx` |
| `script` | `generate_ppt.py`、`generate_ppt_final.py` |
| `final` | `XXX.pptx`、`XXX_final.pptx`、`zsn_ppt.pptx` |
| `media` | `*.png`、`*.jpg` |

## 改动的文件（7 个）

| 文件 | 改动要点 |
|---|---|
| `lib/deep_action_types.ts` | 新增 `GraphProfile`、`GraphStats`、`GraphChunkManifest`、`GraphManifest` 类型 |
| `lib/tool_result_extractor.ts` | 从 problem detection 源中移除 `input_summary`/`prompt_summary`；添加低价值结果过滤器 `LOW_VALUE_RESULT_PATTERNS`；turn fallback 限制为单工具 turn |
| `lib/repair_chain_detector.ts` | Agent 工具排除出 `isProblemTool`；收紧 `rootCauseGuess` 判定模式；收紧 `sameLoop` 检测字段来源 |
| `lib/artifact_tracker.ts` | `classifyArtifact` 引入上下文参数；模板→input，版本→intermediate，成品→final；新增 `buildArtifactFlow()` 生成产物链图 |
| `lib/mermaid_rich_graph.ts` | 新增 `computeGraphStats()`、`buildOverviewFlow()`、`buildPhaseChunkFlow()`、`buildGraphManifest()`、`buildGraphIndex()` |
| `lib/deep_report_writer.ts` | 接受 `GraphManifest` 参数；新增 Recommended Reading Path 表格；新增 size guard 警告（>80KB 或 >300 nodes） |
| `deep_explain_action.ts` | 生成所有分层输出文件；传递 manifest 到 report writer |

## 不改动的地方

- Query loop（`src/query.ts`、`QueryEngine.ts`）
- 运行时埋点（observability schema / event capture）
- Mermaid Live Editor 兼容性（标准 `flowchart TD` 语法）
- V2 benchmark pipeline

## 验收

```bash
# 对复杂 action 生成完整报告
powershell -ExecutionPolicy Bypass -File scripts\observability\deep_explain_action.ps1 -UserActionId 0e05fe1b-ece6-4f6b-9f90-b862e0e88308
```

生成文件位于 `ObservrityTask/action-reports/deep/user_action_0e05fe1b/`：

```
deep_report.md                 # 主报告（含阅读路径 + size guard）
rich_stage_flow.overview.mmd   # 5 分钟入口
rich_stage_flow.full.mmd       # 完整取证图（标记为不可渲染）
rich_stage_flow.part_*.mmd     # 6 个分块图（可渲染）
artifact_flow.mmd              # 产物链
debug_chain_flow.mmd           # 修复链路
graph_manifest.json            # 图索引元数据
graph_index.md                 # 阅读导航
```

## 后续方向

- V2 引入 causality graph（因果图替代阶段式 flow）
- `extract_memories` 集成到 report 中
- 跨 action 对比分析（Compare mode）
