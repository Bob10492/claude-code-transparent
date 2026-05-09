import type { ArtifactRecord, PhaseRecord, RichToolCall } from "./deep_action_types"

const FILE_PATTERN =
  /([A-Za-z]:[\\/][^\s"'`<>|]+|(?:\.{1,2}[\\/])?[\w .-]+(?:[\\/][\w .-]+)*\.(?:docx|pptx|txt|json|py|js|ts|ps1|csv|md|xml|html|png|jpg|jpeg|svg|pdf|xlsx|output))/giu

function unique<T>(values: T[]): T[] {
  return [...new Set(values)]
}

function normalizePath(path: string): string {
  return path
    .trim()
    .replace(/^["']|["']$/gu, "")
    .replace(/\\/gu, "/")
    .replace(/^([A-Za-z]:)\/+/u, "$1/")
    .replace(/([^:])\/{2,}/gu, "$1/")
}

function isLikelyPath(path: string): boolean {
  const normalized = normalizePath(path)
  if (!normalized) return false
  if (/[{}<>]/u.test(normalized)) return false
  if (!/\.[A-Za-z0-9]{1,8}$/u.test(normalized)) return false
  if (/^[A-Za-z]:$/u.test(normalized)) return false
  if (normalized.startsWith("/") && normalized.split("/").length < 3) return false
  return true
}

function extractPaths(text: string): string[] {
  return unique(
    [...text.matchAll(FILE_PATTERN)]
      .map(match => normalizePath(match[1] ?? ""))
      .filter(isLikelyPath),
  )
}

function classifyArtifact(path: string, context?: { toolName?: string; phaseKind?: string }): string {
  const lowered = normalizePath(path).toLowerCase()
  const base = lowered.split("/").at(-1) ?? lowered

  if (/\.(py|js|ts|ps1)$/u.test(lowered)) return "script"
  if (/\.(pptx)$/u.test(lowered)) {
    if (/template|模板|叶先圆|model|master/iu.test(base)) return "input"
    const nameWithoutExt = base.replace(/\.pptx$/iu, "")
    if (/v[2-9]|v\d{2,}|_draft|_wip/iu.test(nameWithoutExt)) return "intermediate"
    if (/final|_clean|_release/iu.test(nameWithoutExt)) return "final"
    if (context?.phaseKind === "output" || context?.toolName === "Bash") return "final"
    if (context?.toolName === "Read" || context?.toolName === "Grep" || context?.toolName === "Glob") return "input"
    return "final"
  }
  if (/\.(docx|pdf)$/u.test(lowered)) return "input"
  if (/\.txt$/u.test(lowered)) {
    if (/extract|analysis|分析/iu.test(base)) return "intermediate"
    return "input"
  }
  if (/\.(png|jpg|jpeg|svg)$/u.test(lowered)) return "media"
  if (/\.(md|csv|json|xml|html|xlsx|output)$/u.test(lowered)) return "intermediate"
  return "other"
}

function toolTouchesArtifact(tool: RichToolCall, path: string): boolean {
  return tool.touched_files.includes(path) || tool.produced_files.includes(path) || tool.result_files.includes(path)
}

export function enrichToolPaths(tools: RichToolCall[]): RichToolCall[] {
  return tools.map(tool => {
    const discovered = extractPaths(
      [
        tool.command_or_path,
        tool.input_summary,
        tool.output_summary,
        tool.stdout_summary,
        tool.stderr_summary,
        tool.result_summary_rich,
      ]
        .filter(Boolean)
        .join("\n"),
    )
    const touched = unique([...tool.touched_files, ...discovered].map(normalizePath).filter(isLikelyPath))
    const produced = unique(
      [...tool.produced_files, ...tool.result_files]
        .map(normalizePath)
        .filter(isLikelyPath),
    )
    const resultFiles = unique([...tool.result_files, ...discovered].map(normalizePath).filter(isLikelyPath))
    return {
      ...tool,
      touched_files: touched,
      produced_files: produced,
      result_files: resultFiles,
    }
  })
}

export function buildArtifactChain(
  tools: RichToolCall[],
  phasesByToolId: Map<string, PhaseRecord>,
): ArtifactRecord[] {
  const artifacts = new Map<string, ArtifactRecord>()

  for (const tool of tools) {
    const phase = phasesByToolId.get(tool.tool_call_id)
    const phaseId = phase?.phase_id ?? "unknown"
    const paths = unique([...tool.touched_files, ...tool.produced_files, ...tool.result_files].map(normalizePath).filter(isLikelyPath))
    for (const path of paths) {
      const existing = artifacts.get(path)
      const produced = tool.produced_files.includes(path) || tool.result_files.includes(path)
      if (!existing) {
        const context = { toolName: tool.tool_name, phaseKind: phase?.stage_kind }
        artifacts.set(path, {
          artifact_path: path,
          artifact_type: classifyArtifact(path, context),
          first_seen_phase: phaseId,
          created_by_tool: produced ? tool.tool_name : "",
          created_by_tool_call_id: produced ? tool.tool_call_id : null,
          created_by_phase_id: produced ? phaseId : null,
          modified_by_tools: toolTouchesArtifact(tool, path) ? [tool.tool_name] : [],
          modified_by_tool_call_ids: toolTouchesArtifact(tool, path) ? [tool.tool_call_id] : [],
          phase_ids: phaseId ? [phaseId] : [],
          evidence_refs: [...tool.evidence_refs],
        })
        continue
      }
      if (!existing.created_by_tool && produced) {
        existing.created_by_tool = tool.tool_name
        existing.created_by_tool_call_id = tool.tool_call_id
        existing.created_by_phase_id = phaseId
      }
      if (toolTouchesArtifact(tool, path)) {
        existing.modified_by_tools = unique([...existing.modified_by_tools, tool.tool_name])
        existing.modified_by_tool_call_ids = unique([...existing.modified_by_tool_call_ids, tool.tool_call_id])
      }
      existing.phase_ids = unique([...existing.phase_ids, phaseId])
      existing.evidence_refs = unique([...existing.evidence_refs, ...tool.evidence_refs])
    }
  }

  return [...artifacts.values()].sort((left, right) => left.artifact_path.localeCompare(right.artifact_path))
}

function esc(text: string): string {
  return text.replaceAll('"', "'").replaceAll("\n", "<br/>")
}

function shortFileName(path: string): string {
  return path.split("/").at(-1) ?? path.split("\\").at(-1) ?? path
}

export function buildArtifactFlow(artifacts: ArtifactRecord[]): string {
  const lines = [
    "flowchart LR",
    "  classDef input fill:#ecfeff,stroke:#0f766e,color:#042f2e",
    "  classDef intermediate fill:#f8fafc,stroke:#64748b,color:#0f172a",
    "  classDef script fill:#eef2ff,stroke:#4338ca,color:#1e1b4b",
    "  classDef final fill:#dcfce7,stroke:#16a34a,color:#14532d",
    "  classDef media fill:#fef3c7,stroke:#b45309,color:#451a03",
    "  classDef other fill:#f1f5f9,stroke:#94a3b8,color:#334155",
  ]

  const byType = new Map<string, ArtifactRecord[]>()
  for (const artifact of artifacts) {
    const list = byType.get(artifact.artifact_type) ?? []
    list.push(artifact)
    byType.set(artifact.artifact_type, list)
  }

  const allNodes: Array<{ id: string; artifact: ArtifactRecord }> = []
  let nodeIndex = 0
  for (const type of ["input", "intermediate", "script", "final", "media", "other"]) {
    for (const artifact of byType.get(type) ?? []) {
      nodeIndex += 1
      const id = `A${nodeIndex}`
      allNodes.push({ id, artifact })
      lines.push(`  ${id}["${esc(shortFileName(artifact.artifact_path))}<br/>${artifact.artifact_type}"]`)
      lines.push(`  class ${id} ${artifact.artifact_type}`)
    }
  }

  const nodeByPath = new Map(allNodes.map(n => [n.artifact.artifact_path, n]))

  for (const artifact of artifacts) {
    const target = nodeByPath.get(artifact.artifact_path)
    if (!target) continue
    for (const modTool of artifact.modified_by_tools) {
      const sources = artifacts.filter(
        other =>
          other.artifact_path !== artifact.artifact_path &&
          other.created_by_tool === modTool &&
          (other.artifact_type === "input" || other.artifact_type === "intermediate"),
      )
      for (const source of sources.slice(0, 3)) {
        const sourceNode = nodeByPath.get(source.artifact_path)
        if (sourceNode) {
          lines.push(`  ${sourceNode.id} --> ${target.id}`)
        }
      }
    }
  }

  const typeOrder = ["input", "intermediate", "script", "final"]
  for (let i = 0; i < typeOrder.length - 1; i++) {
    const fromType = typeOrder[i]!
    const toType = typeOrder[i + 1]!
    const fromNodes = (byType.get(fromType) ?? []).map(a => nodeByPath.get(a.artifact_path)).filter(Boolean)
    const toNodes = (byType.get(toType) ?? []).map(a => nodeByPath.get(a.artifact_path)).filter(Boolean)
    if (fromNodes.length > 0 && toNodes.length > 0) {
      const subgraphId = `SG_${fromType}_${toType}`
      lines.push(`  subgraph ${subgraphId}["${fromType} → ${toType}"]`)
      for (const from of fromNodes.slice(0, 5)) {
        for (const to of toNodes.slice(0, 3)) {
          lines.push(`    ${from!.id} -.-> ${to!.id}`)
        }
      }
      lines.push("  end")
    }
  }

  return lines.join("\n")
}
