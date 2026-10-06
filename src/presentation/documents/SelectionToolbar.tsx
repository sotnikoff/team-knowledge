import type { Editor } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import { formatActions, type FormatActionId } from './formatActions'
import { LinkButton } from './LinkButton'
import { ToolbarButton } from './ToolbarButton'
import { useFormatState } from './useFormatState'
import styles from './SelectionToolbar.module.css'

const inline: readonly FormatActionId[] = ['bold', 'italic', 'underline', 'strike', 'code']

/** Compact menu above selected text (the full set lives in `EditorToolbar`). */
export function SelectionToolbar({ editor }: { editor: Editor }) {
  const state = useFormatState(editor)
  return (
    <BubbleMenu
      editor={editor}
      // Not inside code blocks: inline marks make no sense there.
      shouldShow={({ editor: e, from, to }) => from !== to && !e.isActive('codeBlock')}
      className={styles.bubble}
    >
      {inline.map((id) => (
        <ToolbarButton key={id} editor={editor} action={formatActions[id]} active={state.active[id]} />
      ))}
      <LinkButton editor={editor} href={state.linkHref} />
    </BubbleMenu>
  )
}
