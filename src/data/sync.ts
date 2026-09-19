import type { RoundResult } from '../game/types'
import { emptyRecords, updateRecords } from '../game/records'
import type { PersistedStateV1 } from '../game/types'
import { supabase } from './supabase'

type CloudAttempt = {
  question_id: string
  fact_x: number
  fact_y: number
  displayed_x: number
  displayed_y: number
  entered_answer: number
  correct_answer: number
  is_correct: boolean
  response_time_ms: number
  order_index: number
}

type CloudRound = {
  id: string
  completed_at: string
  difficulty: RoundResult['difficulty']
  total_questions: number
  correct_answers: number
  percentage: number
  active_time_ms: number
  average_time_ms: number
  attempts?: CloudAttempt[]
}

export type SyncStatus = 'local' | 'offline' | 'syncing' | 'synced' | 'error'

function mergeAllRounds(localRounds: RoundResult[], cloudRounds: RoundResult[]): RoundResult[] {
  const merged = new Map<string, RoundResult>()
  cloudRounds.forEach((round) => merged.set(round.id, round))
  localRounds.forEach((round) => merged.set(round.id, round))
  return [...merged.values()]
    .sort((first, second) => second.completedAt.localeCompare(first.completedAt))
}

function isFiniteInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && Number.isFinite(value)
}

function parseCloudAttempt(value: unknown): CloudAttempt | null {
  if (typeof value !== 'object' || value === null) return null
  const attempt = value as Record<string, unknown>
  if (
    typeof attempt.question_id !== 'string' || attempt.question_id.length === 0 ||
    !isFiniteInteger(attempt.fact_x) || attempt.fact_x < 1 || attempt.fact_x > 12 ||
    !isFiniteInteger(attempt.fact_y) || attempt.fact_y < 1 || attempt.fact_y > 12 ||
    !isFiniteInteger(attempt.displayed_x) || attempt.displayed_x < 1 || attempt.displayed_x > 12 ||
    !isFiniteInteger(attempt.displayed_y) || attempt.displayed_y < 1 || attempt.displayed_y > 12 ||
    !isFiniteInteger(attempt.entered_answer) || attempt.entered_answer < 0 || attempt.entered_answer > 999 ||
    !isFiniteInteger(attempt.correct_answer) || attempt.correct_answer < 1 || attempt.correct_answer > 144 ||
    typeof attempt.is_correct !== 'boolean' ||
    !isFiniteInteger(attempt.response_time_ms) || attempt.response_time_ms < 0 ||
    !isFiniteInteger(attempt.order_index) || attempt.order_index < 0 || attempt.order_index > 24
  ) return null
  return attempt as unknown as CloudAttempt
}

export function parseCloudRound(value: unknown): RoundResult | null {
  if (typeof value !== 'object' || value === null) return null
  const round = value as Record<string, unknown>
  if (
    typeof round.id !== 'string' || round.id.length === 0 ||
    typeof round.completed_at !== 'string' || Number.isNaN(Date.parse(round.completed_at)) ||
    !['easy', 'medium', 'expert'].includes(String(round.difficulty)) ||
    !isFiniteInteger(round.total_questions) || round.total_questions < 1 || round.total_questions > 25 ||
    !isFiniteInteger(round.correct_answers) || round.correct_answers < 0 || round.correct_answers > round.total_questions ||
    !isFiniteInteger(round.percentage) || round.percentage < 0 || round.percentage > 100 ||
    !isFiniteInteger(round.active_time_ms) || round.active_time_ms < 0 ||
    !isFiniteInteger(round.average_time_ms) || round.average_time_ms < 0
  ) return null

  const attempts = round.attempts === undefined
    ? []
    : Array.isArray(round.attempts)
      ? round.attempts.map(parseCloudAttempt).filter((attempt): attempt is CloudAttempt => attempt !== null)
      : null
  if (attempts === null) return null

  return fromCloudRound({
    id: round.id,
    completed_at: round.completed_at,
    difficulty: round.difficulty as RoundResult['difficulty'],
    total_questions: round.total_questions,
    correct_answers: round.correct_answers,
    percentage: round.percentage,
    active_time_ms: round.active_time_ms,
    average_time_ms: round.average_time_ms,
    attempts,
  })
}

