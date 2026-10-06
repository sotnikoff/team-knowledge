import { cx } from './cx'
import styles from './SegmentedControl.module.css'

export interface Segment<T extends string | number> {
  readonly value: T
  readonly label: string
  readonly disabled?: boolean
  readonly title?: string
}

/** A row of mutually exclusive options (export scope, format, scale…). */
export function SegmentedControl<T extends string | number>(props: {
  label: string
  value: T
  options: readonly Segment<T>[]
  onChange: (value: T) => void
}) {
  return (
    <div className={styles.group} role="group" aria-label={props.label}>
      {props.options.map((option) => (
        <button
          key={option.value}
          type="button"
          title={option.title}
          aria-pressed={props.value === option.value}
          disabled={option.disabled}
          onClick={() => props.onChange(option.value)}
          className={cx(styles.option, props.value === option.value && styles.selected)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
