import type { InputHTMLAttributes } from 'react'
import styles from './Input.module.css'
import { cx } from './cx'

export function Input({
  inputSize = 'md',
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { inputSize?: 'sm' | 'md' }) {
  return <input className={cx(styles.input, inputSize === 'sm' && styles.sm, className)} {...props} />
}
