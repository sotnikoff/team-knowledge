import { describe, expect, it } from 'vitest'
import { screenToWorld, worldToScreen, zoomAt, initialViewport } from './viewport'

describe('viewport', () => {
  it('round-trips screen and world coordinates', () => {
    const v = { scrollX: 30, scrollY: -10, zoom: 2 }
    const p = { x: 123, y: 45 }
    expect(worldToScreen(v, screenToWorld(v, p))).toEqual(p)
  })

  it('keeps the anchor fixed while zooming', () => {
    const anchor = { x: 200, y: 100 }
    const before = screenToWorld(initialViewport, anchor)
    const after = screenToWorld(zoomAt(initialViewport, 2.5, anchor), anchor)
    expect(after.x).toBeCloseTo(before.x)
    expect(after.y).toBeCloseTo(before.y)
  })
})
