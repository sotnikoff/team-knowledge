import { describe, expect, it } from 'vitest'
import { anchorPoint, moveLinearEnd, syncBindings } from './binding'
import { catmullRomSegments, cubicAt, traceLine } from './curve'
import { absolutePoints, createLinear, withAbsolutePoints } from './factory'
import { hitTestElement } from './geometry'
import { insertBend, isBendIndex, moveLinePoint, removeBend, segmentMidpoints, setCurved } from './linear'
import { TRANSPARENT, type LinearElement, type ShapeElement } from './types'

const style = { strokeColor: '#000', fillColor: TRANSPARENT, strokeWidth: 2, roughness: 1 }

/** A "V": (0,100) -> (100,0) -> (200,100). */
function vLine(curved: boolean): LinearElement {
  const base = { ...createLinear({ id: 'l', type: 'arrow', seed: 1, style, origin: { x: 0, y: 0 } }), curved }
  return withAbsolutePoints(base, [
    { x: 0, y: 100 },
    { x: 100, y: 0 },
    { x: 200, y: 100 },
  ])
}

describe('spline', () => {
  it('passes through every point', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 50, y: 80 },
      { x: 120, y: 10 },
      { x: 200, y: 60 },
    ]
    const segments = catmullRomSegments(points)
    expect(segments).toHaveLength(3)
    segments.forEach((s, i) => {
      expect(cubicAt(s, 0)).toEqual(points[i])
      expect(cubicAt(s, 1)).toEqual(points[i + 1])
    })
  })

  it('is a plain polyline when not curved or with two points', () => {
    const two = [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
    ]
    expect(traceLine(two, true)).toEqual(two)
    expect(traceLine([...two, { x: 20, y: 0 }], false)).toHaveLength(3)
  })
})

describe('lines with bends', () => {
  it('new lines are smooth by default', () => {
    expect(createLinear({ id: 'a', type: 'line', seed: 1, style, origin: { x: 0, y: 0 } }).curved).toBe(true)
  })

  it('bounds of a smooth line include the bulge of the curve', () => {
    // An "L" turn: the smooth corner swings above the first segment (y < 0).
    const corner = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
    ]
    const base = createLinear({ id: 'c', type: 'line', seed: 1, style, origin: { x: 0, y: 0 } })
    expect(withAbsolutePoints(base, corner).y).toBeLessThan(0)
    expect(withAbsolutePoints({ ...base, curved: false }, corner).y).toBe(0)
  })

  it('keeps the points in place when switching smooth <-> broken', () => {
    const smooth = vLine(true)
    const broken = setCurved(smooth, false)
    expect(absolutePoints(broken)).toEqual(absolutePoints(smooth).map((p) => ({ x: p.x, y: expect.closeTo(p.y, 9) })))
    expect(broken.curved).toBe(false)
  })

  it('is hit along the drawn curve, not along the straight chords', () => {
    const smooth = vLine(true)
    const broken = vLine(false)
    // Midpoint of the left chord of the V: on the broken line, off the curve.
    expect(hitTestElement(broken, { x: 50, y: 50 }, 3)).toBe(true)
    const curveMid = segmentMidpoints(smooth)[0]!
    expect(hitTestElement(smooth, curveMid, 3)).toBe(true)
  })

  it('inserts, moves and removes bends; ends are not bends', () => {
    let line = createLinear({ id: 'a', type: 'line', seed: 1, style, origin: { x: 0, y: 0 } })
    line = moveLinearEnd(line, 'end', { x: 100, y: 0 }, null)
    line = insertBend(line, 1, { x: 50, y: 40 })
    expect(absolutePoints(line)).toEqual([
      { x: 0, y: 0 },
      { x: 50, y: 40 },
      { x: 100, y: 0 },
    ])
    expect([0, 1, 2].map((i) => isBendIndex(line, i))).toEqual([false, true, false])

    line = moveLinePoint(line, 1, { x: 50, y: -40 })
    expect(absolutePoints(line)[1]).toEqual({ x: 50, y: -40 })

    expect(removeBend(line, 0)).toBe(line)
    expect(absolutePoints(removeBend(line, 1))).toEqual([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ])
  })

  it('bound ends follow their shapes while bends stay where they are', () => {
    const box: ShapeElement = { id: 'b', type: 'rectangle', label: '', x: 300, y: 0, width: 100, height: 50, seed: 1, style }
    let line = vLine(true)
    line = moveLinearEnd(line, 'end', anchorPoint(box, 'left'), { elementId: 'b', anchor: 'left' })
    const moved = { ...box, y: 200 }
    const synced = syncBindings([moved, line])[1] as LinearElement
    const points = absolutePoints(synced)
    expect(points[1]).toEqual({ x: 100, y: 0 })
    expect(points.at(-1)).toEqual(anchorPoint(moved, 'left'))
  })
})