export function mergeRounds(localRounds: RoundResult[], cloudRounds: RoundResult[]): RoundResult[] {
  return mergeAllRounds(localRounds, cloudRounds).slice(0, 100)
}

export function mergeCloudHistory(state: PersistedStateV1, cloudRounds: RoundResult[]): PersistedStateV1 {
  const allRounds = mergeAllRounds(state.rounds, cloudRounds)
  const records = allRounds.reduce((current, round) => updateRecords(round, current), emptyRecords())
  return { ...state, rounds: allRounds.slice(0, 100), records }
}

function toCloudPayload(round: RoundResult) {
  return {
    p_round: {
      id: round.id,
      completed_at: round.completedAt,
      difficulty: round.difficulty,
      total_questions: round.totalQuestions,
      correct_answers: round.correctAnswers,
      percentage: round.percentage,
      active_time_ms: round.activeTimeMs,
      average_time_ms: round.averageTimeMs,
    },
    p_attempts: round.attempts.map((attempt, orderIndex) => ({
      question_id: attempt.questionId,
      fact_x: attempt.factX,
      fact_y: attempt.factY,
      displayed_x: attempt.displayedX,
      displayed_y: attempt.displayedY,
      entered_answer: attempt.enteredAnswer,
      correct_answer: attempt.correctAnswer,
      is_correct: attempt.isCorrect,
      response_time_ms: attempt.responseTimeMs,
      order_index: orderIndex,
    })),
  }
}

function fromCloudRound(round: CloudRound): RoundResult {
  return {
    id: round.id,
    completedAt: round.completed_at,
    difficulty: round.difficulty,
    totalQuestions: round.total_questions,
    correctAnswers: round.correct_answers,
    percentage: round.percentage,
    activeTimeMs: round.active_time_ms,
    averageTimeMs: round.average_time_ms,
    attempts: [...(round.attempts ?? [])]
      .sort((first, second) => first.order_index - second.order_index)
      .map((attempt) => ({
        questionId: attempt.question_id,
        factX: attempt.fact_x,
        factY: attempt.fact_y,
        displayedX: attempt.displayed_x,
        displayedY: attempt.displayed_y,
        enteredAnswer: attempt.entered_answer,
        correctAnswer: attempt.correct_answer,
        isCorrect: attempt.is_correct,
        responseTimeMs: attempt.response_time_ms,
      })),
  }
}

export async function pullCloudRounds(): Promise<RoundResult[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('rounds')
    .select('id, completed_at, difficulty, total_questions, correct_answers, percentage, active_time_ms, average_time_ms, attempts(question_id, fact_x, fact_y, displayed_x, displayed_y, entered_answer, correct_answer, is_correct, response_time_ms, order_index)')
    .order('completed_at', { ascending: false })
  if (error) throw error
  return (Array.isArray(data) ? data : [])
    .map(parseCloudRound)
    .filter((round): round is RoundResult => round !== null)
}

/** Repeated calls are safe: each row is upserted by its stable local ID. */
export async function pushCompletedRounds(rounds: RoundResult[]): Promise<void> {
  if (!supabase) return
  for (const round of rounds) {
    const payload = toCloudPayload(round)
    const { error: roundError } = await supabase
      .from('rounds')
      .upsert(payload.p_round, { onConflict: 'id' })
    if (roundError) throw roundError
    if (payload.p_attempts.length > 0) {
      const { error } = await supabase
        .from('attempts')
        .upsert(payload.p_attempts.map((attempt) => ({ ...attempt, round_id: round.id })), { onConflict: 'round_id,question_id' })
      if (error) throw error
    }
  }
}
