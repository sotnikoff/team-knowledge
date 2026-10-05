import * as editor from '@/application/editor/editorModel'
import { updateElements } from '@/application/editor/scene'
import { createShape } from '@/domain/element/factory'
import type { DiagramElement } from '@/domain/element/types'
import { boundsFromPoints, type Point } from '@/domain/shared/geometry'
import { dispatch } from '../../editor/store'
import { finishCreation } from './finishCreation'
import type { Tool } from './types'

/** With shift held the shape is constrained to a square/circle. */
function constrain(start: Point, p: Point, square: boolean): Point {
  if (!square) return p
  const size = Math.max(Math.abs(p.x - start.x), Math.abs(p.y - start.y))
  return { x: start.x + Math.sign(p.x - start.x || 1) * size, y: start.y + Math.sign(p.y - start.y || 1) * size }
}

export function shapeTool(type: 'rectangle' | 'ellipse' | 'diamond'): Tool {
  return {
    cursor: 'crosshair',
    begin: ({ world }, ctx) => {
      const id = ctx.ids.next()
      dispatch(
        editor.beginInteraction,
        (m) =>
          editor.updateLive(m, [
            ...m.elements,
            createShape({ id, type, seed: ctx.randomSeed(), style: m.style, x: world.x, y: world.y }),
          ]),
        (m) => editor.select(m, [id]),
      )
      return {
        move: ({ world: p, shiftKey }) => {
          const bounds = boundsFromPoints(world, constrain(world, p, shiftKey))
          dispatch((m) =>
            editor.updateLive(
              m,
              updateElements(m.elements, [id], (el): DiagramElement => ({ ...el, ...bounds })),
            ),
          )
        },
        end: () => finishCreation(id, (el) => el.width >= 2 || el.height >= 2, { clickedAt: world }),
      }
    },
  }
}
