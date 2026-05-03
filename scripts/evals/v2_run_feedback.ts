import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import type {
  EvalCandidateVariantProposal,
  EvalFeedbackApprovalCard,
  EvalFeedbackProposalQueue,
  EvalFeedbackRun,
  EvalFinding,
  EvalHypothesis,
  EvalImprovementProposal,
  EvalNextExperimentPlan,
} from '../../src/observability/v2/evalTypes'

type JsonRecord = Record<string, unknown>

interface ExperimentValidity {
  status?: string
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
  manual_review_required?: boolean
  manual_review_questions?: string[]
}

interface StabilitySummaryItem {
  scenario_id?: string
  variant_id?: string
  flaky_status?: string
}

interface ExperimentRunArtifact {
  experiment_id?: string
  manifest_ref?: string
  report_refs?: string[]
  experiment_validity?: ExperimentValidity
  risk_verdict?: RiskVerdict
  long_context_review_verdict?: string | null
  long_context_summary?: LongContextSummaryItem[]
  stability_summary?: StabilitySummaryItem[]
  run_failures?: JsonRecord[]
}

interface ProposalQueueById {
  top_recommendation_proposal_id: string | null
  recommended_now_proposal_ids: string[]
  recommended_later_proposal_ids: string[]
  deferred_proposal_ids: string[]
  blocked_proposal_ids: string[]
}

const repoRoot = path.resolve(import.meta.dirname, '..', '..')

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

function assertString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${fieldName} must be a non-empty string`)
  }
  return value
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, 'utf8')) as T
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48)
}

function shortHash(value: string): string {
  return createHash('sha1').update(value).digest('hex').slice(0, 8)
}

function buildId(
  kind: string,
  experimentId: string,
  label: string,
  generatedAtCompact: string,
): string {
  return `${kind}_${slug(experimentId)}_${slug(label)}_${generatedAtCompact}_${shortHash(
    `${kind}:${experimentId}:${label}:${generatedAtCompact}`,
  )}`
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

function uniq(values: string[]): string[] {
  return [...new Set(values.filter(value => value.trim() !== ''))]
}

async function ensureDirectory(relativeDir: string) {
  await mkdir(path.join(repoRoot, relativeDir), { recursive: true })
}

async function writeJson(relativePath: string, value: unknown) {
  const absolutePath = path.join(repoRoot, relativePath)
  await mkdir(path.dirname(absolutePath), { recursive: true })
  await writeFile(absolutePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

async function writeMarkdown(relativePath: string, content: string) {
  const absolutePath = path.join(repoRoot, relativePath)
  await mkdir(path.dirname(absolutePath), { recursive: true })
  await writeFile(absolutePath, content, 'utf8')
}

function pushFinding(
  findings: EvalFinding[],
  params: {
    experimentId: string
    sourceReportRef: string
    generatedAtCompact: string
    findingType: string
    findingKind: EvalFinding['finding_kind']
    severity: EvalFinding['severity']
    scope: EvalFinding['scope']
    scopeRef: string
    summary: string
    evidenceRef: string
    isBlocking: boolean
    requiresManualJudgement: boolean
    autoResolvable: boolean
  },
) {
  findings.push({
    finding_id: buildId(
      'finding',
      params.experimentId,
      params.findingType,
      params.generatedAtCompact,
    ),
    source_experiment_id: params.experimentId,
    source_report_ref: params.sourceReportRef,
    finding_type: params.findingType,
    finding_kind: params.findingKind,
    severity: params.severity,
    scope: params.scope,
    scope_ref: params.scopeRef,
    summary: params.summary,
    evidence_ref: params.evidenceRef,
    is_blocking: params.isBlocking,
    requires_manual_judgement: params.requiresManualJudgement,
    auto_resolvable: params.autoResolvable,
    fact_or_inference: 'fact',
  })
}

function extractFindings(
  experimentRunRef: string,
  artifact: ExperimentRunArtifact,
  generatedAtCompact: string,
): EvalFinding[] {
  const experimentId = assertString(artifact.experiment_id, 'experiment_id')
  const reportRefs = asArray<string>(artifact.report_refs)
  const sourceReportRef =
    reportRefs.find(ref => ref.includes('batch_experiment_')) ??
    reportRefs[0] ??
    experimentRunRef
  const findings: EvalFinding[] = []

  if (artifact.long_context_review_verdict === 'needs_manual_review') {
    pushFinding(findings, {
      experimentId,
      sourceReportRef,
      generatedAtCompact,
      findingType: 'long_context_review_verdict_needs_manual_review',
      findingKind: 'manual_review_boundary',
      severity: 'warning',
      scope: 'experiment',
      scopeRef: experimentId,
      summary:
        'The experiment-level long_context_review_verdict remains needs_manual_review.',
      evidenceRef: `${experimentRunRef}#/long_context_review_verdict`,
      isBlocking: false,
      requiresManualJudgement: true,
      autoResolvable: false,
    })
  }

  const riskVerdict = artifact.risk_verdict
  if (riskVerdict?.status === 'inconclusive') {
    pushFinding(findings, {
      experimentId,
      sourceReportRef,
      generatedAtCompact,
      findingType: 'risk_verdict_inconclusive',
      findingKind: 'missing_score',
      severity: 'warning',
      scope: 'experiment',
      scopeRef: experimentId,
      summary: 'The regression-risk verdict is inconclusive for this experiment.',
      evidenceRef: `${experimentRunRef}#/risk_verdict/status`,
      isBlocking: false,
      requiresManualJudgement: false,
      autoResolvable: true,
    })
  }

  if (typeof riskVerdict?.missing_score_count === 'number' && riskVerdict.missing_score_count > 0) {
    pushFinding(findings, {
      experimentId,
      sourceReportRef,
      generatedAtCompact,
      findingType: 'missing_score_count_positive',
      findingKind: 'missing_score',
      severity: 'warning',
      scope: 'experiment',
      scopeRef: experimentId,
      summary: `The experiment still has ${riskVerdict.missing_score_count} missing score(s).`,
      evidenceRef: `${experimentRunRef}#/risk_verdict/missing_score_count`,
      isBlocking: false,
      requiresManualJudgement: false,
      autoResolvable: true,
    })
  }

  asArray<LongContextSummaryItem>(artifact.long_context_summary).forEach((item, index) => {
    const scenarioId = item.scenario_id ?? `scenario_${index + 1}`
    if (asNumber(item.constraint_retention_rate_mean) === null) {
      pushFinding(findings, {
        experimentId,
        sourceReportRef,
        generatedAtCompact,
        findingType: `constraint_retention_rate_missing_${scenarioId}`,
        findingKind: 'missing_score',
        severity: 'warning',
        scope: 'scenario',
        scopeRef: scenarioId,
        summary: `constraint_retention_rate_mean is null for ${scenarioId}.`,
        evidenceRef: `${experimentRunRef}#/long_context_summary/${index}/constraint_retention_rate_mean`,
        isBlocking: false,
        requiresManualJudgement: false,
        autoResolvable: true,
      })
    }
    if (asNumber(item.retrieved_fact_hit_rate_mean) === null) {
      pushFinding(findings, {
        experimentId,
        sourceReportRef,
        generatedAtCompact,
        findingType: `retrieved_fact_hit_rate_missing_${scenarioId}`,
        findingKind: 'missing_score',
        severity: 'warning',
        scope: 'scenario',
        scopeRef: scenarioId,
        summary: `retrieved_fact_hit_rate_mean is null for ${scenarioId}.`,
        evidenceRef: `${experimentRunRef}#/long_context_summary/${index}/retrieved_fact_hit_rate_mean`,
        isBlocking: false,
        requiresManualJudgement: false,
        autoResolvable: true,
      })
    }
    if (item.manual_review_required === true) {
      pushFinding(findings, {
        experimentId,
        sourceReportRef,
        generatedAtCompact,
        findingType: `manual_review_required_${scenarioId}`,
        findingKind: 'manual_review_boundary',
        severity: 'warning',
        scope: 'scenario',
        scopeRef: scenarioId,
        summary: `manual_review_required is true for ${scenarioId}.`,
        evidenceRef: `${experimentRunRef}#/long_context_summary/${index}/manual_review_required`,
        isBlocking: false,
        requiresManualJudgement: true,
        autoResolvable: false,
      })
    }
  })

  asArray<StabilitySummaryItem>(artifact.stability_summary).forEach((item, index) => {
    if (item.flaky_status && item.flaky_status !== 'stable') {
      const scenarioId = item.scenario_id ?? `scenario_${index + 1}`
      const variantId = item.variant_id ?? `variant_${index + 1}`
      pushFinding(findings, {
        experimentId,
        sourceReportRef,
        generatedAtCompact,
        findingType: `flaky_status_${scenarioId}_${variantId}`,
        findingKind: 'stability_gap',
        severity: 'warning',
        scope: 'variant',
        scopeRef: `${scenarioId}:${variantId}`,
        summary: `flaky_status is ${item.flaky_status} for ${scenarioId} / ${variantId}.`,
        evidenceRef: `${experimentRunRef}#/stability_summary/${index}/flaky_status`,
        isBlocking: false,
        requiresManualJudgement: false,
        autoResolvable: false,
      })
    }
  })

  asArray<JsonRecord>(artifact.run_failures).forEach((item, index) => {
    const stage = typeof item.stage === 'string' ? item.stage : 'unknown'
    const scenarioId = typeof item.scenario_id === 'string' ? item.scenario_id : 'unknown'
    pushFinding(findings, {
      experimentId,
      sourceReportRef,
      generatedAtCompact,
      findingType: `run_failure_${stage}_${scenarioId}_${index + 1}`,
      findingKind: 'execution_failure',
      severity: 'blocking',
      scope: 'run',
      scopeRef: `${stage}:${scenarioId}:${index + 1}`,
      summary: `Run failure observed at stage=${stage} for scenario=${scenarioId}.`,
      evidenceRef: `${experimentRunRef}#/run_failures/${index}`,
      isBlocking: true,
      requiresManualJudgement: false,
      autoResolvable: false,
    })
  })

  return findings
}

