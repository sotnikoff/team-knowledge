import { useEditorState, type Editor } from '@tiptap/react'
import { blockTypes, formatActions, type FormatActionId } from './formatActions'

export interface FormatState {
  readonly active: Readonly<Partial<Record<FormatActionId, boolean>>>
  readonly disabled: Readonly<Partial<Record<FormatActionId, boolean>>>
  /** Current block type id, or '' when the selection is in something else. */
  readonly block: string
  /** Language of the code block under the cursor; `undefined` outside one. */
  readonly codeLanguage: string | null | undefined
  readonly linkHref: string | undefined
}

function snapshot(editor: Editor): FormatState {
  const active: Partial<Record<FormatActionId, boolean>> = {}
  const disabled: Partial<Record<FormatActionId, boolean>> = {}
  for (const [id, action] of Object.entries(formatActions) as [FormatActionId, (typeof formatActions)[FormatActionId]][]) {
    if ('isActive' in action) active[id] = action.isActive(editor)
    if ('isDisabled' in action) disabled[id] = action.isDisabled(editor)
  }
  return {
    active,
    disabled,
    block: blockTypes.find((b) => b.isActive(editor))?.id ?? '',
    codeLanguage: editor.isActive('codeBlock')
      ? ((editor.getAttributes('codeBlock').language as string | null | undefined) ?? null)
      : undefined,
    linkHref: editor.getAttributes('link').href as string | undefined,
  }
}

/** Re-renders only when something visible in a toolbar actually changes. */
export function useFormatState(editor: Editor): FormatState {
  return useEditorState({
    editor,
    selector: ({ editor: e }) => snapshot(e),
    equalityFn: (a, b) => b !== null && JSON.stringify(a) === JSON.stringify(b),
  })
}
