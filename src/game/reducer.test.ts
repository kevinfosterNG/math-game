import { describe, expect, it } from 'vitest'
import { generateRound } from './facts'
import { gameReducer, initialGameState } from './reducer'
import type { Attempt } from './types'

const questions = generateRound('easy', () => 0.25)
const attempt = (questionIndex: number, isCorrect: boolean): Attempt => {
  const question = questions[questionIndex]
  return {
    questionId: question.id,
    factX: question.fact.x,
    factY: question.fact.y,
    displayedX: question.displayedX,
    displayedY: question.displayedY,
    enteredAnswer: isCorrect ? question.correctAnswer : question.correctAnswer + 1,
    correctAnswer: question.correctAnswer,
    isCorrect,
    responseTimeMs: 1_000,
  }
}

describe('game reducer', () => {
  it('starts, scores, advances, and blocks double submit', () => {
    let state = gameReducer(initialGameState, { type: 'START', difficulty: 'easy', questions })
    state = gameReducer(state, { type: 'SUBMIT', attempt: attempt(0, true) })
    expect(state.phase).toBe('feedback')
    expect(state.streak).toBe(1)
    expect(gameReducer(state, { type: 'SUBMIT', attempt: attempt(0, true) })).toBe(state)
    state = gameReducer(state, { type: 'ADVANCE' })
    expect(state.phase).toBe('playing')
    expect(state.questionIndex).toBe(1)
  })

  it('resets a streak after a wrong answer', () => {
    let state = gameReducer(initialGameState, { type: 'START', difficulty: 'easy', questions })
    state = gameReducer(state, { type: 'SUBMIT', attempt: attempt(0, true) })
    state = gameReducer(state, { type: 'ADVANCE' })
    state = gameReducer(state, { type: 'SUBMIT', attempt: attempt(1, false) })
    expect(state.streak).toBe(0)
    expect(state.bestStreak).toBe(1)
  })

  it('abandons a round without producing a result', () => {
    const playing = gameReducer(initialGameState, { type: 'START', difficulty: 'easy', questions })
    const home = gameReducer(playing, { type: 'HOME' })
    expect(home).toEqual(initialGameState)
  })

  it('only accepts an attempt for the active question', () => {
    const state = gameReducer(initialGameState, { type: 'START', difficulty: 'easy', questions })
    const invalidAttempt = { ...attempt(0, true), questionId: questions[1].id }
    expect(gameReducer(state, { type: 'SUBMIT', attempt: invalidAttempt })).toBe(state)
  })

  it('builds a completed result only after the final answer advances', () => {
    let state = gameReducer(initialGameState, { type: 'START', difficulty: 'easy', questions })
    questions.forEach((_, index) => {
      state = gameReducer(state, { type: 'SUBMIT', attempt: attempt(index, true) })
      state = gameReducer(state, { type: 'ADVANCE' })
    })
    expect(state.phase).toBe('results')
    expect(state.result).toMatchObject({
      totalQuestions: 25,
      correctAnswers: 25,
      percentage: 100,
      activeTimeMs: 25_000,
      averageTimeMs: 1_000,
    })
  })
})