function buildHypothesis(
  experimentId: string,
  label: string,
  generatedAtCompact: string,
  findings: EvalFinding[],
  body: {
    hypothesis: string
    confidence: EvalHypothesis['confidence']
    risks: string[]
    falsifiableBy: string[]
  },
): EvalHypothesis {
  return {
    hypothesis_id: buildId('hypothesis', experimentId, label, generatedAtCompact),
    based_on_finding_ids: findings.map(item => item.finding_id),
    depends_on_finding_refs: findings.map(item => item.evidence_ref),
    hypothesis: body.hypothesis,
    confidence: body.confidence,
    falsifiable_by: body.falsifiableBy,
    supporting_evidence_refs: findings.map(item => item.evidence_ref),
    risks: body.risks,
    fact_or_inference: 'inference',
  }
}

function artifactUsesExpectationContract(artifact: ExperimentRunArtifact): boolean {
  if (
    typeof artifact.experiment_id === 'string' &&
    artifact.experiment_id.includes('expectation_contract_v0')
  ) {
    return true
  }

  return asArray<LongContextSummaryItem>(artifact.long_context_summary).some(
    item =>
      typeof item.scenario_id === 'string' &&
      item.scenario_id.includes('contract_v0'),
  )
}

function buildHypotheses(
  experimentId: string,
  artifact: ExperimentRunArtifact,
  findings: EvalFinding[],
  generatedAtCompact: string,
): EvalHypothesis[] {
  const hypotheses: EvalHypothesis[] = []
  const usesExpectationContract = artifactUsesExpectationContract(artifact)

  const semanticMissingFindings = findings.filter(
    finding =>
      finding.finding_type.startsWith('constraint_retention_rate_missing_') ||
      finding.finding_type.startsWith('retrieved_fact_hit_rate_missing_'),
  )
  if (semanticMissingFindings.length > 0) {
    hypotheses.push(
      buildHypothesis(
        experimentId,
        'real_output_semantic_parser_missing',
        generatedAtCompact,
        semanticMissingFindings,
        {
          hypothesis:
            'The current real-smoke evaluator lacks a lightweight semantic output parser, so fact retrieval and constraint retention cannot yet be auto-judged from runtime outputs.',
          confidence: 'medium',
          risks: [
            'A parser that is too narrow can miss valid answers.',
            'A parser that is too loose can create false positives.',
          ],
          falsifiableBy: [
            'Implement a lightweight real-smoke output parser and rerun long_context_fact_retrieval_real_smoke.',
            'Verify retrieved_fact_hit_rate and constraint_retention_rate become non-null without inflating distractor_confusion_count.',
          ],
        },
      ),
    )
  }

  const manualReviewFindings = findings.filter(
    finding =>
      finding.finding_type === 'long_context_review_verdict_needs_manual_review' ||
      finding.finding_type.startsWith('manual_review_required_'),
  )
  if (manualReviewFindings.length > 0) {
    hypotheses.push(
      buildHypothesis(
        experimentId,
        usesExpectationContract
          ? 'manual_review_boundary_persisted_after_contract_v0'
          : 'manual_review_boundary_still_open',
        generatedAtCompact,
        manualReviewFindings,
        {
          hypothesis: usesExpectationContract
            ? 'The tightened expectation contract is already in place, but manual review still remains open. The next bottleneck is feedback-loop deduplication and proposal stability, not another copy of the same scenario-contract recommendation.'
            : 'The current long-context evaluation boundary is still partially manual because the system can observe structure and governance, but cannot yet fully resolve final semantic correctness in real smoke.',
          confidence: 'high',
          risks: [
            'Treating manual review signals as auto-pass would overstate evaluator certainty.',
          ],
          falsifiableBy: usesExpectationContract
            ? [
                'Re-run feedback on the same expectation-contract artifact and confirm the queue no longer repeats the same expectation-contract recommendation as top priority.',
                'Verify the next top recommendation, if any, shifts to feedback-system stabilization rather than a duplicate scenario contract.',
              ]
            : [
                'Tighten real-smoke expectations and review prompts, then rerun and confirm whether manual-review scope shrinks without pretending to be fully automatic.',
              ],
        },
      ),
    )
  }

  const gateFindings = findings.filter(
    finding =>
      finding.finding_type === 'risk_verdict_inconclusive' ||
      finding.finding_type === 'missing_score_count_positive',
  )
  if (gateFindings.length > 0 && semanticMissingFindings.length > 0) {
    hypotheses.push(
      buildHypothesis(
        experimentId,
        'gate_inconclusive_due_to_missing_semantic_scores',
        generatedAtCompact,
        gateFindings,
        {
          hypothesis:
            'The regression-risk gate is inconclusive mainly because semantic long-context scores are still missing, not because the runner failed to execute.',
          confidence: 'medium',
          risks: [
            'If missing semantic scores are ignored, risk gating may appear healthier than the evidence supports.',
          ],
          falsifiableBy: [
            'After parser output is bound into context scores, rerun the same real smoke and confirm whether risk_verdict becomes more decisive without hiding uncertainty.',
          ],
        },
      ),
    )
  }

  const instabilityFindings = findings.filter(
    finding =>
      finding.finding_type.startsWith('flaky_status_') ||
      finding.finding_type.startsWith('run_failure_'),
  )
  if (instabilityFindings.length > 0) {
    hypotheses.push(
      buildHypothesis(
        experimentId,
        'runner_or_scenario_instability',
        generatedAtCompact,
        instabilityFindings,
        {
          hypothesis:
            'Observed instability suggests that runner mechanics or scenario contracts still need tightening before higher-trust automated feedback can be used.',
          confidence: 'medium',
          risks: [
            'Pursuing harness changes before stabilizing the evaluator could hide platform issues behind candidate noise.',
          ],
          falsifiableBy: [
            'Increase repeat_count for the real smoke input and inspect whether flaky_status remains inconclusive or converges to stable.',
          ],
        },
      ),
    )
  }

  return hypotheses
}

