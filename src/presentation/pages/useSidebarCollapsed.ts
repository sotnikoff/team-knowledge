import { useCallback, useState } from 'react'

/** UI preference of this browser only (like the theme), outside the persistence ports. */
const STORAGE_KEY = 'team-knowledge:sidebar-collapsed'

function read(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

export function useSidebarCollapsed(): [boolean, (collapsed: boolean) => void] {
  const [collapsed, setCollapsed] = useState(read)
  const update = useCallback((value: boolean) => {
    setCollapsed(value)
    try {
      localStorage.setItem(STORAGE_KEY, String(value))
    } catch {
      // Private mode etc.: the choice just won't survive a reload.
    }
  }, [])
  return [collapsed, update]
}
