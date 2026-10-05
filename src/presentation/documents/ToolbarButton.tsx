import type { Editor } from '@tiptap/react'
import type { FormatAction } from './formatActions'

export function ToolbarButton(props: {
  editor: Editor
  action: FormatAction
  active?: boolean
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      title={props.action.label}
      aria-label={props.action.label}
      aria-pressed={props.action.isActive ? Boolean(props.active) : undefined}
      disabled={props.disabled}
      // Keep the editor selection while clicking.
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => props.action.run(props.editor)}
      className={`flex h-8 min-w-8 items-center justify-center rounded-md px-1.5 text-sm transition-colors disabled:opacity-30 ${
        props.active ? 'bg-indigo-100 text-indigo-700' : 'text-slate-700 hover:bg-slate-100'
      }`}
    >
      {props.action.icon}
    </button>
  )
}

export function ToolbarSeparator() {
  return <span className="mx-1 h-5 w-px shrink-0 bg-slate-200" />
}
