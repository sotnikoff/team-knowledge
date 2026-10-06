import { useEffect } from 'react'
import * as editor from '@/application/editor/editorModel'
import { useDependencies } from '../app/dependencies'
import { boardPointer } from './boardPointer'
import { dispatch, getModel } from './store'
import { isTyping } from './useEditorShortcuts'

/**
 * ⌘/Ctrl+C copies the selected elements to the system clipboard, ⌘/Ctrl+V
 * pastes them under the mouse (works across boards and tabs). Uses the
 * `copy`/`paste` events: no clipboard permission prompt, and text fields keep
 * their own copy/paste.
 */
export function useBoardClipboard(): void {
  const { clipboard, ids } = useDependencies()
  useEffect(() => {
    const onCopy = (e: ClipboardEvent) => {
      if (isTyping(e.target) || !e.clipboardData) return
      const selected = editor.selectedElements(getModel())
      if (selected.length === 0) return
      e.preventDefault()
      e.clipboardData.setData('text/plain', clipboard.serialize(selected))
    }
    const onPaste = (e: ClipboardEvent) => {
      if (isTyping(e.target) || !e.clipboardData) return
      const elements = clipboard.parse(e.clipboardData.getData('text/plain'))
      // Anything else on the clipboard (plain text, images) is left alone.
      if (!elements || elements.length === 0) return
      e.preventDefault()
      const at = boardPointer.pastePoint(getModel().viewport)
      dispatch((m) => editor.pasteElements(m, elements, at, () => ids.next()))
    }
    document.addEventListener('copy', onCopy)
    document.addEventListener('paste', onPaste)
    return () => {
      document.removeEventListener('copy', onCopy)
      document.removeEventListener('paste', onPaste)
    }
  }, [clipboard, ids])
}
