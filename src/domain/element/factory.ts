import { boundsOfPoints, type Point } from '../shared/geometry'
import type {
  DocumentElement,
  ElementId,
  ElementStyle,
  FreedrawElement,
  LinearElement,
  PointsElement,
  ShapeElement,
  TextElement,
} from './types'

interface CommonInit {
  readonly id: ElementId
  readonly seed: number
  readonly style: ElementStyle
}

export function createShape(
  init: CommonInit & { type: ShapeElement['type']; x: number; y: number },
): ShapeElement {
  return { ...init, width: 0, height: 0, label: '' }
}

export function createLinear(
  init: CommonInit & { type: LinearElement['type']; origin: Point },
): LinearElement {
  const { origin, ...rest } = init
  return {
    ...rest,
    x: origin.x,
    y: origin.y,
    width: 0,
    height: 0,
    // Two points from the start: [start, end].
    points: [
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ],
    startBinding: null,
    endBinding: null,
  }
}

export function createFreedraw(init: CommonInit & { origin: Point }): FreedrawElement {
  const { origin, ...rest } = init
  return { ...rest, type: 'freedraw', x: origin.x, y: origin.y, width: 0, height: 0, points: [{ x: 0, y: 0 }] }
}

export function createText(
  init: CommonInit & { x: number; y: number; fontSize: number },
): TextElement {
  return { ...init, type: 'text', text: '', width: 0, height: init.fontSize * 1.25 }
}

export const DOCUMENT_CARD_WIDTH = 480

/** Height is a placeholder until the card is rendered and measured. */
export function createDocumentElement(
  init: CommonInit & { documentId: string; x: number; y: number; width?: number },
): DocumentElement {
  return {
    ...init,
    type: 'document',
    width: init.width ?? DOCUMENT_CARD_WIDTH,
    height: 160,
  }
}

/**
 * Re-anchors a points element so that (x, y) is the top-left corner of its
 * points' bounding box and width/height match it.
 */
export function withAbsolutePoints<T extends PointsElement>(el: T, absolute: readonly Point[]): T {
  const b = boundsOfPoints(absolute)
  return {
    ...el,
    x: b.x,
    y: b.y,
    width: b.width,
    height: b.height,
    points: absolute.map((p) => ({ x: p.x - b.x, y: p.y - b.y })),
  }
}

export function absolutePoints(el: PointsElement): Point[] {
  return el.points.map((p) => ({ x: el.x + p.x, y: el.y + p.y }))
}
