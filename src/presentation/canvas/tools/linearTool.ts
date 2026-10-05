import * as editor from '@/application/editor/editorModel'
import { updateElements } from '@/application/editor/scene'
import { moveLinearEnd } from '@/domain/element/binding'
import { createLinear } from '@/domain/element/factory'
import { isLinearElement } from '@/domain/element/types'
import type { Point } from '@/domain/shared/geometry'
import { dispatch } from '../../editor/store'
import { finishCreation } from './finishCreation'
import { hintFor, snapLineEnd } from './snapping'
import type { Tool } from './types'

/** With shift held the angle snaps to 15° steps. */
function snapAngle(start: Point, p: Point, enabled: boolean): Point {
  if (!enabled) return p
  const step = Math.PI / 12
  const angle = Math.round(Math.atan2(p.y - start.y, p.x - start.x) / step) * step
  const length = Math.hypot(p.x - start.x, p.y - start.y)
  return { x: start.x + length * Math.cos(angle), y: start.y + length * Math.sin(angle) }
}

/**
 * Draws a line/arrow. Each end snaps to the side midpoint of the shape under
 * it and stays bound to that anchor when the shape moves (Alt disables).
 */
export function linearTool(type: 'line' | 'arrow'): Tool {
  return {
    cursor: 'crosshair',
    begin: ({ world, altKey }, ctx) => {
      const id = ctx.ids.next()
      const start = snapLineEnd(world, altKey)
      const seed = ctx.randomSeed()
      dispatch(
        editor.beginInteraction,
        (m) =>
          editor.updateLive(m, [
            ...m.elements,
            {
              ...createLinear({ id, type, seed, style: m.style, origin: start.point }),
              startBinding: start.binding,
            },
          ]),
        (m) => editor.select(m, [id]),
        (m) => editor.setBindingHint(m, hintFor(start.binding)),
      )
      return {
        move: ({ world: p, shiftKey, altKey: free }) => {
          const snapped = snapLineEnd(p, free, [id])
          const point = snapped.binding ? snapped.point : snapAngle(start.point, p, shiftKey)
          dispatch(
            (m) =>
              editor.updateLive(
                m,
                updateElements(m.elements, [id], (el) =>
                  isLinearElement(el) ? moveLinearEnd(el, 'end', point, snapped.binding) : el,
                ),
              ),
            (m) => editor.setBindingHint(m, hintFor(snapped.binding)),
          )
        },
        end: () => finishCreation(id, (el) => Math.hypot(el.width, el.height) >= 4, { clickedAt: world }),
      }
    },
  }
}
