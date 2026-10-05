import type { DocumentRepository } from '@/application/ports/DocumentRepository'
import {
  toDocumentSummary,
  type Document,
  type DocumentId,
  type DocumentSummary,
} from '@/domain/document/Document'
import type { SpaceId } from '@/domain/space/Space'
import {
  documentFromDto,
  documentSummaryFromDto,
  documentSummaryToDto,
  documentToDto,
} from '../dto/documentMapper'
import type { KeyValueStore } from './KeyValueStore'
import { LocalCollection } from './LocalCollection'
import { DEFAULT_PREFIX } from './prefix'

export function documentCollection(store: KeyValueStore, prefix: string) {
  return new LocalCollection<Document, DocumentSummary>(
    store,
    { index: `${prefix}:documents:index`, item: (id) => `${prefix}:document:${id}` },
    {
      entity: 'document',
      toDto: documentToDto,
      fromDto: documentFromDto,
      toIndexEntry: (doc) => documentSummaryToDto(toDocumentSummary(doc)),
      summaryFromDto: documentSummaryFromDto,
    },
  )
}

export class LocalStorageDocumentRepository implements DocumentRepository {
  private readonly documents: LocalCollection<Document, DocumentSummary>

  constructor(store: KeyValueStore, prefix = DEFAULT_PREFIX) {
    this.documents = documentCollection(store, prefix)
  }

  async list(spaceId: SpaceId): Promise<DocumentSummary[]> {
    return this.documents.list().filter((d) => d.spaceId === spaceId)
  }

  async get(id: DocumentId): Promise<Document> {
    return this.documents.get(id)
  }

  async create(doc: Document): Promise<Document> {
    return this.documents.create(doc)
  }

  async save(doc: Document): Promise<Document> {
    return this.documents.save(doc)
  }

  async delete(id: DocumentId): Promise<void> {
    this.documents.delete(id)
  }
}
