import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

type JsonRecord = Record<string, unknown>

interface ExperimentValidity {
  status?: string
  reason?: string
}

interface RiskVerdict {
  status?: string
  missing_score_count?: number
}

interface LongContextSummaryItem {
  scenario_id?: string
  candidate_variant_id?: string
  constraint_retention_rate_mean?: number | null
  retrieved_fact_hit_rate_mean?: number | null
  distractor_confusion_mean?: number | null
  compaction_trigger_mean?: number | null
  total_prompt_input_tokens_mean?: number | null
  manual_review_required?: boolean
  manual_review_questions?: string[]
}

interface VariantEffectSummaryItem {
  scenario_id?: string
  candidate_variant_id?: string
  runtime_difference_observed?: boolean
  baseline_policy_mode?: string
  candidate_policy_mode?: string
  summary?: string[]
}

interface ScorecardSummaryItem {
  scenario_id?: string
  candidate_variant_id?: string
  score_spec_id?: string
  baseline_value?: number | null
  candidate_value?: number | null
  delta?: number | null
  interpretation?: string
}

interface ExperimentConfig {
  baseline_variant_id?: string
  candidate_variant_ids?: string[]
  scenario_ids?: string[]
}

interface ExperimentRunArtifact {
  experiment_id?: string
  manifest_ref?: string
  generated_at?: string
  created_at?: string
  report_refs?: string[]
  experiment_validity?: ExperimentValidity
  long_context_review_verdict?: string | null
  risk_verdict?: RiskVerdict
  long_context_summary?: LongContextSummaryItem[]
  variant_effect_summary?: VariantEffectSummaryItem[]
  scorecard_summary?: ScorecardSummaryItem[]
  experiment?: ExperimentConfig
}

interface FeedbackRunArtifact {
  generated_at?: string
  source_experiment_run_ref?: string
  report_ref?: string
}

const repoRoot = path.resolve(import.meta.dirname, '..', '..')
const manualConclusionDir = path.join(
  repoRoot,
  'ObservrityTask',
  '10-系统版本',
  'v2',
  '08-人工结论',
)

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

function assertString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${fieldName} must be a non-empty string`)
  }
  return value
}

function toRepoRelative(targetPath: string): string {
  return path.relative(repoRoot, targetPath).replace(/\\/g, '/')
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64)
}

function formatMetric(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 'n/a'
  }
  return Number.isInteger(value) ? String(value) : value.toFixed(3)
}

function summarizeLongContext(items: LongContextSummaryItem[]): string[] {
  if (items.length === 0) {
    return ['- 当前 experiment-run 中没有 long_context_summary。']
  }

  return items.map(item => {
    const scenarioId = item.scenario_id ?? 'unknown_scenario'
    const candidateId = item.candidate_variant_id ?? 'unknown_candidate'
    const retention = formatMetric(item.constraint_retention_rate_mean)
    const retrieval = formatMetric(item.retrieved_fact_hit_rate_mean)
    const confusion = formatMetric(item.distractor_confusion_mean)
    const compaction = formatMetric(item.compaction_trigger_mean)
    const tokens = formatMetric(item.total_prompt_input_tokens_mean)
    const manual = item.manual_review_required === true ? 'yes' : 'no'
    return `- ${scenarioId} / ${candidateId}: retention=${retention}, retrieval=${retrieval}, distractor_confusion=${confusion}, compaction_trigger=${compaction}, total_prompt_input_tokens=${tokens}, manual_review_required=${manual}`
  })
}

function summarizeVariantEffects(items: VariantEffectSummaryItem[]): string[] {
  if (items.length === 0) {
    return ['- 当前 experiment-run 中没有 variant_effect_summary。']
  }

  return items.map(item => {
    const scenarioId = item.scenario_id ?? 'unknown_scenario'
    const candidateId = item.candidate_variant_id ?? 'unknown_candidate'
    const observed = item.runtime_difference_observed === true ? 'true' : 'false'
    const baseline = item.baseline_policy_mode ?? 'unknown'
    const candidate = item.candidate_policy_mode ?? 'unknown'
    return `- ${scenarioId} / ${candidateId}: runtime_difference_observed=${observed}, baseline_policy_mode=${baseline}, candidate_policy_mode=${candidate}`
  })
}

function summarizeChangedScores(items: ScorecardSummaryItem[]): string[] {
  const changed = items.filter(
    item =>
      typeof item.interpretation === 'string' &&
      item.interpretation !== 'unchanged',
  )

  if (changed.length === 0) {
    return ['- 当前 scorecard 中没有显著变化项。']
  }

  return changed.map(item => {
    const scoreId = item.score_spec_id ?? 'unknown_score'
    const delta = formatMetric(asNumber(item.delta))
    const baseline = formatMetric(asNumber(item.baseline_value))
    const candidate = formatMetric(asNumber(item.candidate_value))
    return `- ${scoreId}: baseline=${baseline}, candidate=${candidate}, delta=${delta}, interpretation=${item.interpretation ?? 'n/a'}`
  })
}

async function findRelatedFeedbackReports(
  experimentRunRef: string,
): Promise<string[]> {
  const feedbackRunDir = path.join(repoRoot, 'tests', 'evals', 'v2', 'feedback', 'runs')
  let entries: string[] = []
  try {
    entries = await readdir(feedbackRunDir)
  } catch {
    return []
  }

  const matches: { generatedAt: string; reportRef: string }[] = []
  for (const entry of entries) {
    if (!entry.endsWith('.json')) continue
    const artifact = await readJson<FeedbackRunArtifact>(path.join(feedbackRunDir, entry))
    if (artifact.source_experiment_run_ref !== experimentRunRef) continue
    if (typeof artifact.report_ref !== 'string' || artifact.report_ref.trim() === '') continue
    matches.push({
      generatedAt: artifact.generated_at ?? '',
      reportRef: artifact.report_ref.replace(/\\/g, '/'),
    })
  }

  return matches
    .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))
    .map(item => item.reportRef)
}

async function rebuildIndex() {
  const entries = await readdir(manualConclusionDir)
  const mdFiles = entries
    .filter(
      entry =>
        entry.endsWith('.md') &&
        entry !== 'README.md' &&
        entry !== '00-人工结论索引.md' &&
        entry !== '_manual_conclusion.template.md',
    )
    .sort()
    .reverse()

  const lines =
    mdFiles.length === 0
      ? ['- 当前还没有人工结论文件。']
      : mdFiles.map(file => `- [${file}](./${encodeURIComponent(file)})`)

  const content = `# 人工结论索引

