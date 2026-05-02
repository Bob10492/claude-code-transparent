const fs = require('node:fs')
const path = require('node:path')
const { spawnSync } = require('node:child_process')

function parseArgs(argv) {
  const args = {}
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (!token.startsWith('--')) continue
    const key = token.slice(2)
    const value = argv[index + 1]
    if (!value || value.startsWith('--')) {
      args[key] = true
      continue
    }
    args[key] = value
    index += 1
  }
  return args
}

function writeResult(resultPath, payload) {
  fs.mkdirSync(path.dirname(resultPath), { recursive: true })
  fs.writeFileSync(resultPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const requestPath = args.request
  const resultPath = args.result
  if (typeof requestPath !== 'string' || typeof resultPath !== 'string') {
    throw new Error('Usage: node v2_windows_spawn_bridge.cjs --request <path> --result <path>')
  }

  const request = JSON.parse(fs.readFileSync(requestPath, 'utf8'))
  const result = spawnSync(request.command, request.args ?? [], {
    cwd: request.cwd,
    env: {
      ...process.env,
      ...(request.env ?? {}),
    },
    encoding: 'utf8',
    input: request.stdin_text,
    timeout: request.timeout_ms,
  })

  writeResult(resultPath, {
    command: request.command,
    args: request.args ?? [],
    cwd: request.cwd,
    child_status: result.status,
    signal: result.signal ?? null,
    timed_out: result.error?.name === 'ETIMEDOUT',
    error_name: result.error?.name ?? null,
    error_message: result.error?.message ?? null,
    stdout: String(result.stdout ?? ''),
    stderr: String(result.stderr ?? ''),
  })
}

try {
  main()
} catch (error) {
  const args = parseArgs(process.argv.slice(2))
  if (typeof args.result === 'string') {
    writeResult(args.result, {
      child_status: null,
      signal: null,
      timed_out: false,
      error_name: error instanceof Error ? error.name : 'Error',
      error_message: error instanceof Error ? error.message : String(error),
      stdout: '',
      stderr: '',
    })
  } else {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`)
  }
  process.exit(1)
}
