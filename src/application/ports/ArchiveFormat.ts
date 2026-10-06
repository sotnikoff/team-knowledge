import type { Archive } from '@/domain/archive/Archive'

/**
 * How an archive is written to / read from an export file. The file comes
 * from the user's disk, so `parse` validates everything and throws
 * `InvalidFileError` when the text is not a usable export.
 */
export interface ArchiveFormat {
  serialize(archive: Archive): string
  parse(text: string): Archive
}
