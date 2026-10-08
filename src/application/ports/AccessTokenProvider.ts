/**
 * The current access token, as data adapters see it: HTTP adapters send it as
 * `Authorization: Bearer <token>`; the localStorage adapters accept it and
 * ignore it. `null` = not signed in.
 */
export interface AccessTokenProvider {
  current(): string | null
}
