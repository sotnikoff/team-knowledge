import { useLayoutEffect, useRef } from 'react'
import * as editor from '@/application/editor/editorModel'
import { updateElements } from '@/application/editor/scene'
import type { DocumentElement } from '@/domain/element/types'
import { NotFoundError } from '@/domain/shared/errors'
import { StaticDocument } from '../documents/StaticDocument'
import { dispatch, useEditor } from '../editor/store'
import { useDocument } from '../hooks/useDocuments'
import { useI18n } from '../i18n/i18n'
import { cx } from '../ui/cx'
import styles from './DocumentCard.module.css'

/**
 * A document card of the board: DOM, stacked between the canvas layers (see
 * `SceneLayers`) and moved with the same transform as the scene:
 * screen = (world + scroll) * zoom. Pointer input still goes to the overlay
 * canvas on top, so tools treat cards like any element.
 */
export function DocumentCard({ element }: { element: DocumentElement }) {
  const viewport = useEditor((m) => m.viewport)
  return (
    <div className={styles.plane}>
      <div
        style={{
          transformOrigin: '0 0',
          transform: `scale(${viewport.zoom}) translate(${viewport.scrollX}px, ${viewport.scrollY}px)`,
        }}
      >
        <CardContent element={element} />
      </div>
    </div>
  )
}

function CardContent({ element }: { element: DocumentElement }) {
  const { t } = useI18n()
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
      className={cx('document-card', styles.card)}
      style={{ left: element.x, top: element.y, width: element.width }}
    >
      {isPending ? (
        <div className={styles.skeleton}>
          <div style={{ width: '66%', height: 26 }} />
          <div style={{ width: '100%' }} />
          <div style={{ width: '82%' }} />
        </div>
      ) : error ? (
        <p className={styles.missing}>
          {t(error instanceof NotFoundError ? 'document.deleted' : 'document.loadFailed')}
        </p>
      ) : (
        <>
          <h1 className={styles.title}>{doc.title}</h1>
          <StaticDocument content={doc.content} />
        </>
      )}
    </article>
  )
}
