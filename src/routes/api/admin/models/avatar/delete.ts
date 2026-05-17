import { createFileRoute } from '@tanstack/react-router'
import * as z from 'zod'
import { requireAdminSession } from '#/server/admin/auth'
import { deleteImageObjects } from '#/server/admin/storage'

const DeleteAvatarSchema = z.object({
  objectKey: z
    .string()
    .trim()
    .min(1)
    .refine((key) => key.startsWith('model-avatars/'), {
      message: 'Only model avatar objects can be deleted',
    }),
})

async function deleteAvatar({ request }: { request: Request }) {
  try {
    await requireAdminSession(request.headers)

    const input = DeleteAvatarSchema.parse(await request.json())
    await deleteImageObjects([input.objectKey])

    return Response.json({ ok: true })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to delete avatar'
    const status = message === 'Unauthorized' ? 401 : 400

    return Response.json({ error: message }, { status })
  }
}

export const Route = createFileRoute('/api/admin/models/avatar/delete')({
  server: {
    handlers: {
      POST: deleteAvatar,
    },
  },
})
