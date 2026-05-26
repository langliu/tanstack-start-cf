import { createFileRoute } from '@tanstack/react-router'
import * as z from 'zod'
import {
  createImageRecord,
  findImageIdByChecksumSha256,
} from '#/server/admin/assets'
import { requireAdminSession } from '#/server/admin/auth'
import {
  assertUploadedImageObject,
  deleteImageObjects,
} from '#/server/admin/storage'

const UploadedObjectSchema = z.object({
  contentType: z.string().trim().min(1),
  key: z.string().trim().min(1).max(1200),
  size: z.number().int().positive(),
})

const UploadMetadataSchema = z.object({
  albumId: z.string().trim().min(1).nullable().optional(),
  dominantColors: z.array(z.string().trim().min(1).max(40)).max(16).optional(),
  exif: z.record(z.string(), z.unknown()).optional(),
  height: z.number().int().positive().nullable().optional(),
  modelIds: z.array(z.string().trim().min(1)).max(100).optional(),
  note: z.string().max(4000).nullable().optional(),
  rating: z.number().int().min(0).max(5).optional(),
  sourceUrl: z.string().max(1000).nullable().optional(),
  tagIds: z.array(z.string().trim().min(1)).max(100).optional(),
  title: z.string().trim().min(1).max(120).optional(),
  width: z.number().int().positive().nullable().optional(),
})

const CompleteImageUploadSchema = z.object({
  checksumSha256: z
    .string()
    .trim()
    .regex(/^[a-f0-9]{64}$/i),
  imageId: z.string().trim().min(1),
  metadata: UploadMetadataSchema.optional(),
  original: UploadedObjectSchema,
  originalFilename: z.string().trim().min(1).max(500),
  thumbnail: UploadedObjectSchema.nullable().optional(),
})

async function complete({ request }: { request: Request }) {
  const uploadedKeys: string[] = []

  try {
    const session = await requireAdminSession(request.headers)
    const input = CompleteImageUploadSchema.parse(await request.json())
    const checksumSha256 = input.checksumSha256.trim().toLowerCase()

    assertUploadKey(input.original.key, `images/${input.imageId}/original/`)
    if (input.thumbnail) {
      assertUploadKey(input.thumbnail.key, `images/${input.imageId}/thumbnail/`)
    }

    uploadedKeys.push(input.original.key)
    if (input.thumbnail) {
      uploadedKeys.push(input.thumbnail.key)
    }

    const [original, thumbnail] = await Promise.all([
      assertUploadedImageObject({
        contentType: input.original.contentType,
        key: input.original.key,
        label: 'Original image',
        size: input.original.size,
      }),
      input.thumbnail
        ? assertUploadedImageObject({
            contentType: input.thumbnail.contentType,
            key: input.thumbnail.key,
            label: 'Thumbnail image',
            size: input.thumbnail.size,
          })
        : Promise.resolve(null),
    ])

    try {
      const image = await createImageRecord({
        ...(input.metadata ?? {}),
        id: input.imageId,
        originalFilename: input.originalFilename,
        storage: {
          original: {
            ...original,
            sha256: checksumSha256,
          },
          thumbnail,
        },
        uploadedByUserId: session.user.id,
      })

      return Response.json({ imageId: image.id }, { status: 201 })
    } catch (error) {
      await deleteImageObjects(uploadedKeys)

      if (isChecksumUniqueConstraintError(error)) {
        const duplicateImageId =
          await findImageIdByChecksumSha256(checksumSha256)
        if (duplicateImageId) {
          return Response.json(
            { duplicate: true, imageId: duplicateImageId },
            { status: 200 },
          )
        }
      }

      throw error
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to complete upload'
    const status = message === 'Unauthorized' ? 401 : 400

    return Response.json({ error: message }, { status })
  }
}

function assertUploadKey(key: string, prefix: string) {
  if (!key.startsWith(prefix)) {
    throw new Error('Invalid upload object key')
  }
}

function isChecksumUniqueConstraintError(error: unknown) {
  return (
    error instanceof Error &&
    /(?:UNIQUE constraint failed: images\.checksum_sha256|images_checksum_sha256_unique)/i.test(
      error.message,
    )
  )
}

export const Route = createFileRoute('/api/admin/images/upload/complete')({
  server: {
    handlers: {
      POST: complete,
    },
  },
})