function proposalSeedForHypothesis(
  hypothesis: EvalHypothesis,
  findingsById: Map<string, EvalFinding>,
  hasGlobalBlockingExecution: boolean,
  hasSemanticParserGap: boolean,
): Omit<EvalImprovementProposal, 'proposal_id'> | null {
  const basedOnFindingIds = hypothesis.based_on_finding_ids
  const manualJudgementFindingIds = basedOnFindingIds.filter(
    findingId => findingsById.get(findingId)?.requires_manual_judgement === true,
  )
  const blockingFindingIds = basedOnFindingIds.filter(
    findingId => findingsById.get(findingId)?.is_blocking === true,
  )

  if (hypothesis.hypothesis_id.includes('real_output_semantic_parser_missing')) {
    return {
      based_on_hypothesis_ids: [hypothesis.hypothesis_id],
      based_on_finding_ids: basedOnFindingIds,
      proposal_type: 'evaluator_improvement',
      target_layer: 'evaluator',
      priority: 'P0',
      queue_bucket: hasGlobalBlockingExecution ? 'blocked' : 'top_recommendation',
      description:
        'Add a lightweight output parser for long-context real smoke so expected facts and retained constraints can be mapped to explicit score evidence.',
      expected_effect:
        'Convert currently-null long-context semantic scores into rule-backed observed values where the output format is narrow enough.',
      why_now:
        'This directly targets the two most important semantic nulls in the current real-smoke sample and does not require runtime harness changes.',
      why_not_now: hasGlobalBlockingExecution
        ? 'Execution failures must be resolved before evaluator improvements can be trusted.'
        : null,
      blocking_finding_ids: blockingFindingIds,
      manual_judgement_finding_ids: manualJudgementFindingIds,
      risks: hypothesis.risks,
      requires_human_approval: true,
    }
  }

  if (hypothesis.hypothesis_id.includes('manual_review_boundary_still_open')) {
    const queueBucket = hasGlobalBlockingExecution
      ? 'blocked'
      : hasSemanticParserGap
        ? 'recommended_later'
        : 'top_recommendation'
    return {
      based_on_hypothesis_ids: [hypothesis.hypothesis_id],
      based_on_finding_ids: basedOnFindingIds,
      proposal_type: 'scenario_improvement',
      target_layer: 'scenario',
      priority: 'P1',
      queue_bucket: queueBucket,
      description:
        'Tighten long-context real-smoke expected facts, constraints, and review questions so the evaluator has clearer semantic anchors without pretending to be fully automatic.',
      expected_effect:
        'Reduce avoidable manual-review ambiguity while preserving an explicit human-review boundary for nuanced outputs.',
      why_now:
        hasSemanticParserGap
          ? 'This is the cleanest way to narrow manual review once semantic evidence collection improves.'
          : 'Semantic parsing is now present, so the next bottleneck is the real-smoke expectation contract and review-prompt precision.',
      why_not_now: hasGlobalBlockingExecution
        ? 'Execution failures must be resolved before contract-tightening can be evaluated.'
        : hasSemanticParserGap
          ? 'By itself it does not convert null semantic scores into formal evidence, so it is best staged after parser work begins.'
          : null,
      blocking_finding_ids: blockingFindingIds,
      manual_judgement_finding_ids: manualJudgementFindingIds,
      risks: hypothesis.risks,
      requires_human_approval: true,
    }
  }

  if (hypothesis.hypothesis_id.includes('manual_review_boundary_persisted_after_contract')) {
    return {
      based_on_hypothesis_ids: [hypothesis.hypothesis_id],
      based_on_finding_ids: basedOnFindingIds,
      proposal_type: 'feedback_contract_improvement',
      target_layer: 'feedback_system',
      priority: 'P1',
      queue_bucket: hasGlobalBlockingExecution ? 'blocked' : 'top_recommendation',
      description:
        'Stabilize the feedback input contract so an already-realized expectation-contract follow-up is detected and not re-recommended as the next top proposal.',
      expected_effect:
        'Prevent proposal-loop duplication and keep approval cards aligned with the true next unresolved bottleneck.',
      why_now:
        'The current source experiment already uses expectation_contract_v0, so repeating the same contract proposal would be a feedback-loop error rather than a useful next action.',
      why_not_now: hasGlobalBlockingExecution
        ? 'Execution failures must be resolved before feedback-contract stabilization can be trusted.'
        : null,
      blocking_finding_ids: blockingFindingIds,
      manual_judgement_finding_ids: manualJudgementFindingIds,
      risks: hypothesis.risks,
      requires_human_approval: true,
    }
  }

  if (hypothesis.hypothesis_id.includes('gate_inconclusive_due_to_missing_semantic_scores')) {
    return {
      based_on_hypothesis_ids: [hypothesis.hypothesis_id],
      based_on_finding_ids: basedOnFindingIds,
      proposal_type: 'score_binding_improvement',
      target_layer: 'scorer',
      priority: 'P1',
      queue_bucket: 'blocked',
      description:
        'Map parser output into context score-spec fields so long-context risk gating can distinguish missing semantics from genuine regression risk.',
      expected_effect:
        'Reduce inconclusive gate results caused purely by absent semantic score evidence.',
      why_now:
        'The gate cannot become more informative until parser output is formally bound into context scores.',
      why_not_now:
        'This is blocked until a lightweight parser exists; there is nothing stable to bind before that.',
      blocking_finding_ids: blockingFindingIds,
      manual_judgement_finding_ids: manualJudgementFindingIds,
      risks: hypothesis.risks,
      requires_human_approval: true,
    }
  }

  if (hypothesis.hypothesis_id.includes('runner_or_scenario_instability')) {
    return {
      based_on_hypothesis_ids: [hypothesis.hypothesis_id],
      based_on_finding_ids: basedOnFindingIds,
      proposal_type: 'feedback_contract_improvement',
      target_layer: 'feedback_system',
      priority: 'P2',
      queue_bucket: hasGlobalBlockingExecution ? 'blocked' : 'deferred',
      description:
        'Stabilize the upstream scenario or feedback input contract before trusting automated feedback suggestions for this branch of evaluation.',
      expected_effect:
        'Reduce noisy or ambiguous inputs before turning feedback artifacts into concrete candidate work items.',
      why_now:
        'This keeps the feedback system honest when stability evidence is weak or under-sampled.',
      why_not_now: hasGlobalBlockingExecution
        ? 'Execution failures must be resolved before contract work can be meaningfully assessed.'
        : 'The current sample has a stronger semantic-evidence gap than a true contract-breakage gap, so this should remain deferred.',
      blocking_finding_ids: blockingFindingIds,
      manual_judgement_finding_ids: manualJudgementFindingIds,
      risks: hypothesis.risks,
      requires_human_approval: true,
    }
  }

  return null
}

