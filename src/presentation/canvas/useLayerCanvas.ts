import { useEffect, type RefObject } from 'react'
import type { RoughCanvas } from 'roughjs/bin/canvas'
import { subscribeToModel } from '../editor/store'
import { createRoughCanvas, type Surface } from './renderScene'

/**
 * Keeps a layer canvas sized to the surface and redraws it on every model
 * change, at most once per frame. `draw` should be stable (useCallback).
 */
export function useLayerCanvas(
  ref: RefObject<HTMLCanvasElement | null>,
  surface: Surface,
  draw: (canvas: HTMLCanvasElement, rc: RoughCanvas) => void,
): void {
  useEffect(() => {
    const canvas = ref.current
    if (!canvas || surface.width === 0) return
    canvas.width = Math.floor(surface.width * surface.pixelRatio)
    canvas.height = Math.floor(surface.height * surface.pixelRatio)
    const rc = createRoughCanvas(canvas)
    let frame = 0
    const render = () => {
      frame = 0
      draw(canvas, rc)
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(render)
    }
    render()
    const unsubscribe = subscribeToModel(schedule)
    void document.fonts.ready.then(schedule)
    return () => {
      unsubscribe()
      cancelAnimationFrame(frame)
    }
  }, [ref, surface, draw])
}
