import { describe, expect, it } from 'vitest'
import { defaultState } from './state'
import { mergeCloudHistory, mergeRounds, parseCloudRound } from './sync'
import type { RoundResult } from '../game/types'

const round = (id: string, completedAt: string, score: number): RoundResult => ({
  id,
  completedAt,
  difficulty: 'easy',
  totalQuestions: 25,
  correctAnswers: Math.round(score / 4),
  percentage: score,
  activeTimeMs: 30_000,
  averageTimeMs: 1_200,
  attempts: [],
})

describe('cloud history merge', () => {
  it('deduplicates by stable round ID, favors the local copy, and sorts newest first', () => {
    const local = [round('shared', '2026-01-02T00:00:00.000Z', 100)]
    const cloud = [round('shared', '2026-01-01T00:00:00.000Z', 40), round('cloud', '2026-01-03T00:00:00.000Z', 80)]
    expect(mergeRounds(local, cloud)).toEqual([cloud[1], local[0]])
  })

  it('rebuilds records from the merged cross-device history', () => {
    const merged = mergeCloudHistory({ ...defaultState(), rounds: [round('local', '2026-01-01T00:00:00.000Z', 80)] }, [
      round('cloud', '2026-01-02T00:00:00.000Z', 96),
    ])
    expect(merged.records.easy.bestScore).toBe(96)
    expect(merged.rounds).toHaveLength(2)
  })

  it('keeps records from older cloud rounds even though local history is capped', () => {
    const cloud = Array.from({ length: 101 }, (_, index) => round(
      String(index),
      new Date(Date.UTC(2026, 0, 1, 0, 0, index)).toISOString(),
      index === 0 ? 100 : 80,
    ))
    const merged = mergeCloudHistory(defaultState(), cloud)
    expect(merged.rounds).toHaveLength(100)
    expect(merged.records.easy.bestScore).toBe(100)
  })

  it('rejects malformed cloud summaries without throwing', () => {
    expect(parseCloudRound({ id: 'bad', difficulty: 'easy' })).toBeNull()
    expect(parseCloudRound({
      id: 'valid', completed_at: '2026-01-01T00:00:00.000Z', difficulty: 'easy',
      total_questions: 25, correct_answers: 25, percentage: 100, active_time_ms: 1000, average_time_ms: 40,
      attempts: [{ question_id: 'ok', fact_x: 2, fact_y: 3, displayed_x: 2, displayed_y: 3, entered_answer: 6,
        correct_answer: 6, is_correct: true, response_time_ms: 40, order_index: 0 }, { question_id: null }],
    })).toMatchObject({ id: 'valid', attempts: [{ questionId: 'ok' }] })
    expect(parseCloudRound({
      id: 'bad-attempts', completed_at: '2026-01-01T00:00:00.000Z', difficulty: 'easy',
      total_questions: 25, correct_answers: 25, percentage: 100, active_time_ms: 1000, average_time_ms: 40,
      attempts: 'not-an-array',
    })).toBeNull()
  })
})