这里放的是人工主导的实验结论。

## 阅读原则

1. 先看 experiment-run 和 batch report
2. 再看这里的人工结论
3. 最后才看 feedback 报告

## 当前文件

${lines.join('\n')}
`

  await writeFile(
    path.join(manualConclusionDir, '00-人工结论索引.md'),
    content,
    'utf8',
  )
}

const args = parseArgs(process.argv.slice(2))
const experimentRunArg = args['experiment-run']
if (typeof experimentRunArg !== 'string' || experimentRunArg.trim() === '') {
  console.error(
    'Usage: bun run scripts/evals/v2_create_manual_conclusion.ts --experiment-run <experiment-run-json>',
  )
  process.exit(1)
}

const experimentRunAbsolute = path.resolve(repoRoot, experimentRunArg)
const experimentRunRef = toRepoRelative(experimentRunAbsolute)
const artifact = await readJson<ExperimentRunArtifact>(experimentRunAbsolute)
const experimentId = assertString(artifact.experiment_id, 'experiment_id')
const now = new Date()
const generatedAt = now.toISOString()
const compact = generatedAt.replace(/[-:.]/g, '').replace('Z', 'Z')

await mkdir(manualConclusionDir, { recursive: true })

const longContextSummary = asArray<LongContextSummaryItem>(artifact.long_context_summary)
const variantEffectSummary = asArray<VariantEffectSummaryItem>(artifact.variant_effect_summary)
const scorecardSummary = asArray<ScorecardSummaryItem>(artifact.scorecard_summary)
const reportRefs = asArray<string>(artifact.report_refs).map(ref => ref.replace(/\\/g, '/'))
const feedbackRefs = await findRelatedFeedbackReports(experimentRunRef)

const baselineVariantId = artifact.experiment?.baseline_variant_id ?? 'unknown'
const candidateVariantIds = asArray<string>(artifact.experiment?.candidate_variant_ids)
const scenarioIds = asArray<string>(artifact.experiment?.scenario_ids)

const fileName = `manual_conclusion_${slug(experimentId)}_${compact}.md`
const absoluteOutput = path.join(manualConclusionDir, fileName)
const relativeOutput = toRepoRelative(absoluteOutput)

const content = `# 人工结论：${experimentId}

## 元信息

- 结论状态：待分析
- experiment_id：${experimentId}
- source_experiment_run_ref：${experimentRunRef}
- manifest_ref：${artifact.manifest_ref ?? 'n/a'}
- generated_at：${generatedAt}

## 实验对象

- baseline_variant_id：${baselineVariantId}
- candidate_variant_ids：${candidateVariantIds.join(' | ') || 'n/a'}
- scenario_ids：${scenarioIds.join(' | ') || 'n/a'}

## 自动事实摘要

- experiment_validity：${artifact.experiment_validity?.status ?? 'n/a'}
- experiment_validity_reason：${artifact.experiment_validity?.reason ?? 'n/a'}
- long_context_review_verdict：${artifact.long_context_review_verdict ?? 'n/a'}
- risk_verdict_status：${artifact.risk_verdict?.status ?? 'n/a'}
- risk_missing_score_count：${typeof artifact.risk_verdict?.missing_score_count === 'number' ? artifact.risk_verdict.missing_score_count : 'n/a'}

## Long Context 摘要

${summarizeLongContext(longContextSummary).join('\n')}

## Runtime Difference 摘要

${summarizeVariantEffects(variantEffectSummary).join('\n')}

## Score 变化摘要

${summarizeChangedScores(scorecardSummary).join('\n')}

## 原始报告入口

${reportRefs.length > 0 ? reportRefs.map(ref => `- ${ref}`).join('\n') : '- 当前 experiment-run 没有 report_refs。'}

## Feedback 附录入口

${feedbackRefs.length > 0 ? feedbackRefs.map(ref => `- ${ref}`).join('\n') : '- 当前还没有与这份 experiment-run 绑定的 feedback 报告。'}

## 我当前关注的问题

- 

## 我看到的关键事实

- 

## 我的人工判断

- 

## 是否接受 candidate

- 待定

## 下一步动作

- 

## 备注

- 这份文件是人工主导的结论层。
- feedback 报告是附录层，只作参考，不直接替代人工判断。
`

await writeFile(absoluteOutput, content, 'utf8')
await rebuildIndex()

console.log(
  JSON.stringify(
    {
      experiment_id: experimentId,
      source_experiment_run_ref: experimentRunRef,
      manual_conclusion_ref: relativeOutput,
      related_feedback_report_refs: feedbackRefs,
      report_refs: reportRefs,
      status: 'created',
    },
    null,
    2,
  ),
)