function buildImprovementProposals(
  experimentId: string,
  findings: EvalFinding[],
  hypotheses: EvalHypothesis[],
  generatedAtCompact: string,
): EvalImprovementProposal[] {
  const findingsById = new Map(findings.map(item => [item.finding_id, item]))
  const hasGlobalBlockingExecution = findings.some(item => item.finding_kind === 'execution_failure')
  const hasSemanticParserGap = hypotheses.some(hypothesis =>
    hypothesis.hypothesis_id.includes('real_output_semantic_parser_missing'),
  )
  const proposals: EvalImprovementProposal[] = []

  for (const hypothesis of hypotheses) {
    const seed = proposalSeedForHypothesis(
      hypothesis,
      findingsById,
      hasGlobalBlockingExecution,
      hasSemanticParserGap,
    )
    if (!seed) continue
    let label = 'proposal'
    if (seed.description.includes('output parser')) label = 'add_long_context_output_parser_v0'
    else if (seed.description.includes('expected facts')) label = 'tighten_real_smoke_expectations_v0'
    else if (seed.description.includes('score-spec')) label = 'map_parser_output_to_context_scores_v0'
    else if (seed.description.includes('already-realized expectation-contract')) {
      label = 'stabilize_feedback_input_contract_after_contract_v0'
    } else if (seed.description.includes('feedback input contract')) {
      label = 'stabilize_feedback_input_contract_v0'
    }

    proposals.push({
      proposal_id: buildId('proposal', experimentId, label, generatedAtCompact),
      ...seed,
    })
  }

  return proposals
}

