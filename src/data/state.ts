import { emptyRecords, updateRecords } from '../game/records'
import type { PersistedStateV1, RoundResult } from '../game/types'

export function defaultState(): PersistedStateV1 {
  return { version: 1, rounds: [], records: emptyRecords(), settings: { soundEnabled: true } }
}

export function addCompletedRound(state: PersistedStateV1, result: RoundResult): PersistedStateV1 {
  return {
    ...state,
    rounds: [result, ...state.rounds.filter((round) => round.id !== result.id)].slice(0, 100),
    records: updateRecords(result, state.records),
  }
}
