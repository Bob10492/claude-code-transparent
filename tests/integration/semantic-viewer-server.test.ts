import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { afterEach, describe, expect, test } from "bun:test"
import {
  buildSemanticViewerServerHandler,
  findSemanticViewerEntry,
  parseSemanticViewerServerArgs,
  readRecentDbActions,
  readSemanticViewerIndex,
  type CommandRunner,
} from "../../scripts/observability/semantic_viewer_server"

const tempRoots: string[] = []

function makeTempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "semantic-viewer-server-"))
  tempRoots.push(root)
  return root
}

function writeViewer(root: string, dirName: string, actionId: string): void {
  const dir = join(root, dirName)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, "semantic_viewer.html"), `<html><body>viewer ${actionId}</body></html>`, "utf8")
  writeFileSync(
    join(dir, "semantic_viewer.data.json"),
    JSON.stringify({
      action: {
        user_action_id: actionId,
        selected_by: "explicit_user_action_id",
        terminal_reason: "completed",
        query_count: 2,
        tool_call_count: 8,
      },
      lanes: [],
      nodes: [],
      edges: [],
      details: {},
    }),
    "utf8",
  )
}

afterEach(() => {
  while (tempRoots.length) {
    const root = tempRoots.pop()
    if (root) rmSync(root, { recursive: true, force: true })
  }
})

