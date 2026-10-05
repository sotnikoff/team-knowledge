import { create } from 'zustand'
import {
  createEditorModel,
  type EditorModel,
} from '@/application/editor/editorModel'
import type { DiagramElement } from '@/domain/element/types'

/**
 * Thin reactive wrapper around the pure `EditorModel`. All logic lives in
 * `application/editor`; this file only makes it observable for React.
 */
const useEditorStore = create<{ model: EditorModel }>(() => ({ model: createEditorModel([]) }))

export function resetEditor(elements: readonly DiagramElement[]): void {
  useEditorStore.setState({ model: createEditorModel(elements) })
}

export function getModel(): EditorModel {
  return useEditorStore.getState().model
}

/** Applies one or more pure transitions atomically. */
export function dispatch(...transitions: Array<(m: EditorModel) => EditorModel>): void {
  useEditorStore.setState((s) => {
    const model = transitions.reduce((m, t) => t(m), s.model)
    return model === s.model ? s : { model }
  })
}

/** Subscribe to a slice. Return primitives or stable references only. */
export function useEditor<T>(selector: (m: EditorModel) => T): T {
  return useEditorStore((s) => selector(s.model))
}

export function subscribeToModel(listener: (m: EditorModel) => void): () => void {
  return useEditorStore.subscribe((s) => listener(s.model))
}
