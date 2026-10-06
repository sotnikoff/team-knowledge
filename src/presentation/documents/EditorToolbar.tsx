import type { Editor } from '@tiptap/react'
import type { ReactNode } from 'react'
import { Select } from '../components/Select'
import { useI18n } from '../i18n/i18n'
import { CODE_LANGUAGES } from './extensions'
import { blockTypes, formatActions, type FormatActionId } from './formatActions'
import { LinkButton } from './LinkButton'
import { ToolbarButton, ToolbarSeparator } from './ToolbarButton'
import { useFormatState } from './useFormatState'

const groups: readonly (readonly FormatActionId[])[] = [
  ['bold', 'italic', 'underline', 'strike', 'code'],
  ['bulletList', 'orderedList', 'taskList', 'blockquote'],
]

/** Always-visible formatting toolbar, sticky at the top of the page. */
export function EditorToolbar(props: { editor: Editor; end?: ReactNode }) {
  const { editor } = props
  const state = useFormatState(editor)
  const { t } = useI18n()

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
      aria-label={t('format.toolbar')}
      className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-surface/95 px-4 py-2 backdrop-blur"
    >
      {button('undo')}
      {button('redo')}
      <ToolbarSeparator />
      <Select
        aria-label={t('format.textStyle')}
        value={state.block}
        onChange={(e) => blockTypes.find((b) => b.id === e.target.value)?.run(editor)}
        className="h-8 w-44"
      >
        {state.block === '' && <option value="">—</option>}
        {blockTypes.map((b) => (
          <option key={b.id} value={b.id}>
            {t(b.label)}
          </option>
        ))}
      </Select>
      <ToolbarSeparator />
      {groups[0]!.map(button)}
      <LinkButton editor={editor} href={state.linkHref} />
      <ToolbarSeparator />
      {groups[1]!.map(button)}
      <ToolbarSeparator />
      {button('codeBlock')}
      {state.codeLanguage !== undefined && (
        <Select
          aria-label={t('format.codeLanguage')}
          value={state.codeLanguage ?? ''}
          onChange={(e) =>
            editor
              .chain()
              .focus()
              .updateAttributes('codeBlock', { language: e.target.value || null })
              .run()
          }
          className="ml-1 h-8"
        >
          <option value="">{t('format.codeAuto')}</option>
          {CODE_LANGUAGES.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label ?? t('format.codePlain')}
            </option>
          ))}
        </Select>
      )}
      {button('horizontalRule')}
      {button('clear')}
      {props.end && <div className="ml-auto pl-2">{props.end}</div>}
    </div>
  )
}
