import { normalizeEmail } from '@/domain/auth/email'
import type { AuthGateway } from '../../ports/AuthGateway'

/** Step 1 of sign-in / sign-up: send a one-time code to the email. */
export class RequestLoginCode {
  private readonly auth: AuthGateway

  constructor(auth: AuthGateway) {
    this.auth = auth
  }

  async execute(input: { email: string }): Promise<void> {
    return this.auth.requestCode(normalizeEmail(input.email))
  }
}
