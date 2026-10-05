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
import { AppIcon, type IconName } from './icons'

export const NEW_ITEM_NAME = 'Без названия'

export function SpaceSidebar({ spaceId }: { spaceId: SpaceId }) {
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
    <nav className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-2 pb-4">
      {error && <p className="px-2 text-sm text-red-600">{errorMessage(error)}</p>}
      <Section
        title="Доски"
        onCreate={() =>
          createBoard.mutate(NEW_ITEM_NAME, { onSuccess: (b) => void navigate(`${base}/boards/${b.id}`) })
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
        title="Документы"
        onCreate={() =>
          createDocument.mutate(NEW_ITEM_NAME, { onSuccess: (d) => void navigate(`${base}/docs/${d.id}`) })
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

function Section(props: { title: string; onCreate: () => void; children: ReactNode }) {
  return (
    <section>
      <header className="flex items-center justify-between px-2 py-1">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{props.title}</h2>
        <button
          type="button"
          title={`Создать: ${props.title.toLowerCase()}`}
          aria-label={`Создать: ${props.title.toLowerCase()}`}
          onClick={props.onCreate}
          className="rounded p-0.5 text-slate-500 hover:bg-slate-200 hover:text-slate-800"
        >
          <AppIcon name="plus" />
        </button>
      </header>
      <ul className="flex flex-col">{props.children}</ul>
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
  const [mode, setMode] = useState<'view' | 'rename' | 'confirm'>('view')
  const [name, setName] = useState(props.name)
  const [error, setError] = useState<unknown>(null)

  const submitRename = () => {
    if (name.trim() === props.name) return setMode('view')
    props.rename(name).then(() => setMode('view'), setError)
  }

  if (mode === 'rename') {
    return (
      <li className="px-1 py-0.5">
        <input
          autoFocus
          value={name}
          maxLength={NAME_MAX_LENGTH}
          aria-label="Новое название"
          onChange={(e) => setName(e.target.value)}
          onBlur={submitRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submitRename()
            if (e.key === 'Escape') setMode('view')
          }}
          className="w-full rounded border border-indigo-400 px-2 py-1 text-sm outline-none"
        />
        {error !== null && <p className="px-1 text-xs text-red-600">{errorMessage(error)}</p>}
      </li>
    )
  }

  return (
    <li className="group relative">
      <NavLink
        to={props.to}
        className={({ isActive }) =>
          `flex items-center gap-2 rounded-md py-1.5 pl-2 pr-14 text-sm ${
            isActive ? 'bg-indigo-100 text-indigo-800' : 'text-slate-700 hover:bg-slate-200'
          }`
        }
      >
        <span className="shrink-0 opacity-60">
          <AppIcon name={props.icon} />
        </span>
        <span className="truncate">{props.name}</span>
      </NavLink>
      <span className="absolute right-1 top-1/2 flex -translate-y-1/2 gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100">
        {mode === 'confirm' ? (
          <button
            type="button"
            onClick={() => void props.remove().catch(setError)}
            onBlur={() => setMode('view')}
            autoFocus
            className="rounded bg-red-600 px-1.5 text-xs text-white"
          >
            Удалить?
          </button>
        ) : (
          <>
            <IconAction label="Переименовать" icon="edit" onClick={() => (setName(props.name), setMode('rename'))} />
            <IconAction label="Удалить" icon="trash" onClick={() => setMode('confirm')} />
          </>
        )}
      </span>
      {error !== null && <p className="px-2 text-xs text-red-600">{errorMessage(error)}</p>}
    </li>
  )
}

function IconAction(props: { label: string; icon: IconName; onClick: () => void }) {
  return (
    <button
      type="button"
      title={props.label}
      aria-label={props.label}
      onClick={props.onClick}
      className="rounded p-0.5 text-slate-500 hover:bg-slate-300 hover:text-slate-900 [&_svg]:h-4 [&_svg]:w-4"
    >
      <AppIcon name={props.icon} />
    </button>
  )
}
