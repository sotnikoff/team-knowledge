import type { Board, BoardSummary } from '@/domain/board/Board'
import {
  ANCHORS,
  ELEMENT_TYPES,
  type Anchor,
  type Binding,
  type DiagramElement,
  type ElementStyle,
  type ElementType,
} from '@/domain/element/types'
import type { Point } from '@/domain/shared/geometry'
import {
  BOARD_SCHEMA_VERSION,
  type BoardDto,
  type BoardSummaryDto,
  type ElementDto,
} from './BoardDto'

/** Thrown when incoming data does not match the wire format. */
export class InvalidBoardDataError extends Error {
  constructor(message: string) {
    super(`Invalid board data: ${message}`)
    this.name = 'InvalidBoardDataError'
  }
}

// ---------- domain -> DTO ----------

export function summaryToDto(summary: BoardSummary): BoardSummaryDto {
  return {
    id: summary.id,
    name: summary.name,
    version: summary.version,
    createdAt: summary.createdAt.toISOString(),
    updatedAt: summary.updatedAt.toISOString(),
  }
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

type Json = Record<string, unknown>

const isObject = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v)

function field<T>(obj: Json, key: string, guard: (v: unknown) => v is T, what: string): T {
  const value = obj[key]
  if (!guard(value)) throw new InvalidBoardDataError(`"${key}" must be ${what}`)
  return value
}

const isString = (v: unknown): v is string => typeof v === 'string'
const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isArray = (v: unknown): v is unknown[] => Array.isArray(v)
const isElementType = (v: unknown): v is ElementType => ELEMENT_TYPES.includes(v as ElementType)
const isAnchor = (v: unknown): v is Anchor => ANCHORS.includes(v as Anchor)

function optional<T>(obj: Json, key: string, parse: (v: unknown) => T, fallback: T): T {
  const value = obj[key]
  return value === undefined || value === null ? fallback : parse(value)
}

function parseBinding(raw: unknown): Binding {
  if (!isObject(raw)) throw new InvalidBoardDataError('binding must be an object')
  return {
    elementId: field(raw, 'elementId', isString, 'a string'),
    anchor: field(raw, 'anchor', isAnchor, 'a known anchor'),
  }
}

function parseString(raw: unknown): string {
  if (!isString(raw)) throw new InvalidBoardDataError('expected a string')
  return raw
}

function parseDate(obj: Json, key: string): Date {
  const date = new Date(field(obj, key, isString, 'an ISO date string'))
  if (Number.isNaN(date.getTime())) throw new InvalidBoardDataError(`"${key}" is not a valid date`)
  return date
}

function parsePoint(raw: unknown): Point {
  if (!isObject(raw)) throw new InvalidBoardDataError('point must be an object')
  return { x: field(raw, 'x', isNumber, 'a number'), y: field(raw, 'y', isNumber, 'a number') }
}

function parseStyle(raw: unknown): ElementStyle {
  if (!isObject(raw)) throw new InvalidBoardDataError('"style" must be an object')
  return {
    strokeColor: field(raw, 'strokeColor', isString, 'a string'),
    fillColor: field(raw, 'fillColor', isString, 'a string'),
    strokeWidth: field(raw, 'strokeWidth', isNumber, 'a number'),
    roughness: field(raw, 'roughness', isNumber, 'a number'),
  }
}

function parseElement(raw: unknown): DiagramElement {
  if (!isObject(raw)) throw new InvalidBoardDataError('element must be an object')
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
      }
    case 'freedraw':
      return { ...base, type, points: field(raw, 'points', isArray, 'an array').map(parsePoint) }
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
  if (!isObject(raw)) throw new InvalidBoardDataError('board must be an object')
  return {
    id: field(raw, 'id', isString, 'a string'),
    name: field(raw, 'name', isString, 'a string'),
    version: field(raw, 'version', isNumber, 'a number'),
    createdAt: parseDate(raw, 'createdAt'),
    updatedAt: parseDate(raw, 'updatedAt'),
  }
}

export function boardFromDto(raw: unknown): Board {
  if (!isObject(raw)) throw new InvalidBoardDataError('board must be an object')
  const schemaVersion = field(raw, 'schemaVersion', isNumber, 'a number')
  if (schemaVersion > BOARD_SCHEMA_VERSION) {
    throw new InvalidBoardDataError(`unsupported schemaVersion ${schemaVersion}`)
  }
  return {
    ...summaryFromDto(raw),
    elements: field(raw, 'elements', isArray, 'an array').map(parseElement),
  }
}
