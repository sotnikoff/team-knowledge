import type { DiagramElement } from '@/domain/element/types'

export type Snapshot = readonly DiagramElement[]

export interface History {
  readonly past: readonly Snapshot[]
  readonly future: readonly Snapshot[]
}

export const HISTORY_LIMIT = 100

export const emptyHistory: History = { past: [], future: [] }

/** Remembers `previous` as an undo step and drops the redo branch. */
export function record(history: History, previous: Snapshot): History {
  return { past: [...history.past, previous].slice(-HISTORY_LIMIT), future: [] }
}

export function undo(history: History, current: Snapshot): { history: History; elements: Snapshot } | null {
  const previous = history.past.at(-1)
  if (!previous) return null
  return {
    history: { past: history.past.slice(0, -1), future: [current, ...history.future] },
    elements: previous,
  }
}

export function redo(history: History, current: Snapshot): { history: History; elements: Snapshot } | null {
  const [next, ...rest] = history.future
  if (!next) return null
  return { history: { past: [...history.past, current], future: rest }, elements: next }
}
