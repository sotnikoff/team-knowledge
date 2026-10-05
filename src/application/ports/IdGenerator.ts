/** Ids are generated on the client, so a backend never has to invent them. */
export interface IdGenerator {
  next(): string
}
