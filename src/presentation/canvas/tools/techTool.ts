import * as editor from '@/application/editor/editorModel'
import { updateElements } from '@/application/editor/scene'
import { createTech } from '@/domain/element/factory'
import { TECH_LAYOUT } from '@/domain/element/tech'
import { boundsFromPoints, type Point } from '@/domain/shared/geometry'
import { dispatch, getModel } from '../../editor/store'
import type { Tool } from './types'

/** Smaller than this (screen px) the gesture is a click: place the default size. */
const CLICK_SIZE = 8

/**
 * Places the component chosen in the palette (`EditorModel.techKind`): drag
 * to size it, or click to drop it in its default size centred on the cursor.
 * With shift the drag keeps the component's default proportions.
 */
export const techTool: Tool = {
  cursor: 'crosshair',
  begin: ({ world }, ctx) => {
    const id = ctx.ids.next()
    const kind = getModel().techKind
    const preferred = TECH_LAYOUT[kind].defaultSize
    dispatch(
      editor.beginInteraction,
      (m) =>
        editor.updateLive(m, [
          ...m.elements,
          createTech({ id, kind, seed: ctx.randomSeed(), style: m.style, x: world.x, y: world.y, width: 0, height: 0 }),
        ]),
      (m) => editor.select(m, [id]),
    )
    const resize = (bounds: { x: number; y: number; width: number; height: number }) =>
      dispatch((m) => editor.updateLive(m, updateElements(m.elements, [id], (el) => ({ ...el, ...bounds }))))

    return {
      move: ({ world: p, shiftKey }) => {
        let end: Point = p
        if (shiftKey) {
          const scale = Math.max(Math.abs(p.x - world.x) / preferred.width, Math.abs(p.y - world.y) / preferred.height)
          end = {
            x: world.x + Math.sign(p.x - world.x || 1) * preferred.width * scale,
            y: world.y + Math.sign(p.y - world.y || 1) * preferred.height * scale,
          }
        }
        resize(boundsFromPoints(world, end))
      },
      end: ({ world: p }) => {
        const zoom = getModel().viewport.zoom
        const isClick = Math.abs(p.x - world.x) * zoom < CLICK_SIZE && Math.abs(p.y - world.y) * zoom < CLICK_SIZE
        if (isClick) {
          resize({
            x: world.x - preferred.width / 2,
            y: world.y - preferred.height / 2,
            width: preferred.width,
            height: preferred.height,
          })
        }
        dispatch(editor.endInteraction, (m) => editor.setTool(m, 'select'))
      },
    }
  },
}
