import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import type { EvalScenario, EvalVariant } from '../../src/observability/v2/evalTypes'
import type { EvalExperimentExecutionConfig } from '../../src/observability/v2/evalExperimentTypes'

type JsonRecord = Record<string, unknown>

export interface EvalExecutionContext {
  experiment_id: string
  scenario_id: string
  variant_id: string
  benchmark_run_id: string
  eval_run_id: string
}

export interface HarnessExecutionAdapterInput {
  experimentId: string
  scenarioId: string
  variantId: string
  runId: string
  prompt: string
  timeoutMs: number
}

export interface HarnessExecutionAdapterOutput {
  status: 'completed' | 'failed' | 'timeout'
  entryUserActionId?: string
  stdoutRef?: string
  stderrRef?: string
  error?: string
}

export interface HarnessExecutionAdapter {
  execute(input: HarnessExecutionAdapterInput): Promise<HarnessExecutionAdapterOutput>
}

export interface CaptureResult {
  status: 'captured' | 'capture_failed' | 'ambiguous_capture'
  user_action_id?: string
  match_count: number
  error?: string
}

export interface VariantApplyResult {
  env: Record<string, string>
  cliArgs: string[]
  metadata: JsonRecord
}

export interface ExecuteHarnessResult {
  execution: HarnessExecutionAdapterOutput
  capture: CaptureResult
  variant_apply: VariantApplyResult
  benchmark_run_id: string
  eval_run_id: string
}

const repoRoot = path.resolve(import.meta.dirname, '..', '..')
const bunExe = process.execPath
const nodeExe = process.env.CLAUDE_CODE_NODE_EXE?.trim() || 'node.exe'
const duckdbExe = path.join(repoRoot, 'tools', 'duckdb', 'duckdb.exe')
const defaultDbPath = path.join(repoRoot, '.observability', 'observability_v1.duckdb')
const harnessRunsRoot = path.join(repoRoot, '.observability', 'v2h')
const windowsLauncherBridgePath = path.join(
  repoRoot,
  'scripts',
  'evals',
  'v2_windows_spawn_bridge.cjs',
)

function sqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`
}

function sanitizeId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '')
}

function artifactRunDirName(runId: string): string {
  return createHash('sha1').update(runId).digest('hex').slice(0, 16)
}

function evalAlias(prefix: string, value: string): string {
  const human = sanitizeId(value).slice(0, 12)
  const hash = createHash('sha1').update(value).digest('hex').slice(0, 8)
  return `${prefix}_${human}_${hash}`
}

function stringifyEnv(value: string | number | boolean): string {
  return typeof value === 'string' ? value : String(value)
}

function mergeEnvRecords(...records: Array<Record<string, string | number | boolean> | undefined>) {
  const env: Record<string, string> = {}
  for (const record of records) {
    for (const [key, value] of Object.entries(record ?? {})) {
      env[key] = stringifyEnv(value)
    }
  }
  return env
}

function spawnWithMergedEnv(
  command: string,
  args: string[],
  options: {
    cwd: string
    encoding: BufferEncoding
    timeout?: number
    env: Record<string, string>
    input?: string
  },
) {
  if (process.platform !== 'win32') {
    return spawnSync(command, args, {
      cwd: options.cwd,
      encoding: options.encoding,
      timeout: options.timeout,
      input: options.input,
      env: {
        ...process.env,
        ...options.env,
      },
    })
  }

  const previousValues = new Map<string, string | undefined>()
  for (const [key, value] of Object.entries(options.env)) {
    previousValues.set(key, process.env[key])
    process.env[key] = value
  }
  try {
    return spawnSync(command, args, {
      cwd: options.cwd,
      encoding: options.encoding,
      timeout: options.timeout,
      input: options.input,
    })
  } finally {
    for (const [key, previousValue] of previousValues.entries()) {
      if (previousValue === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = previousValue
      }
    }
  }
}

function featureGateEnvName(key: string): string {
  return `CLAUDE_CODE_FEATURE_${key.replace(/[^a-zA-Z0-9]+/g, '_').toUpperCase()}`
}

function queryDuckDb<T extends JsonRecord>(dbPath: string, sql: string): T[] {
  const result = spawnSync(duckdbExe, ['-json', dbPath, sql], {
    cwd: repoRoot,
    encoding: 'utf8',
  })
  if (result.status !== 0) {
    const message =
      String(result.stderr ?? '').trim() ||
      String(result.stdout ?? '').trim() ||
      String(result.error?.message ?? '').trim()
    throw new Error(`DuckDB query failed: ${message}`)
  }
  const output = String(result.stdout ?? '').trim()
  return output ? (JSON.parse(output) as T[]) : []
}

function escapeSqlLiteral(value: string): string {
  return value.replaceAll("'", "''")
}

function relationColumns(dbPath: string, relation: string): string[] {
  const rows = queryDuckDb<{ name?: string }>(
    dbPath,
    `PRAGMA table_info('${escapeSqlLiteral(relation)}');`,
  )
  return rows
    .map(row => (typeof row.name === 'string' ? row.name : null))
    .filter((value): value is string => Boolean(value))
}

function hasRelationColumn(dbPath: string, relation: string, column: string): boolean {
  return relationColumns(dbPath, relation).includes(column)
}

export function buildEvalContextEnv(context: EvalExecutionContext): Record<string, string> {
  return {
    CLAUDE_CODE_EVAL_EXPERIMENT_ID: evalAlias('exp', context.experiment_id),
    CLAUDE_CODE_EVAL_SCENARIO_ID: evalAlias('scn', context.scenario_id),
    CLAUDE_CODE_EVAL_VARIANT_ID: evalAlias('var', context.variant_id),
    CLAUDE_CODE_EVAL_EXPERIMENT_LABEL: context.experiment_id,
    CLAUDE_CODE_EVAL_SCENARIO_LABEL: context.scenario_id,
    CLAUDE_CODE_EVAL_VARIANT_LABEL: context.variant_id,
    CLAUDE_CODE_EVAL_BENCHMARK_RUN_ID: context.benchmark_run_id,
    CLAUDE_CODE_EVAL_RUN_ID: context.eval_run_id,
  }
}

export function isExecuteHarnessDisabled(args: Record<string, string | boolean>): boolean {
  return (
    Boolean(args['disable-execute-harness']) ||
    process.env.V2_2_EXECUTE_HARNESS === '0' ||
    process.env.V2_EXECUTE_HARNESS === '0'
  )
}

export function createRunIdentity(params: {
  experimentId: string
  scenarioId: string
  variantId: string
  stamp: string
}): { eval_run_id: string; benchmark_run_id: string } {
  const base = `${params.experimentId}_${params.scenarioId}_${params.variantId}_${params.stamp}`
  const humanPrefix = sanitizeId(
    `${params.experimentId.slice(0, 20)}_${params.scenarioId.slice(0, 20)}_${params.variantId.slice(0, 20)}`,
  )
  const hash = createHash('sha1').update(base).digest('hex').slice(0, 12)
  const identity = `${humanPrefix}_${hash}`
  return {
    eval_run_id: `eval_${identity}`,
    benchmark_run_id: `bench_${identity}`,
  }
}

export function applyVariantV0(params: {
  variant: EvalVariant
  execution?: EvalExperimentExecutionConfig
  context: EvalExecutionContext
}): VariantApplyResult {
  const { variant, execution, context } = params
  const featureGateEnv = Object.fromEntries(
    Object.entries(variant.feature_gates ?? {}).map(([key, value]) => [
      featureGateEnvName(key),
      stringifyEnv(value),
    ]),
  )
  const env = {
    ...buildEvalContextEnv(context),
    ...mergeEnvRecords(execution?.env, variant.env_overrides),
    ...featureGateEnv,
  }
  const cliArgs: string[] = []
  const maxTurns = variant.model_config?.max_turns ?? execution?.max_turns
  if (variant.model_config?.model) cliArgs.push('--model', variant.model_config.model)
  if (variant.model_config?.thinking) cliArgs.push('--thinking', variant.model_config.thinking)
  if (typeof maxTurns === 'number') cliArgs.push('--max-turns', String(maxTurns))
  if (typeof variant.model_config?.max_budget_usd === 'number') {
    cliArgs.push('--max-budget-usd', String(variant.model_config.max_budget_usd))
  }

  if (variant.config_snapshot_ref) {
    env.CLAUDE_CODE_EVAL_CONFIG_SNAPSHOT_REF = variant.config_snapshot_ref
  }
  if (execution?.require_config_snapshot && variant.config_snapshot_ref) {
    const candidatePath = path.resolve(repoRoot, variant.config_snapshot_ref)
    if (!existsSync(candidatePath)) {
      throw new Error(
        `Variant apply failed: config_snapshot_ref does not exist: ${variant.config_snapshot_ref}`,
      )
    }
  }

  return {
    env,
    cliArgs,
    metadata: {
      supported_variant_fields: [
        'env_overrides',
        'config_snapshot_ref',
        'model_config',
        'feature_gates',
      ],
      config_snapshot_ref: variant.config_snapshot_ref ?? null,
      feature_gate_count: Object.keys(variant.feature_gates ?? {}).length,
      env_override_count: Object.keys(variant.env_overrides ?? {}).length,
      model_config: variant.model_config ?? null,
    },
  }
}

function expandTemplateArgs(args: string[], input: HarnessExecutionAdapterInput): string[] {
  return args.map(arg =>
    arg
      .replaceAll('{prompt}', input.prompt)
      .replaceAll('{runId}', input.runId)
      .replaceAll('{experimentId}', input.experimentId)
      .replaceAll('{scenarioId}', input.scenarioId)
      .replaceAll('{variantId}', input.variantId),
  )
}

export class DisabledHarnessExecutionAdapter implements HarnessExecutionAdapter {
  async execute(): Promise<HarnessExecutionAdapterOutput> {
    return {
      status: 'failed',
      error:
        'execute_harness adapter is disabled. Use bind_existing or remove --disable-execute-harness/V2_2_EXECUTE_HARNESS=0.',
    }
  }
}

export class CliPrintHarnessExecutionAdapter implements HarnessExecutionAdapter {
  constructor(
    private readonly options: {
      execution?: EvalExperimentExecutionConfig
      env: Record<string, string>
      cliArgs: string[]
    },
  ) {}

  async execute(input: HarnessExecutionAdapterInput): Promise<HarnessExecutionAdapterOutput> {
    const runDir = path.join(harnessRunsRoot, artifactRunDirName(input.runId))
    await mkdir(runDir, { recursive: true })
    const stdoutPath = path.join(runDir, 'stdout.txt')
    const stderrPath = path.join(runDir, 'stderr.txt')
    const commandPath = path.join(runDir, 'command.json')
    const promptPath = path.join(runDir, 'prompt.txt')
    const launcherRequestPath = path.join(runDir, 'launcher-request.json')
    const launcherResultPath = path.join(runDir, 'launcher-result.json')
    const command = this.options.execution?.command ?? bunExe
    const defaultArgs = [
      'run',
      'src/entrypoints/cli.tsx',
      '--print',
      '--output-format',
      'json',
      ...this.options.cliArgs,
    ]
    const args = this.options.execution?.args
      ? expandTemplateArgs(this.options.execution.args, input)
      : defaultArgs
    const promptViaStdin = !this.options.execution?.args
    if (promptViaStdin) {
      await writeFile(promptPath, input.prompt, 'utf8')
    }
    if (process.platform === 'win32') {
      await writeFile(
        launcherRequestPath,
        `${JSON.stringify(
          {
            command,
            args,
            cwd: repoRoot,
            env: this.options.env,
            timeout_ms: input.timeoutMs,
            stdin_text: promptViaStdin ? input.prompt : undefined,
          },
          null,
          2,
        )}\n`,
        'utf8',
      )
    }

    await writeFile(
      commandPath,
      `${JSON.stringify(
        {
          command,
          args,
          prompt_transport: promptViaStdin ? 'stdin' : 'arg_template',
          prompt_ref: promptViaStdin ? path.relative(repoRoot, promptPath) : null,
          launcher_bridge_ref:
            process.platform === 'win32'
              ? path.relative(repoRoot, windowsLauncherBridgePath)
              : null,
          launcher_request_ref:
            process.platform === 'win32'
              ? path.relative(repoRoot, launcherRequestPath)
              : null,
          timeout_ms: input.timeoutMs,
          env_keys: Object.keys(this.options.env).sort(),
        },
        null,
        2,
      )}\n`,
      'utf8',
    )

    let status: HarnessExecutionAdapterOutput['status'] = 'completed'
    let stdoutText = ''
    let stderrText = ''
    let errorText = ''

    if (process.platform === 'win32') {
      const bridgeResult = spawnSync(
        nodeExe,
        [windowsLauncherBridgePath, '--request', launcherRequestPath, '--result', launcherResultPath],
        {
          cwd: repoRoot,
          encoding: 'utf8',
          timeout: input.timeoutMs + 10_000,
        },
      )
      if (bridgeResult.status !== 0 && !existsSync(launcherResultPath)) {
        stdoutText = String(bridgeResult.stdout ?? '')
        stderrText = String(bridgeResult.stderr ?? bridgeResult.error?.message ?? '')
        errorText =
          stderrText.trim() ||
          stdoutText.trim() ||
          `Windows launcher bridge exited with status ${bridgeResult.status}`
        status = bridgeResult.error?.name === 'ETIMEDOUT' ? 'timeout' : 'failed'
      } else {
        const launcherPayload = JSON.parse(await readFile(launcherResultPath, 'utf8')) as {
          child_status?: number | null
          stdout?: string
          stderr?: string
          error_name?: string | null
          error_message?: string | null
          timed_out?: boolean
          signal?: string | null
        }
        stdoutText = String(launcherPayload.stdout ?? '')
        stderrText = String(launcherPayload.stderr ?? launcherPayload.error_message ?? '')
        if (launcherPayload.timed_out) {
          status = 'timeout'
          errorText = launcherPayload.error_message ?? 'Windows launcher bridge timed out'
        } else if ((launcherPayload.child_status ?? 0) !== 0) {
          status = 'failed'
          errorText =
            String(launcherPayload.stderr ?? '').trim() ||
            String(launcherPayload.stdout ?? '').trim() ||
            String(launcherPayload.error_message ?? '').trim() ||
            (launcherPayload.signal
              ? `command terminated by signal ${launcherPayload.signal}`
              : `command exited with status ${launcherPayload.child_status}`)
        }
      }
    } else {
      const result = spawnWithMergedEnv(command, args, {
        cwd: repoRoot,
        encoding: 'utf8',
        timeout: input.timeoutMs,
        env: this.options.env,
        input: promptViaStdin ? input.prompt : undefined,
      })
      stdoutText = String(result.stdout ?? '')
      stderrText = String(result.stderr ?? result.error?.message ?? '')
      if (result.error && result.error.name === 'ETIMEDOUT') {
        status = 'timeout'
        errorText = result.error.message
      } else if (result.status !== 0) {
        status = 'failed'
        errorText =
          String(result.stderr ?? '').trim() ||
          String(result.stdout ?? '').trim() ||
          String(result.error?.message ?? '').trim() ||
          `command exited with status ${result.status}`
      }
    }

    await writeFile(stdoutPath, stdoutText, 'utf8')
    await writeFile(stderrPath, stderrText, 'utf8')

    const stdoutRef = path.relative(repoRoot, stdoutPath)
    const stderrRef = path.relative(repoRoot, stderrPath)
    if (status === 'timeout') {
      return {
        status: 'timeout',
        stdoutRef,
        stderrRef,
        error: errorText,
      }
    }
    if (status === 'failed') {
      return {
        status: 'failed',
        stdoutRef,
        stderrRef,
        error: errorText,
      }
    }
    return {
      status: 'completed',
      stdoutRef,
      stderrRef,
    }
  }
}

export function createHarnessExecutionAdapter(params: {
  execution?: EvalExperimentExecutionConfig
  env: Record<string, string>
  cliArgs: string[]
}): HarnessExecutionAdapter {
  const adapter = params.execution?.adapter ?? 'cli_print'
  if (adapter === 'disabled') return new DisabledHarnessExecutionAdapter()
  if (adapter === 'cli_print') return new CliPrintHarnessExecutionAdapter(params)
  throw new Error(`Unsupported execute_harness adapter: ${adapter}`)
}

export function rebuildObservabilityDb(dbPath?: string): void {
  const args = ['run', 'scripts/observability/build_duckdb_etl.ts']
  if (dbPath) args.push('--db-path', dbPath)
  const result = spawnSync(bunExe, args, {
    cwd: repoRoot,
    encoding: 'utf8',
  })
  if (result.status !== 0) {
    const message =
      String(result.stderr ?? '').trim() ||
      String(result.stdout ?? '').trim() ||
      String(result.error?.message ?? '').trim()
    throw new Error(`Failed to rebuild V1 observability DB before capture: ${message}`)
  }
}

export function captureUserActionByBenchmarkRunId(params: {
  benchmarkRunId: string
  dbPath?: string
}): CaptureResult {
  try {
    const captureDbPath = params.dbPath ?? defaultDbPath
    if (!hasRelationColumn(captureDbPath, 'user_actions', 'benchmark_run_id')) {
      return {
        status: 'capture_failed',
        match_count: 0,
        error: [
          `user_actions is missing benchmark_run_id in ${captureDbPath}.`,
          'The V1 DuckDB schema is stale and was not rebuilt with the current ETL.',
          'Run bun run scripts/observability/build_duckdb_etl.ts and retry.',
        ].join(' '),
      }
    }
    const rows = queryDuckDb<{ user_action_id: string }>(
      captureDbPath,
      [
        'SELECT DISTINCT user_action_id',
        'FROM user_actions',
        `WHERE benchmark_run_id = ${sqlString(params.benchmarkRunId)}`,
        "  AND TRIM(COALESCE(user_action_id, '')) <> ''",
        'ORDER BY user_action_id;',
      ].join(' '),
    )
    if (rows.length === 0) {
      return {
        status: 'capture_failed',
        match_count: 0,
        error: `No user_action_id found for benchmark_run_id=${params.benchmarkRunId}`,
      }
    }
    if (rows.length > 1) {
      return {
        status: 'ambiguous_capture',
        match_count: rows.length,
        error: `Multiple user_action_id values found for benchmark_run_id=${params.benchmarkRunId}`,
      }
    }
    return {
      status: 'captured',
      user_action_id: rows[0].user_action_id,
      match_count: 1,
    }
  } catch (error) {
    return {
      status: 'capture_failed',
      match_count: 0,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

export async function executeHarnessAndCapture(params: {
  experimentId: string
  scenario: EvalScenario
  variant: EvalVariant
  execution?: EvalExperimentExecutionConfig
  evalRunId: string
  benchmarkRunId: string
  dbPath?: string
}): Promise<ExecuteHarnessResult> {
  const context: EvalExecutionContext = {
    experiment_id: params.experimentId,
    scenario_id: params.scenario.scenario_id,
    variant_id: params.variant.variant_id,
    benchmark_run_id: params.benchmarkRunId,
    eval_run_id: params.evalRunId,
  }
  const variantApply = applyVariantV0({
    variant: params.variant,
    execution: params.execution,
    context,
  })
  const timeoutMs = params.execution?.timeout_ms ?? 180_000
  const adapter = createHarnessExecutionAdapter({
    execution: params.execution,
    env: variantApply.env,
    cliArgs: variantApply.cliArgs,
  })
  const execution = await adapter.execute({
    experimentId: params.experimentId,
    scenarioId: params.scenario.scenario_id,
    variantId: params.variant.variant_id,
    runId: params.evalRunId,
    prompt: params.scenario.input_prompt,
    timeoutMs,
  })
  const shouldRebuildDb =
    execution.status === 'completed' &&
    (!params.dbPath ||
      (!params.execution?.command && !params.execution?.args))

  if (shouldRebuildDb) {
    rebuildObservabilityDb(params.dbPath)
  }
  const capture =
    execution.status === 'completed'
      ? captureUserActionByBenchmarkRunId({
          benchmarkRunId: params.benchmarkRunId,
          dbPath: params.dbPath,
        })
      : {
          status: 'capture_failed' as const,
          match_count: 0,
          error: execution.error ?? `Harness execution did not complete: ${execution.status}`,
        }
  return {
    execution,
    capture,
    variant_apply: variantApply,
    benchmark_run_id: params.benchmarkRunId,
    eval_run_id: params.evalRunId,
  }
}
