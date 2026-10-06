import { useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router'
import { NAME_MAX_LENGTH } from '@/domain/shared/name'
import { errorMessage } from '../errors'
import { useI18n } from '../i18n/i18n'
import { Button } from '../ui/Button'
import { buttonClass } from '../ui/buttonClass'
import { Input } from '../ui/Input'
import { IconButton } from '../ui/IconButton'
import { AppIcon } from './icons'
import styles from './ItemCard.module.css'

const linkStyle = buttonClass('link', 'sm')

/** Card for a space, board or document: open, rename inline, delete with confirmation. */
export function ItemCard(props: {
  title: string
  subtitle: string
  to: string
  icon?: ReactNode
  rename: (name: string) => Promise<unknown>
  remove: () => Promise<unknown>
}) {
  const { t } = useI18n()
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [name, setName] = useState(props.title)
  const [error, setError] = useState<unknown>(null)

  const run = (action: () => Promise<unknown>, after?: () => void) => {
    setError(null)
    action().then(after, setError)
  }

  const onRename = (e: FormEvent) => {
    e.preventDefault()
    run(() => props.rename(name), () => setEditing(false))
  }

  return (
    <article className={styles.card}>
      {editing ? (
        <form onSubmit={onRename} className={styles.renameForm}>
          <Input
            autoFocus
            inputSize="sm"
            value={name}
            maxLength={NAME_MAX_LENGTH}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && setEditing(false)}
            aria-label={t('common.newName')}
            className={styles.renameInput}
          />
          <Button type="submit" variant="primary" size="sm">
            OK
          </Button>
        </form>
      ) : (
        <Link to={props.to} className={styles.main}>
          {props.icon && <span className={styles.icon}>{props.icon}</span>}
          <span className={styles.text}>
            <h3 className={styles.title}>{props.title}</h3>
            <p className={styles.subtitle}>{props.subtitle}</p>
          </span>
        </Link>
      )}

      {error !== null && <p className={styles.error}>{errorMessage(error, t)}</p>}

      <div className={styles.actions}>
        <Link to={props.to} className={linkStyle}>
          {t('common.open')}
        </Link>
        <span className={styles.push}>
          {confirmDelete ? (
            <>
              <Button variant="dangerSolid" size="sm" onClick={() => run(props.remove)}>
                {t('common.deleteConfirm')}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                {t('common.cancel')}
              </Button>
            </>
          ) : (
            <>
              <IconButton
                size="sm"
                label={t('common.rename')}
                onClick={() => {
                  setName(props.title)
                  setEditing(true)
                }}
              >
                <AppIcon name="edit" />
              </IconButton>
              <IconButton size="sm" label={t('common.delete')} className={styles.deleteButton} onClick={() => setConfirmDelete(true)}>
                <AppIcon name="trash" />
              </IconButton>
            </>
          )}
        </span>
      </div>
    </article>
  )
}
