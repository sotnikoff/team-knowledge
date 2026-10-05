import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * Enforces the hexagonal dependency rule (see CLAUDE.md):
 *
 *   domain         -> (nothing, no packages)
 *   application    -> domain                         (no packages)
 *   infrastructure -> application, domain, packages
 *   presentation   -> application, domain, packages; only the composition
 *                     root (presentation/app/container.ts) may touch infrastructure
 *
 * Test files may additionally import `vitest`.
 */
const SRC = dirname(fileURLToPath(import.meta.url))

type Layer = 'domain' | 'application' | 'infrastructure' | 'presentation'

const allowedLayers: Record<Layer, readonly Layer[]> = {
  domain: ['domain'],
  application: ['application', 'domain'],
  infrastructure: ['infrastructure', 'application', 'domain'],
  presentation: ['presentation', 'application', 'domain'],
}
const packagesAllowed: Record<Layer, boolean> = {
  domain: false,
  application: false,
  infrastructure: true,
  presentation: true,
}
const COMPOSITION_ROOT = 'presentation/app/container.ts'

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) return sourceFiles(full)
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : []
  })
}

function importsOf(file: string): string[] {
  const code = readFileSync(file, 'utf8')
  const pattern = /(?:import|export)\s[^'"]*?from\s+['"]([^'"]+)['"]|import\s+['"]([^'"]+)['"]/g
  return [...code.matchAll(pattern)].map((m) => (m[1] ?? m[2])!)
}

function layerOf(pathFromSrc: string): Layer | null {
  const top = pathFromSrc.split('/')[0]
  return top && top in allowedLayers ? (top as Layer) : null
}

function violations(): string[] {
  const problems: string[] = []
  for (const file of sourceFiles(SRC)) {
    const fromSrc = relative(SRC, file)
    const layer = layerOf(fromSrc)
    if (!layer) continue
    const isTest = /\.(test|contract)\.tsx?$/.test(file)

    for (const spec of importsOf(file)) {
      let target: string | null = null
      if (spec.startsWith('@/')) target = spec.slice(2)
      else if (spec.startsWith('.')) target = relative(SRC, resolve(dirname(file), spec))

      if (target === null) {
        const isVitest = isTest && spec === 'vitest'
        const isNode = isTest && spec.startsWith('node:')
        if (!packagesAllowed[layer] && !isVitest && !isNode) {
          problems.push(`${fromSrc}: ${layer} must not import package "${spec}"`)
        }
        continue
      }

      const targetLayer = layerOf(target)
      if (!targetLayer) continue
      const allowed =
        allowedLayers[layer].includes(targetLayer) ||
        (fromSrc === COMPOSITION_ROOT && targetLayer === 'infrastructure')
      if (!allowed) problems.push(`${fromSrc}: ${layer} must not import ${targetLayer} ("${spec}")`)
    }
  }
  return problems
}

describe('architecture', () => {
  it('respects the hexagonal dependency rule', () => {
    expect(violations()).toEqual([])
  })
})
