import { useState } from 'react'
import { useParams } from 'react-router'
import { Editor } from '../editor/Editor'
import { useBoard } from '../hooks/useBoards'
import { LoadError, Loading } from '../components/PageState'

export function BoardEditorPage() {
  const { boardId = '' } = useParams()
  const { data: board, error, isPending, refetch } = useBoard(boardId)
  const [generation, setGeneration] = useState(0)

  if (isPending) return <Loading>Загрузка доски…</Loading>
  if (error) return <LoadError error={error} onRetry={() => void refetch()} />

  const reload = async () => {
    await refetch()
    setGeneration((g) => g + 1)
  }

  return <Editor key={`${board.id}:${generation}`} board={board} onReload={() => void reload()} />
}
