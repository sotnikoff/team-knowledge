import { beforeEach, describe, expect, it } from 'vitest'
import {
  AlreadyExistsError,
  NotFoundError,
  VersionConflictError,
  type EntityKind,
} from '@/domain/shared/errors'
import type { Versioned } from '@/domain/shared/versioned'

/** What every repository port has in common. */
interface VersionedRepository<T extends Versioned> {
  get(id: string): Promise<T>
  create(entity: T): Promise<T>
  save(entity: T): Promise<T>
  delete(id: string): Promise<void>
}

export interface ContractSubject<T extends Versioned, R extends VersionedRepository<T>> {
  readonly name: string
  readonly entity: EntityKind
  readonly make: () => R | Promise<R>
  /** Lists entities of a space (spaces themselves ignore `spaceId`). */
  readonly list: (repo: R, spaceId: string) => Promise<Versioned[]>
  /** A fresh entity, as produced by the domain factory. */
  readonly sample: (id: string, spaceId: string) => T
  /** Changes the entity's content (and `updatedAt`). */
  readonly modify: (entity: T, now: Date) => T
  /** Property present on full entities but absent from list summaries. */
  readonly heavyField?: string
  /** Whether `list` is scoped by space. */
  readonly scopedBySpace: boolean
}

/**
 * Behavioural contract every repository adapter must satisfy (Liskov: adapters
 * are interchangeable). It is the executable spec of these rules:
 *
 * - every method is async, even if the backing store is synchronous;
 * - returned objects are detached copies — mutating them never affects storage;
 * - `get`/`save`/`delete` of an unknown id reject with `NotFoundError`;
 * - `create` of an existing id rejects with `AlreadyExistsError`;
 * - `save` succeeds only if `entity.version` equals the stored version, else
 *   it rejects with `VersionConflictError`; on success the stored (and
 *   returned) entity has `version + 1`. Callers continue from the returned one;
 * - infrastructure failures reject with `StorageUnavailableError`.
 */
export function runVersionedRepositoryContract<T extends Versioned, R extends VersionedRepository<T>>(
  subject: ContractSubject<T, R>,
): void {
  describe(`repository contract: ${subject.name}`, () => {
    let repo: R
    const t1 = new Date('2026-01-02T00:00:00.000Z')
    const sample = (id = 'e1', spaceId = 's1') => subject.sample(id, spaceId)

    beforeEach(async () => {
      repo = await subject.make()
    })

    it('starts empty', async () => {
      expect(await subject.list(repo, 's1')).toEqual([])
    })

    it('creates and reads back an entity', async () => {
      expect(await repo.create(sample())).toEqual(sample())
      expect(await repo.get('e1')).toEqual(sample())
    })

    it('lists summaries', async () => {
      await repo.create(sample('e1'))
      await repo.create(sample('e2'))
      const list = await subject.list(repo, 's1')
      expect(list.map((e) => e.id).sort()).toEqual(['e1', 'e2'])
      expect(list[0]?.createdAt).toBeInstanceOf(Date)
      if (subject.heavyField) expect(list[0]).not.toHaveProperty(subject.heavyField)
    })

    if (subject.scopedBySpace) {
      it('lists only the entities of the given space', async () => {
        await repo.create(sample('e1', 's1'))
        await repo.create(sample('e2', 's2'))
        expect((await subject.list(repo, 's2')).map((e) => e.id)).toEqual(['e2'])
      })
    }

    it('rejects duplicate creation', async () => {
      await repo.create(sample())
      await expect(repo.create(sample())).rejects.toBeInstanceOf(AlreadyExistsError)
    })

    it('rejects unknown ids with NotFoundError of the right entity', async () => {
      await expect(repo.get('nope')).rejects.toMatchObject({ entity: subject.entity, id: 'nope' })
      await expect(repo.get('nope')).rejects.toBeInstanceOf(NotFoundError)
      await expect(repo.save(sample('nope'))).rejects.toBeInstanceOf(NotFoundError)
      await expect(repo.delete('nope')).rejects.toBeInstanceOf(NotFoundError)
    })

    it('saves changes and bumps the version', async () => {
      const created = await repo.create(sample())
      const modified = subject.modify(created, t1)
      const saved = await repo.save(modified)
      expect(saved).toEqual({ ...modified, version: created.version + 1 })
      expect(await repo.get('e1')).toEqual(saved)
      const [summary] = await subject.list(repo, 's1')
      expect(summary?.version).toBe(saved.version)
      expect(summary?.updatedAt).toEqual(t1)
    })

    it('rejects a save based on a stale version', async () => {
      const created = await repo.create(sample())
      await repo.save(created)
      await expect(repo.save(created)).rejects.toBeInstanceOf(VersionConflictError)
    })

    it('returns detached copies', async () => {
      const created = await repo.create(sample())
      ;(created as { version: number }).version = 999
      expect((await repo.get('e1')).version).toBe(1)
    })

    it('deletes an entity', async () => {
      await repo.create(sample())
      await repo.delete('e1')
      expect(await subject.list(repo, 's1')).toEqual([])
      await expect(repo.get('e1')).rejects.toBeInstanceOf(NotFoundError)
    })
  })
}
