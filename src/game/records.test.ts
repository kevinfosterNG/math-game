import { describe, expect, it } from 'vitest'
import { emptyRecords, getAchievements, rankRounds, updateRecords } from './records'
import type { RoundResult } from './types'

function result(correctAnswers: number, activeTimeMs: number): RoundResult {
  return {
    id: `${correctAnswers}-${activeTimeMs}`,
    completedAt: '2026-09-19T12:00:00.000Z',
    difficulty: 'medium',
    totalQuestions: 25,
    correctAnswers,
    percentage: Math.round((correctAnswers / 25) * 100),
    activeTimeMs,
    averageTimeMs: Math.round(activeTimeMs / 25),
    attempts: [],
  }
}

describe('personal records', () => {
  it('uses 23/25 as the qualified boundary', () => {
    expect(getAchievements(result(22, 40_000), emptyRecords()).qualifiedTime).toBe(false)
    expect(getAchievements(result(23, 40_000), emptyRecords()).qualifiedTime).toBe(true)
  })

  it('requires strict improvement and tracks perfect time separately', () => {
    const first = result(25, 60_000)
    const records = updateRecords(first, emptyRecords())
    expect(getAchievements(result(25, 60_000), records)).toEqual({
      bestScore: false,
      perfectTime: false,
      qualifiedTime: false,
    })
    const faster = getAchievements(result(25, 55_000), records)
    expect(faster.bestScore).toBe(false)
    expect(faster.perfectTime).toBe(true)
    expect(faster.qualifiedTime).toBe(true)
  })

  it('keeps difficulty records independent', () => {
    const records = updateRecords(result(24, 50_000), emptyRecords())
    expect(records.medium.bestScore).toBe(96)
    expect(records.easy.bestScore).toBeNull()
  })

  it('ranks each difficulty by score, then fastest time', () => {
    const rounds = [
      result(24, 50_000),
      result(25, 65_000),
      result(24, 40_000),
      result(25, 55_000),
      { ...result(25, 30_000), id: 'easy-round', difficulty: 'easy' as const },
    ]
    expect(rankRounds(rounds, 'medium').map((round) => round.id)).toEqual([
      '25-55000',
      '25-65000',
      '24-40000',
      '24-50000',
    ])
  })

  it('limits a leaderboard to ten rounds', () => {
    const rounds = Array.from({ length: 12 }, (_, index) => result(20, 30_000 + index))
    expect(rankRounds(rounds, 'medium')).toHaveLength(10)
  })
})
