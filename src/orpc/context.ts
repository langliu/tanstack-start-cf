import { ORPCError, os } from '@orpc/server'
import { getAdminSession } from '#/server/admin/auth'

export type ORPCContext = {
  headers?: Headers
}

export const publicProcedure = os.$context<ORPCContext>()

export const adminProcedure = publicProcedure.use(async ({ context, next }) => {
  const session = context.headers
    ? await getAdminSession(context.headers)
    : null

  if (!session) {
    throw new ORPCError('UNAUTHORIZED')
  }

  return next({
    context: {
      session,
    },
  })
})
