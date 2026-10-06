import { screenToWorld, type Viewport } from '@/application/editor/viewport'
import type { Point } from '@/domain/shared/geometry'

/**
 * Where the mouse is over the board, in screen pixels relative to the canvas
 * (null when it is elsewhere), and the canvas size. Kept outside the editor
 * model: it changes on every mouse move and nothing needs to re-render for it.
 */
let pointer: Point | null = null
let size = { width: 0, height: 0 }

export const boardPointer = {
  move(screen: Point): void {
    pointer = screen
  },
  leave(): void {
    pointer = null
  },
  resize(width: number, height: number): void {
    size = { width, height }
  },
  /**
   * Board point where pasted elements go: under the mouse if it is over the
   * board, else the middle of the visible board. Converted with the current
   * viewport, so scrolling without moving the mouse is taken into account.
   */
  pastePoint(viewport: Viewport): Point {
    return screenToWorld(viewport, pointer ?? { x: size.width / 2, y: size.height / 2 })
  },
}
