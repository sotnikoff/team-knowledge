/**
 * Ids for things born on the client: elements inside a board (they are part of
 * the board's content, tools need their id at once). Entity ids (spaces,
 * boards, documents) are NOT generated here — the repository assigns them; the
 * localStorage adapter happens to use this port for that internally.
 */
export interface IdGenerator {
  next(): string
}
