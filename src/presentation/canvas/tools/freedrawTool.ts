import * as editor from '@/application/editor/editorModel'
import { updateElements } from '@/application/editor/scene'
import { createFreedraw, withAbsolutePoints } from '@/domain/element/factory'
import { isPointsElement } from '@/domain/element/types'
import type { Point } from '@/domain/shared/geometry'
import { dispatch } from '../../editor/store'
import { finishCreation } from './finishCreation'
import type { Tool } from './types'

export const freedrawTool: Tool = {
  cursor: 'crosshair',
  begin: ({ world }, ctx) => {
    const id = ctx.ids.next()
    const points: Point[] = [world]
    dispatch(editor.beginInteraction, (m) =>
      editor.updateLive(m, [
        ...m.elements,
        createFreedraw({ id, seed: ctx.randomSeed(), style: m.style, origin: world }),
      ]),
    )
    return {
      move: ({ world: p }) => {
        points.push(p)
        dispatch((m) =>
          editor.updateLive(
            m,
            updateElements(m.elements, [id], (el) =>
              isPointsElement(el) ? withAbsolutePoints(el, points) : el,
            ),
          ),
        )
      },
      // The pen stays active, like in Excalidraw.
      end: () => finishCreation(id, (el) => isPointsElement(el) && el.points.length > 1, { keepTool: true }),
    }
  },
}
