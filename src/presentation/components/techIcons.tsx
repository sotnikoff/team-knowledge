import type { ReactNode } from 'react'
import type { TechKind } from '@/domain/element/tech'

function Glyph({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 32 32"
      width="28"
      height="28"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

/** Palette previews; they mirror the hand-drawn glyphs in `canvas/techRenderers.ts`. */
const techIcons: { readonly [K in TechKind]: ReactNode } = {
  service: (
    <Glyph>
      <path d="M10 6h12l6 10-6 10H10L4 16z" />
    </Glyph>
  ),
  database: (
    <Glyph>
      <ellipse cx="16" cy="8" rx="10" ry="3.5" />
      <path d="M6 8v16c0 2 4.5 3.5 10 3.5s10-1.5 10-3.5V8M6 14c0 2 4.5 3.5 10 3.5s10-1.5 10-3.5" />
    </Glyph>
  ),
  cache: (
    <Glyph>
      <ellipse cx="14" cy="8" rx="9" ry="3.2" />
      <path d="M5 8v16c0 1.8 4 3.2 9 3.2s9-1.4 9-3.2V8M27 11l-3 6h3l-3 6" />
    </Glyph>
  ),
  queue: (
    <Glyph>
      <path d="M7 9h18a3 7 0 010 14H7a3 7 0 010-14z" />
      <ellipse cx="25" cy="16" rx="3" ry="7" />
      <path d="M10 11v10M14 11v10" />
    </Glyph>
  ),
  storage: (
    <Glyph>
      <ellipse cx="16" cy="9" rx="11" ry="3.5" />
      <path d="M5 9l3 16c0 1.4 3.6 2.4 8 2.4s8-1 8-2.4l3-16" />
    </Glyph>
  ),
  function: (
    <Glyph>
      <rect x="6" y="6" width="20" height="20" rx="4" />
      <path d="M12 23l5-12M14.5 15.5l4 7.5M12 11h3" />
    </Glyph>
  ),
  server: (
    <Glyph>
      <rect x="6" y="5" width="20" height="22" rx="1" />
      <path d="M6 11h20M6 17h20M9 8h7M9 14h7" />
      <circle cx="22" cy="8" r="1" />
      <circle cx="22" cy="14" r="1" />
    </Glyph>
  ),
  gateway: (
    <Glyph>
      <path d="M4 6h24v4H4zM5 10h4v17H5zM23 10h4v17h-4zM11 15h10M18 12l3 3-3 3" />
    </Glyph>
  ),
  loadBalancer: (
    <Glyph>
      <circle cx="16" cy="16" r="10" />
      <path d="M9 16h6M15 16l7-5M15 16h7M15 16l7 5" />
    </Glyph>
  ),
  external: (
    <Glyph>
      <path d="M9 24a5 5 0 01-.5-10A7 7 0 0122 11.5 6 6 0 0124 24z" />
    </Glyph>
  ),
  web: (
    <Glyph>
      <rect x="4" y="6" width="24" height="20" rx="1" />
      <path d="M4 11h24" />
      <circle cx="7.5" cy="8.5" r=".6" />
      <circle cx="10" cy="8.5" r=".6" />
      <circle cx="12.5" cy="8.5" r=".6" />
    </Glyph>
  ),
  mobile: (
    <Glyph>
      <rect x="10" y="4" width="12" height="24" rx="2" />
      <path d="M14.5 7h3" />
      <circle cx="16" cy="24.5" r="1" />
    </Glyph>
  ),
  user: (
    <Glyph>
      <circle cx="16" cy="9" r="4" />
      <path d="M16 13v8M10 16h12M11 28l5-7 5 7" />
    </Glyph>
  ),
}

export function TechIcon({ kind }: { kind: TechKind }) {
  return techIcons[kind]
}
