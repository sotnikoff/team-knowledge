import { setTheme, useTheme } from './theme'

const sun = (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
)

const moon = (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z" />
  </svg>
)

/** Switches between light and dark theme. */
export function ThemeToggle({ withLabel = false }: { withLabel?: boolean }) {
  const theme = useTheme()
  const next = theme === 'dark' ? 'light' : 'dark'
  const label = next === 'dark' ? 'Тёмная тема' : 'Светлая тема'
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={() => setTheme(next)}
      className="flex h-9 items-center gap-2 rounded-md px-2 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    >
      {next === 'dark' ? moon : sun}
      {withLabel && label}
    </button>
  )
}
