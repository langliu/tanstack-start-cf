import { createFileRoute } from '@tanstack/react-router'
import * as z from 'zod'
import { findImageIdByChecksumSha256 } from '#/server/admin/assets'
import { requireAdminSession } from '#/server/admin/auth'
import { createUploadObjectTargets } from '#/server/admin/storage'
import { createId } from '#/server/admin/utils'

const FileDescriptorSchema = z.object({
  contentType: z.string().trim().min(1),
  name: z.string().trim().min(1).max(500),
  size: z.number().int().positive(),
})

const PrepareImageUploadSchema = z.object({
  checksumSha256: z
    .string()
    .trim()
    .regex(/^[a-f0-9]{64}$/i),
  original: FileDescriptorSchema,
  thumbnail: FileDescriptorSchema.nullable().optional(),
})

async function prepare({ request }: { request: Request }) {
  try {
    await requireAdminSession(request.headers)

    const input = PrepareImageUploadSchema.parse(await request.json())
    const checksumSha256 = input.checksumSha256.trim().toLowerCase()
    const existingImageId = await findImageIdByChecksumSha256(checksumSha256)

    if (existingImageId) {
      return Response.json(
        { duplicate: true, imageId: existingImageId },
        { status: 200 },
      )
    }

    const imageId = createId()
    const upload = await createUploadObjectTargets({
      imageId,
      original: input.original,
      thumbnail: input.thumbnail ?? null,
    })

    return Response.json(
      {
        duplicate: false,
        imageId,
        upload,
      },
      { status: 201 },
    )
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to prepare upload'
    const status = message === 'Unauthorized' ? 401 : 400

    return Response.json({ error: message }, { status })
  }
}

export const Route = createFileRoute('/api/admin/images/upload/prepare')({
  server: {
    handlers: {
      POST: prepare,
    },
  },
})
