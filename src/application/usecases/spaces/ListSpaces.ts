import type { Space } from '@/domain/space/Space'
import type { SpaceRepository } from '../../ports/SpaceRepository'
import { byRecentUpdate } from '../sorting'

export class ListSpaces {
  private readonly spaces: SpaceRepository

  constructor(spaces: SpaceRepository) {
    this.spaces = spaces
  }

  /** Most recently updated first. */
  async execute(): Promise<Space[]> {
    return (await this.spaces.list()).sort(byRecentUpdate)
  }
}
