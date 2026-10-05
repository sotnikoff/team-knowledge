import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { BoardNotFoundError } from '@/domain/shared/errors'
import { Editor } from '../editor/Editor'
import { errorMessage } from '../errors'
import { useBoard } from '../hooks/useBoard'

export function BoardEditorPage() {
  const { boardId = '' } = useParams()
  const { data: board, error, isPending, refetch } = useBoard(boardId)
  const [generation, setGeneration] = useState(0)

  if (isPending) return <CenteredMessage>Загрузка доски…</CenteredMessage>
  if (error) {
    return (
      <CenteredMessage>
        <p>{errorMessage(error)}</p>
        {!(error instanceof BoardNotFoundError) && (
          <button type="button" className="text-indigo-600 hover:underline" onClick={() => void refetch()}>
            Повторить
          </button>
        )}
        <Link to="/" className="text-indigo-600 hover:underline">
          К списку досок
        </Link>
      </CenteredMessage>
    )
  }

  const reload = async () => {
    await refetch()
    setGeneration((g) => g + 1)
  }

  return <Editor key={`${board.id}:${generation}`} board={board} onReload={() => void reload()} />
}

function CenteredMessage({ children }: { children: ReactNode }) {
  return <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-slate-600">{children}</div>
}
