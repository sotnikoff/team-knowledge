import type { Board, BoardSummary } from '@/domain/board/Board'
import {
  ANCHORS,
  ELEMENT_TYPES,
  isArrowhead,
  isFillStyle,
  type Anchor,
  type Arrowhead,
  type Binding,
  type DiagramElement,
  type ElementStyle,
  type ElementType,
  type FillStyle,
} from '@/domain/element/types'
import { isTechKind } from '@/domain/element/tech'
import type { Point } from '@/domain/shared/geometry'
import {
  BOARD_SCHEMA_VERSION,
  type BoardDto,
  type BoardSummaryDto,
  type ElementDto,
} from './BoardDto'
import {
  asObject,
  checkSchemaVersion,
  field,
  InvalidDataError,
  isArray,
  isNumber,
  isObject,
  isString,
  optional,
  parseBoolean,
  parseString,
  parseVersioned,
  versionedToDto,
} from './common'

// ---------- domain -> DTO ----------

export function summaryToDto(summary: BoardSummary): BoardSummaryDto {
  return { ...versionedToDto(summary), spaceId: summary.spaceId, name: summary.name }
}

export function boardToDto(board: Board): BoardDto {
  return {
    ...summaryToDto(board),
    schemaVersion: BOARD_SCHEMA_VERSION,
    elements: board.elements.map(elementToDto),
  }
}

function elementToDto(el: DiagramElement): ElementDto {
  // Elements are plain data already; copying detaches them from the caller.
  return structuredClone(el) as ElementDto
}

// ---------- DTO -> domain (validating: never trust storage or network) ----------

const isElementType = (v: unknown): v is ElementType => ELEMENT_TYPES.includes(v as ElementType)
const isAnchor = (v: unknown): v is Anchor => ANCHORS.includes(v as Anchor)

function parseBinding(raw: unknown): Binding {
  if (!isObject(raw)) throw new InvalidDataError('binding must be an object')
  return {
    elementId: field(raw, 'elementId', isString, 'a string'),
    anchor: field(raw, 'anchor', isAnchor, 'a known anchor'),
  }
}

function parsePoint(raw: unknown): Point {
  if (!isObject(raw)) throw new InvalidDataError('point must be an object')
  return { x: field(raw, 'x', isNumber, 'a number'), y: field(raw, 'y', isNumber, 'a number') }
}

/** Absent = older data (`fallback`); `null` = deliberately no head. */
function parseArrowhead(raw: Record<string, unknown>, key: string, fallback: Arrowhead | null): Arrowhead | null {
  const value = raw[key]
  if (value === undefined) return fallback
  if (value === null) return null
  if (!isArrowhead(value)) throw new InvalidDataError(`"${key}" must be a known arrowhead or null`)
  return value
}

function parseFillStyle(raw: unknown): FillStyle {
  if (!isFillStyle(raw)) throw new InvalidDataError('"fillStyle" must be a known fill style')
  return raw
}

function parseStyle(raw: unknown): ElementStyle {
  if (!isObject(raw)) throw new InvalidDataError('"style" must be an object')
  return {
    strokeColor: field(raw, 'strokeColor', isString, 'a string'),
    fillColor: field(raw, 'fillColor', isString, 'a string'),
    fillStyle: optional<FillStyle>(raw, 'fillStyle', parseFillStyle, 'hachure'),
    strokeWidth: field(raw, 'strokeWidth', isNumber, 'a number'),
    roughness: field(raw, 'roughness', isNumber, 'a number'),
  }
}

function parseElement(raw: unknown): DiagramElement {
  if (!isObject(raw)) throw new InvalidDataError('element must be an object')
  const base = {
    id: field(raw, 'id', isString, 'a string'),
    x: field(raw, 'x', isNumber, 'a number'),
    y: field(raw, 'y', isNumber, 'a number'),
    width: field(raw, 'width', isNumber, 'a number'),
    height: field(raw, 'height', isNumber, 'a number'),
    seed: field(raw, 'seed', isNumber, 'a number'),
    style: parseStyle(raw.style),
  }
  const type = field(raw, 'type', isElementType, 'a known element type')
  switch (type) {
    case 'rectangle':
    case 'ellipse':
    case 'diamond':
      return { ...base, type, label: optional(raw, 'label', parseString, '') }
    case 'line':
    case 'arrow':
      return {
        ...base,
        type,
        points: field(raw, 'points', isArray, 'an array').map(parsePoint),
        startBinding: optional<Binding | null>(raw, 'startBinding', parseBinding, null),
        endBinding: optional<Binding | null>(raw, 'endBinding', parseBinding, null),
        curved: optional(raw, 'curved', parseBoolean, false),
        label: optional(raw, 'label', parseString, ''),
        // Saved before arrowheads were editable: an arrow pointed at its end.
        startArrowhead: parseArrowhead(raw, 'startArrowhead', null),
        endArrowhead: parseArrowhead(raw, 'endArrowhead', type === 'arrow' ? 'arrow' : null),
      }
    case 'freedraw':
      return { ...base, type, points: field(raw, 'points', isArray, 'an array').map(parsePoint) }
    case 'tech':
      return {
        ...base,
        type,
        kind: field(raw, 'kind', isTechKind, 'a known component kind'),
        label: optional(raw, 'label', parseString, ''),
      }
    case 'document':
      return { ...base, type, documentId: field(raw, 'documentId', isString, 'a string') }
    case 'text':
      return {
        ...base,
        type,
        text: field(raw, 'text', isString, 'a string'),
        fontSize: field(raw, 'fontSize', isNumber, 'a number'),
      }
  }
}

export function summaryFromDto(raw: unknown): BoardSummary {
  const obj = asObject(raw, 'board')
  return {
    ...parseVersioned(obj),
    spaceId: field(obj, 'spaceId', isString, 'a string'),
    name: field(obj, 'name', isString, 'a string'),
  }
}

export function boardFromDto(raw: unknown): Board {
  const obj = asObject(raw, 'board')
  checkSchemaVersion(obj, BOARD_SCHEMA_VERSION)
  return {
    ...summaryFromDto(obj),
    elements: field(obj, 'elements', isArray, 'an array').map(parseElement),
  }
}