describe("semantic viewer server", () => {
  test("parses local server args with safe defaults", () => {
    const args = parseSemanticViewerServerArgs(["--port", "9001", "--host", "0.0.0.0", "--root", "ObservrityTask/action-reports/deep"])

    expect(args.port).toBe(9001)
    expect(args.host).toBe("0.0.0.0")
    expect(args.viewerRoot).toContain("ObservrityTask")
  })

  test("scans viewer directories when index file is absent", () => {
    const root = makeTempRoot()
    writeViewer(root, "user_action_12345678", "12345678-aaaa-bbbb-cccc-1234567890ab")

    const entries = readSemanticViewerIndex(root)

    expect(entries).toHaveLength(1)
    expect(entries[0]?.user_action_id).toBe("12345678-aaaa-bbbb-cccc-1234567890ab")
    expect(entries[0]?.relative_viewer_path).toBe("/view/12345678-aaaa-bbbb-cccc-1234567890ab")
  })

  test("normalizes static index paths to service routes", () => {
    const root = makeTempRoot()
    writeFileSync(
      join(root, "semantic_viewer_index.json"),
      JSON.stringify([
        {
          user_action_id: "abcdef12-aaaa-bbbb-cccc-1234567890ab",
          output_dir_name: "user_action_abcdef12",
          relative_viewer_path: "user_action_abcdef12/semantic_viewer.html",
          selected_by: "latest",
          terminal_reason: "completed",
          generated_at: "2026-05-12T00:00:00.000Z",
          query_count: 1,
          tool_call_count: 3,
        },
      ]),
      "utf8",
    )

    const entries = readSemanticViewerIndex(root)

    expect(entries[0]?.relative_viewer_path).toBe("/view/abcdef12-aaaa-bbbb-cccc-1234567890ab")
  })

  test("finds exact ids and unique prefixes only", () => {
    const entries = [
      {
        user_action_id: "abcdef12-aaaa-bbbb-cccc-1234567890ab",
        output_dir_name: "a",
        relative_viewer_path: "/view/abcdef12-aaaa-bbbb-cccc-1234567890ab",
        selected_by: "latest" as const,
        terminal_reason: "completed",
        generated_at: "2026-05-12T00:00:00.000Z",
        query_count: 1,
        tool_call_count: 1,
      },
      {
        user_action_id: "abcdef99-aaaa-bbbb-cccc-1234567890ab",
        output_dir_name: "b",
        relative_viewer_path: "/view/abcdef99-aaaa-bbbb-cccc-1234567890ab",
        selected_by: "latest" as const,
        terminal_reason: "completed",
        generated_at: "2026-05-12T00:00:00.000Z",
        query_count: 1,
        tool_call_count: 1,
      },
    ]

    expect(findSemanticViewerEntry(entries, "abcdef12")?.output_dir_name).toBe("a")
    expect(findSemanticViewerEntry(entries, "abcdef")).toBeNull()
  })

  test("serves dashboard, viewer html, data json, and blocks path escape", async () => {
    const root = makeTempRoot()
    const actionId = "12345678-aaaa-bbbb-cccc-1234567890ab"
    writeViewer(root, "user_action_12345678", actionId)
    const handler = buildSemanticViewerServerHandler({ viewerRoot: root })

    const home = await handler(new Request("http://127.0.0.1/")).text()
    expect(home).toContain("Search By Action ID")
    expect(home).toContain("Recent 5 User Actions")
    expect(home).toContain("recent-action-open")
    expect(home).toContain(`/view/${actionId}`)

    const viewer = await handler(new Request(`http://127.0.0.1/view/${actionId}`)).text()
    expect(viewer).toContain(`viewer ${actionId}`)

    const data = (await handler(new Request("http://127.0.0.1/data/12345678")).json()) as {
      action: { user_action_id: string }
    }
    expect(data.action.user_action_id).toBe(actionId)

    const blocked = handler(new Request("http://127.0.0.1/files/..%2Fpackage.json"))
    expect(blocked.status).toBe(403)
  })

  test("reads recent DuckDB actions and marks whether a viewer exists", () => {
    const root = makeTempRoot()
    const actionId = "12345678-aaaa-bbbb-cccc-1234567890ab"
    writeViewer(root, "user_action_12345678", actionId)
    const commandRunner: CommandRunner = () => ({
      status: 0,
      stdout: JSON.stringify([
        {
          user_action_id: actionId,
          started_at: "2026-06-03T09:00:00.000Z",
          duration_ms: 1000,
          query_count: 1,
          tool_call_count: 2,
        },
        {
          user_action_id: "87654321-aaaa-bbbb-cccc-1234567890ab",
          started_at: "2026-06-03T08:00:00.000Z",
          duration_ms: 2000,
          query_count: 2,
          tool_call_count: 3,
        },
      ]),
      stderr: "",
    })

    const actions = readRecentDbActions({
      viewerRoot: root,
      duckDbExe: "duckdb.exe",
      dbPath: "observability.duckdb",
      commandRunner,
    })

    expect(actions[0]?.has_viewer).toBe(true)
    expect(actions[0]?.viewer_path).toBe(`/view/${actionId}`)
    expect(actions[1]?.has_viewer).toBe(false)
    expect(actions[1]?.viewer_path).toBeNull()
  })

  test("serves DB actions and local refresh/generate commands", async () => {
    const root = makeTempRoot()
    const calls: Array<{ command: string; args: string[] }> = []
    const commandRunner: CommandRunner = (command, args) => {
      calls.push({ command, args })
      if (command.includes("duckdb")) {
        return {
          status: 0,
          stdout: JSON.stringify([
            {
              user_action_id: "excel-action-1",
              started_at: "2026-06-03T09:00:00.000Z",
              duration_ms: 1000,
              query_count: 1,
              tool_call_count: 2,
            },
          ]),
          stderr: "",
        }
      }
      if (args.includes("--latest")) {
        return { status: 0, stdout: JSON.stringify({ userActionId: "latest-action" }), stderr: "" }
      }
      return { status: 0, stdout: JSON.stringify({ userActionId: args.at(-1) }), stderr: "" }
    }
    const handler = buildSemanticViewerServerHandler({
      viewerRoot: root,
      duckDbExe: "duckdb.exe",
      dbPath: "observability.duckdb",
      rebuildScript: "rebuild.ps1",
      deepExplainScript: "deep_explain_action.ts",
      commandRunner,
    })

    const dbActions = (await handler(new Request("http://127.0.0.1/api/db-actions")).json()) as Array<{
      user_action_id: string
    }>
    expect(dbActions[0]?.user_action_id).toBe("excel-action-1")

    const refresh = await handler(new Request("http://127.0.0.1/api/refresh-db", { method: "POST" })).json()
    expect((refresh as { ok: boolean }).ok).toBe(true)

    const latest = (await handler(new Request("http://127.0.0.1/api/generate-latest", { method: "POST" })).json()) as {
      userActionId: string
    }
    expect(latest.userActionId).toBe("latest-action")

    const generated = (await handler(new Request("http://127.0.0.1/api/generate/excel-action-1", { method: "POST" })).json()) as {
      userActionId: string
    }
    expect(generated.userActionId).toBe("excel-action-1")
    expect(calls.some(call => call.command === "powershell" && call.args.some(arg => arg.endsWith("rebuild.ps1")))).toBe(true)
    expect(calls.some(call => call.command === "bun" && call.args.includes("--latest"))).toBe(true)
    expect(calls.some(call => call.command === "bun" && call.args.includes("--user-action-id"))).toBe(true)
  })
})
