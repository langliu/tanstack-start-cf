import '@tanstack/react-start/server-only'

import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { db, schema } from '#/db/index'

export const auth = betterAuth({
  baseURL: {
    allowedHosts: [
      'localhost:3000',
      ...(process.env.BETTER_AUTH_URL
        ? [new URL(process.env.BETTER_AUTH_URL).host]
        : []),
      '*.vercel.app',
    ],
  },
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [tanstackStartCookies()],
})
