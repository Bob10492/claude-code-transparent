import type { EvalScenario, EvalScore } from '../../src/observability/v2/evalTypes'

type JsonRecord = Record<string, unknown>

export interface V2ScoreInput {
  runId: string
  scenario: EvalScenario
  action: JsonRecord
  rootQuery: JsonRecord
  integrity: JsonRecord | undefined
  tools: JsonRecord[]
  subagents: JsonRecord[]
  recoveries: JsonRecord[]
  variantEffect?: JsonRecord
  longContext?: JsonRecord
}

type V2ScoreScorer = (input: V2ScoreInput) => EvalScore

function asNumber(value: unknown): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string' && value.trim() !== '') return Number(value)
  return 0
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function scoreLabel(value: number): string {
  if (value >= 1) return 'pass'
  if (value > 0) return 'partial'
  return 'fail'
}

function longContextStringArray(evidence: JsonRecord | undefined, key: string): string[] {
  const value = evidence?.[key]
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item.length > 0)
}

function longContextNumber(evidence: JsonRecord | undefined, key: string): number | null {
  if (!evidence || evidence[key] === undefined || evidence[key] === null) return null
  return asNumber(evidence[key])
}

function ratio(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null
  return Number((numerator / denominator).toFixed(6))
}

function contextManualReviewScore(
  params: Pick<V2ScoreInput, 'runId' | 'longContext' | 'scenario'>,
): EvalScore {
  const { runId, longContext, scenario } = params
  const questions =
    longContextStringArray(longContext, 'manual_review_questions').length > 0
      ? longContextStringArray(longContext, 'manual_review_questions')
      : scenario.manual_review_questions ?? []
  return {
    score_id: `${runId}_context_manual_review_required`,
    run_id: runId,
    dimension: 'context',
    subdimension: 'manual_review_required',
    score_value: questions.length > 0 ? 1 : 0,
    score_label: questions.length > 0 ? 'manual_review_required' : 'not_applicable',
    evidence_ref: 'long_context_evidence.manual_review_questions',
    reason:
      questions.length > 0
        ? `Manual review remains required. Questions: ${questions.join(' | ')}`
        : 'No manual review questions were configured for this run.',
  }
}

export function scoreKey(score: EvalScore): string {
  return `${score.dimension}.${score.subdimension}`
}

function subagentCount(subagents: JsonRecord[]): number {
  return subagents.reduce(
    (sum, subagent) => sum + asNumber(subagent.subagent_count),
    0,
  )
}

