import type { ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router'
import { AppIcon } from '../components/icons'
import { ItemCard } from '../components/ItemCard'
import { formatUpdated } from '../format'
import { useBoardList, useCreateBoard, useDeleteBoard, useRenameBoard } from '../hooks/useBoards'
import {
  useCreateDocument,
  useDeleteDocument,
  useDocumentList,
  useRenameDocument,
} from '../hooks/useDocuments'
import { useSpace } from '../hooks/useSpaces'
import { useI18n } from '../i18n/i18n'
import { Button } from '../ui/Button'
import { TitleRule } from '../ui/TitleRule'
import styles from './SpaceOverviewPage.module.css'

export function SpaceOverviewPage() {
  const i18n = useI18n()
  const { t } = i18n
  const { spaceId = '' } = useParams()
  const navigate = useNavigate()
  const base = `/spaces/${spaceId}`
  const space = useSpace(spaceId)

  const boards = useBoardList(spaceId)
  const createBoard = useCreateBoard(spaceId)
  const renameBoard = useRenameBoard()
  const deleteBoard = useDeleteBoard(spaceId)

  const documents = useDocumentList(spaceId)
  const createDocument = useCreateDocument(spaceId)
  const renameDocument = useRenameDocument()
  const deleteDocument = useDeleteDocument(spaceId)

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{space.data?.name}</h1>
      <TitleRule className={styles.underline} />

      <Section
        title={t('sidebar.boards')}
        createLabel={t('sidebar.newBoard')}
        empty={t('sidebar.noBoards')}
        onCreate={() =>
          createBoard.mutate(t('common.untitled'), { onSuccess: (b) => void navigate(`${base}/boards/${b.id}`) })
        }
      >
        {boards.data?.map((b, index) => (
          <ItemCard
            key={b.id}
            index={index}
            icon={<AppIcon name="board" />}
            title={b.name}
            subtitle={formatUpdated(b.updatedAt, i18n)}
            to={`${base}/boards/${b.id}`}
            rename={(name) => renameBoard.mutateAsync({ id: b.id, name })}
            remove={() => deleteBoard.mutateAsync(b.id)}
          />
        ))}
      </Section>

      <Section
        title={t('sidebar.documents')}
        createLabel={t('sidebar.newDocument')}
        empty={t('sidebar.noDocuments')}
        onCreate={() =>
          createDocument.mutate(t('common.untitled'), { onSuccess: (d) => void navigate(`${base}/docs/${d.id}`) })
        }
      >
        {documents.data?.map((d, index) => (
          <ItemCard
            key={d.id}
            index={index}
            icon={<AppIcon name="document" />}
            title={d.title}
            subtitle={formatUpdated(d.updatedAt, i18n)}
            to={`${base}/docs/${d.id}`}
            rename={(title) => renameDocument.mutateAsync({ id: d.id, title })}
            remove={() => deleteDocument.mutateAsync(d.id)}
          />
        ))}
      </Section>
    </div>
  )
}

function Section(props: {
  title: string
  createLabel: string
  empty: string
  onCreate: () => void
  children: ReactNode[] | undefined
}) {
  const count = props.children?.length ?? 0
  return (
    <section className={styles.section}>
      <header className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>
          {props.title}
          {count > 0 && <span className={styles.count}>· {String(count).padStart(2, '0')}</span>}
        </h2>
        <Button variant="primary" size="sm" onClick={props.onCreate}>
          <AppIcon name="plus" /> {props.createLabel}
        </Button>
      </header>
      {count > 0 ? <div className={styles.grid}>{props.children}</div> : <p className={styles.empty}>{props.empty}</p>}
    </section>
  )
}
