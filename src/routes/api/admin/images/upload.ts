import { createFileRoute } from '@tanstack/react-router'
import * as z from 'zod'
import { createImageRecord } from '#/server/admin/assets'
import { requireAdminSession } from '#/server/admin/auth'
import { deleteImageObjects, storeUploadObjects } from '#/server/admin/storage'
import { createId } from '#/server/admin/utils'

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

async function upload({ request }: { request: Request }) {
  try {
    const session = await requireAdminSession(request.headers)
    const formData = await request.formData()
    const original = getFile(formData, 'original')
    const thumbnail = getOptionalFile(formData, 'thumbnail')
    const metadata = parseMetadata(formData.get('metadata'))
    const imageId = createId()
    const storage = await storeUploadObjects({
      imageId,
      original,
      thumbnail,
    })

    try {
      const image = await createImageRecord({
        ...metadata,
        id: imageId,
        originalFilename: original.name,
        storage,
        uploadedByUserId: session.user.id,
      })

      return Response.json({ image }, { status: 201 })
    } catch (error) {
      await deleteImageObjects([
        storage.original.key,
        ...(storage.thumbnail ? [storage.thumbnail.key] : []),
      ])
      throw error
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to upload image'
    const status = message === 'Unauthorized' ? 401 : 400

    return Response.json({ error: message }, { status })
  }
}

function getFile(formData: FormData, name: string) {
  const value = formData.get(name)

  if (!(value instanceof File)) {
    throw new Error(`${name} file is required`)
  }

  return value
}

function getOptionalFile(formData: FormData, name: string) {
  const value = formData.get(name)

  if (value === null || value === '') {
    return null
  }

  if (!(value instanceof File)) {
    throw new Error(`${name} must be a file`)
  }

  return value
}

function parseMetadata(value: FormDataEntryValue | null) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return {}
  }

  return UploadMetadataSchema.parse(JSON.parse(value))
}

export const Route = createFileRoute('/api/admin/images/upload')({
  server: {
    handlers: {
      POST: upload,
    },
  },
})