export const V2_SCORE_SCORERS: Record<string, V2ScoreScorer> = {
  'task_success.main_chain_observed': ({ runId, rootQuery }) => ({
    score_id: `${runId}_task_success_main_chain_observed`,
    run_id: runId,
    dimension: 'task_success',
    subdimension: 'main_chain_observed',
    score_value: rootQuery ? 1 : 0,
    score_label: rootQuery ? 'pass' : 'fail',
    evidence_ref: 'queries',
    reason: rootQuery
      ? 'Main-thread root query is present in V1 evidence.'
      : 'No main-thread root query found for this user_action_id.',
  }),

  'decision_quality.expected_tool_hit_rate': ({ runId, scenario, tools }) => {
    const expectedTools = new Set(scenario.expected_tools)
    const observedTools = new Set(tools.map(tool => asString(tool.tool_name)))
    const expectedToolHitRate =
      expectedTools.size === 0
        ? null
        : [...expectedTools].filter(tool => observedTools.has(tool)).length /
          expectedTools.size
    return {
      score_id: `${runId}_decision_quality_expected_tool_hit_rate`,
      run_id: runId,
      dimension: 'decision_quality',
      subdimension: 'expected_tool_hit_rate',
      score_value: expectedToolHitRate,
      score_label:
        expectedToolHitRate === null
          ? 'not_applicable'
          : scoreLabel(expectedToolHitRate),
      evidence_ref: 'tools',
      reason:
        expectedToolHitRate === null
          ? 'Scenario has no expected_tools yet.'
          : `Observed ${observedTools.size} tool names against ${expectedTools.size} expected tools.`,
    }
  },

  'efficiency.total_billed_tokens': ({ runId, action }) => ({
    score_id: `${runId}_efficiency_total_billed_tokens`,
    run_id: runId,
    dimension: 'efficiency',
    subdimension: 'total_billed_tokens',
    score_value: asNumber(action.total_billed_tokens),
    score_label: 'observed',
    evidence_ref: 'user_actions.total_billed_tokens',
    reason: 'Raw efficiency fact from V1 user_actions.',
  }),

  'efficiency.total_billed_token_budget': ({ runId, scenario, action }) => {
    const billedLimit = scenario.max_total_billed_tokens
    const billedTokens = asNumber(action.total_billed_tokens)
    const billedBudgetScore =
      billedLimit === undefined ? null : billedTokens <= billedLimit ? 1 : 0
    return {
      score_id: `${runId}_efficiency_total_billed_token_budget`,
      run_id: runId,
      dimension: 'efficiency',
      subdimension: 'total_billed_token_budget',
      score_value: billedBudgetScore,
      score_label:
        billedBudgetScore === null ? 'not_applicable' : scoreLabel(billedBudgetScore),
      evidence_ref: 'user_actions.total_billed_tokens',
      reason:
        billedLimit === undefined
          ? 'Scenario has no max_total_billed_tokens budget.'
          : `total_billed_tokens=${billedTokens}; budget=${billedLimit}.`,
    }
  },

  'stability.v1_closure_health': ({ runId, integrity }) => {
    const closureValues = [
      integrity?.strict_query_completion_rate,
      integrity?.strict_turn_state_closure_rate,
      integrity?.tool_lifecycle_closure_rate,
      integrity?.subagent_lifecycle_closure_rate,
    ].map(asNumber)
    const closureHealth =
      closureValues.length === 0
        ? 0
        : closureValues.reduce((sum, value) => sum + value, 0) /
          closureValues.length
    return {
      score_id: `${runId}_stability_v1_closure_health`,
      run_id: runId,
      dimension: 'stability',
      subdimension: 'v1_closure_health',
      score_value: Number(closureHealth.toFixed(6)),
      score_label: scoreLabel(closureHealth),
      evidence_ref: 'metrics_integrity_daily',
      reason:
        'Average of query, turn, tool, and subagent closure rates for the action date.',
    }
  },

  'stability.recovery_absence': ({ runId, recoveries }) => {
    const recoveryScore = recoveries.length === 0 ? 1 : 0
    return {
      score_id: `${runId}_stability_recovery_absence`,
      run_id: runId,
      dimension: 'stability',
      subdimension: 'recovery_absence',
      score_value: recoveryScore,
      score_label: scoreLabel(recoveryScore),
      evidence_ref: 'recoveries',
      reason:
        recoveries.length === 0
          ? 'No recovery events were observed for this action.'
          : `${recoveries.length} recovery events were observed for this action.`,
    }
  },

  'controllability.turn_limit_basic': ({ runId, scenario, rootQuery }) => {
    const maxTurnCount = asNumber(rootQuery.turn_count)
    const turnLimit = scenario.max_turn_count ?? 8
    const maxTurnScore = maxTurnCount > 0 && maxTurnCount <= turnLimit ? 1 : 0
    return {
      score_id: `${runId}_controllability_turn_limit_basic`,
      run_id: runId,
      dimension: 'controllability',
      subdimension: 'turn_limit_basic',
      score_value: maxTurnScore,
      score_label: scoreLabel(maxTurnScore),
      evidence_ref: 'queries.turn_count',
      reason: `Root query turn_count=${maxTurnCount}; scenario limit is ${turnLimit}.`,
    }
  },

  'decision_quality.subagent_count_observed': ({ runId, subagents }) => ({
    score_id: `${runId}_decision_quality_subagent_count_observed`,
    run_id: runId,
    dimension: 'decision_quality',
    subdimension: 'subagent_count_observed',
    score_value: subagentCount(subagents),
    score_label: 'observed',
    evidence_ref: 'subagents',
    reason: 'Observed subagent count is a fact for later baseline vs candidate comparison.',
  }),

  'decision_quality.session_memory_policy_observed': ({ runId, variantEffect }) => {
    const observed =
      variantEffect &&
      (variantEffect.variant_effect_observed === true ||
        variantEffect.policy_event_observed === true)
        ? 1
        : 0
    return {
      score_id: `${runId}_decision_quality_session_memory_policy_observed`,
      run_id: runId,
      dimension: 'decision_quality',
      subdimension: 'session_memory_policy_observed',
      score_value: observed,
      score_label: 'observed',
      evidence_ref: 'variant_effect',
      reason:
        observed === 1
          ? 'Session-memory runtime policy was observed in trace-backed evidence.'
          : 'No session-memory runtime policy observation was found for this run.',
    }
  },

  'controllability.subagent_count_budget': ({ runId, scenario, subagents }) => {
    const limit = scenario.max_subagent_count
    const count = subagentCount(subagents)
    const budgetScore = limit === undefined ? null : count <= limit ? 1 : 0
    return {
      score_id: `${runId}_controllability_subagent_count_budget`,
      run_id: runId,
      dimension: 'controllability',
      subdimension: 'subagent_count_budget',
      score_value: budgetScore,
      score_label: budgetScore === null ? 'not_applicable' : scoreLabel(budgetScore),
      evidence_ref: 'subagents',
      reason:
        limit === undefined
          ? 'Scenario has no max_subagent_count budget.'
          : `subagent_count=${count}; budget=${limit}.`,
    }
  },

  'context.retained_constraint_count': ({ runId, longContext }) => {
    const retained = longContextStringArray(
      longContext,
      'observed_retained_constraints',
    ).length
    return {
      score_id: `${runId}_context_retained_constraint_count`,
      run_id: runId,
      dimension: 'context',
      subdimension: 'retained_constraint_count',
      score_value: retained,
      score_label: 'observed',
      evidence_ref: 'long_context_evidence.observed_retained_constraints',
      reason: `Observed ${retained} retained constraints from long-context evidence.`,
    }
  },

  'context.lost_constraint_count': ({ runId, longContext }) => {
    const lost = longContextStringArray(longContext, 'observed_lost_constraints').length
    return {
      score_id: `${runId}_context_lost_constraint_count`,
      run_id: runId,
      dimension: 'context',
      subdimension: 'lost_constraint_count',
      score_value: lost,
      score_label: 'observed',
      evidence_ref: 'long_context_evidence.observed_lost_constraints',
      reason: `Observed ${lost} lost constraints from long-context evidence.`,
    }
  },

  'context.constraint_retention_rate': ({ runId, longContext }) => {
    const retained = longContextStringArray(
      longContext,
      'observed_retained_constraints',
    ).length
    const lost = longContextStringArray(longContext, 'observed_lost_constraints').length
    const value = ratio(retained, retained + lost)
    return {
      score_id: `${runId}_context_constraint_retention_rate`,
      run_id: runId,
      dimension: 'context',
      subdimension: 'constraint_retention_rate',
      score_value: value,
      score_label: value === null ? 'inconclusive' : scoreLabel(value),
      evidence_ref: 'long_context_evidence.observed_retained_constraints',
      reason:
        value === null
          ? 'No retained/lost constraint evidence was available.'
          : `Constraint retention rate=${value} from retained=${retained}, lost=${lost}.`,
    }
  },

  'context.retrieved_fact_hit_rate': ({ runId, longContext }) => {
    const retrieved = longContextStringArray(longContext, 'observed_retrieved_facts').length
    const missed = longContextStringArray(longContext, 'observed_missed_facts').length
    const value = ratio(retrieved, retrieved + missed)
    return {
      score_id: `${runId}_context_retrieved_fact_hit_rate`,
      run_id: runId,
      dimension: 'context',
      subdimension: 'retrieved_fact_hit_rate',
      score_value: value,
      score_label: value === null ? 'inconclusive' : scoreLabel(value),
      evidence_ref: 'long_context_evidence.observed_retrieved_facts',
      reason:
        value === null
          ? 'No retrieved/missed fact evidence was available.'
          : `Retrieved fact hit rate=${value} from hits=${retrieved}, missed=${missed}.`,
    }
  },

  'context.distractor_confusion_count': ({ runId, longContext }) => {
    const confusions = longContextStringArray(longContext, 'observed_confusions').length
    return {
      score_id: `${runId}_context_distractor_confusion_count`,
      run_id: runId,
      dimension: 'context',
      subdimension: 'distractor_confusion_count',
      score_value: confusions,
      score_label: 'observed',
      evidence_ref: 'long_context_evidence.observed_confusions',
      reason: `Observed ${confusions} distractor confusions from long-context evidence.`,
    }
  },

  'context.total_prompt_input_tokens': ({ runId, action }) => ({
    score_id: `${runId}_context_total_prompt_input_tokens`,
    run_id: runId,
    dimension: 'context',
    subdimension: 'total_prompt_input_tokens',
    score_value: asNumber(action.total_prompt_input_tokens),
    score_label: 'observed',
    evidence_ref: 'user_actions.total_prompt_input_tokens',
    reason: 'Raw prompt-input cost fact from V1 user_actions.',
  }),

  'context.compaction_trigger_count': ({ runId, longContext }) => {
    const count = longContextNumber(longContext, 'compaction_trigger_count')
    return {
      score_id: `${runId}_context_compaction_trigger_count`,
      run_id: runId,
      dimension: 'context',
      subdimension: 'compaction_trigger_count',
      score_value: count,
      score_label: count === null ? 'inconclusive' : 'observed',
      evidence_ref: 'long_context_evidence.compaction_trigger_count',
      reason:
        count === null
          ? 'No compaction trigger evidence was available.'
          : `Observed compaction_trigger_count=${count}.`,
    }
  },

  'context.compaction_saved_tokens': ({ runId, longContext }) => {
    const saved = longContextNumber(longContext, 'compaction_saved_tokens')
    return {
      score_id: `${runId}_context_compaction_saved_tokens`,
      run_id: runId,
      dimension: 'context',
      subdimension: 'compaction_saved_tokens',
      score_value: saved,
      score_label: saved === null ? 'inconclusive' : 'observed',
      evidence_ref: 'long_context_evidence.compaction_saved_tokens',
      reason:
        saved === null
          ? 'No compaction saved-token evidence was available.'
          : `Observed compaction_saved_tokens=${saved}.`,
    }
  },

  'context.success_under_context_pressure': ({ runId, rootQuery, longContext }) => {
    const explicit = longContextNumber(longContext, 'success_under_context_pressure')
    const value =
      explicit !== null ? explicit : rootQuery ? 1 : 0
    return {
      score_id: `${runId}_context_success_under_context_pressure`,
      run_id: runId,
      dimension: 'context',
      subdimension: 'success_under_context_pressure',
      score_value: value,
      score_label: scoreLabel(value),
      evidence_ref:
        explicit !== null
          ? 'long_context_evidence.success_under_context_pressure'
          : 'queries',
      reason:
        explicit !== null
          ? `Fixture/runtime evidence marked success_under_context_pressure=${explicit}.`
          : rootQuery
            ? 'Fallback success signal: root query exists.'
            : 'No root query or explicit success-under-pressure evidence was found.',
    }
  },

  'context.manual_review_required': ({ runId, longContext, scenario }) =>
    contextManualReviewScore({ runId, longContext, scenario }),

  'context.manual_quality_review_required': ({ runId, longContext, scenario }) =>
    contextManualReviewScore({ runId, longContext, scenario }),
}

export function listImplementedScoreSpecIds(): string[] {
  return Object.keys(V2_SCORE_SCORERS)
}

export function buildScoresForSpecIds(
  input: V2ScoreInput,
  requestedScoreSpecIds: string[],
): EvalScore[] {
  const scoreSpecIds =
    requestedScoreSpecIds.length > 0
      ? requestedScoreSpecIds
      : listImplementedScoreSpecIds()
  return scoreSpecIds.map(scoreSpecId => {
    const scorer = V2_SCORE_SCORERS[scoreSpecId]
    if (!scorer) {
      throw new Error(`Score spec has no implemented scorer yet: ${scoreSpecId}`)
    }
    return scorer(input)
  })
}
