import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Board } from '@/domain/board/Board'
import type { DiagramElement } from '@/domain/element/types'
import { BoardConflictError } from '@/domain/shared/errors'
import { useDependencies } from '../app/dependencies'
import { queryKeys } from './queryKeys'

export type SaveStatus = 'saved' | 'pending' | 'saving' | 'error' | 'conflict'

const DEBOUNCE_MS = 600

/**
 * Debounced, strictly sequential saving of the editor content. Written with a
 * slow network in mind: at most one request in flight, the latest content
 * always wins, and the version returned by each save is the base of the next.
 */
export function useAutosave(initial: Board, elements: readonly DiagramElement[]) {
  const { saveBoardContent } = useDependencies()
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<SaveStatus>('saved')

  const base = useRef(initial)
  const latest = useRef(elements)
  const persisted = useRef(initial.elements)
  const inFlight = useRef(false)
  const blocked = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    latest.current = elements
  }, [elements])

  const flush = useCallback(async (): Promise<void> => {
    clearTimeout(timer.current)
    if (inFlight.current || blocked.current) return
    inFlight.current = true
    try {
      // Keep going while edits arrive during a request; the newest content wins.
      while (latest.current !== persisted.current) {
        setStatus('saving')
        const content = latest.current
        const saved = await saveBoardContent.execute(base.current, content)
        base.current = saved
        persisted.current = content
        queryClient.setQueryData(queryKeys.board(saved.id), saved)
        void queryClient.invalidateQueries({ queryKey: queryKeys.boards, exact: true })
      }
      setStatus('saved')
    } catch (error) {
      const conflict = error instanceof BoardConflictError
      blocked.current = conflict
      setStatus(conflict ? 'conflict' : 'error')
    } finally {
      inFlight.current = false
    }
  }, [saveBoardContent, queryClient])

  useEffect(() => {
    if (elements === persisted.current || blocked.current) return
    setStatus('pending')
    clearTimeout(timer.current)
    timer.current = setTimeout(() => void flush(), DEBOUNCE_MS)
  }, [elements, flush])

  // Do not lose the last edits when leaving the page or closing the tab.
  useEffect(() => {
    const onBeforeUnload = () => void flush()
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      void flush()
    }
  }, [flush])

  const retry = useCallback(() => void flush(), [flush])

  return { status, retry }
}
