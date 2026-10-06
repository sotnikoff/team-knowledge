import styles from './Button.module.css'
import { cx } from './cx'

export type ButtonVariant = 'primary' | 'subtle' | 'ghost' | 'link' | 'danger' | 'dangerSolid'
export type ButtonSize = 'sm' | 'md'

/** Button look, also for elements that are not <button> (e.g. router links). */
export function buttonClass(variant: ButtonVariant = 'subtle', size: ButtonSize = 'md'): string {
  return cx(styles.button, styles[size], styles[variant])
}
