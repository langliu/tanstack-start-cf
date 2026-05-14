import { env } from 'cloudflare:workers'
import { drizzle } from 'drizzle-orm/d1'

import * as schema from './schema.ts'

export function createDb(binding: D1Database) {
  return drizzle(binding, { schema })
}

export const db = createDb(env.DB)

export type Db = ReturnType<typeof createDb>

export { schema }
