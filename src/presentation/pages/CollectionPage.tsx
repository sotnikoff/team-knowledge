import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { NAME_MAX_LENGTH } from '@/domain/shared/name'
import { AppIcon } from '../components/icons'
import { ItemCard } from '../components/ItemCard'
import { errorMessage } from '../errors'
import { formatUpdated } from '../format'
import { useI18n } from '../i18n/i18n'
import { LanguageSelect } from '../i18n/LanguageSelect'
import { ThemeToggle } from '../theme/ThemeToggle'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { TitleRule } from '../ui/TitleRule'
import styles from './CollectionPage.module.css'

interface Named {
  readonly id: string
  readonly name: string
  readonly updatedAt: Date
}

/**
 * A top-level list page (projects, spaces of a project): brand bar, title,
 * "create" and "import" controls and a grid of cards with rename/export/delete.
 */
export function CollectionPage<T extends Named>(props: {
  /** Link back up to the parent level, shown above the title. */
  back?: { readonly to: string; readonly label: string }
  title: string
  subtitle: string
  placeholder: string
  empty: string
  list: { readonly isPending: boolean; readonly error: unknown; readonly data?: readonly T[] }
  hrefOf: (item: T) => string
  create: { readonly isPending: boolean; readonly error: unknown; readonly submit: (name: string) => void }
  rename: (item: T, name: string) => Promise<unknown>
  remove: (item: T) => Promise<unknown>
  /** Downloads an item as a JSON file. */
  exportJson: (item: T) => Promise<unknown>
  /** Imports a JSON file as a new item of this list. */
  importJson: { readonly isPending: boolean; readonly error: unknown; readonly run: () => void }
}) {
  const i18n = useI18n()
  const { t } = i18n
  const { list, create, importJson } = props
  const [name, setName] = useState('')

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    create.submit(name.trim() || t('common.untitled'))
  }

  return (
    <main className={styles.page}>
      <div className={styles.topbar}>
        <span className={styles.brand}>
          <span className={styles.mark} aria-hidden="true">
            TK
          </span>
          Team/Knowledge
        </span>
        <div className={styles.prefs}>
          <ThemeToggle />
          <LanguageSelect />
        </div>
      </div>

      <header className={styles.hero}>
        <div>
          {props.back && (
            <Link to={props.back.to} className={styles.crumbs}>
              <AppIcon name="back" /> {props.back.label}
            </Link>
          )}
          <h1 className={styles.title}>{props.title}</h1>
          <TitleRule className={styles.underline} />
          <p className={styles.subtitle}>{props.subtitle}</p>
        </div>
        <form onSubmit={onSubmit} className={styles.create}>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={NAME_MAX_LENGTH}
            placeholder={props.placeholder}
            aria-label={props.placeholder}
            className={styles.createInput}
          />
          <Button type="submit" variant="primary" disabled={create.isPending}>
            {t('common.create')}
          </Button>
          <Button
            type="button"
            variant="subtle"
            title={t('archive.importHint')}
            disabled={importJson.isPending}
            onClick={importJson.run}
          >
            <AppIcon name="upload" /> {t('archive.import')}
          </Button>
        </form>
      </header>

      {create.error != null && <p className={styles.error}>{errorMessage(create.error, t)}</p>}
      {importJson.error != null && <p className={styles.error}>{errorMessage(importJson.error, t)}</p>}

      {list.isPending ? (
        <p className={styles.muted}>{t('common.loading')}</p>
      ) : list.error != null ? (
        <p className={styles.error}>{errorMessage(list.error, t)}</p>
      ) : !list.data || list.data.length === 0 ? (
        <div className={styles.empty}>{props.empty}</div>
      ) : (
        <ul className={styles.grid}>
          {list.data.map((item, index) => (
            <li key={item.id}>
              <ItemCard
                index={index}
                title={item.name}
                subtitle={formatUpdated(item.updatedAt, i18n)}
                to={props.hrefOf(item)}
                rename={(newName) => props.rename(item, newName)}
                remove={() => props.remove(item)}
                exportJson={() => props.exportJson(item)}
              />
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
