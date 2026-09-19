import { describe, expect, it } from 'vitest'
import { buildFactPool, canonicalFact, generateRound } from './facts'
import type { Difficulty } from './types'

describe('fact generation', () => {
  it.each([
    ['easy', 34],
    ['medium', 45],
    ['expert', 68],
  ] as const)('builds the expected %s pool', (difficulty, expected) => {
    expect(buildFactPool(difficulty).length).toBe(expected)
  })

  it('canonicalizes symmetric facts', () => {
    expect(canonicalFact(8, 7)).toEqual(canonicalFact(7, 8))
  })

  it('keeps 11s and 12s exclusive to Expert', () => {
    for (const difficulty of ['easy', 'medium'] as const) {
      expect(buildFactPool(difficulty).every((fact) => fact.x <= 10 && fact.y <= 10)).toBe(true)
    }
    const expert = buildFactPool('expert')
    expect(expert.some((fact) => fact.x === 11 || fact.y === 11)).toBe(true)
    expect(expert.some((fact) => fact.x === 12 || fact.y === 12)).toBe(true)
  })

  it.each(['easy', 'medium', 'expert'] as Difficulty[])('creates 25 unique %s questions', (difficulty) => {
    for (let seed = 0; seed < 30; seed += 1) {
      let state = seed + 1
      const random = () => {
        state = (state * 16807) % 2147483647
        return (state - 1) / 2147483646
      }
      const round = generateRound(difficulty, random)
      expect(round).toHaveLength(25)
      expect(new Set(round.map((question) => question.fact.key)).size).toBe(25)
      round.forEach((question, index) => {
        expect(question.position).toBe(index + 1)
        expect(question.displayedX * question.displayedY).toBe(question.correctAnswer)
        expect([question.fact.x, question.fact.y]).toContain(question.displayedX)
      })
    }
  })
})
