import type { Editor } from '@tiptap/react'
import type { ReactNode } from 'react'
import { CODE_LANGUAGES } from './extensions'
import { blockTypes, formatActions, type FormatActionId } from './formatActions'
import { LinkButton } from './LinkButton'
import { ToolbarButton, ToolbarSeparator } from './ToolbarButton'
import { useFormatState } from './useFormatState'

const groups: readonly (readonly FormatActionId[])[] = [
  ['bold', 'italic', 'underline', 'strike', 'code'],
  ['bulletList', 'orderedList', 'taskList', 'blockquote'],
]

const selectClass =
  'h-8 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700 outline-none hover:border-slate-300 focus:border-indigo-400'

/** Always-visible formatting toolbar, sticky at the top of the page. */
export function EditorToolbar(props: { editor: Editor; end?: ReactNode }) {
  const { editor } = props
  const state = useFormatState(editor)

  const button = (id: FormatActionId) => (
    <ToolbarButton
      key={id}
      editor={editor}
      action={formatActions[id]}
      active={state.active[id]}
      disabled={state.disabled[id]}
    />
  )

  return (
    <div
      role="toolbar"
      aria-label="Форматирование"
      className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-white/95 px-4 py-2 backdrop-blur"
    >
      {button('undo')}
      {button('redo')}
      <ToolbarSeparator />
      <select
        aria-label="Стиль текста"
        value={state.block}
        onChange={(e) => blockTypes.find((b) => b.id === e.target.value)?.run(editor)}
        className={`${selectClass} w-40`}
      >
        {state.block === '' && <option value="">—</option>}
        {blockTypes.map((b) => (
          <option key={b.id} value={b.id}>
            {b.label}
          </option>
        ))}
      </select>
      <ToolbarSeparator />
      {groups[0]!.map(button)}
      <LinkButton editor={editor} href={state.linkHref} />
      <ToolbarSeparator />
      {groups[1]!.map(button)}
      <ToolbarSeparator />
      {button('codeBlock')}
      {state.codeLanguage !== undefined && (
        <select
          aria-label="Язык кода"
          value={state.codeLanguage ?? ''}
          onChange={(e) =>
            editor
              .chain()
              .focus()
              .updateAttributes('codeBlock', { language: e.target.value || null })
              .run()
          }
          className={`${selectClass} ml-1`}
        >
          <option value="">Авто</option>
          {CODE_LANGUAGES.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </select>
      )}
      {button('horizontalRule')}
      {button('clear')}
      {props.end && <div className="ml-auto pl-2">{props.end}</div>}
    </div>
  )
}
