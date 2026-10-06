import type { ButtonHTMLAttributes } from 'react'
import { buttonClass, type ButtonSize, type ButtonVariant } from './buttonClass'
import { cx } from './cx'

export function Button({
  variant = 'subtle',
  size = 'md',
  className,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button type={type} className={cx(buttonClass(variant, size), className)} {...props} />
}