function buildCandidateVariantProposals(
  experimentId: string,
  proposals: EvalImprovementProposal[],
  generatedAtCompact: string,
): EvalCandidateVariantProposal[] {
  return proposals.map(proposal => {
    if (
      proposal.proposal_type === 'evaluator_improvement' ||
      proposal.proposal_type === 'score_binding_improvement'
    ) {
      const variantName = proposal.proposal_id.includes('add_long_context_output_parser')
        ? 'candidate_long_context_output_parser_v0'
        : 'candidate_long_context_score_binding_v0'
      return {
        candidate_proposal_id: buildId(
          'candidate_proposal',
          experimentId,
          variantName,
          generatedAtCompact,
        ),
        based_on_proposal_id: proposal.proposal_id,
        change_layer:
          proposal.proposal_type === 'evaluator_improvement' ? 'evaluator' : 'scorer',
        variant_name: variantName,
        implementation_scope:
          'Only scorer/report/evaluator files may change. No runtime harness policy changes are allowed in this proposal.',
        do_not_touch: [
          'src/query.ts',
          'src/services/SessionMemory/sessionMemory.ts',
          'src/services/api/claude.ts',
        ],
        suggested_manifest_patch: {
          proposed_variant_stub: {
            variant_id: variantName,
            name: variantName,
            description: proposal.description,
            change_layer: 'mixed',
            notes: 'Evaluator-only candidate draft generated by V2.5 beta feedback loop.',
          },
          implementation_hint: [
            'Keep the human-review boundary explicit.',
            proposal.proposal_type === 'evaluator_improvement'
              ? 'Extend real-smoke output parsing for expected facts and retained constraints.'
              : 'Bind parser output into context score-spec fields without hiding uncertainty.',
          ],
        },
      }
    }

    let variantName = 'candidate_feedback_input_contract_v0'
    if (proposal.proposal_type === 'scenario_improvement') {
      variantName = 'candidate_long_context_expectation_contract_v0'
    } else if (
      proposal.proposal_type === 'feedback_contract_improvement' &&
      proposal.proposal_id.includes('after_contract')
    ) {
      variantName = 'candidate_feedback_input_contract_after_contract_v0'
    }

    return {
      candidate_proposal_id: buildId(
        'candidate_proposal',
        experimentId,
        variantName,
        generatedAtCompact,
      ),
      based_on_proposal_id: proposal.proposal_id,
      change_layer:
        proposal.proposal_type === 'scenario_improvement'
          ? 'scenario'
          : 'feedback_system',
      variant_name: variantName,
      implementation_scope:
        proposal.proposal_type === 'scenario_improvement'
          ? 'Only scenario manifests, expected facts, constraints, and manual review prompts may change.'
          : 'Only feedback extraction rules, feedback taxonomy, and report/queue logic may change.',
      do_not_touch:
        proposal.proposal_type === 'scenario_improvement'
          ? [
              'src/query.ts',
              'src/services/SessionMemory/sessionMemory.ts',
              'runtime harness policy files',
            ]
          : [
              'src/query.ts',
              'src/services/SessionMemory/sessionMemory.ts',
              'src/services/api/claude.ts',
            ],
      suggested_manifest_patch: {
        proposed_variant_stub: {
          variant_id: variantName,
          name: variantName,
          description: proposal.description,
          change_layer: 'mixed',
          notes: 'Contract-level draft generated by V2.5 beta feedback loop.',
        },
        implementation_hint:
          proposal.proposal_type === 'scenario_improvement'
            ? [
                'Tighten expected facts, constraints, and manual review prompts for real smoke.',
                'Do not change runtime policy in this candidate.',
              ]
            : [
                'Keep feedback taxonomy stable and queue semantics explicit.',
                'Do not turn manual review into automatic pass.',
              ],
      },
    }
  })
}

function uniqueScenarioIds(artifact: ExperimentRunArtifact): string[] {
  const scenarioIds = new Set<string>()
  for (const item of asArray<LongContextSummaryItem>(artifact.long_context_summary)) {
    if (typeof item.scenario_id === 'string' && item.scenario_id.trim() !== '') {
      scenarioIds.add(item.scenario_id)
    }
  }
  for (const item of asArray<StabilitySummaryItem>(artifact.stability_summary)) {
    if (typeof item.scenario_id === 'string' && item.scenario_id.trim() !== '') {
      scenarioIds.add(item.scenario_id)
    }
  }
  return [...scenarioIds]
}

function buildNextExperimentPlans(
  experimentId: string,
  artifact: ExperimentRunArtifact,
  proposals: EvalImprovementProposal[],
  candidateProposals: EvalCandidateVariantProposal[],
  generatedAtCompact: string,
): EvalNextExperimentPlan[] {
  const scenarioIds = uniqueScenarioIds(artifact)
  return proposals.map(proposal => {
    const candidateProposal = candidateProposals.find(
      item => item.based_on_proposal_id === proposal.proposal_id,
    )
    const scenarioSelection =
      scenarioIds.length > 0 ? scenarioIds : ['long_context_fact_retrieval_real_smoke']

    const evaluatorLike =
      proposal.proposal_type === 'evaluator_improvement' ||
      proposal.proposal_type === 'score_binding_improvement'

    return {
      next_experiment_plan_id: buildId(
        'experiment_plan',
        experimentId,
        candidateProposal?.variant_name ?? proposal.proposal_id,
        generatedAtCompact,
      ),
      based_on_proposal_id: proposal.proposal_id,
      scenario_ids: evaluatorLike
        ? ['long_context_fact_retrieval_real_smoke']
        : scenarioSelection,
      baseline_variant_id: 'baseline_default',
      candidate_variant_id:
        candidateProposal?.variant_name ?? 'candidate_feedback_followup_v0',
      repeat_count: evaluatorLike ? 2 : 1,
      success_criteria: evaluatorLike
        ? [
            'retrieved_fact_hit_rate is no longer null for real smoke.',
            'constraint_retention_rate is no longer null for real smoke.',
            'manual_review_required does not increase.',
            'distractor_confusion_count remains 0.',
          ]
        : proposal.proposal_type === 'scenario_improvement'
          ? [
              'Manual review prompts become more specific and lower-ambiguity.',
              'Scenario intent remains matched.',
              'No new flaky or failed run groups appear.',
            ]
          : [
              'Feedback queue semantics become stable and easier to approve.',
              'Top recommendation remains unique.',
              'No new schema ambiguity appears in feedback artifacts.',
            ],
      failure_criteria: evaluatorLike
        ? [
            'Parser introduces false positives against distractor-resistant scenarios.',
            'Manual review requirement increases or semantic scores become contradictory.',
          ]
        : proposal.proposal_type === 'scenario_improvement'
          ? [
              'Scenario contract changes erase the current runtime-difference evidence.',
              'Long-context intent becomes less specific or more brittle.',
            ]
          : [
              'Feedback queue becomes contradictory or unstable across equivalent inputs.',
              'Manual review and human approval boundaries become harder to distinguish.',
            ],
      manual_review_required: true,
    }
  })
}

