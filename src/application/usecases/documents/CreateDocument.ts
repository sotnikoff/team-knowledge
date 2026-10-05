import { createDocument, type Document } from '@/domain/document/Document'
import type { SpaceId } from '@/domain/space/Space'
import type { Clock } from '../../ports/Clock'
import type { DocumentRepository } from '../../ports/DocumentRepository'
import type { IdGenerator } from '../../ports/IdGenerator'
import type { SpaceRepository } from '../../ports/SpaceRepository'

export class CreateDocument {
  private readonly documents: DocumentRepository
  private readonly spaces: SpaceRepository
  private readonly ids: IdGenerator
  private readonly clock: Clock

  constructor(documents: DocumentRepository, spaces: SpaceRepository, ids: IdGenerator, clock: Clock) {
    this.documents = documents
    this.spaces = spaces
    this.ids = ids
    this.clock = clock
  }

  async execute(input: { spaceId: SpaceId; title: string }): Promise<Document> {
    await this.spaces.get(input.spaceId) // NotFoundError if the space is gone
    const doc = createDocument({
      id: this.ids.next(),
      spaceId: input.spaceId,
      title: input.title,
      now: this.clock.now(),
    })
    return this.documents.create(doc)
  }
}
