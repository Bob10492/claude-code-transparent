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
