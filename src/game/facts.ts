import type { CanonicalFact, Difficulty, Question } from './types'

export const TABLES: Record<Difficulty, readonly number[]> = {
  easy: [1, 2, 5, 10],
  medium: [3, 4, 6, 7, 8, 9],
  expert: [3, 4, 6, 7, 8, 9, 11, 12],
}

export const MAX_MULTIPLIER: Record<Difficulty, number> = {
  easy: 10,
  medium: 10,
  expert: 12,
}

export type RandomSource = () => number

export function canonicalFact(a: number, b: number): CanonicalFact {
  const x = Math.min(a, b)
  const y = Math.max(a, b)
  return { x, y, key: `${x}x${y}` }
}

export function buildFactPool(difficulty: Difficulty): CanonicalFact[] {
  const facts = new Map<string, CanonicalFact>()
  for (const table of TABLES[difficulty]) {
    for (let multiplier = 1; multiplier <= MAX_MULTIPLIER[difficulty]; multiplier += 1) {
      const fact = canonicalFact(table, multiplier)
      facts.set(fact.key, fact)
    }
  }
  return [...facts.values()]
}

export function shuffle<T>(items: readonly T[], random: RandomSource = Math.random): T[] {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
  }
  return result
}

export function generateRound(
  difficulty: Difficulty,
  random: RandomSource = Math.random,
  size = 25,
): Question[] {
  const pool = buildFactPool(difficulty)
  if (pool.length < size) throw new Error(`Only ${pool.length} unique facts available for ${size} questions`)

  const selected = shuffle(pool, random).slice(0, size)
  const oriented = selected.map((fact, index) => {
    const reverse = fact.x !== fact.y && random() >= 0.5
    return {
      id: `${fact.key}-${index}`,
      position: index + 1,
      fact,
      displayedX: reverse ? fact.y : fact.x,
      displayedY: reverse ? fact.x : fact.y,
      correctAnswer: fact.x * fact.y,
    }
  })

  return shuffle(oriented, random).map((question, index) => ({ ...question, position: index + 1 }))
}
