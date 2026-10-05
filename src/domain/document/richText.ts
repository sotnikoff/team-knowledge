/**
 * Formatted text as a neutral JSON tree. The shape is the ProseMirror/TipTap
 * document format, so the editor can load and emit it directly, but nothing in
 * the core depends on the editor library.
 */
export interface RichTextMark {
  readonly type: string
  readonly attrs?: Readonly<Record<string, unknown>>
}

export interface RichTextNode {
  readonly type: string
  readonly attrs?: Readonly<Record<string, unknown>>
  readonly content?: readonly RichTextNode[]
  readonly marks?: readonly RichTextMark[]
  readonly text?: string
}

export interface RichText extends RichTextNode {
  readonly type: 'doc'
}

export const emptyRichText: RichText = { type: 'doc', content: [{ type: 'paragraph' }] }
