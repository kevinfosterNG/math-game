import { describe, expect, it, vi } from 'vitest'
import type { RoundResult } from '../game/types'

const database = vi.hoisted(() => ({
  from: vi.fn(),
  eq: vi.fn(),
  order: vi.fn(),
  upsert: vi.fn(),
}))

vi.mock('./supabase', () => ({ supabase: { from: database.from } }))

import { pullCloudRounds, pushCompletedRounds } from './sync'

describe('authenticated sync requests', () => {
  it('filters reads and attributes writes to the current user', async () => {
    database.order.mockResolvedValue({ data: [], error: null })
    database.eq.mockReturnValue({ order: database.order })
    database.upsert.mockResolvedValue({ error: null })
    database.from.mockImplementation(() => ({
      select: () => ({ eq: database.eq }),
      upsert: database.upsert,
    }))

    await pullCloudRounds('student-a')
    expect(database.eq).toHaveBeenCalledWith('user_id', 'student-a')

    const round: RoundResult = {
      id: 'round-a', completedAt: '2026-09-23T00:00:00.000Z', difficulty: 'easy',
      totalQuestions: 25, correctAnswers: 25, percentage: 100,
      activeTimeMs: 25_000, averageTimeMs: 1_000, attempts: [],
    }
    await pushCompletedRounds([round], 'student-a')
    expect(database.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'round-a', user_id: 'student-a' }),
      { onConflict: 'id' },
    )
  })
})
