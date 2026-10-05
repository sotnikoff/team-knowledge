import { useLayoutEffect, useRef } from 'react'
import * as editor from '@/application/editor/editorModel'
import { updateElements } from '@/application/editor/scene'
import type { DocumentElement } from '@/domain/element/types'
import { NotFoundError } from '@/domain/shared/errors'
import { StaticDocument } from '../documents/StaticDocument'
import { dispatch, useEditor } from '../editor/store'
import { useDocument } from '../hooks/useDocuments'

/**
 * Document cards of the board, rendered as DOM under the (transparent) canvas
 * and moved with the same transform as the scene: screen = (world + scroll) * zoom.
 * Pointer input still goes to the canvas, so tools treat cards like any element.
 */
export function DocumentLayer() {
  const elements = useEditor((m) => m.elements)
  const viewport = useEditor((m) => m.viewport)
  const documents = elements.filter((el): el is DocumentElement => el.type === 'document')
  if (documents.length === 0) return null

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        style={{
          transformOrigin: '0 0',
          transform: `scale(${viewport.zoom}) translate(${viewport.scrollX}px, ${viewport.scrollY}px)`,
        }}
      >
        {documents.map((el) => (
          <DocumentCard key={el.id} element={el} />
        ))}
      </div>
    </div>
  )
}

function DocumentCard({ element }: { element: DocumentElement }) {
  const { data: doc, error, isPending } = useDocument(element.documentId)
  const ref = useRef<HTMLDivElement>(null)

  // The card is always shown in full; keep the element's height equal to the
  // rendered one so selection, hit-testing and arrow bindings stay exact.
  // (offsetHeight ignores the CSS scale, so it is already in world units.)
  useLayoutEffect(() => {
    const height = ref.current?.offsetHeight
    if (height === undefined || Math.abs(height - element.height) <= 1) return
    dispatch((m) =>
      editor.updateLive(
        m,
        updateElements(m.elements, [element.id], (el) => (el.type === 'document' ? { ...el, height } : el)),
      ),
    )
  })

  return (
    <article
      ref={ref}
      data-element-id={element.id}
      className="document-card absolute rounded-xl border border-slate-200 bg-white px-7 py-6 shadow-md"
      style={{ left: element.x, top: element.y, width: element.width }}
    >
      {isPending ? (
        <div className="space-y-3">
          <div className="h-7 w-2/3 animate-pulse rounded bg-slate-100" />
          <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-slate-100" />
        </div>
      ) : error ? (
        <p className="text-slate-500">
          {error instanceof NotFoundError ? 'Документ удалён' : 'Не удалось загрузить документ'}
        </p>
      ) : (
        <>
          <h1 className="mb-4 text-2xl font-bold text-slate-900">{doc.title}</h1>
          <StaticDocument content={doc.content} />
        </>
      )}
    </article>
  )
}
