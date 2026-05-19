import '@tanstack/react-start/server-only'

import { env } from 'cloudflare:workers'
import {
  extensionFromContentType,
  filenameStem,
  publicAssetPath,
  safeFilename,
} from './utils'

const MAX_IMAGE_BYTES = 50 * 1024 * 1024

export type StoredImageObject = {
  contentType: string
  key: string
  publicPath: string
  sha256?: string
  size: number
}

export type StoredUploadObjects = {
  original: StoredImageObject
  thumbnail: StoredImageObject | null
}

export function assertImageFile(file: File, label: string) {
  if (!file.type.startsWith('image/')) {
    throw new Error(`${label} must be an image file`)
  }

  if (file.size <= 0) {
    throw new Error(`${label} is empty`)
  }

  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error(`${label} is larger than 50 MB`)
  }
}

export async function deleteImageObjects(keys: string[]) {
  const uniqueKeys = Array.from(new Set(keys.filter(Boolean)))

  for (let index = 0; index < uniqueKeys.length; index += 1000) {
    await env.IMAGE_BUCKET.delete(uniqueKeys.slice(index, index + 1000))
  }
}

export async function storeUploadObjects(input: {
  imageId: string
  original: File
  originalSha256?: string
  thumbnail?: File | null
}) {
  assertImageFile(input.original, 'Original image')

  if (input.thumbnail) {
    assertImageFile(input.thumbnail, 'Thumbnail image')
  }

  const original = await storeImageObject({
    file: input.original,
    key: createOriginalKey(input.imageId, input.original),
    sha256: input.originalSha256 ?? true,
  })

  const thumbnail = input.thumbnail
    ? await storeImageObject({
        file: input.thumbnail,
        key: createThumbnailKey(input.imageId, input.thumbnail),
      })
    : null

  return {
    original,
    thumbnail,
  } satisfies StoredUploadObjects
}

export async function storeModelAvatarObject(input: {
  file: File
  modelId?: string
}) {
  assertImageFile(input.file, 'Model avatar')

  return storeImageObject({
    file: input.file,
    key: createModelAvatarKey(input.modelId ?? crypto.randomUUID(), input.file),
  })
}

export async function checksumImageFile(file: File, label: string) {
  assertImageFile(file, label)
  return sha256Hex(await file.arrayBuffer())
}

async function storeImageObject(input: {
  file: File
  key: string
  sha256?: boolean | string
}) {
  const bytes = await input.file.arrayBuffer()
  const sha256 =
    typeof input.sha256 === 'string'
      ? input.sha256
      : input.sha256
        ? await sha256Hex(bytes)
        : undefined

  await env.IMAGE_BUCKET.put(input.key, bytes, {
    httpMetadata: {
      cacheControl: 'public, max-age=31536000, immutable',
      contentType: input.file.type,
    },
  })

  return {
    contentType: input.file.type,
    key: input.key,
    publicPath: publicAssetPath(input.key),
    sha256,
    size: input.file.size,
  } satisfies StoredImageObject
}

function createOriginalKey(imageId: string, file: File) {
  return `images/${imageId}/original/${safeFilename(file.name)}`
}

function createThumbnailKey(imageId: string, file: File) {
  const stem = filenameStem(safeFilename(file.name))
  const extension = extensionFromContentType(file.type)
  return `images/${imageId}/thumbnail/${stem}.${extension}`
}

function createModelAvatarKey(modelId: string, file: File) {
  const stem = filenameStem(safeFilename(file.name))
  const extension = extensionFromContentType(file.type)
  return `model-avatars/${modelId}/${stem}.${extension}`
}

async function sha256Hex(bytes: ArrayBuffer) {
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}
