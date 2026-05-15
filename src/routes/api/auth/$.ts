import { createFileRoute } from '@tanstack/react-router'
import { auth } from '#/lib/auth'

export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      GET: ({ request }) => handleAuth(request),
      POST: ({ request }) => handleAuth(request),
    },
  },
})

async function handleAuth(request: Request) {
  try {
    return await auth.handler(request)
  } catch (error) {
    console.error('[auth error]', error)
    throw error
  }
}
