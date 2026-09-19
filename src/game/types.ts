export type Difficulty = 'easy' | 'medium' | 'expert'

export interface CanonicalFact {
  x: number
  y: number
  key: string
}

export interface Question {
  id: string
  position: number
  fact: CanonicalFact
  displayedX: number
  displayedY: number
  correctAnswer: number
}

export interface Attempt {
  questionId: string
  factX: number
  factY: number
  displayedX: number
  displayedY: number
  enteredAnswer: number
  correctAnswer: number
  isCorrect: boolean
  responseTimeMs: number
}

export interface RoundResult {
  id: string
  completedAt: string
  difficulty: Difficulty
  totalQuestions: number
  correctAnswers: number
  percentage: number
  activeTimeMs: number
  averageTimeMs: number
  attempts: Attempt[]
}

export interface DifficultyRecords {
  bestScore: number | null
  perfectTimeMs: number | null
  qualifiedTimeMs: number | null
}

export type RecordsByDifficulty = Record<Difficulty, DifficultyRecords>

export interface PersistedStateV1 {
  version: 1
  rounds: RoundResult[]
  records: RecordsByDifficulty
  settings: { soundEnabled: boolean }
}

export interface RecordAchievements {
  bestScore: boolean
  perfectTime: boolean
  qualifiedTime: boolean
}

