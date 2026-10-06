import type { SelectHTMLAttributes } from 'react'
import { cx } from './cx'
import styles from './Select.module.css'

/**
 * Native <select> with its own chevron: the browser arrow is hidden because it
 * sits glued to the border and ignores padding.
 */
export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className={cx(styles.wrap, className)}>
      <select className={styles.select} {...props} />
      <svg
        className={styles.chevron}
        viewBox="0 0 24 24"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </span>
  )
}
