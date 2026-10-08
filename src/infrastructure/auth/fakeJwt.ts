/**
 * An unsigned JWT (`alg: none`) for the localStorage mode, which has no server
 * to sign tokens. It has the shape of a real one, so the rest of the app
 * handles it like the backend's token; only `LocalAuthGateway` reads it back.
 */
export interface FakeJwtClaims {
  readonly sub: string
  readonly email: string
  /** Seconds since the epoch, as in JWT. */
  readonly iat: number
  readonly exp: number
}

export function issueFakeJwt(claims: FakeJwtClaims): string {
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(claims)}.`
}

/** The claims of a token issued by `issueFakeJwt`, or `null` if it is not one. */
export function readFakeJwt(token: string): FakeJwtClaims | null {
  const [, payload] = token.split('.')
  if (!payload) return null
  try {
    const claims = JSON.parse(decode(payload)) as Partial<FakeJwtClaims> | null
    if (
      typeof claims?.sub !== 'string' ||
      typeof claims.email !== 'string' ||
      typeof claims.iat !== 'number' ||
      typeof claims.exp !== 'number'
    ) {
      return null
    }
    return { sub: claims.sub, email: claims.email, iat: claims.iat, exp: claims.exp }
  } catch {
    return null
  }
}

function encode(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value))
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function decode(base64url: string): string {
  const binary = atob(base64url.replace(/-/g, '+').replace(/_/g, '/'))
  return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)))
}
