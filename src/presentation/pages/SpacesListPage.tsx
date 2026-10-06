import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { NAME_MAX_LENGTH } from '@/domain/shared/name'
import { ItemCard } from '../components/ItemCard'
import { formatUpdated } from '../format'
import { errorMessage } from '../errors'
import { ThemeToggle } from '../theme/ThemeToggle'
import { useCreateSpace, useDeleteSpace, useRenameSpace, useSpaceList } from '../hooks/useSpaces'
import { useI18n } from '../i18n/i18n'
import { LanguageSelect } from '../i18n/LanguageSelect'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { TitleRule } from '../ui/TitleRule'
import styles from './SpacesListPage.module.css'

export function SpacesListPage() {
  const i18n = useI18n()
  const { t } = i18n
  const spaces = useSpaceList()
  const create = useCreateSpace()
  const rename = useRenameSpace()
  const remove = useDeleteSpace()
  const navigate = useNavigate()
  const [name, setName] = useState('')

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    create.mutate(name.trim() || t('common.untitled'), {
      onSuccess: (space) => void navigate(`/spaces/${space.id}`),
    })
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
          <h1 className={styles.title}>{t('spaces.title')}</h1>
          <TitleRule className={styles.underline} />
          <p className={styles.subtitle}>{t('spaces.subtitle')}</p>
        </div>
        <form onSubmit={onSubmit} className={styles.create}>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={NAME_MAX_LENGTH}
            placeholder={t('spaces.newPlaceholder')}
            aria-label={t('spaces.newPlaceholder')}
            className={styles.createInput}
          />
          <Button type="submit" variant="primary" disabled={create.isPending}>
            {t('common.create')}
          </Button>
        </form>
      </header>

      {create.error && <p className={styles.error}>{errorMessage(create.error, t)}</p>}

      {spaces.isPending ? (
        <p className={styles.muted}>{t('common.loading')}</p>
      ) : spaces.error ? (
        <p className={styles.error}>{errorMessage(spaces.error, t)}</p>
      ) : spaces.data.length === 0 ? (
        <div className={styles.empty}>{t('spaces.empty')}</div>
      ) : (
        <ul className={styles.grid}>
          {spaces.data.map((space, index) => (
            <li key={space.id}>
              <ItemCard
                index={index}
                title={space.name}
                subtitle={formatUpdated(space.updatedAt, i18n)}
                to={`/spaces/${space.id}`}
                rename={(newName) => rename.mutateAsync({ id: space.id, name: newName })}
                remove={() => remove.mutateAsync(space.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
