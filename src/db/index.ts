import { env } from 'cloudflare:workers'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'

import * as schema from './schema.ts'

export function createDb(connectionString: string) {
  return drizzle(neon(connectionString), { schema })
}

function getDatabaseUrl() {
  const value = (env as unknown as Record<string, string | undefined>)
    .DATABASE_URL

  if (!value) {
    throw new Error('DATABASE_URL is required')
  }

  return value
}

export const db = createDb(getDatabaseUrl())

export type Db = ReturnType<typeof createDb>

export { schema }
