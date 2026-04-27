# V2.1 自动化实验闭环 Patch Pack（基于公开 GitHub 代码审查）

> 说明：我可以通过 GitHub 网页读取公开仓库源码，但当前环境不能 clone/push GitHub 仓库，也不能在你的本地仓库执行 Bun。下面给出的是可直接交给 Codex 应用的实现包：新增文件、脚本行为、验收命令、风险边界。

## 1. 当前源码事实

- `src/observability/v2/evalTypes.ts` 已有基础类型：Scenario / Variant / Run / Expectation / Score / Experiment。
- `tests/evals/v2/README.md` 已说明当前 V2 workspace，并列出：record run、compare runs、list runs、compare latest scenario、validate manifests。
- `scripts/evals/v2_record_run.ts` 当前是“把某个 V1 user_action 绑定成 V2 run 并生成 scores/report”的脚本，不是真正自动执行 harness 的 runner。
- `scripts/evals/v2_compare_runs.ts` 和 `v2_compare_scenario.ts` 当前已能基于 run/scores 生成 baseline vs candidate report。

## 2. V2.1 本轮真实目标

把当前“手动绑定 + 单次 compare”推进到“manifest 驱动的 experiment runner scaffold”：

1. 读取 experiment manifest。
2. 加载 baseline/candidate variant。
3. 对一组 scenario 生成 run 绑定。
4. 调用现有 `v2_record_run.ts` 生成 run + score。
5. 调用现有 `v2_compare_runs.ts` 生成 compare report。
6. 生成 experiment-level summary。

注意：如果仓库还没有可自动驱动 harness 执行 prompt 的入口，则本轮 runner 先支持 **bind-existing 模式**，即使用已有 V1 user_action_id 建立评测闭环。不要假装已经能自动跑真实 harness。

---

## 3. 建议新增目录

```text
tests/evals/v2/
  score-specs/
    _score_spec.template.json
    default-v2-1.score-specs.json
  gates/
    default_v2_1_gate.json
  experiments/
    _experiment.v2_1.template.json
  experiment-runs/
    <generated>
```

---

## 4. 建议新增文件：`src/observability/v2/evalExperimentTypes.ts`

```ts
import type {
  EvalExperiment,
  EvalScoreDimension,
} from './evalTypes'

export type EvalScoreDirection =
  | 'higher_is_better'
  | 'lower_is_better'
  | 'boolean_pass'
  | 'observed_only'

export type EvalAutomationLevel =
  | 'automatic'
  | 'manual_review'
  | 'mixed'

export interface EvalScoreSpecThresholds {
  hard_fail_regression_pct?: number
  soft_warn_regression_pct?: number
  max_allowed_value?: number
  min_allowed_value?: number
}

export interface EvalScoreSpec {
  score_spec_id: string
  dimension: EvalScoreDimension
  subdimension: string
  direction: EvalScoreDirection
  formula: string
  data_sources: string[]
  evidence_requirements: string[]
  automation_level: EvalAutomationLevel
  thresholds?: EvalScoreSpecThresholds
  version: string
  notes?: string
}

export interface EvalGatePolicyRule {
  score_spec_id: string
  rule_type: 'hard_fail' | 'soft_warning'
  condition: string
  threshold?: number
  notes?: string
}

export interface EvalGatePolicy {
  gate_policy_id: string
  name: string
  rules: EvalGatePolicyRule[]
}

export interface EvalExperimentV21 extends EvalExperiment {
  scenario_ids?: string[]
  repeat_count?: number
  score_spec_ids?: string[]
  gate_policy_id?: string
  mode?: 'bind_existing' | 'execute_harness'
  action_bindings?: Array<{
    scenario_id: string
    baseline_user_action_id: string
    candidate_user_action_ids: Record<string, string>
  }>
}
```

---

## 5. 建议新增文件：`tests/evals/v2/score-specs/default-v2-1.score-specs.json`

