import type { IdGenerator } from '@/application/ports/IdGenerator'

export class CryptoIdGenerator implements IdGenerator {
  next(): string {
    return crypto.randomUUID()
  }
}
