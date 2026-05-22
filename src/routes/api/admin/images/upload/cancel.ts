import { createFileRoute } from '@tanstack/react-router'
import * as z from 'zod'
import { requireAdminSession } from '#/server/admin/auth'
import { deleteImageObjects } from '#/server/admin/storage'

const CancelImageUploadSchema = z.object({
  keys: z
    .array(
      z
        .string()
        .trim()
        .min(1)
        .refine((key) => key.startsWith('images/'), {
          message: 'Only image upload objects can be cancelled',
        }),
    )
    .min(1)
    .max(20),
})

async function cancel({ request }: { request: Request }) {
  try {
    await requireAdminSession(request.headers)

    const input = CancelImageUploadSchema.parse(await request.json())
    await deleteImageObjects(input.keys)

    return Response.json({ ok: true })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to cancel upload'
    const status = message === 'Unauthorized' ? 401 : 400

    return Response.json({ error: message }, { status })
  }
}

export const Route = createFileRoute('/api/admin/images/upload/cancel')({
  server: {
    handlers: {
      POST: cancel,
    },
  },
})
