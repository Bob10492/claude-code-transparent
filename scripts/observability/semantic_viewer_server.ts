import { spawnSync } from "node:child_process"
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import { extname, isAbsolute, join, relative, resolve } from "node:path"
import type { SemanticViewerData, SemanticViewerIndexEntry, SemanticViewerRecentDbAction } from "./lib/deep_action_types"
import { renderSemanticViewerDirectoryAppHtml } from "./lib/semantic_dialogue_viewer"

const repoRoot = resolve(import.meta.dir, "..", "..")
const defaultViewerRoot = join(repoRoot, "ObservrityTask", "action-reports", "deep")
const defaultDuckDbExe = join(repoRoot, "tools", "duckdb", "duckdb.exe")
const defaultDbPath = join(repoRoot, ".observability", "observability_v1.duckdb")
const defaultRebuildScript = join(repoRoot, "scripts", "observability", "rebuild_observability_db.ps1")
const defaultDeepExplainScript = join(repoRoot, "scripts", "observability", "deep_explain_action.ts")

export type SemanticViewerServerArgs = {
  viewerRoot: string
  host: string
  port: number
}

export type SemanticViewerServerOptions = {
  viewerRoot: string
  duckDbExe?: string
  dbPath?: string
  rebuildScript?: string
  deepExplainScript?: string
  commandRunner?: CommandRunner
}

export type CommandResult = {
  status: number | null
  stdout: string
  stderr: string
}

export type CommandRunner = (command: string, args: string[]) => CommandResult
export type RecentDbActionRow = {
  user_action_id: string
  started_at: string
  duration_ms: number | null
  query_count: number
  tool_call_count: number
}

function textResponse(body: string, status = 200, contentType = "text/plain; charset=utf-8"): Response {
  return new Response(body, {
    status,
    headers: {
      "content-type": contentType,
      "cache-control": "no-store",
    },
  })
}

function jsonResponse(value: unknown, status = 200): Response {
  return textResponse(JSON.stringify(value, null, 2), status, "application/json; charset=utf-8")
}

const defaultCommandRunner: CommandRunner = (command, args) => {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 128,
    windowsHide: true,
  })
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  }
}

function commandJsonResponse(result: CommandResult, extra: Record<string, unknown> = {}): Response {
  const ok = result.status === 0
  return jsonResponse(
    {
      ok,
      status: result.status,
      stdout: result.stdout.trim(),
      stderr: result.stderr.trim(),
      ...extra,
    },
    ok ? 200 : 500,
  )
}

function parsePort(value: string | undefined): number {
  const port = Number(value)
  if (!Number.isInteger(port) || port <= 0 || port > 65535) return 8765
  return port
}

export function parseSemanticViewerServerArgs(argv: string[]): SemanticViewerServerArgs {
  const args: SemanticViewerServerArgs = {
    viewerRoot: defaultViewerRoot,
    host: "127.0.0.1",
    port: 8765,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index]
    if (current === "--root" || current === "--viewer-root") args.viewerRoot = resolve(argv[++index] ?? defaultViewerRoot)
    if (current === "--host") args.host = argv[++index] ?? args.host
    if (current === "--port") args.port = parsePort(argv[++index])
  }

  args.viewerRoot = resolve(args.viewerRoot)
  if (!args.host.trim()) args.host = "127.0.0.1"
  return args
}

function isInsideRoot(root: string, candidate: string): boolean {
  const normalizedRoot = resolve(root)
  const normalizedCandidate = resolve(candidate)
  const rel = relative(normalizedRoot, normalizedCandidate)
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel))
}

function safeJoin(root: string, relativePath: string): string | null {
  const cleaned = relativePath.replaceAll("\\", "/").replace(/^\/+/u, "")
  const candidate = resolve(root, cleaned)
  if (!isInsideRoot(root, candidate)) return null
  return candidate
}

function readDataEntry(root: string, outputDirName: string): SemanticViewerIndexEntry | null {
  const dataPath = join(root, outputDirName, "semantic_viewer.data.json")
  const viewerPath = join(root, outputDirName, "semantic_viewer.html")
  if (!existsSync(dataPath) || !existsSync(viewerPath)) return null
  try {
    const parsed = JSON.parse(readFileSync(dataPath, "utf8")) as SemanticViewerData
    const generatedAt = statSync(dataPath).mtime.toISOString()
    return {
      user_action_id: parsed.action.user_action_id,
      output_dir_name: outputDirName,
      relative_viewer_path: `/view/${encodeURIComponent(parsed.action.user_action_id)}`,
      selected_by: parsed.action.selected_by,
      terminal_reason: parsed.action.terminal_reason,
      generated_at: generatedAt,
      query_count: parsed.action.query_count,
      tool_call_count: parsed.action.tool_call_count,
    }
  } catch {
    return null
  }
}

