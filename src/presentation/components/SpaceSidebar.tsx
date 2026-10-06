import { useState, type ReactNode } from 'react'
import { NavLink, useNavigate, useParams } from 'react-router'
import type { SpaceId } from '@/domain/space/Space'
import { NAME_MAX_LENGTH } from '@/domain/shared/name'
import { errorMessage } from '../errors'
import { useBoardList, useCreateBoard, useDeleteBoard, useRenameBoard } from '../hooks/useBoards'
import {
  useCreateDocument,
  useDeleteDocument,
  useDocumentList,
  useRenameDocument,
} from '../hooks/useDocuments'
import { Button } from '../ui/Button'
import { cx } from '../ui/cx'
import { IconButton } from '../ui/IconButton'
import { Input } from '../ui/Input'
import { AppIcon, type IconName } from './icons'
import styles from './SpaceSidebar.module.css'
import { useI18n } from '../i18n/i18n'

export function SpaceSidebar({ spaceId }: { spaceId: SpaceId }) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { boardId, documentId } = useParams()
  const base = `/spaces/${spaceId}`

  const boards = useBoardList(spaceId)
  const createBoard = useCreateBoard(spaceId)
  const renameBoard = useRenameBoard()
  const deleteBoard = useDeleteBoard(spaceId)

  const documents = useDocumentList(spaceId)
  const createDocument = useCreateDocument(spaceId)
  const renameDocument = useRenameDocument()
  const deleteDocument = useDeleteDocument(spaceId)

  const error = createBoard.error ?? createDocument.error ?? boards.error ?? documents.error

  return (
    <nav className={styles.nav}>
      {error && <p className={styles.error}>{errorMessage(error, t)}</p>}
      <Section
        title={t('sidebar.boards')}
        createLabel={t('sidebar.newBoard')}
        onCreate={() =>
          createBoard.mutate(t('common.untitled'), { onSuccess: (b) => void navigate(`${base}/boards/${b.id}`) })
        }
      >
        {boards.data?.map((b) => (
          <SidebarItem
            key={b.id}
            icon="board"
            name={b.name}
            to={`${base}/boards/${b.id}`}
            rename={(name) => renameBoard.mutateAsync({ id: b.id, name })}
            remove={async () => {
              await deleteBoard.mutateAsync(b.id)
              if (boardId === b.id) void navigate(base)
            }}
          />
        ))}
      </Section>
      <Section
        title={t('sidebar.documents')}
        createLabel={t('sidebar.newDocument')}
        onCreate={() =>
          createDocument.mutate(t('common.untitled'), { onSuccess: (d) => void navigate(`${base}/docs/${d.id}`) })
        }
      >
        {documents.data?.map((d) => (
          <SidebarItem
            key={d.id}
            icon="document"
            name={d.title}
            to={`${base}/docs/${d.id}`}
            rename={(title) => renameDocument.mutateAsync({ id: d.id, title })}
            remove={async () => {
              await deleteDocument.mutateAsync(d.id)
              if (documentId === d.id) void navigate(base)
            }}
          />
        ))}
      </Section>
    </nav>
  )
}

function Section(props: { title: string; createLabel: string; onCreate: () => void; children: ReactNode }) {
  return (
    <section className={styles.section}>
      <header className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>{props.title}</h2>
        <IconButton label={props.createLabel} size="sm" onClick={props.onCreate}>
          <AppIcon name="plus" />
        </IconButton>
      </header>
      <ul className={styles.list}>{props.children}</ul>
    </section>
  )
}

function SidebarItem(props: {
  icon: IconName
  name: string
  to: string
  rename: (name: string) => Promise<unknown>
  remove: () => Promise<unknown>
}) {
  const { t } = useI18n()
  const [mode, setMode] = useState<'view' | 'rename' | 'confirm'>('view')
  const [name, setName] = useState(props.name)
  const [error, setError] = useState<unknown>(null)

  const submitRename = () => {
    if (name.trim() === props.name) return setMode('view')
    props.rename(name).then(() => setMode('view'), setError)
  }

  if (mode === 'rename') {
    return (
      <li className={styles.renaming}>
        <Input
          autoFocus
          inputSize="sm"
          value={name}
          maxLength={NAME_MAX_LENGTH}
          aria-label={t('common.newName')}
          onChange={(e) => setName(e.target.value)}
          onBlur={submitRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submitRename()
            if (e.key === 'Escape') setMode('view')
          }}
          className={styles.renameInput}
        />
        {error !== null && <p className={styles.error}>{errorMessage(error, t)}</p>}
      </li>
    )
  }

  return (
    <li className={styles.item}>
      <NavLink to={props.to} className={({ isActive }) => cx(styles.link, isActive && styles.active)}>
        <span className={styles.icon}>
          <AppIcon name={props.icon} />
        </span>
        <span className={styles.name}>{props.name}</span>
      </NavLink>
      <span className={cx(styles.actions, mode === 'confirm' && styles.actionsVisible)}>
        {mode === 'confirm' ? (
          <Button
            variant="dangerSolid"
            size="sm"
            className={styles.confirm}
            onClick={() => void props.remove().catch(setError)}
            onBlur={() => setMode('view')}
            autoFocus
          >
            {t('common.deleteConfirm')}
          </Button>
        ) : (
          <>
            <IconButton size="sm" label={t('common.rename')} onClick={() => (setName(props.name), setMode('rename'))}>
              <AppIcon name="edit" />
            </IconButton>
            <IconButton size="sm" label={t('common.delete')} onClick={() => setMode('confirm')}>
              <AppIcon name="trash" />
            </IconButton>
          </>
        )}
      </span>
      {error !== null && <p className={styles.error}>{errorMessage(error, t)}</p>}
    </li>
  )
}