function buildProposalQueue(proposals: EvalImprovementProposal[]): ProposalQueueById {
  const topRecommendation = proposals.find(
    proposal => proposal.queue_bucket === 'top_recommendation',
  )

  return {
    top_recommendation_proposal_id: topRecommendation?.proposal_id ?? null,
    recommended_now_proposal_ids: proposals
      .filter(
        proposal =>
          proposal.queue_bucket === 'recommended_now' ||
          proposal.queue_bucket === 'top_recommendation',
      )
      .map(proposal => proposal.proposal_id),
    recommended_later_proposal_ids: proposals
      .filter(proposal => proposal.queue_bucket === 'recommended_later')
      .map(proposal => proposal.proposal_id),
    deferred_proposal_ids: proposals
      .filter(proposal => proposal.queue_bucket === 'deferred')
      .map(proposal => proposal.proposal_id),
    blocked_proposal_ids: proposals
      .filter(proposal => proposal.queue_bucket === 'blocked')
      .map(proposal => proposal.proposal_id),
  }
}

function buildApprovalCard(
  proposals: EvalImprovementProposal[],
  candidateProposals: EvalCandidateVariantProposal[],
  nextExperimentPlans: EvalNextExperimentPlan[],
  proposalQueue: ProposalQueueById,
  proposalRefById: Map<string, string>,
  nextPlanRefByProposalId: Map<string, string>,
): EvalFeedbackApprovalCard {
  const topProposal = proposals.find(
    proposal => proposal.proposal_id === proposalQueue.top_recommendation_proposal_id,
  )
  const fallbackWhyNow =
    'No top recommendation was produced. Review findings manually before approving any proposal.'

  if (!topProposal) {
    return {
      current_top_recommendation_proposal_ref: null,
      why_now: fallbackWhyNow,
      why_not_others_yet: [],
      approval_scope: 'No approval scope generated.',
      do_not_touch: [],
      next_experiment_plan_ref: null,
      success_criteria: [],
      risks: [],
      manual_review_boundary:
        'Manual review remains required. Do not treat unresolved semantic checks as automatic pass.',
    }
  }

  const topCandidate = candidateProposals.find(
    proposal => proposal.based_on_proposal_id === topProposal.proposal_id,
  )
  const topPlan = nextExperimentPlans.find(
    plan => plan.based_on_proposal_id === topProposal.proposal_id,
  )
  const whyNotOthersYet = proposals
    .filter(proposal => proposal.proposal_id !== topProposal.proposal_id)
    .map(
      proposal =>
        `${proposal.proposal_id}: ${proposal.queue_bucket}${
          proposal.why_not_now ? ` - ${proposal.why_not_now}` : ''
        }`,
    )

  return {
    current_top_recommendation_proposal_ref:
      proposalRefById.get(topProposal.proposal_id) ?? null,
    why_now: topProposal.why_now,
    why_not_others_yet: whyNotOthersYet,
    approval_scope:
      topCandidate?.implementation_scope ??
      'Approval is limited to the proposal scope recorded in the matching candidate draft.',
    do_not_touch: topCandidate?.do_not_touch ?? [],
    next_experiment_plan_ref:
      nextPlanRefByProposalId.get(topProposal.proposal_id) ?? null,
    success_criteria: topPlan?.success_criteria ?? [],
    risks: topProposal.risks,
    manual_review_boundary:
      'Do not treat manual_review_required or needs_manual_review as automatic pass. Any approved proposal must preserve explicit human review for nuanced semantic checks.',
  }
}

