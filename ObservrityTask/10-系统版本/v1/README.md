# V1 目录索引

当前目录保存可观测系统 V1 的稳定文档。

## 子目录

- `01-总览`
  - V1 主研究报告与 dashboard
- `02-Schema与指标`
  - 事件 Schema、DuckDB Schema、指标定义、日志阅读教学
- `03-样例`
  - 基于真实 `user_action_id` 生成的样例解析
- `04-专题研究`
  - 与当前 V1 一致，但更偏专题分析的研究文档

## 建议阅读顺序

1. `01-总览/当前可观测系统V1深度研究报告.md`
2. `02-Schema与指标/`
3. `03-样例/`
4. `04-专题研究/`

## 单次动作报告与 Mermaid 图

如果你想分析最近一次用户动作的完整运行轨迹，使用：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\observability\explain_action.ps1 -Latest -SnapshotDb
```

如果你已经知道 `user_action_id`，使用：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\observability\explain_action.ps1 -UserActionId <你的user_action_id> -SnapshotDb
```

生成报告会包含两份 Mermaid：

- `Mermaid Overview`：适合快速看主线程、子 agent、分支原因、成本和时延。
- `Mermaid Detailed DAG`：适合逐轮看 turn、工具调用聚合、循环次数、分支挂载位置。

默认优先写入 `03-样例`。如果当前环境不能在该目录中新建文件，脚本会自动写入 `.observability/action-reports/`，并在命令输出中提示最终路径。

如果想直接看到渲染后的流程图，而不是手动复制 Mermaid，可以使用：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\observability\render_action_mermaid.ps1 -Latest -SnapshotDb -Open
```

常用参数：

- `-Diagram overview`：默认值，生成压缩总览图。
- `-Diagram detailed`：生成逐 turn 展开的详细 DAG。
- `-UserActionId <id>`：渲染指定用户动作。
- `-OutputPath <html路径>`：指定 HTML 输出位置。

生成的 HTML 默认位于 `.observability/action-flowcharts/`。页面会从 Mermaid CDN 加载渲染库；如果浏览器无法访问网络，可以回退到报告里的 Mermaid 代码块。
