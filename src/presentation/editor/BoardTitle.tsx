import { useState } from 'react'
import type { Board } from '@/domain/board/Board'
import { NAME_MAX_LENGTH } from '@/domain/shared/name'
import { errorMessage } from '../errors'
import { useRenameBoard } from '../hooks/useBoards'
import { useI18n } from '../i18n/i18n'
import { Panel } from '../ui/Panel'
import styles from './BoardTitle.module.css'

/** Board name in the top-left corner; click to rename it in place. */
export function BoardTitle({ board }: { board: Board }) {
  const { t } = useI18n()
  const rename = useRenameBoard()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(board.name)

  const start = () => {
    setName(board.name)
    rename.reset()
    setEditing(true)
  }

  const commit = () => {
    if (name.trim() === '' || name.trim() === board.name) return setEditing(false)
    rename.mutate({ id: board.id, name }, { onSuccess: () => setEditing(false) })
  }

  return (
    <Panel padding="none" className={styles.panel}>
      {editing ? (
        <input
          autoFocus
          value={name}
          maxLength={NAME_MAX_LENGTH}
          aria-label={t('common.newName')}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => setName(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') setEditing(false)
          }}
          className={styles.input}
          size={Math.max(name.length, 6)}
        />
      ) : (
        <button type="button" className={styles.title} title={t('board.renameHint')} onClick={start}>
          {board.name}
        </button>
      )}
      {rename.error && <p className={styles.error}>{errorMessage(rename.error, t)}</p>}
    </Panel>
  )
}
