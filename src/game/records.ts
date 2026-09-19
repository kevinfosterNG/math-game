import type { DifficultyRecords, RecordAchievements, RecordsByDifficulty, RoundResult } from './types'

export function rankRounds(rounds: RoundResult[], difficulty: RoundResult['difficulty'], limit = 10): RoundResult[] {
  return rounds
    .filter((round) => round.difficulty === difficulty)
    .sort((first, second) =>
      second.percentage - first.percentage ||
      first.activeTimeMs - second.activeTimeMs ||
      second.completedAt.localeCompare(first.completedAt),
    )
    .slice(0, limit)
}

export const EMPTY_DIFFICULTY_RECORDS: DifficultyRecords = {
  bestScore: null,
  perfectTimeMs: null,
  qualifiedTimeMs: null,
}

export function emptyRecords(): RecordsByDifficulty {
  return {
    easy: { ...EMPTY_DIFFICULTY_RECORDS },
    medium: { ...EMPTY_DIFFICULTY_RECORDS },
    expert: { ...EMPTY_DIFFICULTY_RECORDS },
  }
}

export function getAchievements(result: RoundResult, current: RecordsByDifficulty): RecordAchievements {
  const records = current[result.difficulty]
  return {
    bestScore: records.bestScore === null || result.percentage > records.bestScore,
    perfectTime:
      result.correctAnswers === result.totalQuestions &&
      (records.perfectTimeMs === null || result.activeTimeMs < records.perfectTimeMs),
    qualifiedTime:
      result.percentage >= 90 &&
      (records.qualifiedTimeMs === null || result.activeTimeMs < records.qualifiedTimeMs),
  }
}

export function updateRecords(result: RoundResult, current: RecordsByDifficulty): RecordsByDifficulty {
  const achievements = getAchievements(result, current)
  const previous = current[result.difficulty]
  return {
    ...current,
    [result.difficulty]: {
      bestScore: achievements.bestScore ? result.percentage : previous.bestScore,
      perfectTimeMs: achievements.perfectTime ? result.activeTimeMs : previous.perfectTimeMs,
      qualifiedTimeMs: achievements.qualifiedTime ? result.activeTimeMs : previous.qualifiedTimeMs,
    },
  }
}
