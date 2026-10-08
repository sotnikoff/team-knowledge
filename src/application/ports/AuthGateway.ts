import type { Session } from '@/domain/auth/Session'
import type { Profile, User } from '@/domain/auth/User'

/**
 * Passwordless sign-in, shaped like the future REST API:
 *
 * - `requestCode` -> `POST /auth/code { email }`: emails a one-time 6-digit code;
 * - `verifyCode`  -> `POST /auth/verify { email, code }`: signs in, creating the
 *   account on first sign-in (then `user.name === null`), returns a session;
 * - `updateProfile` -> `PUT /me`: the signed-in user's name and company
 *   (authorized by the current access token).
 *
 * Errors: `InvalidEmailError`, `InvalidCodeError`, `UnauthorizedError`,
 * `InvalidNameError`, `StorageUnavailableError`.
 */
export interface AuthGateway {
  requestCode(email: string): Promise<void>
  verifyCode(email: string, code: string): Promise<Session>
  updateProfile(profile: Profile): Promise<User>
}
