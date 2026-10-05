import type { JSONContent } from '@tiptap/react'
import type { RichText } from '@/domain/document/richText'

/**
 * The only place that knows the domain's `RichText` and TipTap's `JSONContent`
 * are the same ProseMirror JSON. Swapping the editor library means rewriting
 * this file, not the domain or the storage format.
 */
export function toEditorContent(content: RichText): JSONContent {
  return content as JSONContent
}

export function fromEditorContent(json: JSONContent): RichText {
  if (json.type !== 'doc') throw new Error(`Expected a "doc" root, got "${json.type}"`)
  return json as RichText
}
