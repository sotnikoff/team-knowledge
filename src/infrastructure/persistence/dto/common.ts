import type { Versioned } from '@/domain/shared/versioned'

/**
 * Validation helpers shared by all mappers. Incoming data (storage or network)
 * is never trusted: every field is checked before it reaches the domain.
 */
export class InvalidDataError extends Error {
  constructor(message: string) {
    super(`Invalid data: ${message}`)
    this.name = 'InvalidDataError'
  }
}

export type Json = Record<string, unknown>

export const isObject = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v)
export const isString = (v: unknown): v is string => typeof v === 'string'
export const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
export const isArray = (v: unknown): v is unknown[] => Array.isArray(v)

export function asObject(raw: unknown, what: string): Json {
  if (!isObject(raw)) throw new InvalidDataError(`${what} must be an object`)
  return raw
}

export function field<T>(obj: Json, key: string, guard: (v: unknown) => v is T, what: string): T {
  const value = obj[key]
  if (!guard(value)) throw new InvalidDataError(`"${key}" must be ${what}`)
  return value
}

/** Optional field: `undefined`/`null` fall back to a default (additive schema changes). */
export function optional<T>(obj: Json, key: string, parse: (v: unknown) => T, fallback: T): T {
  const value = obj[key]
  return value === undefined || value === null ? fallback : parse(value)
}

export function parseString(raw: unknown): string {
  if (!isString(raw)) throw new InvalidDataError('expected a string')
  return raw
}

export function parseBoolean(raw: unknown): boolean {
  if (typeof raw !== 'boolean') throw new InvalidDataError('expected a boolean')
  return raw
}

export function parseDate(obj: Json, key: string): Date {
  const date = new Date(field(obj, key, isString, 'an ISO date string'))
  if (Number.isNaN(date.getTime())) throw new InvalidDataError(`"${key}" is not a valid date`)
  return date
}

/** Wire form of `Versioned`: dates as ISO-8601 strings. */
export interface VersionedDto {
  id: string
  version: number
  createdAt: string
  updatedAt: string
}

export function versionedToDto(v: Versioned): VersionedDto {
  return {
    id: v.id,
    version: v.version,
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt.toISOString(),
  }
}

export function parseVersioned(obj: Json): Versioned {
  return {
    id: field(obj, 'id', isString, 'a string'),
    version: field(obj, 'version', isNumber, 'a number'),
    createdAt: parseDate(obj, 'createdAt'),
    updatedAt: parseDate(obj, 'updatedAt'),
  }
}

export function checkSchemaVersion(obj: Json, supported: number): void {
  const schemaVersion = field(obj, 'schemaVersion', isNumber, 'a number')
  if (schemaVersion > supported) throw new InvalidDataError(`unsupported schemaVersion ${schemaVersion}`)
}