function normalizeServerEntry(entry: SemanticViewerIndexEntry): SemanticViewerIndexEntry {
  return {
    ...entry,
    relative_viewer_path: `/view/${encodeURIComponent(entry.user_action_id)}`,
  }
}

export function readSemanticViewerIndex(viewerRoot: string): SemanticViewerIndexEntry[] {
  const root = resolve(viewerRoot)
  const indexPath = join(root, "semantic_viewer_index.json")
  if (existsSync(indexPath)) {
    try {
      const parsed = JSON.parse(readFileSync(indexPath, "utf8")) as SemanticViewerIndexEntry[]
      return parsed.map(normalizeServerEntry).sort((left, right) => right.generated_at.localeCompare(left.generated_at))
    } catch {
      // Fall through to directory scan so a damaged index does not make the local server useless.
    }
  }

  if (!existsSync(root)) return []
  const entries: SemanticViewerIndexEntry[] = []
  for (const dirent of readdirSync(root, { withFileTypes: true })) {
    if (!dirent.isDirectory()) continue
    const entry = readDataEntry(root, dirent.name)
    if (entry) entries.push(entry)
  }
  return entries.sort((left, right) => right.generated_at.localeCompare(left.generated_at))
}

export function findSemanticViewerEntry(entries: SemanticViewerIndexEntry[], actionIdOrPrefix: string): SemanticViewerIndexEntry | null {
  const normalized = decodeURIComponent(actionIdOrPrefix).trim().toLowerCase()
  if (!normalized) return null
  const exact = entries.find(entry => entry.user_action_id.toLowerCase() === normalized)
  if (exact) return exact
  const prefixMatches = entries.filter(entry => entry.user_action_id.toLowerCase().startsWith(normalized))
  return prefixMatches.length === 1 ? prefixMatches[0]! : null
}

function runDuckDbJson<T>(duckDbExe: string, databasePath: string, sql: string, commandRunner: CommandRunner): T[] {
  if (commandRunner === defaultCommandRunner && (!existsSync(duckDbExe) || !existsSync(databasePath))) return []
  const result = commandRunner(duckDbExe, ["-json", databasePath, sql])
  if (result.status !== 0) return []
  const raw = result.stdout.trim()
  return raw ? (JSON.parse(raw) as T[]) : []
}

export function readRecentDbActions(params: {
  viewerRoot: string
  duckDbExe?: string
  dbPath?: string
  limit?: number
  commandRunner?: CommandRunner
}): SemanticViewerRecentDbAction[] {
  const viewerRoot = resolve(params.viewerRoot)
  const entries = readSemanticViewerIndex(viewerRoot)
  const rows = runDuckDbJson<RecentDbActionRow>(
    params.duckDbExe ?? defaultDuckDbExe,
    params.dbPath ?? defaultDbPath,
    `select user_action_id, started_at, duration_ms, query_count, tool_call_count from user_actions order by started_at_ms desc limit ${Math.max(1, params.limit ?? 5)};`,
    params.commandRunner ?? defaultCommandRunner,
  )

  return rows.map(row => {
    const viewer = findSemanticViewerEntry(entries, row.user_action_id)
    return {
      user_action_id: row.user_action_id,
      started_at: row.started_at,
      duration_ms: row.duration_ms,
      query_count: row.query_count,
      tool_call_count: row.tool_call_count,
      has_viewer: Boolean(viewer),
      viewer_path: viewer?.relative_viewer_path ?? null,
    }
  })
}

function mimeType(path: string): string {
  switch (extname(path).toLowerCase()) {
    case ".html":
      return "text/html; charset=utf-8"
    case ".json":
      return "application/json; charset=utf-8"
    case ".md":
    case ".mmd":
    case ".csv":
    case ".txt":
      return "text/plain; charset=utf-8"
    default:
      return "application/octet-stream"
  }
}

function fileResponse(path: string): Response {
  if (!existsSync(path)) return textResponse("Not found", 404)
  const stat = statSync(path)
  if (!stat.isFile()) return textResponse("Not found", 404)
  return new Response(readFileSync(path), {
    headers: {
      "content-type": mimeType(path),
      "cache-control": "no-store",
    },
  })
}

