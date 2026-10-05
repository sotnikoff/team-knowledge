import { useSyncExternalStore } from 'react'

export type Theme = 'light' | 'dark'

/**
 * UI preference, not domain data: lives in the viewer's browser only and is
 * deliberately outside the persistence ports. Not under the `tk2:` namespace.
 */
const STORAGE_KEY = 'team-knowledge:theme'

const systemQuery = () => window.matchMedia('(prefers-color-scheme: dark)')

function readStored(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === 'light' || value === 'dark' ? value : null
  } catch {
    return null
  }
}

/** Explicit choice of the user; `null` = follow the system setting. */
let chosen: Theme | null = null
let current: Theme = 'light'
const listeners = new Set<() => void>()

function apply(theme: Theme): void {
  current = theme
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  root.style.colorScheme = theme // native inputs, selects, scrollbars
  listeners.forEach((listener) => listener())
}

/** Call once before the first render (avoids a flash of the wrong theme). */
export function initTheme(): void {
  chosen = readStored()
  apply(chosen ?? (systemQuery().matches ? 'dark' : 'light'))
  systemQuery().addEventListener('change', (e) => {
    if (chosen === null) apply(e.matches ? 'dark' : 'light')
  })
}

export function setTheme(theme: Theme): void {
  chosen = theme
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Private mode etc.: the choice just won't survive a reload.
  }
  apply(theme)
}

export function useTheme(): Theme {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => current,
  )
}
