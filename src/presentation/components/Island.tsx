import type { ReactNode } from 'react'

/** Floating white panel used for every editor overlay. */
export function Island({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-slate-200 bg-surface p-1 shadow-md ${className}`}>{children}</div>
  )
}

export function IconButton(props: {
  label: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
  hint?: string
}) {
  return (
    <button
      type="button"
      title={props.hint ? `${props.label} — ${props.hint}` : props.label}
      aria-label={props.label}
      aria-pressed={props.active}
      disabled={props.disabled}
      onClick={props.onClick}
      className={`relative flex h-9 w-9 items-center justify-center rounded-md transition-colors disabled:opacity-30 ${
        props.active ? 'bg-indigo-100 text-indigo-700' : 'text-slate-700 hover:bg-slate-100'
      }`}
    >
      {props.children}
    </button>
  )
}
