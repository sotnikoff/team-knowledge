import type { DocumentRepository } from '@/application/ports/DocumentRepository'
import {
  toDocumentSummary,
  type Document,
  type DocumentDraft,
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
import { LocalCollection, type LocalIdentity } from './LocalCollection'
import { DEFAULT_PREFIX } from './prefix'

export function documentCollection(store: KeyValueStore, prefix: string, identity: LocalIdentity) {
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
    identity,
  )
}

export class LocalStorageDocumentRepository implements DocumentRepository {
  private readonly documents: LocalCollection<Document, DocumentSummary>

  /** `identity` assigns ids/timestamps of created documents — a localStorage-only concern. */
  constructor(store: KeyValueStore, identity: LocalIdentity, prefix = DEFAULT_PREFIX) {
    this.documents = documentCollection(store, prefix, identity)
  }

  async list(spaceId: SpaceId): Promise<DocumentSummary[]> {
    return this.documents.list().filter((d) => d.spaceId === spaceId)
  }

  async get(id: DocumentId): Promise<Document> {
    return this.documents.get(id)
  }

  async create(draft: DocumentDraft): Promise<Document> {
    return this.documents.create(draft)
  }

  async save(doc: Document): Promise<Document> {
    return this.documents.save(doc)
  }

  async delete(id: DocumentId): Promise<void> {
    this.documents.delete(id)
  }
}
