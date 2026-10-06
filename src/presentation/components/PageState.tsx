import type { ReactNode } from 'react'
import { NotFoundError } from '@/domain/shared/errors'
import { errorMessage } from '../errors'
import { useI18n } from '../i18n/i18n'
import { Button } from '../ui/Button'
import { cx } from '../ui/cx'
import styles from './PageState.module.css'

export function Loading({ children }: { children: ReactNode }) {
  return <div className={cx(styles.state, styles.loading)}>{children}</div>
}

/** Error state for a page: retry unless the thing simply does not exist. */
export function LoadError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const { t } = useI18n()
  return (
    <div className={styles.state}>
      <p>{errorMessage(error, t)}</p>
      {!(error instanceof NotFoundError) && (
        <Button variant="subtle" size="sm" onClick={onRetry}>
          {t('common.retry')}
        </Button>
      )}
    </div>
  )
}
