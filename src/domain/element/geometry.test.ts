import { describe, expect, it } from 'vitest'
import { createLinear, withAbsolutePoints } from './factory'
import { hitTestElement, resizeBounds, resizeElement } from './geometry'
import { TRANSPARENT, type DiagramElement, type ElementStyle } from './types'

const style: ElementStyle = {
  strokeColor: '#000',
  fillColor: TRANSPARENT,
  strokeWidth: 2,
  roughness: 1,
}

const rect: DiagramElement = {
  id: 'r',
  type: 'rectangle',
  label: '',
  x: 0,
  y: 0,
  width: 100,
  height: 50,
  seed: 1,
  style,
}

describe('hitTestElement', () => {
  it('hits the outline of a transparent rectangle but not its middle', () => {
    expect(hitTestElement(rect, { x: 100, y: 25 }, 4)).toBe(true)
    expect(hitTestElement(rect, { x: 50, y: 25 }, 4)).toBe(false)
  })

  it('hits the inside of a filled rectangle', () => {
    const filled = { ...rect, style: { ...style, fillColor: '#f00' } }
    expect(hitTestElement(filled, { x: 50, y: 25 }, 4)).toBe(true)
  })

  it('hits an ellipse outline', () => {
    const ellipse: DiagramElement = { ...rect, type: 'ellipse', label: '' }
    expect(hitTestElement(ellipse, { x: 50, y: 0 }, 4)).toBe(true)
    expect(hitTestElement(ellipse, { x: 2, y: 2 }, 4)).toBe(false)
  })

  it('hits a line near its segment', () => {
    const base = createLinear({ id: 'l', type: 'line', seed: 1, style, origin: { x: 0, y: 0 } })
    const line = withAbsolutePoints(base, [
      { x: 0, y: 0 },
      { x: 100, y: 100 },
    ])
    expect(hitTestElement(line, { x: 50, y: 52 }, 4)).toBe(true)
    expect(hitTestElement(line, { x: 50, y: 80 }, 4)).toBe(false)
  })
})

describe('resizeBounds', () => {
  it('drags the south-east handle', () => {
    expect(resizeBounds({ x: 0, y: 0, width: 10, height: 10 }, 'se', { x: 30, y: 20 })).toEqual({
      x: 0,
      y: 0,
      width: 30,
      height: 20,
    })
  })

  it('flips when crossing the opposite edge', () => {
    expect(resizeBounds({ x: 0, y: 0, width: 10, height: 10 }, 'e', { x: -5, y: 99 })).toEqual({
      x: -5,
      y: 0,
      width: 5,
      height: 10,
    })
  })
})

describe('resizeElement', () => {
  it('scales the points of a line', () => {
    const base = createLinear({ id: 'l', type: 'line', seed: 1, style, origin: { x: 0, y: 0 } })
    const line = withAbsolutePoints(base, [
      { x: 0, y: 0 },
      { x: 10, y: 20 },
    ])
    const resized = resizeElement(line, { x: 5, y: 5, width: 20, height: 40 })
    expect(resized.points).toEqual([
      { x: 0, y: 0 },
      { x: 20, y: 40 },
    ])
    expect(resized.x).toBe(5)
  })
})
