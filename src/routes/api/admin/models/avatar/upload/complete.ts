import { createFileRoute } from '@tanstack/react-router'
import * as z from 'zod'
import { requireAdminSession } from '#/server/admin/auth'
import { assertUploadedImageObject } from '#/server/admin/storage'

const CompleteAvatarUploadSchema = z.object({
  avatar: z.object({
    contentType: z.string().trim().min(1),
    key: z
      .string()
      .trim()
      .min(1)
      .refine((key) => key.startsWith('model-avatars/'), {
        message: 'Only model avatar objects can be completed',
      }),
    size: z.number().int().positive(),
  }),
})

async function complete({ request }: { request: Request }) {
  try {
    await requireAdminSession(request.headers)

    const input = CompleteAvatarUploadSchema.parse(await request.json())
    const avatar = await assertUploadedImageObject({
      contentType: input.avatar.contentType,
      key: input.avatar.key,
      label: 'Model avatar',
      size: input.avatar.size,
    })

    return Response.json(
      {
        avatar: {
          objectKey: avatar.key,
          publicUrl: avatar.publicPath,
        },
      },
      { status: 201 },
    )
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to complete avatar upload'
    const status = message === 'Unauthorized' ? 401 : 400

    return Response.json({ error: message }, { status })
  }
}

export const Route = createFileRoute('/api/admin/models/avatar/upload/complete')({
  server: {
    handlers: {
      POST: complete,
    },
  },
})
