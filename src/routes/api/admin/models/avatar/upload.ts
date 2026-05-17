import { createFileRoute } from '@tanstack/react-router'
import * as z from 'zod'
import { requireAdminSession } from '#/server/admin/auth'
import { storeModelAvatarObject } from '#/server/admin/storage'

const AvatarMetadataSchema = z.object({
  modelId: z.string().trim().min(1).nullable().optional(),
})

async function upload({ request }: { request: Request }) {
  try {
    await requireAdminSession(request.headers)

    const formData = await request.formData()
    const avatar = getFile(formData, 'avatar')
    const metadata = parseMetadata(formData.get('metadata'))
    const storage = await storeModelAvatarObject({
      file: avatar,
      modelId: metadata.modelId ?? undefined,
    })

    return Response.json(
      {
        avatar: {
          objectKey: storage.key,
          publicUrl: storage.publicPath,
        },
      },
      { status: 201 },
    )
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to upload avatar'
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

function parseMetadata(value: FormDataEntryValue | null) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return {}
  }

  return AvatarMetadataSchema.parse(JSON.parse(value))
}

export const Route = createFileRoute('/api/admin/models/avatar/upload')({
  server: {
    handlers: {
      POST: upload,
    },
  },
})
