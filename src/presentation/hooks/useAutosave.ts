import { useCallback, useEffect, useRef, useState } from 'react'
import { VersionConflictError } from '@/domain/shared/errors'
import type { Versioned } from '@/domain/shared/versioned'

export type SaveStatus = 'saved' | 'pending' | 'saving' | 'error' | 'conflict'

const DEBOUNCE_MS = 600

export interface AutosaveOptions<T extends Versioned, C> {
  /** The entity as loaded; its version is the base of the first save. */
  readonly initial: T
  /** The content as loaded (to tell whether anything changed). */
  readonly initialContent: C
  /** Current content in the editor. Compared by reference. */
  readonly content: C
  /**
   * The freshest copy of the entity known to the app (the query cache). When
   * it gets newer — e.g. it was renamed from the sidebar — it becomes the base
   * of the next save instead of causing a false version conflict.
   */
  readonly latest: T | undefined
  /** Persists `content` on top of `base`; resolves with the saved entity. */
  readonly save: (base: T, content: C) => Promise<T>
  /** Called with every successfully saved entity (to update caches). */
  readonly onSaved: (saved: T) => void
}

/**
 * Debounced, strictly sequential saving of editor content. Written with a slow
 * network in mind: at most one request in flight, the latest content always
 * wins, and the version returned by each save is the base of the next.
 */
export function useAutosave<T extends Versioned, C>(options: AutosaveOptions<T, C>) {
  const [status, setStatus] = useState<SaveStatus>('saved')

  const base = useRef(options.initial)
  const latest = useRef(options.content)
  const persisted = useRef(options.initialContent)
  const inFlight = useRef(false)
  const blocked = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const callbacks = useRef({ save: options.save, onSaved: options.onSaved })

  useEffect(() => {
    latest.current = options.content
    callbacks.current = { save: options.save, onSaved: options.onSaved }
  })

  // Adopt a newer version saved by someone else in this app (rename etc.).
  useEffect(() => {
    const remote = options.latest
    if (remote && !inFlight.current && remote.version > base.current.version) base.current = remote
  }, [options.latest])

  const flush = useCallback(async (): Promise<void> => {
    clearTimeout(timer.current)
    if (inFlight.current || blocked.current) return
    inFlight.current = true
    try {
      // Keep going while edits arrive during a request; the newest content wins.
      while (latest.current !== persisted.current) {
        setStatus('saving')
        const content = latest.current
        const saved = await callbacks.current.save(base.current, content)
        base.current = saved
        persisted.current = content
        callbacks.current.onSaved(saved)
      }
      setStatus('saved')
    } catch (error) {
      const conflict = error instanceof VersionConflictError
      blocked.current = conflict
      setStatus(conflict ? 'conflict' : 'error')
    } finally {
      inFlight.current = false
    }
  }, [])

  useEffect(() => {
    if (options.content === persisted.current || blocked.current) return
    setStatus('pending')
    clearTimeout(timer.current)
    timer.current = setTimeout(() => void flush(), DEBOUNCE_MS)
  }, [options.content, flush])

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
