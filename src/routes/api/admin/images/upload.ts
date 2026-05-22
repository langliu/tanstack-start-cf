import { createFileRoute } from '@tanstack/react-router'

async function legacyUpload() {
  return Response.json(
    { error: 'Use direct OSS upload prepare/complete endpoints' },
    { status: 410 },
  )
}

export const Route = createFileRoute('/api/admin/images/upload')({
  server: {
    handlers: {
      POST: legacyUpload,
    },
  },
})