function buildMarkdownReport(params: {
  feedbackRunId: string
  generatedAt: string
  sourceExperimentRunRef: string
  sourceReportRefs: string[]
  findings: EvalFinding[]
  hypotheses: EvalHypothesis[]
  proposals: EvalImprovementProposal[]
  candidateProposals: EvalCandidateVariantProposal[]
  nextExperimentPlans: EvalNextExperimentPlan[]
  proposalQueue: EvalFeedbackProposalQueue
  blockingFindingRefs: string[]
  manualJudgementFindingRefs: string[]
  autoResolvableFindingRefs: string[]
  approvalCard: EvalFeedbackApprovalCard
  proposalRefById: Map<string, string>
}): string {
  const findingLines =
    params.findings.length === 0
      ? ['- No findings generated.']
      : params.findings.map(
          finding =>
            `- ${finding.finding_id}\n  - type: ${finding.finding_type}\n  - kind: ${finding.finding_kind}\n  - severity: ${finding.severity}\n  - scope: ${finding.scope}\n  - scope_ref: ${finding.scope_ref}\n  - summary: ${finding.summary}\n  - evidence_ref: ${finding.evidence_ref}\n  - is_blocking: ${String(finding.is_blocking)}\n  - requires_manual_judgement: ${String(finding.requires_manual_judgement)}\n  - auto_resolvable: ${String(finding.auto_resolvable)}\n  - fact_or_inference: ${finding.fact_or_inference}`,
        )

  const hypothesisLines =
    params.hypotheses.length === 0
      ? ['- No hypotheses generated.']
      : params.hypotheses.map(
          hypothesis =>
            `- ${hypothesis.hypothesis_id}\n  - confidence: ${hypothesis.confidence}\n  - based_on: ${hypothesis.based_on_finding_ids.join(', ')}\n  - depends_on_finding_refs: ${hypothesis.depends_on_finding_refs.join(' | ')}\n  - hypothesis: ${hypothesis.hypothesis}\n  - falsifiable_by: ${hypothesis.falsifiable_by.join(' | ')}\n  - risks: ${hypothesis.risks.join(' | ')}\n  - fact_or_inference: ${hypothesis.fact_or_inference}`,
        )

  const proposalLines =
    params.proposals.length === 0
      ? ['- No proposals generated.']
      : params.proposals.map(
          proposal =>
            `- ${proposal.proposal_id}\n  - type: ${proposal.proposal_type}\n  - target_layer: ${proposal.target_layer}\n  - priority: ${proposal.priority}\n  - queue_bucket: ${proposal.queue_bucket}\n  - description: ${proposal.description}\n  - expected_effect: ${proposal.expected_effect}\n  - why_now: ${proposal.why_now}\n  - why_not_now: ${proposal.why_not_now ?? 'n/a'}\n  - blocking_finding_ids: ${proposal.blocking_finding_ids.join(' | ') || 'none'}\n  - manual_judgement_finding_ids: ${proposal.manual_judgement_finding_ids.join(' | ') || 'none'}\n  - risks: ${proposal.risks.join(' | ')}\n  - requires_human_approval: true`,
        )

  const candidateLines =
    params.candidateProposals.length === 0
      ? ['- No candidate variant proposals generated.']
      : params.candidateProposals.map(
          candidate =>
            `- ${candidate.candidate_proposal_id}\n  - variant_name: ${candidate.variant_name}\n  - change_layer: ${candidate.change_layer}\n  - implementation_scope: ${candidate.implementation_scope}\n  - do_not_touch: ${candidate.do_not_touch.join(' | ')}`,
        )

  const nextPlanLines =
    params.nextExperimentPlans.length === 0
      ? ['- No next experiment plans generated.']
      : params.nextExperimentPlans.map(
          plan =>
            `- ${plan.next_experiment_plan_id}\n  - candidate_variant_id: ${plan.candidate_variant_id}\n  - scenario_ids: ${plan.scenario_ids.join(', ')}\n  - repeat_count: ${plan.repeat_count}\n  - success_criteria: ${plan.success_criteria.join(' | ')}\n  - failure_criteria: ${plan.failure_criteria.join(' | ')}\n  - manual_review_required: ${String(plan.manual_review_required)}`,
        )

  const topRecommendation =
    params.approvalCard.current_top_recommendation_proposal_ref ?? 'none'

  return `# V2.5 Beta Feedback Report: ${params.feedbackRunId}

## Understanding

- source_experiment_run: ${params.sourceExperimentRunRef}
- source_reports:
${params.sourceReportRefs.map(ref => `  - ${ref}`).join('\n')}
- generated_at: ${params.generatedAt}
- this report is advisory only and does not apply code changes automatically

## Human Approval Card

- current_top_recommendation: ${topRecommendation}
- why_now: ${params.approvalCard.why_now}
- why_not_others_yet:
${params.approvalCard.why_not_others_yet.length > 0 ? params.approvalCard.why_not_others_yet.map(item => `  - ${item}`).join('\n') : '  - none'}
- approval_scope: ${params.approvalCard.approval_scope}
- do_not_touch: ${params.approvalCard.do_not_touch.join(' | ') || 'none'}
- next_experiment_plan_ref: ${params.approvalCard.next_experiment_plan_ref ?? 'none'}
- success_criteria:
${params.approvalCard.success_criteria.length > 0 ? params.approvalCard.success_criteria.map(item => `  - ${item}`).join('\n') : '  - none'}
- risks:
${params.approvalCard.risks.length > 0 ? params.approvalCard.risks.map(item => `  - ${item}`).join('\n') : '  - none'}
- manual_review_boundary: ${params.approvalCard.manual_review_boundary}

## Proposal Queue

- top_recommendation:
  - ${params.proposalQueue.top_recommendation_proposal_ref ?? 'none'}
- recommended_now:
${params.proposalQueue.recommended_now_proposal_refs.length > 0 ? params.proposalQueue.recommended_now_proposal_refs.map(ref => `  - ${ref}`).join('\n') : '  - none'}
- recommended_later:
${params.proposalQueue.recommended_later_proposal_refs.length > 0 ? params.proposalQueue.recommended_later_proposal_refs.map(ref => `  - ${ref}`).join('\n') : '  - none'}
- deferred:
${params.proposalQueue.deferred_proposal_refs.length > 0 ? params.proposalQueue.deferred_proposal_refs.map(ref => `  - ${ref}`).join('\n') : '  - none'}
- blocked:
${params.proposalQueue.blocked_proposal_refs.length > 0 ? params.proposalQueue.blocked_proposal_refs.map(ref => `  - ${ref}`).join('\n') : '  - none'}

## Approval Contract

- blocking_findings:
${params.blockingFindingRefs.length > 0 ? params.blockingFindingRefs.map(ref => `  - ${ref}`).join('\n') : '  - none'}
- manual_judgement_required_findings:
${params.manualJudgementFindingRefs.length > 0 ? params.manualJudgementFindingRefs.map(ref => `  - ${ref}`).join('\n') : '  - none'}
- auto_resolvable_findings:
${params.autoResolvableFindingRefs.length > 0 ? params.autoResolvableFindingRefs.map(ref => `  - ${ref}`).join('\n') : '  - none'}

## Findings

${findingLines.join('\n')}

## Hypotheses

${hypothesisLines.join('\n')}

## Improvement Proposals

${proposalLines.join('\n')}

## Candidate Variant Proposals

${candidateLines.join('\n')}

## Next Experiment Plans

${nextPlanLines.join('\n')}

## Human Approval Required

- yes
- no proposal in this report has been auto-implemented
- findings are facts; hypotheses and proposals are reviewable inferences
`
}

const args = parseArgs(process.argv.slice(2))
const experimentRunArg = args['experiment-run']
if (typeof experimentRunArg !== 'string' || experimentRunArg.trim() === '') {
  console.error(
    'Usage: bun run scripts/evals/v2_run_feedback.ts --experiment-run <experiment-run-json>',
  )
  process.exit(1)
}

const experimentRunAbsolute = path.resolve(repoRoot, experimentRunArg)
const experimentRunRef = toRepoRelative(experimentRunAbsolute)
const artifact = await readJson<ExperimentRunArtifact>(experimentRunAbsolute)
const experimentId = assertString(artifact.experiment_id, 'experiment_id')
const generatedAt = new Date().toISOString()
const generatedAtCompact = generatedAt.replace(/[-:.]/g, '')
const feedbackRunId = buildId('feedback_run', experimentId, 'beta', generatedAtCompact)

await ensureDirectory('tests/evals/v2/feedback/findings')
await ensureDirectory('tests/evals/v2/feedback/hypotheses')
await ensureDirectory('tests/evals/v2/feedback/proposals')
await ensureDirectory('tests/evals/v2/feedback/candidate-proposals')
await ensureDirectory('tests/evals/v2/feedback/experiment-plans')
await ensureDirectory('tests/evals/v2/feedback/runs')
await ensureDirectory('ObservrityTask/10-系统版本/v2/07-反馈报告')

const findings = extractFindings(experimentRunRef, artifact, generatedAtCompact)
const hypotheses = buildHypotheses(experimentId, artifact, findings, generatedAtCompact)
const proposals = buildImprovementProposals(
  experimentId,
  findings,
  hypotheses,
  generatedAtCompact,
)
const candidateProposals = buildCandidateVariantProposals(
  experimentId,
  proposals,
  generatedAtCompact,
)
const nextExperimentPlans = buildNextExperimentPlans(
  experimentId,
  artifact,
  proposals,
  candidateProposals,
  generatedAtCompact,
)
const proposalQueueById = buildProposalQueue(proposals)

