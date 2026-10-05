import { useState } from 'react'
import * as editor from '@/application/editor/editorModel'
import { createDocumentElement, DOCUMENT_CARD_WIDTH } from '@/domain/element/factory'
import type { Point } from '@/domain/shared/geometry'
import type { SpaceId } from '@/domain/space/Space'
import { useDependencies } from '../app/dependencies'
import { dispatch } from '../editor/store'
import { errorMessage } from '../errors'
import { NEW_ITEM_NAME } from '../format'
import { useCreateDocument, useDocumentList } from '../hooks/useDocuments'
import { AppIcon } from './icons'
import { Island } from './Island'

/** Puts a document of the space onto the board as a card. */
export function InsertDocumentMenu(props: { spaceId: SpaceId; viewCenter: () => Point }) {
  const { ids } = useDependencies()
  const [open, setOpen] = useState(false)
  const documents = useDocumentList(props.spaceId)
  const create = useCreateDocument(props.spaceId)

  const insert = (documentId: string) => {
    const center = props.viewCenter()
    const card = createDocumentElement({
      id: ids.next(),
      documentId,
      seed: 1,
      style: editor.defaultStyle,
      x: center.x - DOCUMENT_CARD_WIDTH / 2,
      y: center.y - 120,
    })
    dispatch(
      (m) => editor.commit(m, [...m.elements, card]),
      (m) => editor.select(editor.setTool(m, 'select'), [card.id]),
    )
    setOpen(false)
  }

  return (
    <div className="relative">
      <Island className="flex">
        <button
          type="button"
          title="Добавить документ на доску"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className={`flex h-9 items-center gap-1.5 rounded-md px-2.5 text-sm ${
            open ? 'bg-indigo-100 text-indigo-700' : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <AppIcon name="document" /> Документ
        </button>
      </Island>
      {open && (
        <Island className="absolute right-0 top-12 z-20 w-72 p-1">
          <button
            type="button"
            disabled={create.isPending}
            onClick={() => create.mutate(NEW_ITEM_NAME, { onSuccess: (doc) => insert(doc.id) })}
            className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm font-medium text-indigo-700 hover:bg-indigo-50"
          >
            <AppIcon name="plus" /> Новый документ
          </button>
          {(documents.data?.length ?? 0) > 0 && <div className="my-1 h-px bg-slate-100" />}
          <ul className="max-h-72 overflow-y-auto">
            {documents.data?.map((doc) => (
              <li key={doc.id}>
                <button
                  type="button"
                  onClick={() => insert(doc.id)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100"
                >
                  <span className="opacity-50">
                    <AppIcon name="document" />
                  </span>
                  <span className="truncate">{doc.title}</span>
                </button>
              </li>
            ))}
          </ul>
          {create.error && <p className="px-2 py-1 text-sm text-red-600">{errorMessage(create.error)}</p>}
        </Island>
      )}
    </div>
  )
}
