import { createFileRoute } from '@tanstack/react-router'
import * as z from 'zod'
import { requireAdminSession } from '#/server/admin/auth'
import { createModelAvatarUploadTarget } from '#/server/admin/storage'

const FileDescriptorSchema = z.object({
  contentType: z.string().trim().min(1),
  name: z.string().trim().min(1).max(500),
  size: z.number().int().positive(),
})

const PrepareAvatarUploadSchema = z.object({
  avatar: FileDescriptorSchema,
  modelId: z.string().trim().min(1).nullable().optional(),
})

async function prepare({ request }: { request: Request }) {
  try {
    await requireAdminSession(request.headers)

    const input = PrepareAvatarUploadSchema.parse(await request.json())
    const upload = await createModelAvatarUploadTarget({
      file: input.avatar,
      modelId: input.modelId ?? undefined,
    })

    return Response.json({ upload }, { status: 201 })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to prepare avatar upload'
    const status = message === 'Unauthorized' ? 401 : 400

    return Response.json({ error: message }, { status })
  }
}

export const Route = createFileRoute('/api/admin/models/avatar/upload/prepare')({
  server: {
    handlers: {
      POST: prepare,
    },
  },
})
