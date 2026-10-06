/** A hand-drawn underline stroke (decorative). */
export function Scribble({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 140 10" fill="none" preserveAspectRatio="none" aria-hidden="true">
      <path
        d="M2 6.5C25 3 52 2.5 78 4.2S122 7.8 138 4"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  )
}
