import type { SelectHTMLAttributes } from 'react'

/**
 * Native <select> with its own chevron: the browser arrow is hidden
 * (`appearance-none`) because it sits glued to the border and ignores padding.
 */
export function Select({ className = '', ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className={`relative inline-flex ${className}`}>
      <select
        {...props}
        className="h-full w-full cursor-pointer appearance-none rounded-md border border-slate-200 bg-surface py-0 pl-2.5 pr-8 text-sm text-slate-700 outline-none hover:border-slate-300 focus:border-indigo-400"
      />
      <svg
        viewBox="0 0 24 24"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </span>
  )
}