```json
{
  "score_specs": [
    {
      "score_spec_id": "task_success.main_chain_observed",
      "dimension": "task_success",
      "subdimension": "main_chain_observed",
      "direction": "higher_is_better",
      "formula": "1 if a main_thread root query exists for run.entry_user_action_id else 0",
      "data_sources": ["V1 queries", "V2 run"],
      "evidence_requirements": ["entry_user_action_id", "root_query_id"],
      "automation_level": "automatic",
      "version": "v2.1"
    },
    {
      "score_spec_id": "efficiency.total_billed_tokens",
      "dimension": "efficiency",
      "subdimension": "total_billed_tokens",
      "direction": "lower_is_better",
      "formula": "user_actions.total_billed_tokens for run.entry_user_action_id",
      "data_sources": ["V1 user_actions"],
      "evidence_requirements": ["entry_user_action_id", "total_billed_tokens"],
      "automation_level": "automatic",
      "thresholds": {
        "hard_fail_regression_pct": 30,
        "soft_warn_regression_pct": 10
      },
      "version": "v2.1"
    },
    {
      "score_spec_id": "decision_quality.subagent_count_observed",
      "dimension": "decision_quality",
      "subdimension": "subagent_count_observed",
      "direction": "lower_is_better",
      "formula": "count(subagents) for run.entry_user_action_id",
      "data_sources": ["V1 subagents"],
      "evidence_requirements": ["entry_user_action_id", "subagents"],
      "automation_level": "automatic",
      "thresholds": {
        "soft_warn_regression_pct": 50
      },
      "version": "v2.1"
    },
    {
      "score_spec_id": "stability.recovery_absence",
      "dimension": "stability",
      "subdimension": "recovery_absence",
      "direction": "higher_is_better",
      "formula": "1 if no recovery event exists for run.entry_user_action_id else 0",
      "data_sources": ["V1 recoveries"],
      "evidence_requirements": ["entry_user_action_id", "recoveries"],
      "automation_level": "automatic",
      "version": "v2.1"
    },
    {
      "score_spec_id": "controllability.turn_limit_basic",
      "dimension": "controllability",
      "subdimension": "turn_limit_basic",
      "direction": "higher_is_better",
      "formula": "1 if root_query.turn_count <= 8 else 0",
      "data_sources": ["V1 queries"],
      "evidence_requirements": ["root_query_id", "turn_count"],
      "automation_level": "automatic",
      "version": "v2.1"
    }
  ]
}
```

---

## 6. 建议新增文件：`tests/evals/v2/gates/default_v2_1_gate.json`

```json
{
  "gate_policy_id": "default_v2_1_gate",
  "name": "Default V2.1 Regression Gate",
  "rules": [
    {
      "score_spec_id": "task_success.main_chain_observed",
      "rule_type": "hard_fail",
      "condition": "candidate < baseline",
      "notes": "Candidate cannot lose the main-chain success signal."
    },
    {
      "score_spec_id": "efficiency.total_billed_tokens",
      "rule_type": "hard_fail",
      "condition": "candidate_regression_pct > 30 and task_success_not_improved",
      "threshold": 30,
      "notes": "Cost cannot rise sharply without a success improvement."
    },
    {
      "score_spec_id": "efficiency.total_billed_tokens",
      "rule_type": "soft_warning",
      "condition": "candidate_regression_pct > 10",
      "threshold": 10
    },
    {
      "score_spec_id": "decision_quality.subagent_count_observed",
      "rule_type": "soft_warning",
      "condition": "candidate_regression_pct > 50",
      "threshold": 50
    }
  ]
}
```

---

## 7. 建议新增文件：`tests/evals/v2/experiments/_experiment.v2_1.template.json`

```json
{
  "experiment_id": "session_memory_sparse_vs_default",
  "name": "Session Memory Sparse vs Default",
  "goal": "Evaluate whether sparse session memory reduces cost without hurting task success.",
  "baseline_variant_id": "baseline_default",
  "candidate_variant_ids": ["candidate_session_memory_sparse"],
  "scenario_set_id": "v2_first_batch",
  "scenario_ids": ["cost_sensitive_task"],
  "repeat_count": 1,
  "score_spec_ids": [
    "task_success.main_chain_observed",
    "efficiency.total_billed_tokens",
    "decision_quality.subagent_count_observed",
    "stability.recovery_absence",
    "controllability.turn_limit_basic"
  ],
  "gate_policy_id": "default_v2_1_gate",
  "mode": "bind_existing",
  "action_bindings": [
    {
      "scenario_id": "cost_sensitive_task",
      "baseline_user_action_id": "REPLACE_WITH_BASELINE_USER_ACTION_ID",
      "candidate_user_action_ids": {
        "candidate_session_memory_sparse": "REPLACE_WITH_CANDIDATE_USER_ACTION_ID"
      }
    }
  ],
  "status": "draft"
}
```

---

## 8. 建议新增脚本：`scripts/evals/v2_run_experiment.ts`

