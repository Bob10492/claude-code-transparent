import { spawnSync } from "node:child_process"
import { join, resolve } from "node:path"

const repoRoot = resolve(import.meta.dir, "..", "..")
const bunExe = process.execPath

function runScript(scriptPath: string, args: string[]): void {
  const result = spawnSync(bunExe, [scriptPath, ...args], {
    cwd: repoRoot,
    stdio: "inherit",
    shell: false,
  })

  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

function main(): void {
  const forwardedArgs = process.argv.slice(2)
  runScript(join(repoRoot, "scripts", "observability", "deep_explain_action.ts"), forwardedArgs)
  runScript(join(repoRoot, "scripts", "observability", "patch_semantic_viewer_recent_actions.ts"), [])
}

main()
