import { randomUUID } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { appendFile, mkdir } from 'node:fs/promises'
import path from 'node:path'

const repoRoot = path.resolve(import.meta.dirname, '..', '..')
const observabilityDir = path.join(repoRoot, '.observability')
const duckdbExe = path.join(repoRoot, 'tools', 'duckdb', 'duckdb.exe')

function requiredEnv(name: string): string {
  const value = process.env[name]
  if (!value || value.trim() === '') {
    throw new Error(`Missing required fixture env: ${name}`)
  }
  return value
}

function requiredContextEnv(primary: string, fallback?: string): string {
  const direct = process.env[primary]
  if (direct && direct.trim() !== '') return direct
  if (fallback) return requiredEnv(fallback)
  return requiredEnv(primary)
}

function sqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`
}

function writeFixtureDb(params: {
  dbPath: string
  userActionId: string
  queryId: string
  startedAt: string
  endedAt: string
}) {
  const benchmarkRunId = requiredEnv('CLAUDE_CODE_EVAL_BENCHMARK_RUN_ID')
  const experimentId = requiredContextEnv(
    'CLAUDE_CODE_EVAL_EXPERIMENT_LABEL',
    'CLAUDE_CODE_EVAL_EXPERIMENT_ID',
  )
  const scenarioId = requiredContextEnv(
    'CLAUDE_CODE_EVAL_SCENARIO_LABEL',
    'CLAUDE_CODE_EVAL_SCENARIO_ID',
  )
  const variantId = requiredContextEnv(
    'CLAUDE_CODE_EVAL_VARIANT_LABEL',
    'CLAUDE_CODE_EVAL_VARIANT_ID',
  )
  const evalRunId = requiredEnv('CLAUDE_CODE_EVAL_RUN_ID')
  const sql = [
    'CREATE TABLE IF NOT EXISTS user_actions(event_date VARCHAR, user_action_id VARCHAR, started_at VARCHAR, started_at_ms BIGINT, ended_at VARCHAR, ended_at_ms BIGINT, duration_ms BIGINT, event_count BIGINT, query_count BIGINT, main_thread_query_count BIGINT, subagent_query_count BIGINT, subagent_count BIGINT, tool_call_count BIGINT, experiment_id VARCHAR, scenario_id VARCHAR, variant_id VARCHAR, benchmark_run_id VARCHAR, eval_run_id VARCHAR, raw_input_tokens BIGINT, output_tokens BIGINT, cache_read_tokens BIGINT, cache_create_tokens BIGINT, total_prompt_input_tokens BIGINT, total_billed_tokens BIGINT, main_thread_total_prompt_input_tokens BIGINT, subagent_total_prompt_input_tokens BIGINT);',
    'CREATE TABLE IF NOT EXISTS queries(query_id VARCHAR, user_action_id VARCHAR, agent_name VARCHAR, started_at VARCHAR, turn_count BIGINT, terminal_reason VARCHAR);',
    'CREATE TABLE IF NOT EXISTS tools(user_action_id VARCHAR, tool_name VARCHAR, is_closed BOOLEAN, has_failed BOOLEAN);',
    'CREATE TABLE IF NOT EXISTS subagents(user_action_id VARCHAR, subagent_reason VARCHAR, subagent_trigger_kind VARCHAR, subagent_trigger_detail VARCHAR, duration_ms BIGINT);',
    'CREATE TABLE IF NOT EXISTS recoveries(user_action_id VARCHAR, event_name VARCHAR, ts_wall VARCHAR);',
    'CREATE TABLE IF NOT EXISTS metrics_integrity_daily(event_date VARCHAR, strict_query_completion_rate DOUBLE, strict_turn_state_closure_rate DOUBLE, tool_lifecycle_closure_rate DOUBLE, subagent_lifecycle_closure_rate DOUBLE);',
    `INSERT INTO user_actions VALUES (${sqlString(params.startedAt.slice(0, 10))}, ${sqlString(params.userActionId)}, ${sqlString(params.startedAt)}, 0, ${sqlString(params.endedAt)}, 10, 10, 2, 1, 1, 0, 0, 0, ${sqlString(experimentId)}, ${sqlString(scenarioId)}, ${sqlString(variantId)}, ${sqlString(benchmarkRunId)}, ${sqlString(evalRunId)}, 100, 10, 0, 0, 100, 110, 100, 0);`,
    `INSERT INTO queries VALUES (${sqlString(params.queryId)}, ${sqlString(params.userActionId)}, 'main_thread', ${sqlString(params.startedAt)}, 1, 'fixture_completed');`,
    `INSERT INTO metrics_integrity_daily VALUES (${sqlString(params.startedAt.slice(0, 10))}, 1, 1, 1, 1);`,
  ].join('\n')
  const result = spawnSync(duckdbExe, [params.dbPath, sql], {
    cwd: repoRoot,
    encoding: 'utf8',
  })
  if (result.status !== 0) {
    throw new Error(
      String(result.stderr ?? '').trim() ||
        String(result.stdout ?? '').trim() ||
        String(result.error?.message ?? '').trim(),
    )
  }
}

async function main(): Promise<void> {
  await mkdir(observabilityDir, { recursive: true })
  const now = new Date()
  const endedAt = new Date(now.getTime() + 10).toISOString()
  const filePath = path.join(
    observabilityDir,
    `events-${now.toISOString().slice(0, 10).replaceAll('-', '')}.jsonl`,
  )
  const userActionId = randomUUID()
  const queryId = randomUUID()
  const fixtureDbPath = process.env.V2_FIXTURE_DB_PATH
  const fixtureVariantId =
    process.env.CLAUDE_CODE_EVAL_VARIANT_LABEL ?? process.env.CLAUDE_CODE_EVAL_VARIANT_ID
  if (process.env.V2_FIXTURE_FAIL_VARIANT === fixtureVariantId) {
    throw new Error(`Fixture requested failure for variant ${fixtureVariantId}`)
  }
  if (fixtureDbPath) {
    writeFixtureDb({
      dbPath: fixtureDbPath,
      userActionId,
      queryId,
      startedAt: now.toISOString(),
      endedAt,
    })
    if (process.env.V2_FIXTURE_DUPLICATE_CAPTURE === '1') {
      writeFixtureDb({
        dbPath: fixtureDbPath,
        userActionId: randomUUID(),
        queryId: randomUUID(),
        startedAt: now.toISOString(),
        endedAt,
      })
    }
    console.log(`fixture_user_action_id=${userActionId}`)
    return
  }
  const base = {
    schema_version: '2026-04-19',
    level: 'info',
    component: 'v2_fixture_trace',
    session_id: `v2-fixture-${randomUUID()}`,
    conversation_id: `v2-fixture-${randomUUID()}`,
    user_action_id: userActionId,
    query_id: queryId,
    query_source: 'repl_main_thread',
    experiment_id: requiredContextEnv(
      'CLAUDE_CODE_EVAL_EXPERIMENT_LABEL',
      'CLAUDE_CODE_EVAL_EXPERIMENT_ID',
    ),
    scenario_id: requiredContextEnv(
      'CLAUDE_CODE_EVAL_SCENARIO_LABEL',
      'CLAUDE_CODE_EVAL_SCENARIO_ID',
    ),
    variant_id: requiredContextEnv(
      'CLAUDE_CODE_EVAL_VARIANT_LABEL',
      'CLAUDE_CODE_EVAL_VARIANT_ID',
    ),
    benchmark_run_id: requiredEnv('CLAUDE_CODE_EVAL_BENCHMARK_RUN_ID'),
    eval_run_id: requiredEnv('CLAUDE_CODE_EVAL_RUN_ID'),
    cwd: repoRoot,
    git_branch: null,
    build_version: 'v2-fixture',
  }
  const started = {
    ...base,
    ts_wall: now.toISOString(),
    ts_mono_ms: 1,
    event: 'query.started',
    payload: {},
  }
  const ended = {
    ...base,
    ts_wall: endedAt,
    ts_mono_ms: 11,
    event: 'query.terminated',
    payload: { reason: 'fixture_completed' },
  }
  await appendFile(filePath, `${JSON.stringify(started)}\n${JSON.stringify(ended)}\n`, 'utf8')
  console.log(`fixture_user_action_id=${userActionId}`)
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
