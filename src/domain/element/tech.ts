import type { Bounds } from '../shared/geometry'

/**
 * Catalogue of software-architecture components ("tech" shapes). They all
 * behave like shapes (label, bindings, resize, style); only the drawing and
 * the label area differ per kind. Adding a kind = one entry here + one
 * renderer + one palette icon (the compiler asks for each via mapped types).
 */
export const TECH_KINDS = [
  'service',
  'database',
  'cache',
  'queue',
  'storage',
  'function',
  'server',
  'gateway',
  'loadBalancer',
  'external',
  'web',
  'mobile',
  'user',
] as const

export type TechKind = (typeof TECH_KINDS)[number]

export const isTechKind = (value: unknown): value is TechKind => TECH_KINDS.includes(value as TechKind)

interface TechLayout {
  /** Size of a component placed with a click (world units). */
  readonly defaultSize: { readonly width: number; readonly height: number }
  /** Where the label goes, as fractions of the bounds (x, y, width, height). */
  readonly label: readonly [number, number, number, number]
}

/** Containers keep the label in their body; icon-like kinds put it under the glyph. */
export const TECH_LAYOUT: { readonly [K in TechKind]: TechLayout } = {
  service: { defaultSize: { width: 160, height: 110 }, label: [0.18, 0.15, 0.64, 0.7] },
  database: { defaultSize: { width: 140, height: 120 }, label: [0.08, 0.34, 0.84, 0.52] },
  cache: { defaultSize: { width: 140, height: 120 }, label: [0.08, 0.34, 0.66, 0.52] },
  queue: { defaultSize: { width: 190, height: 80 }, label: [0.1, 0.15, 0.68, 0.7] },
  storage: { defaultSize: { width: 140, height: 120 }, label: [0.16, 0.34, 0.68, 0.5] },
  function: { defaultSize: { width: 120, height: 120 }, label: [0.06, 0.58, 0.88, 0.38] },
  server: { defaultSize: { width: 140, height: 140 }, label: [0.08, 0.5, 0.84, 0.46] },
  gateway: { defaultSize: { width: 170, height: 120 }, label: [0.17, 0.44, 0.66, 0.52] },
  loadBalancer: { defaultSize: { width: 140, height: 130 }, label: [0.04, 0.64, 0.92, 0.34] },
  external: { defaultSize: { width: 190, height: 120 }, label: [0.2, 0.38, 0.6, 0.42] },
  web: { defaultSize: { width: 200, height: 140 }, label: [0.06, 0.26, 0.88, 0.68] },
  mobile: { defaultSize: { width: 120, height: 150 }, label: [0.04, 0.66, 0.92, 0.32] },
  user: { defaultSize: { width: 110, height: 140 }, label: [0.04, 0.66, 0.92, 0.32] },
}

/** Label area of a component inside its bounds. */
export function techLabelBox(kind: TechKind, b: Bounds, padding: number): Bounds {
  const [fx, fy, fw, fh] = TECH_LAYOUT[kind].label
  const width = Math.max(0, b.width * fw - padding * 2)
  const height = Math.max(0, b.height * fh - padding)
  return {
    x: b.x + b.width * fx + (b.width * fw - width) / 2,
    y: b.y + b.height * fy + (b.height * fh - height) / 2,
    width,
    height,
  }
}
