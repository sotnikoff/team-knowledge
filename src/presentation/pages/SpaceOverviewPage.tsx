import type { ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router'
import { AppIcon } from '../components/icons'
import { ItemCard } from '../components/ItemCard'
import { formatUpdated, NEW_ITEM_NAME } from '../format'
import { useBoardList, useCreateBoard, useDeleteBoard, useRenameBoard } from '../hooks/useBoards'
import {
  useCreateDocument,
  useDeleteDocument,
  useDocumentList,
  useRenameDocument,
} from '../hooks/useDocuments'
import { useSpace } from '../hooks/useSpaces'

export function SpaceOverviewPage() {
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
    <div className="mx-auto max-w-5xl px-8 py-10">
      <h1 className="mb-8 text-3xl font-semibold text-slate-900">{space.data?.name}</h1>

      <Section
        title="Доски"
        createLabel="Новая доска"
        empty="Досок пока нет"
        onCreate={() =>
          createBoard.mutate(NEW_ITEM_NAME, { onSuccess: (b) => void navigate(`${base}/boards/${b.id}`) })
        }
      >
        {boards.data?.map((b) => (
          <ItemCard
            key={b.id}
            icon={<AppIcon name="board" />}
            title={b.name}
            subtitle={formatUpdated(b.updatedAt)}
            to={`${base}/boards/${b.id}`}
            rename={(name) => renameBoard.mutateAsync({ id: b.id, name })}
            remove={() => deleteBoard.mutateAsync(b.id)}
          />
        ))}
      </Section>

      <Section
        title="Документы"
        createLabel="Новый документ"
        empty="Документов пока нет"
        onCreate={() =>
          createDocument.mutate(NEW_ITEM_NAME, { onSuccess: (d) => void navigate(`${base}/docs/${d.id}`) })
        }
      >
        {documents.data?.map((d) => (
          <ItemCard
            key={d.id}
            icon={<AppIcon name="document" />}
            title={d.title}
            subtitle={formatUpdated(d.updatedAt)}
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
  const hasItems = (props.children?.length ?? 0) > 0
  return (
    <section className="mb-10">
      <header className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-medium text-slate-800">{props.title}</h2>
        <button
          type="button"
          onClick={props.onCreate}
          className="flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <AppIcon name="plus" /> {props.createLabel}
        </button>
      </header>
      {hasItems ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{props.children}</div>
      ) : (
        <p className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center text-slate-500">
          {props.empty}
        </p>
      )}
    </section>
  )
}
