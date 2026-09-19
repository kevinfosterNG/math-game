import { describe, expect, it } from 'vitest'
import { addCompletedRound, defaultPersistedState, loadPersistedState, STORAGE_KEY } from './storage'
import type { RoundResult } from '../game/types'

const makeRound = (index: number): RoundResult => ({
  id: String(index), completedAt: new Date(index).toISOString(), difficulty: 'easy', totalQuestions: 25,
  correctAnswers: 20, percentage: 80, activeTimeMs: 50_000, averageTimeMs: 2_000, attempts: [],
})

describe('local persistence', () => {
  it('falls back for malformed and unknown data', () => {
    expect(loadPersistedState({ getItem: () => '{bad' })).toEqual(defaultPersistedState())
    expect(loadPersistedState({ getItem: () => JSON.stringify({ version: 2 }) })).toEqual(defaultPersistedState())
  })

  it('reads valid versioned data', () => {
    const state = defaultPersistedState()
    const storage = { getItem: (key: string) => key === STORAGE_KEY ? JSON.stringify(state) : null }
    expect(loadPersistedState(storage)).toEqual(state)
  })

  it('uses safe defaults when records are incomplete and removes malformed round history', () => {
    const state = defaultPersistedState()
    const incompleteRecords = { ...state.records, easy: { bestScore: 90 } }
    expect(loadPersistedState({ getItem: () => JSON.stringify({ ...state, records: incompleteRecords }) }))
      .toEqual(defaultPersistedState())

    const withBadRound = { ...state, rounds: [{ id: 'missing-fields' }, makeRound(1)] }
    expect(loadPersistedState({ getItem: () => JSON.stringify(withBadRound) }).rounds).toEqual([makeRound(1)])
  })

  it('retains only the latest 100 rounds', () => {
    let state = defaultPersistedState()
    for (let index = 0; index < 105; index += 1) state = addCompletedRound(state, makeRound(index))
    expect(state.rounds).toHaveLength(100)
    expect(state.rounds[0].id).toBe('104')
    expect(state.rounds.at(-1)?.id).toBe('5')
  })
})
