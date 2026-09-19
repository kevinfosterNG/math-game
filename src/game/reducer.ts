import type { Attempt, Difficulty, Question, RoundResult } from './types'

export type GamePhase = 'home' | 'playing' | 'feedback' | 'results'

export interface GameState {
  phase: GamePhase
  difficulty: Difficulty | null
  questions: Question[]
  questionIndex: number
  attempts: Attempt[]
  streak: number
  bestStreak: number
  lastAttempt: Attempt | null
  result: RoundResult | null
}

export const initialGameState: GameState = {
  phase: 'home',
  difficulty: null,
  questions: [],
  questionIndex: 0,
  attempts: [],
  streak: 0,
  bestStreak: 0,
  lastAttempt: null,
  result: null,
}

export type GameAction =
  | { type: 'START'; difficulty: Difficulty; questions: Question[] }
  | { type: 'SUBMIT'; attempt: Attempt }
  | { type: 'ADVANCE' }
  | { type: 'HOME' }

function makeId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
}

function buildResult(state: GameState): RoundResult | null {
  if (!state.difficulty || state.questions.length === 0 || state.attempts.length !== state.questions.length) return null
  const correctAnswers = state.attempts.filter((attempt) => attempt.isCorrect).length
  const activeTimeMs = Math.round(state.attempts.reduce((sum, attempt) => sum + attempt.responseTimeMs, 0))
  return {
    id: makeId(),
    completedAt: new Date().toISOString(),
    difficulty: state.difficulty,
    totalQuestions: state.questions.length,
    correctAnswers,
    percentage: Math.round((correctAnswers / state.questions.length) * 100),
    activeTimeMs,
    averageTimeMs: Math.round(activeTimeMs / state.questions.length),
    attempts: state.attempts,
  }
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START':
      return {
        ...initialGameState,
        phase: 'playing',
        difficulty: action.difficulty,
        questions: action.questions,
      }
    case 'SUBMIT': {
      if (state.phase !== 'playing') return state
      const currentQuestion = state.questions[state.questionIndex]
      if (!currentQuestion || action.attempt.questionId !== currentQuestion.id) return state
      const streak = action.attempt.isCorrect ? state.streak + 1 : 0
      return {
        ...state,
        phase: 'feedback',
        attempts: [...state.attempts, action.attempt],
        streak,
        bestStreak: Math.max(state.bestStreak, streak),
        lastAttempt: action.attempt,
      }
    }
    case 'ADVANCE': {
      if (state.phase !== 'feedback') return state
      if (state.questionIndex >= state.questions.length - 1) {
        return { ...state, phase: 'results', result: buildResult(state) }
      }
      return { ...state, phase: 'playing', questionIndex: state.questionIndex + 1, lastAttempt: null }
    }
    case 'HOME':
      return initialGameState
    default:
      return state
  }
}
