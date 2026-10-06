import type { ReactNode } from 'react'
import styles from './IconButton.module.css'
import { cx } from './cx'

/** Square icon-only button; `label` is its tooltip and accessible name. */
export function IconButton(props: {
  label: string
  /** Shortcut shown after the label in the tooltip. */
  hint?: string
  /** Tiny key label in the corner (e.g. the number-row shortcut of a tool). */
  badge?: string
  active?: boolean
  disabled?: boolean
  size?: 'sm' | 'md'
  className?: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      title={props.hint ? `${props.label} — ${props.hint}` : props.label}
      aria-label={props.label}
      aria-pressed={props.active}
      disabled={props.disabled}
      onClick={props.onClick}
      className={cx(styles.iconButton, styles[props.size ?? 'md'], props.active && styles.active, props.className)}
    >
      {props.children}
      {props.badge && (
        <span className={styles.badge} aria-hidden="true">
          {props.badge}
        </span>
      )}
    </button>
  )
}
