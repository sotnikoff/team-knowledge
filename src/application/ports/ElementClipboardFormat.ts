import type { DiagramElement } from '@/domain/element/types'

/**
 * How copied board elements look on the system clipboard. Pasted text comes
 * from anywhere (other tabs, other apps), so `parse` must validate it.
 */
export interface ElementClipboardFormat {
  serialize(elements: readonly DiagramElement[]): string
  /** The elements, or null if the text is not elements of this app or is malformed. */
  parse(text: string): DiagramElement[] | null
}
