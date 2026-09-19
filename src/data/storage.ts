import { emptyRecords, updateRecords } from '../game/records'
import type { Attempt, Difficulty, DifficultyRecords, PersistedStateV1, RecordsByDifficulty, RoundResult } from '../game/types'

export const STORAGE_KEY = 'math-quest:v1'

export function defaultPersistedState(): PersistedStateV1 {
  return { version: 1, rounds: [], records: emptyRecords(), settings: { soundEnabled: true } }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isDifficulty(value: unknown): value is Difficulty {
  return value === 'easy' || value === 'medium' || value === 'expert'
}

function isDifficultyRecords(value: unknown): value is DifficultyRecords {
  if (!isObject(value)) return false
  return ['bestScore', 'perfectTimeMs', 'qualifiedTimeMs'].every((key) => {
    const recordValue = value[key]
    return recordValue === null || isFiniteNumber(recordValue)
  })
}

function isRecordsByDifficulty(value: unknown): value is RecordsByDifficulty {
  return isObject(value) && isDifficultyRecords(value.easy) && isDifficultyRecords(value.medium) && isDifficultyRecords(value.expert)
}

function isAttempt(value: unknown): value is Attempt {
  if (!isObject(value)) return false
  return (
    typeof value.questionId === 'string' &&
    ['factX', 'factY', 'displayedX', 'displayedY', 'enteredAnswer', 'correctAnswer', 'responseTimeMs'].every(
      (key) => isFiniteNumber(value[key]),
    ) &&
    typeof value.isCorrect === 'boolean'
  )
}

function isRoundResult(value: unknown): value is RoundResult {
  if (!isObject(value)) return false
  return (
    typeof value.id === 'string' &&
    typeof value.completedAt === 'string' &&
    isDifficulty(value.difficulty) &&
    ['totalQuestions', 'correctAnswers', 'percentage', 'activeTimeMs', 'averageTimeMs'].every((key) => isFiniteNumber(value[key])) &&
    Array.isArray(value.attempts) &&
    value.attempts.every(isAttempt)
  )
}

export function loadPersistedState(storage?: Pick<Storage, 'getItem'>): PersistedStateV1 {
  try {
    const raw = (storage ?? globalThis.localStorage).getItem(STORAGE_KEY)
    if (!raw) return defaultPersistedState()
    const parsed: unknown = JSON.parse(raw)
    if (!isObject(parsed) || parsed.version !== 1) {
      return defaultPersistedState()
    }
    if (!Array.isArray(parsed.rounds) || !isRecordsByDifficulty(parsed.records) || !isObject(parsed.settings)) {
      return defaultPersistedState()
    }
    return {
      version: 1,
      rounds: parsed.rounds.filter(isRoundResult).slice(0, 100),
      records: parsed.records,
      settings: { soundEnabled: parsed.settings.soundEnabled !== false },
    }
  } catch {
    return defaultPersistedState()
  }
}

export function savePersistedState(state: PersistedStateV1, storage?: Pick<Storage, 'setItem'>): void {
  try {
    ;(storage ?? globalThis.localStorage).setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // The game remains playable if storage is unavailable or full.
  }
}

export function addCompletedRound(state: PersistedStateV1, result: RoundResult): PersistedStateV1 {
  return {
    ...state,
    rounds: [result, ...state.rounds.filter((round) => round.id !== result.id)].slice(0, 100),
    records: updateRecords(result, state.records),
  }
}
