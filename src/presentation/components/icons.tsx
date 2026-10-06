import type { ReactNode, SVGProps } from 'react'

function Icon({ children, ...props }: SVGProps<SVGSVGElement> & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  )
}

const paths = {
  select: (
    <Icon>
      <path d="M6 3l12 9-5.5 1.2L15 20l-2.6 1-2.5-6.8L6 18z" />
    </Icon>
  ),
  hand: (
    <Icon>
      <path d="M8 13V5.5a1.5 1.5 0 013 0V12M11 11.5V4a1.5 1.5 0 013 0v7.5M14 11.5V6a1.5 1.5 0 013 0v8a7 7 0 01-7 7h-.5a6 6 0 01-4.6-2.2L4.3 16a1.6 1.6 0 012.4-2.1L8 15.2" />
    </Icon>
  ),
  rectangle: (
    <Icon>
      <rect x="4" y="5" width="16" height="14" rx="1.5" />
    </Icon>
  ),
  diamond: (
    <Icon>
      <path d="M12 3l9 9-9 9-9-9z" />
    </Icon>
  ),
  ellipse: (
    <Icon>
      <ellipse cx="12" cy="12" rx="9" ry="7.5" />
    </Icon>
  ),
  arrow: (
    <Icon>
      <path d="M5 19L19 5M10 5h9v9" />
    </Icon>
  ),
  line: (
    <Icon>
      <path d="M5 19L19 5" />
    </Icon>
  ),
  freedraw: (
    <Icon>
      <path d="M4 18c3-1 4-9 7-9s1 8 4 8 3-6 5-7" />
    </Icon>
  ),
  text: (
    <Icon>
      <path d="M5 6V4h14v2M12 4v16M9 20h6" />
    </Icon>
  ),
  undo: (
    <Icon>
      <path d="M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3" />
    </Icon>
  ),
  redo: (
    <Icon>
      <path d="M15 14l5-5-5-5M20 9H10a6 6 0 000 12h3" />
    </Icon>
  ),
  trash: (
    <Icon>
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
    </Icon>
  ),
  board: (
    <Icon>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 15l3-4 3 3 4-5" />
    </Icon>
  ),
  document: (
    <Icon>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4M9 12h6M9 16h6" />
    </Icon>
  ),
  plus: (
    <Icon>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  ),
  edit: (
    <Icon>
      <path d="M4 20h4L19 9l-4-4L4 16z" />
    </Icon>
  ),
  sidebar: (
    <Icon>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16" />
    </Icon>
  ),
  download: (
    <Icon>
      <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
    </Icon>
  ),
  upload: (
    <Icon>
      <path d="M12 15V4M7 9l5-5 5 5M5 20h14" />
    </Icon>
  ),
  back: (
    <Icon>
      <path d="M15 18l-6-6 6-6" />
    </Icon>
  ),
} as const

export type IconName = keyof typeof paths

export function AppIcon({ name }: { name: IconName }) {
  return paths[name]
}
