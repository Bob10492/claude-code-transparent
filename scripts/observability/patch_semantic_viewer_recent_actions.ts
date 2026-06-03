import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"
import type { SemanticViewerIndexEntry } from "./lib/deep_action_types"

const repoRoot = resolve(import.meta.dir, "..", "..")
const defaultViewerRoot = join(repoRoot, "ObservrityTask", "action-reports", "deep")

type Args = {
  viewerRoot: string
  limit: number
}

function parseArgs(argv: string[]): Args {
  const args: Args = { viewerRoot: defaultViewerRoot, limit: 5 }
  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index]
    if (current === "--viewer-root") args.viewerRoot = resolve(argv[++index] ?? defaultViewerRoot)
    if (current === "--limit") args.limit = Number(argv[++index] ?? "5")
  }
  if (!Number.isFinite(args.limit) || args.limit <= 0) args.limit = 5
  return args
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

function readIndex(viewerRoot: string): SemanticViewerIndexEntry[] {
  const indexPath = join(viewerRoot, "semantic_viewer_index.json")
  if (!existsSync(indexPath)) throw new Error(`semantic viewer index not found: ${indexPath}`)
  const parsed = JSON.parse(readFileSync(indexPath, "utf8")) as SemanticViewerIndexEntry[]
  return [...parsed].sort((left, right) => right.generated_at.localeCompare(left.generated_at))
}

function recentCard(entries: SemanticViewerIndexEntry[], limit: number): string {
  const recent = entries.slice(0, limit)
  const rows = recent.map((entry, index) => {
    const id = escapeHtml(entry.user_action_id)
    const shortId = escapeHtml(entry.user_action_id.slice(0, 8))
    const meta = escapeHtml(`${entry.output_dir_name} · tools=${entry.tool_call_count} · queries=${entry.query_count}`)
    const path = escapeHtml(entry.relative_viewer_path)
    return `
          <div class="recent-action-row">
            <div class="recent-action-rank">#${index + 1}</div>
            <input class="recent-action-id" value="${id}" readonly aria-label="Recent user action id ${shortId}" />
            <a class="recent-action-open" href="${path}" target="semantic-viewer-frame">Open</a>
            <div class="recent-action-meta">${meta}</div>
          </div>`
  }).join("")

  return `
      <section class="app-card" id="recent-user-actions-card">
        <div class="section-label" style="margin-top:0;">Recent User Actions</div>
        <div class="notebook-tip">最近 ${recent.length} 次已生成 viewer 的 user action id。点击输入框后 Ctrl/Cmd+C 复制，再粘贴到上方搜索框即可查找。</div>
        <div class="recent-action-list">${rows}
        </div>
      </section>`
}

function recentStyle(): string {
  return `
    .recent-action-list {
      display: grid;
      gap: 10px;
      margin-top: 10px;
    }
    .recent-action-row {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      gap: 8px;
      align-items: center;
      border: 1px solid var(--nb-line);
      border-radius: 16px;
      background: #fff;
      padding: 10px;
    }
    .recent-action-rank {
      color: var(--nb-muted);
      font-size: 12px;
      font-weight: 700;
    }
    .recent-action-id {
      min-width: 0;
      border: 1px solid var(--nb-line);
      border-radius: 10px;
      padding: 8px 9px;
      color: var(--nb-ink);
      background: #fbfdff;
      font: 12px/1.4 Consolas, "SFMono-Regular", monospace;
    }
    .recent-action-open {
      color: var(--nb-accent);
      font-size: 12px;
      font-weight: 700;
      text-decoration: none;
    }
    .recent-action-meta {
      grid-column: 2 / 4;
      color: var(--nb-muted);
      font-size: 12px;
      line-height: 1.45;
      overflow-wrap: anywhere;
    }
  `
}

function patchDashboardHtml(html: string, entries: SemanticViewerIndexEntry[], limit: number): string {
  const cleaned = html
    .replace(/\n\s*\.recent-action-list \{[\s\S]*?\.recent-action-meta \{[\s\S]*?\n\s*\}/u, "")
    .replace(/\n\s*<section class="app-card" id="recent-user-actions-card">[\s\S]*?<\/section>/u, "")

  const withStyle = cleaned.includes("</style>")
    ? cleaned.replace("</style>", `${recentStyle()}\n  </style>`)
    : cleaned

  const card = recentCard(entries, limit)
  const marker = "      <section class=\"app-card\">\n        <div class=\"section-label\" style=\"margin-top:0;\">Reading Flow</div>"
  if (withStyle.includes(marker)) {
    return withStyle.replace(marker, `${card}\n${marker}`)
  }

  return withStyle.replace("    </aside>", `${card}\n    </aside>`)
}

function main(): void {
  const args = parseArgs(process.argv.slice(2))
  const appPath = join(args.viewerRoot, "semantic_viewer_app.html")
  if (!existsSync(appPath)) throw new Error(`semantic viewer app not found: ${appPath}`)
  const entries = readIndex(args.viewerRoot)
  const currentHtml = readFileSync(appPath, "utf8")
  const patched = patchDashboardHtml(currentHtml, entries, args.limit)
  writeFileSync(appPath, patched, "utf8")
  console.log(JSON.stringify({ appPath, recentActionCount: Math.min(entries.length, args.limit) }, null, 2))
}

main()
