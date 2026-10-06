import type { ElementClipboardFormat } from '@/application/ports/ElementClipboardFormat'
import type { DiagramElement } from '@/domain/element/types'
import { elementsFromDto, elementsToDto } from '../persistence/dto/boardMapper'

/** Marks clipboard text as elements of this app (other JSON is ignored). */
const KIND = 'team-knowledge/elements'
const VERSION = 1

interface ClipboardDto {
  kind: typeof KIND
  version: number
  elements: unknown
}

/**
 * Clipboard text = JSON with the same element format as saved boards, so a
 * copy pastes into any board and the same validation guards it.
 */
export class JsonElementClipboardFormat implements ElementClipboardFormat {
  serialize(elements: readonly DiagramElement[]): string {
    const dto: ClipboardDto = { kind: KIND, version: VERSION, elements: elementsToDto(elements) }
    return JSON.stringify(dto)
  }

  parse(text: string): DiagramElement[] | null {
    let raw: unknown
    try {
      raw = JSON.parse(text)
    } catch {
      return null // plain text from elsewhere: not ours
    }
    const dto = raw as Partial<ClipboardDto> | null
    if (typeof dto !== 'object' || dto === null || dto.kind !== KIND) return null
    if (typeof dto.version !== 'number' || dto.version > VERSION) return null
    try {
      return elementsFromDto(dto.elements)
    } catch {
      return null // ours but malformed (edited by hand, newer app version…)
    }
  }
}