const findingRefs: string[] = []
for (const finding of findings) {
  const relativePath = `tests/evals/v2/feedback/findings/${finding.finding_id}.json`
  await writeJson(relativePath, finding)
  findingRefs.push(relativePath)
}

const hypothesisRefs: string[] = []
for (const hypothesis of hypotheses) {
  const relativePath = `tests/evals/v2/feedback/hypotheses/${hypothesis.hypothesis_id}.json`
  await writeJson(relativePath, hypothesis)
  hypothesisRefs.push(relativePath)
}

const proposalRefs: string[] = []
const proposalRefById = new Map<string, string>()
for (const proposal of proposals) {
  const relativePath = `tests/evals/v2/feedback/proposals/${proposal.proposal_id}.json`
  await writeJson(relativePath, proposal)
  proposalRefs.push(relativePath)
  proposalRefById.set(proposal.proposal_id, relativePath)
}

const candidateProposalRefs: string[] = []
for (const proposal of candidateProposals) {
  const relativePath = `tests/evals/v2/feedback/candidate-proposals/${proposal.candidate_proposal_id}.json`
  await writeJson(relativePath, proposal)
  candidateProposalRefs.push(relativePath)
}

const nextExperimentPlanRefs: string[] = []
const nextPlanRefByProposalId = new Map<string, string>()
for (const plan of nextExperimentPlans) {
  const relativePath = `tests/evals/v2/feedback/experiment-plans/${plan.next_experiment_plan_id}.json`
  await writeJson(relativePath, plan)
  nextExperimentPlanRefs.push(relativePath)
  nextPlanRefByProposalId.set(plan.based_on_proposal_id, relativePath)
}

const proposalQueue: EvalFeedbackProposalQueue = {
  top_recommendation_proposal_ref:
    proposalQueueById.top_recommendation_proposal_id
      ? proposalRefById.get(proposalQueueById.top_recommendation_proposal_id) ?? null
      : null,
  recommended_now_proposal_refs: uniq(
    proposalQueueById.recommended_now_proposal_ids
      .map(proposalId => proposalRefById.get(proposalId) ?? '')
      .filter(Boolean),
  ),
  recommended_later_proposal_refs: uniq(
    proposalQueueById.recommended_later_proposal_ids
      .map(proposalId => proposalRefById.get(proposalId) ?? '')
      .filter(Boolean),
  ),
  deferred_proposal_refs: uniq(
    proposalQueueById.deferred_proposal_ids
      .map(proposalId => proposalRefById.get(proposalId) ?? '')
      .filter(Boolean),
  ),
  blocked_proposal_refs: uniq(
    proposalQueueById.blocked_proposal_ids
      .map(proposalId => proposalRefById.get(proposalId) ?? '')
      .filter(Boolean),
  ),
}

const blockingFindingRefs = uniq(
  findings
    .filter(finding => finding.is_blocking)
    .map(finding => `tests/evals/v2/feedback/findings/${finding.finding_id}.json`),
)
const manualJudgementFindingRefs = uniq(
  findings
    .filter(finding => finding.requires_manual_judgement)
    .map(finding => `tests/evals/v2/feedback/findings/${finding.finding_id}.json`),
)
const autoResolvableFindingRefs = uniq(
  findings
    .filter(finding => finding.auto_resolvable)
    .map(finding => `tests/evals/v2/feedback/findings/${finding.finding_id}.json`),
)

const approvalCard = buildApprovalCard(
  proposals,
  candidateProposals,
  nextExperimentPlans,
  proposalQueueById,
  proposalRefById,
  nextPlanRefByProposalId,
)

const sourceReportRefs = asArray<string>(artifact.report_refs)
const reportRelativePath = `ObservrityTask/10-系统版本/v2/07-反馈报告/${feedbackRunId}.md`
await writeMarkdown(
  reportRelativePath,
  buildMarkdownReport({
    feedbackRunId,
    generatedAt,
    sourceExperimentRunRef: experimentRunRef,
    sourceReportRefs,
    findings,
    hypotheses,
    proposals,
    candidateProposals,
    nextExperimentPlans,
    proposalQueue,
    blockingFindingRefs,
    manualJudgementFindingRefs,
    autoResolvableFindingRefs,
    approvalCard,
    proposalRefById,
  }),
)

const feedbackRun: EvalFeedbackRun = {
  feedback_run_id: feedbackRunId,
  taxonomy_version: 'v2_5_beta',
  generated_at: generatedAt,
  source_experiment_id: experimentId,
  source_experiment_run_ref: experimentRunRef,
  source_report_refs: sourceReportRefs,
  finding_refs: findingRefs,
  hypothesis_refs: hypothesisRefs,
  proposal_refs: proposalRefs,
  candidate_proposal_refs: candidateProposalRefs,
  next_experiment_plan_refs: nextExperimentPlanRefs,
  proposal_queue: proposalQueue,
  blocking_finding_refs: blockingFindingRefs,
  manual_judgement_required_finding_refs: manualJudgementFindingRefs,
  auto_resolvable_finding_refs: autoResolvableFindingRefs,
  approval_card: approvalCard,
  report_ref: reportRelativePath,
  human_approval_required: true,
  status: 'completed',
}

const feedbackRunRelativePath = `tests/evals/v2/feedback/runs/${feedbackRunId}.json`
await writeJson(feedbackRunRelativePath, feedbackRun)

console.log(
  JSON.stringify(
    {
      feedback_run_id: feedbackRunId,
      taxonomy_version: feedbackRun.taxonomy_version,
      source_experiment_id: experimentId,
      source_experiment_run_ref: experimentRunRef,
      findings: findings.length,
      hypotheses: hypotheses.length,
      proposals: proposals.length,
      candidate_proposals: candidateProposals.length,
      next_experiment_plans: nextExperimentPlans.length,
      top_recommendation_proposal_ref: proposalQueue.top_recommendation_proposal_ref,
      report_ref: reportRelativePath,
      feedback_run_ref: feedbackRunRelativePath,
      human_approval_required: true,
    },
    null,
    2,
  ),
)
