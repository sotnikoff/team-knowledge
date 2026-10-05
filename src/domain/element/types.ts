import type { Point } from '../shared/geometry'

export type ElementId = string

export const TRANSPARENT = 'transparent'

export interface ElementStyle {
  readonly strokeColor: string
  /** CSS color or `TRANSPARENT`. */
  readonly fillColor: string
  readonly strokeWidth: number
  /** 0 = clean lines, higher = sketchier. */
  readonly roughness: number
}

interface BaseElement {
  readonly id: ElementId
  readonly x: number
  readonly y: number
  /** Always >= 0 for a committed element. */
  readonly width: number
  readonly height: number
  /** Keeps the hand-drawn jitter stable between renders. */
  readonly seed: number
  readonly style: ElementStyle
}

/** Shapes can carry a text label centered inside them ('' = no label). */
interface LabeledElement extends BaseElement {
  readonly label: string
}

export interface RectangleElement extends LabeledElement {
  readonly type: 'rectangle'
}

export interface EllipseElement extends LabeledElement {
  readonly type: 'ellipse'
}

export interface DiamondElement extends LabeledElement {
  readonly type: 'diamond'
}

/** Midpoint of a side of the target's bounding box. */
export type Anchor = 'top' | 'right' | 'bottom' | 'left'

export const ANCHORS: readonly Anchor[] = ['top', 'right', 'bottom', 'left']

/** Glues an end of a line/arrow to an anchor of another element. */
export interface Binding {
  readonly elementId: ElementId
  readonly anchor: Anchor
}

/** `points` are relative to (x, y); width/height are their bounding box. */
interface LinearBase extends BaseElement {
  /** Ends + bend points, in order. */
  readonly points: readonly Point[]
  /** Smooth curve through the points (true) or a broken line (false). */
  readonly curved: boolean
  readonly startBinding: Binding | null
  readonly endBinding: Binding | null
}

export interface LineElement extends LinearBase {
  readonly type: 'line'
}

export interface ArrowElement extends LinearBase {
  readonly type: 'arrow'
}

export interface FreedrawElement extends BaseElement {
  readonly type: 'freedraw'
  readonly points: readonly Point[]
}

export interface TextElement extends BaseElement {
  readonly type: 'text'
  readonly text: string
  readonly fontSize: number
}

/**
 * A text document placed on the board. Only the reference is stored — the
 * content lives in the document itself. `height` mirrors the rendered card
 * (the whole document, never scrolled) so hit-testing and bindings are exact.
 */
export interface DocumentElement extends BaseElement {
  readonly type: 'document'
  readonly documentId: string
}

export type DiagramElement =
  | RectangleElement
  | EllipseElement
  | DiamondElement
  | LineElement
  | ArrowElement
  | FreedrawElement
  | TextElement
  | DocumentElement

export type ElementType = DiagramElement['type']

export type ElementOfType<T extends ElementType> = Extract<DiagramElement, { type: T }>

export type PointsElement = LineElement | ArrowElement | FreedrawElement

export type LinearElement = LineElement | ArrowElement

export type ShapeElement = RectangleElement | EllipseElement | DiamondElement

/** Elements a line/arrow can be bound to. */
export type BindableElement = ShapeElement | TextElement | DocumentElement

export const ELEMENT_TYPES: readonly ElementType[] = [
  'rectangle',
  'ellipse',
  'diamond',
  'line',
  'arrow',
  'freedraw',
  'text',
  'document',
]

export function isPointsElement(el: DiagramElement): el is PointsElement {
  return el.type === 'line' || el.type === 'arrow' || el.type === 'freedraw'
}

export function isLinearElement(el: DiagramElement): el is LinearElement {
  return el.type === 'line' || el.type === 'arrow'
}

export function isShapeElement(el: DiagramElement): el is ShapeElement {
  return el.type === 'rectangle' || el.type === 'ellipse' || el.type === 'diamond'
}

export function isBindableElement(el: DiagramElement): el is BindableElement {
  return isShapeElement(el) || el.type === 'text' || el.type === 'document'
}
