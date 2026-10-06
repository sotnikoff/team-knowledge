import type { ArchivedBoard, ArchivedDocument, ArchivedSpace, Archive, ArchiveKind } from '@/domain/archive/Archive'
import type { SpaceId } from '@/domain/space/Space'
import type { BoardRepository } from '../../ports/BoardRepository'
import type { DocumentRepository } from '../../ports/DocumentRepository'
import type { ProjectRepository } from '../../ports/ProjectRepository'
import type { SpaceRepository } from '../../ports/SpaceRepository'

/** Collects a project, space, board or document with everything inside it. */
export class ExportArchive {
  private readonly projects: ProjectRepository
  private readonly spaces: SpaceRepository
  private readonly boards: BoardRepository
  private readonly documents: DocumentRepository

  constructor(
    projects: ProjectRepository,
    spaces: SpaceRepository,
    boards: BoardRepository,
    documents: DocumentRepository,
  ) {
    this.projects = projects
    this.spaces = spaces
    this.boards = boards
    this.documents = documents
  }

  async execute(target: { kind: ArchiveKind; id: string }): Promise<Archive> {
    switch (target.kind) {
      case 'project': {
        const project = await this.projects.get(target.id)
        const spaces = await this.spaces.list(project.id)
        return {
          kind: 'project',
          project: { id: project.id, name: project.name, spaces: await Promise.all(spaces.map((s) => this.space(s.id))) },
        }
      }
      case 'space':
        return { kind: 'space', space: await this.space(target.id) }
      case 'board':
        return { kind: 'board', board: await this.board(target.id) }
      case 'document':
        return { kind: 'document', document: await this.document(target.id) }
    }
  }

  private async space(id: SpaceId): Promise<ArchivedSpace> {
    const space = await this.spaces.get(id)
    const [boards, documents] = await Promise.all([this.boards.list(id), this.documents.list(id)])
    return {
      id: space.id,
      name: space.name,
      boards: await Promise.all(boards.map((b) => this.board(b.id))),
      documents: await Promise.all(documents.map((d) => this.document(d.id))),
    }
  }

  private async board(id: string): Promise<ArchivedBoard> {
    const board = await this.boards.get(id)
    return { id: board.id, name: board.name, elements: board.elements }
  }

  private async document(id: string): Promise<ArchivedDocument> {
    const doc = await this.documents.get(id)
    return { id: doc.id, title: doc.title, content: doc.content }
  }
}
