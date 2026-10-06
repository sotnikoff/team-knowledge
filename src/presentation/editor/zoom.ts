import * as editor from '@/application/editor/editorModel'
import { zoomAt } from '@/application/editor/viewport'
import { dispatch } from './store'

/** One step of the zoom buttons and of the − / = keys. */
export const ZOOM_STEP = 1.2

/** Zooms the board around the middle of the window. */
export function zoomBy(factor: number): void {
  const anchor = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
  dispatch((m) => editor.setViewport(m, zoomAt(m.viewport, m.viewport.zoom * factor, anchor)))
}
