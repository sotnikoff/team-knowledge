import { describe, expect, it } from 'vitest'
import { containsBounds } from '../shared/geometry'
import { anchorPoint, findBindingTarget } from './binding'
import { createTech } from './factory'
import { hitTestElement, labelBox } from './geometry'
import { TECH_KINDS, TECH_LAYOUT } from './tech'
import { isBindableElement, isShapeElement, TRANSPARENT } from './types'

const style = { strokeColor: '#000', fillColor: TRANSPARENT, fillStyle: 'hachure' as const, strokeWidth: 2, roughness: 1 }

describe('tech components', () => {
  it.each(TECH_KINDS)('%s keeps its label area inside its bounds', (kind) => {
    const { width, height } = TECH_LAYOUT[kind].defaultSize
    const el = createTech({ id: 'c', kind, seed: 1, style, x: 10, y: 20, width, height })
    const box = labelBox(el)
    expect(containsBounds(el, box)).toBe(true)
    expect(box.width).toBeGreaterThan(0)
    expect(box.height).toBeGreaterThan(0)
  })

  it('behaves like a shape: solid hit area, label, bindings', () => {
    const db = createTech({ id: 'db', kind: 'database', seed: 1, style, x: 0, y: 0, width: 140, height: 120 })
    expect(isShapeElement(db)).toBe(true)
    expect(isBindableElement(db)).toBe(true)
    expect(db.label).toBe('')
    expect(hitTestElement(db, { x: 70, y: 60 }, 2)).toBe(true)
    expect(hitTestElement(db, { x: 200, y: 60 }, 2)).toBe(false)
    expect(findBindingTarget([db], { x: 142, y: 60 }, { threshold: 10 })).toEqual({ elementId: 'db', anchor: 'right' })
    expect(anchorPoint(db, 'top').x).toBe(70)
  })
})
