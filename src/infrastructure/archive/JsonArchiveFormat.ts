import type { ArchiveFormat } from '@/application/ports/ArchiveFormat'
import {
  ARCHIVE_KINDS,
  type Archive,
  type ArchiveKind,
  type ArchivedBoard,
  type ArchivedDocument,
  type ArchivedProject,
  type ArchivedSpace,
} from '@/domain/archive/Archive'
import { InvalidFileError } from '@/domain/shared/errors'
import { elementsFromDto, elementsToDto } from '../persistence/dto/boardMapper'
import { asObject, field, isArray, isNumber, isString, type Json } from '../persistence/dto/common'
import { parseRichText } from '../persistence/dto/documentMapper'

const FORMAT = 'team-knowledge'
const VERSION = 1

/**
 * Export file: `{ format, kind, version, exportedAt, <kind>: {...} }`.
 * Elements and rich text use the same wire format (and validation) as saved
 * boards and documents. The file comes from the user's disk: anything that
 * does not parse becomes `InvalidFileError('unreadable')`.
 */
export class JsonArchiveFormat implements ArchiveFormat {
  serialize(archive: Archive): string {
    const body = (() => {
      switch (archive.kind) {
        case 'project':
          return { project: projectToJson(archive.project) }
        case 'space':
          return { space: spaceToJson(archive.space) }
        case 'board':
          return { board: boardToJson(archive.board) }
        case 'document':
          return { document: archive.document }
      }
    })()
    return JSON.stringify(
      { format: FORMAT, kind: archive.kind, version: VERSION, exportedAt: new Date().toISOString(), ...body },
      null,
      2,
    )
  }

  parse(text: string): Archive {
    try {
      const obj = asObject(JSON.parse(text) as unknown, 'file')
      if (obj.format !== FORMAT) throw new Error('not an export of this app')
      const version = field(obj, 'version', isNumber, 'a number')
      if (version > VERSION) throw new Error(`unsupported version ${version}`)
      const kind = field(obj, 'kind', isArchiveKind, 'a known kind')
      switch (kind) {
        case 'project':
          return { kind, project: parseProject(obj.project) }
        case 'space':
          return { kind, space: parseSpace(obj.space) }
        case 'board':
          return { kind, board: parseBoard(obj.board) }
        case 'document':
          return { kind, document: parseDocument(obj.document) }
      }
    } catch (error) {
      throw new InvalidFileError('unreadable', { cause: error })
    }
  }
}

const isArchiveKind = (v: unknown): v is ArchiveKind => ARCHIVE_KINDS.includes(v as ArchiveKind)

// ---------- archive -> JSON ----------

function boardToJson(board: ArchivedBoard) {
  return { id: board.id, name: board.name, elements: elementsToDto(board.elements) }
}

function spaceToJson(space: ArchivedSpace) {
  return { id: space.id, name: space.name, boards: space.boards.map(boardToJson), documents: space.documents }
}

function projectToJson(project: ArchivedProject) {
  return { id: project.id, name: project.name, spaces: project.spaces.map(spaceToJson) }
}

// ---------- JSON -> archive (validating) ----------

function parseDocument(raw: unknown): ArchivedDocument {
  const obj: Json = asObject(raw, 'document')
  return {
    id: field(obj, 'id', isString, 'a string'),
    title: field(obj, 'title', isString, 'a string'),
    content: parseRichText(obj.content),
  }
}

function parseBoard(raw: unknown): ArchivedBoard {
  const obj = asObject(raw, 'board')
  return {
    id: field(obj, 'id', isString, 'a string'),
    name: field(obj, 'name', isString, 'a string'),
    elements: elementsFromDto(obj.elements),
  }
}

function parseSpace(raw: unknown): ArchivedSpace {
  const obj = asObject(raw, 'space')
  return {
    id: field(obj, 'id', isString, 'a string'),
    name: field(obj, 'name', isString, 'a string'),
    boards: field(obj, 'boards', isArray, 'an array').map(parseBoard),
    documents: field(obj, 'documents', isArray, 'an array').map(parseDocument),
  }
}

function parseProject(raw: unknown): ArchivedProject {
  const obj = asObject(raw, 'project')
  return {
    id: field(obj, 'id', isString, 'a string'),
    name: field(obj, 'name', isString, 'a string'),
    spaces: field(obj, 'spaces', isArray, 'an array').map(parseSpace),
  }
}