export function buildSemanticViewerServerHandler(options: SemanticViewerServerOptions): (request: Request) => Response {
  const viewerRoot = resolve(options.viewerRoot)
  const duckDbExe = resolve(options.duckDbExe ?? defaultDuckDbExe)
  const dbPath = resolve(options.dbPath ?? defaultDbPath)
  const rebuildScript = resolve(options.rebuildScript ?? defaultRebuildScript)
  const deepExplainScript = resolve(options.deepExplainScript ?? defaultDeepExplainScript)
  const commandRunner = options.commandRunner ?? defaultCommandRunner

  return (request: Request): Response => {
    const url = new URL(request.url)
    const pathname = url.pathname

    if (request.method !== "GET" && request.method !== "HEAD" && request.method !== "POST") {
      return textResponse("Method not allowed", 405)
    }

    const entries = readSemanticViewerIndex(viewerRoot)

    if (pathname === "/" || pathname === "/index.html") {
      const recentDbActions = readRecentDbActions({ viewerRoot, duckDbExe, dbPath, limit: 5, commandRunner })
      return textResponse(renderSemanticViewerDirectoryAppHtml(entries, { recentDbActions }), 200, "text/html; charset=utf-8")
    }

    if (pathname === "/api/actions" || pathname === "/index.json") {
      return jsonResponse(entries)
    }

    if (pathname === "/api/db-actions") {
      return jsonResponse(readRecentDbActions({ viewerRoot, duckDbExe, dbPath, limit: 5, commandRunner }))
    }

    if (pathname === "/api/refresh-db") {
      if (request.method !== "POST") return textResponse("Method not allowed", 405)
      const result = commandRunner("powershell", ["-ExecutionPolicy", "Bypass", "-File", rebuildScript, "-Quiet"])
      return commandJsonResponse(result)
    }

    if (pathname === "/api/generate-latest") {
      if (request.method !== "POST") return textResponse("Method not allowed", 405)
      const result = commandRunner("bun", ["run", deepExplainScript, "--latest"])
      let userActionId: string | null = null
      try {
        userActionId = JSON.parse(result.stdout).userActionId ?? null
      } catch {
        userActionId = null
      }
      return commandJsonResponse(result, { userActionId })
    }

    const generateMatch = pathname.match(/^\/api\/generate\/([^/]+)$/u)
    if (generateMatch) {
      if (request.method !== "POST") return textResponse("Method not allowed", 405)
      const actionId = decodeURIComponent(generateMatch[1]!).trim()
      if (!/^[A-Za-z0-9_-]{6,80}$/u.test(actionId)) return jsonResponse({ ok: false, error: "invalid action id" }, 400)
      const result = commandRunner("bun", ["run", deepExplainScript, "--user-action-id", actionId])
      let userActionId: string | null = null
      try {
        userActionId = JSON.parse(result.stdout).userActionId ?? actionId
      } catch {
        userActionId = actionId
      }
      return commandJsonResponse(result, { userActionId })
    }

    const viewMatch = pathname.match(/^\/view\/([^/]+)$/u)
    if (viewMatch) {
      const entry = findSemanticViewerEntry(entries, viewMatch[1]!)
      if (!entry) return textResponse("Action viewer not found", 404)
      const viewerPath = safeJoin(viewerRoot, `${entry.output_dir_name}/semantic_viewer.html`)
      return viewerPath ? fileResponse(viewerPath) : textResponse("Forbidden", 403)
    }

    const dataMatch = pathname.match(/^\/data\/([^/]+)$/u)
    if (dataMatch) {
      const entry = findSemanticViewerEntry(entries, dataMatch[1]!)
      if (!entry) return textResponse("Action data not found", 404)
      const dataPath = safeJoin(viewerRoot, `${entry.output_dir_name}/semantic_viewer.data.json`)
      return dataPath ? fileResponse(dataPath) : textResponse("Forbidden", 403)
    }

    if (pathname.startsWith("/files/")) {
      const relativePath = decodeURIComponent(pathname.slice("/files/".length))
      const path = safeJoin(viewerRoot, relativePath)
      return path ? fileResponse(path) : textResponse("Forbidden", 403)
    }

    return textResponse("Not found", 404)
  }
}

if (import.meta.main) {
  const args = parseSemanticViewerServerArgs(Bun.argv.slice(2))
  const handler = buildSemanticViewerServerHandler({ viewerRoot: args.viewerRoot })
  const server = Bun.serve({
    hostname: args.host,
    port: args.port,
    fetch: handler,
  })

  console.log(`Semantic viewer server: http://${args.host}:${server.port}`)
  console.log(`Viewer root: ${args.viewerRoot}`)
}
