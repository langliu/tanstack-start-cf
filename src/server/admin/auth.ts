import '@tanstack/react-start/server-only'

import { auth } from '#/lib/auth'

export type AdminSession = NonNullable<
  Awaited<ReturnType<typeof auth.api.getSession>>
>

export async function getAdminSession(headers: Headers) {
  return auth.api.getSession({ headers })
}

export async function requireAdminSession(headers: Headers) {
  const session = await getAdminSession(headers)

  if (!session) {
    throw new Error('Unauthorized')
  }

  return session
}