```ts
import { spawnSync } from 'node:child_process'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { EvalExperimentV21 } from '../../src/observability/v2/evalExperimentTypes'

interface RunFile {
  run: {
    run_id: string
    scenario_id: string
    variant_id: string
    entry_user_action_id?: string
  }
}

const repoRoot = path.resolve(import.meta.dirname, '..', '..')
const evalRoot = path.join(repoRoot, 'tests', 'evals', 'v2')
const runsRoot = path.join(evalRoot, 'runs')
const experimentRunsRoot = path.join(evalRoot, 'experiment-runs')

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const result: Record<string, string | boolean> = {}
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (!arg.startsWith('--')) continue
    const key = arg.slice(2)
    const next = argv[i + 1]
    if (!next || next.startsWith('--')) {
      result[key] = true
    } else {
      result[key] = next
      i += 1
    }
  }
  return result
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, 'utf8')) as T
}

function runBunScript(script: string, args: string[]): string {
  const result = spawnSync('bun', ['run', script, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
  })
  if (result.status !== 0) {
    throw new Error(
      [
        `Command failed: bun run ${script} ${args.join(' ')}`,
        String(result.stderr ?? '').trim(),
        String(result.stdout ?? '').trim(),
      ]
        .filter(Boolean)
        .join('\n'),
    )
  }
  return String(result.stdout ?? '')
}

function extractCreatedRunId(output: string): string {
  const match = output.match(/Created V2 run:\s*(\S+)/)
  if (!match?.[1]) {
    throw new Error(`Cannot find created run id in output:\n${output}`)
  }
  return match[1]
}

async function findExperimentPath(idOrPath: string): Promise<string> {
  if (idOrPath.endsWith('.json')) return path.resolve(repoRoot, idOrPath)
  return path.join(evalRoot, 'experiments', `${idOrPath}.json`)
}

async function latestRun(scenarioId: string, variantId: string): Promise<string | undefined> {
  const entries = await readdir(runsRoot, { withFileTypes: true }).catch(() => [])
  const runs = await Promise.all(
    entries
      .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
      .map(entry => readJson<RunFile>(path.join(runsRoot, entry.name))),
  )
  return runs
    .map(file => file.run)
    .filter(run => run.scenario_id === scenarioId && run.variant_id === variantId)
    .sort((a, b) => b.run_id.localeCompare(a.run_id))[0]?.run_id
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  const experimentArg = String(args.experiment ?? '')
  if (!experimentArg) throw new Error('Missing required --experiment <id-or-path>')

  const experimentPath = await findExperimentPath(experimentArg)
  const experiment = await readJson<EvalExperimentV21>(experimentPath)

  if (experiment.mode && experiment.mode !== 'bind_existing') {
    throw new Error(
      `Only bind_existing mode is implemented in V2.1 scaffold. mode=${experiment.mode}`,
    )
  }

  const scenarioIds = experiment.scenario_ids ?? []
  if (scenarioIds.length === 0) {
    throw new Error('Experiment must define scenario_ids for V2.1 runner.')
  }

  const summary: Array<{
    scenario_id: string
    baseline_run_id: string
    candidate_run_ids: Record<string, string>
    compare_reports: string[]
  }> = []

  for (const scenarioId of scenarioIds) {
    const binding = experiment.action_bindings?.find(
      item => item.scenario_id === scenarioId,
    )
    if (!binding) {
      throw new Error(
        `Missing action_bindings for scenario=${scenarioId}. V2.1 bind_existing mode requires fact-only user_action_id bindings.`,
      )
    }

    const baselineOutput = runBunScript('scripts/evals/v2_record_run.ts', [
      '--scenario',
      scenarioId,
      '--variant',
      experiment.baseline_variant_id,
      '--user-action-id',
      binding.baseline_user_action_id,
      '--snapshot-db',
    ])
    const baselineRunId = extractCreatedRunId(baselineOutput)

    const candidateRunIds: Record<string, string> = {}
    const compareReports: string[] = []

    for (const candidateVariantId of experiment.candidate_variant_ids) {
      const candidateActionId = binding.candidate_user_action_ids[candidateVariantId]
      if (!candidateActionId) {
        throw new Error(
          `Missing candidate user_action_id for scenario=${scenarioId}, variant=${candidateVariantId}`,
        )
      }

      const candidateOutput = runBunScript('scripts/evals/v2_record_run.ts', [
        '--scenario',
        scenarioId,
        '--variant',
        candidateVariantId,
        '--user-action-id',
        candidateActionId,
        '--snapshot-db',
      ])
      const candidateRunId = extractCreatedRunId(candidateOutput)
      candidateRunIds[candidateVariantId] = candidateRunId

      const compareOutput = runBunScript('scripts/evals/v2_compare_runs.ts', [
        '--baseline-run',
        baselineRunId,
        '--candidate-run',
        candidateRunId,
      ])
      compareReports.push(compareOutput.trim())
    }

    summary.push({
      scenario_id: scenarioId,
      baseline_run_id: baselineRunId,
      candidate_run_ids: candidateRunIds,
      compare_reports: compareReports,
    })
  }

  await mkdir(experimentRunsRoot, { recursive: true })
  const outputPath = path.join(
    experimentRunsRoot,
    `${experiment.experiment_id}_${new Date().toISOString().replace(/[:.]/g, '')}.json`,
  )
  await writeFile(
    outputPath,
    `${JSON.stringify({ experiment, summary }, null, 2)}\n`,
  )

  console.log(`Created V2.1 experiment summary: ${path.relative(repoRoot, outputPath)}`)
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
```

---

## 9. 验收命令

```powershell
bun run scripts/evals/v2_validate_manifests.ts
bun run scripts/evals/v2_run_experiment.ts --experiment tests/evals/v2/experiments/_experiment.v2_1.template.json
```

模板里的 user_action_id 必须先替换成真实 V1 user_action_id，否则应该报错。这是有意设计：V2.1 当前只做 fact-only bind-existing runner，不伪造自动 harness 执行能力。

---

## 10. 当前仍未完成的能力

- 真实自动执行 harness prompt 的 runner。
- Repeat 10 次鲁棒性运行。
- 长上下文专项 scenario。
- Tool / Skill 价值评测专项 profile。
- 自动模型裁判。

这些不应混进 V2.1 第一轮。
