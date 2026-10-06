import type { Editor } from '@tiptap/react'
import { useI18n } from '../i18n/i18n'
import { cx } from '../ui/cx'
import type { FormatAction } from './formatActions'
import styles from './ToolbarButton.module.css'

export function ToolbarButton(props: {
  editor: Editor
  action: FormatAction
  active?: boolean
  disabled?: boolean
}) {
  const { t } = useI18n()
  const { action } = props
  const label = action.shortcut ? `${t(action.label)} (${action.shortcut})` : t(action.label)
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={props.action.isActive ? Boolean(props.active) : undefined}
      disabled={props.disabled}
      // Keep the editor selection while clicking.
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => props.action.run(props.editor)}
      className={cx(styles.button, props.active && styles.active)}
    >
      {typeof action.icon === 'function' ? action.icon(t) : action.icon}
    </button>
  )
}

export function ToolbarSeparator() {
  return <span className={styles.separator} />
}
