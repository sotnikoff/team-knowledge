import type { SaveStatus as Status } from '../hooks/useAutosave'
import { useI18n, type MessageKey } from '../i18n/i18n'
import { cx } from '../ui/cx'
import styles from './SaveStatus.module.css'

const labels: Record<Status, MessageKey> = {
  saved: 'save.saved',
  pending: 'save.pending',
  saving: 'save.saving',
  error: 'save.error',
  conflict: 'save.conflict',
}

const dots: Record<Status, string> = {
  saved: styles.saved!,
  pending: styles.pending!,
  saving: cx(styles.pending, styles.pulse),
  error: styles.failed!,
  conflict: styles.failed!,
}

/**
 * Save state as a single coloured dot; the text is its tooltip. On an error or
 * a conflict the dot is a button (retry / load the latest version).
 */
export function SaveStatus(props: { status: Status; onRetry: () => void; onReload: () => void }) {
  const { t } = useI18n()
  const label = t(labels[props.status])
  const dot = <span className={cx(styles.dot, dots[props.status])} />

  const action =
    props.status === 'error'
      ? { run: props.onRetry, hint: t('save.retryHint') }
      : props.status === 'conflict'
        ? { run: props.onReload, hint: t('save.reload') }
        : null

  if (action) {
    return (
      <button
        type="button"
        role="status"
        title={`${label} — ${action.hint}`}
        aria-label={`${label} — ${action.hint}`}
        onClick={action.run}
        className={cx(styles.status, styles.alert)}
      >
        {dot}
      </button>
    )
  }
  return (
    <span role="status" title={label} aria-label={label} className={styles.status}>
      {dot}
    </span>
  )
}
