import { beforeEach, describe, expect, it } from 'vitest'
import { NotFoundError, VersionConflictError, type EntityKind } from '@/domain/shared/errors'
import type { Draft, Versioned } from '@/domain/shared/versioned'

/** What every repository port has in common. */
interface VersionedRepository<T extends Versioned> {
  get(id: string): Promise<T>
  create(draft: Draft<T>): Promise<T>
  save(entity: T): Promise<T>
  delete(id: string): Promise<void>
}

export interface ContractSubject<T extends Versioned, R extends VersionedRepository<T>> {
  readonly name: string
  readonly entity: EntityKind
  readonly make: () => R | Promise<R>
  /** Lists entities of a space (spaces themselves ignore `spaceId`). */
  readonly list: (repo: R, spaceId: string) => Promise<Versioned[]>
  /** A new entity, as produced by the domain factory (no identity yet). */
  readonly draft: (spaceId: string) => Draft<T>
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
 * - `create(draft)` gives the entity its identity: a new unique `id`,
 *   `version` 1 and `createdAt`/`updatedAt` — the caller never chooses them
 *   (a backend assigns them on POST and returns the created entity);
 * - returned objects are detached copies — mutating them never affects storage;
 * - `get`/`save`/`delete` of an unknown id reject with `NotFoundError`;
 * - `save` succeeds only if `entity.version` equals the stored version, else
 *   it rejects with `VersionConflictError`; on success the stored (and
 *   returned) entity has `version + 1`. Callers continue from the returned one;
 * - infrastructure failures reject with `StorageUnavailableError`.
 */
/** Pass the type arguments explicitly: `runVersionedRepositoryContract<Board, MyBoardRepo>(…)`. */
export function runVersionedRepositoryContract<T extends Versioned, R extends VersionedRepository<T>>(
  subject: ContractSubject<T, R>,
): void {
  describe(`repository contract: ${subject.name}`, () => {
    let repo: R
    const t1 = new Date('2030-01-02T00:00:00.000Z')
    const create = (spaceId = 's1') => repo.create(subject.draft(spaceId))

    beforeEach(async () => {
      repo = await subject.make()
    })

    it('starts empty', async () => {
      expect(await subject.list(repo, 's1')).toEqual([])
    })

    it('assigns the identity on create and reads the entity back', async () => {
      const created = await create()
      expect(created.id).toEqual(expect.any(String))
      expect(created.id).not.toBe('')
      expect(created.version).toBe(1)
      expect(created.createdAt).toBeInstanceOf(Date)
      expect(created.updatedAt).toEqual(created.createdAt)
      expect(created).toMatchObject(subject.draft('s1'))
      expect(await repo.get(created.id)).toEqual(created)
    })

    it('gives every created entity its own id', async () => {
      const a = await create()
      const b = await create()
      expect(a.id).not.toBe(b.id)
    })

    it('lists summaries', async () => {
      const a = await create()
      const b = await create()
      const list = await subject.list(repo, 's1')
      expect(list.map((e) => e.id).sort()).toEqual([a.id, b.id].sort())
      expect(list[0]?.createdAt).toBeInstanceOf(Date)
      if (subject.heavyField) expect(list[0]).not.toHaveProperty(subject.heavyField)
    })

    if (subject.scopedBySpace) {
      it('lists only the entities of the given space', async () => {
        await create('s1')
        const other = await create('s2')
        expect((await subject.list(repo, 's2')).map((e) => e.id)).toEqual([other.id])
      })
    }

    it('rejects unknown ids with NotFoundError of the right entity', async () => {
      const created = await create()
      await expect(repo.get('nope')).rejects.toMatchObject({ entity: subject.entity, id: 'nope' })
      await expect(repo.get('nope')).rejects.toBeInstanceOf(NotFoundError)
      await expect(repo.save({ ...created, id: 'nope' })).rejects.toBeInstanceOf(NotFoundError)
      await expect(repo.delete('nope')).rejects.toBeInstanceOf(NotFoundError)
    })

    it('saves changes and bumps the version', async () => {
      const created = await create()
      const modified = subject.modify(created, t1)
      const saved = await repo.save(modified)
      expect(saved).toEqual({ ...modified, version: created.version + 1 })
      expect(await repo.get(created.id)).toEqual(saved)
      const [summary] = await subject.list(repo, 's1')
      expect(summary?.version).toBe(saved.version)
      expect(summary?.updatedAt).toEqual(t1)
    })

    it('rejects a save based on a stale version', async () => {
      const created = await create()
      await repo.save(created)
      await expect(repo.save(created)).rejects.toBeInstanceOf(VersionConflictError)
    })

    it('returns detached copies', async () => {
      const created = await create()
      ;(created as { version: number }).version = 999
      expect((await repo.get(created.id)).version).toBe(1)
    })

    it('deletes an entity', async () => {
      const created = await create()
      await repo.delete(created.id)
      expect(await subject.list(repo, 's1')).toEqual([])
      await expect(repo.get(created.id)).rejects.toBeInstanceOf(NotFoundError)
    })
  })
}
