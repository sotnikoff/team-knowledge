import { Fragment, useCallback, useRef } from 'react'
import type { RoughCanvas } from 'roughjs/bin/canvas'
import type { EditorModel } from '@/application/editor/editorModel'
import { splitAtDocuments, type SceneStrata } from '@/application/editor/scene'
import { getModel, useEditor } from '../editor/store'
import { cx } from '../ui/cx'
import { DocumentCard } from './DocumentCard'
import { renderDrawing, type Surface } from './renderScene'
import styles from './Canvas.module.css'
import { useLayerCanvas } from './useLayerCanvas'

// Every layer canvas splits the same elements on each frame; split them once.
let cached: { elements: EditorModel['elements']; strata: SceneStrata } | null = null
function strataOf(elements: EditorModel['elements']): SceneStrata {
  if (cached?.elements !== elements) cached = { elements, strata: splitAtDocuments(elements) }
  return cached.strata
}

/**
 * The board in stacking order: a canvas with the drawings under the first
 * document card, the card, the next canvas, and so on. So z-order works the
 * same for cards and drawings, and a filled shape can lie under a card or over it.
 */
export function SceneLayers({ surface }: { surface: Surface }) {
  const { documents } = strataOf(useEditor((m) => m.elements))
  return (
    <>
      {documents.map((doc, i) => (
        <Fragment key={doc.id}>
          <DrawingLayer index={i} surface={surface} />
          <DocumentCard element={doc} />
        </Fragment>
      ))}
      <DrawingLayer index={documents.length} surface={surface} />
    </>
  )
}

function DrawingLayer({ index, surface }: { index: number; surface: Surface }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const draw = useCallback(
    (canvas: HTMLCanvasElement, rc: RoughCanvas) => {
      const m = getModel()
      renderDrawing(canvas, rc, strataOf(m.elements).drawings[index] ?? [], m, surface)
    },
    [index, surface],
  )
  useLayerCanvas(ref, surface, draw)
  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className={cx('board-ink', styles.layer)}
      style={{ width: surface.width, height: surface.height }}
    />
  )
}
