import type { HTMLAttributes } from 'react'
import styles from './Panel.module.css'
import { cx } from './cx'

export function Panel({
  padding = 'tight',
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { padding?: 'tight' | 'roomy' | 'none' }) {
  return <div className={cx(styles.panel, padding !== 'none' && styles[padding], className)} {...props} />
}
