import '@tanstack/react-start/server-only'

import { createOssPresignedRequest } from './oss'
import {
  extensionFromContentType,
  filenameStem,
  publicAssetPath,
  safeFilename,
} from './utils'

export const MAX_IMAGE_BYTES = 50 * 1024 * 1024

const UPLOAD_URL_EXPIRES_IN_SECONDS = 10 * 60

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

export type ImageFileDescriptor = {
  contentType: string
  name: string
  size: number
}

export type PresignedImageUpload = {
  contentType: string
  headers: Record<string, string>
  key: string
  publicPath: string
  size: number
  uploadUrl: string
}

export type PresignedUploadObjects = {
  original: PresignedImageUpload
  thumbnail: PresignedImageUpload | null
}

export function assertImageFile(file: File, label: string) {
  return assertImageDescriptor(
    { contentType: file.type, name: file.name, size: file.size },
    label,
  )
}

export function assertImageDescriptor(
  descriptor: ImageFileDescriptor,
  label: string,
) {
  if (!descriptor.contentType.startsWith('image/')) {
    throw new Error(`${label} must be an image file`)
  }

  if (descriptor.size <= 0) {
    throw new Error(`${label} is empty`)
  }

  if (descriptor.size > MAX_IMAGE_BYTES) {
    throw new Error(`${label} is larger than 50 MB`)
  }
}

export async function deleteImageObjects(keys: string[]) {
  const uniqueKeys = Array.from(new Set(keys.filter(Boolean)))

  for (let index = 0; index < uniqueKeys.length; index += 20) {
    await Promise.all(
      uniqueKeys.slice(index, index + 20).map(async (key) => {
        const request = await createOssPresignedRequest({
          expiresIn: 120,
          key,
          method: 'DELETE',
        })
        const response = await fetch(request.url, {
          headers: request.headers,
          method: 'DELETE',
        })

        if (!response.ok && response.status !== 404) {
          throw new Error(`Failed to delete image object: ${key}`)
        }
      }),
    )
  }
}

export async function createUploadObjectTargets(input: {
  imageId: string
  original: ImageFileDescriptor
  thumbnail?: ImageFileDescriptor | null
}) {
  assertImageDescriptor(input.original, 'Original image')

  if (input.thumbnail) {
    assertImageDescriptor(input.thumbnail, 'Thumbnail image')
  }

  const original = await createUploadObjectTarget({
    descriptor: input.original,
    key: createOriginalKey(input.imageId, input.original),
  })
  const thumbnail = input.thumbnail
    ? await createUploadObjectTarget({
        descriptor: input.thumbnail,
        key: createThumbnailKey(input.imageId, input.thumbnail),
      })
    : null

  return {
    original,
    thumbnail,
  } satisfies PresignedUploadObjects
}

export async function createModelAvatarUploadTarget(input: {
  file: ImageFileDescriptor
  modelId?: string
}) {
  assertImageDescriptor(input.file, 'Model avatar')

  return createUploadObjectTarget({
    descriptor: input.file,
    key: createModelAvatarKey(input.modelId ?? crypto.randomUUID(), input.file),
  })
}

export async function assertUploadedImageObject(input: {
  contentType?: string
  key: string
  label: string
  size?: number
}) {
  const request = await createOssPresignedRequest({
    expiresIn: 120,
    key: input.key,
    method: 'HEAD',
  })
  const response = await fetch(request.url, {
    headers: request.headers,
    method: 'HEAD',
  })

  if (!response.ok) {
    throw new Error(`${input.label} was not uploaded`)
  }

  const contentType = response.headers.get('content-type') ?? ''
  const size = Number(response.headers.get('content-length') ?? '0')

  if (!contentType.startsWith('image/')) {
    throw new Error(`${input.label} must be an image file`)
  }

  if (input.contentType && contentType !== input.contentType) {
    throw new Error(`${input.label} content type does not match`)
  }

  if (input.size !== undefined && size !== input.size) {
    throw new Error(`${input.label} size does not match`)
  }

  return {
    contentType,
    key: input.key,
    publicPath: publicAssetPath(input.key),
    size,
  } satisfies StoredImageObject
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
    key: createOriginalKey(input.imageId, imageFileDescriptor(input.original)),
    sha256: input.originalSha256 ?? true,
  })

  const thumbnail = input.thumbnail
    ? await storeImageObject({
        file: input.thumbnail,
        key: createThumbnailKey(
          input.imageId,
          imageFileDescriptor(input.thumbnail),
        ),
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
    key: createModelAvatarKey(
      input.modelId ?? crypto.randomUUID(),
      imageFileDescriptor(input.file),
    ),
  })
}

export async function checksumImageFile(file: File, label: string) {
  assertImageFile(file, label)
  return sha256Hex(await file.arrayBuffer())
}

async function createUploadObjectTarget(input: {
  descriptor: ImageFileDescriptor
  key: string
}) {
  const headers = uploadHeaders(input.descriptor.contentType)
  const request = await createOssPresignedRequest({
    expiresIn: UPLOAD_URL_EXPIRES_IN_SECONDS,
    headers,
    key: input.key,
    method: 'PUT',
  })

  return {
    contentType: input.descriptor.contentType,
    headers: request.headers,
    key: input.key,
    publicPath: publicAssetPath(input.key),
    size: input.descriptor.size,
    uploadUrl: request.url,
  } satisfies PresignedImageUpload
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
  const headers = uploadHeaders(input.file.type)
  const request = await createOssPresignedRequest({
    expiresIn: 120,
    headers,
    key: input.key,
    method: 'PUT',
  })
  const response = await fetch(request.url, {
    body: bytes,
    headers: request.headers,
    method: 'PUT',
  })

  if (!response.ok) {
    throw new Error(`Failed to store image object: ${input.key}`)
  }

  return {
    contentType: input.file.type,
    key: input.key,
    publicPath: publicAssetPath(input.key),
    sha256,
    size: input.file.size,
  } satisfies StoredImageObject
}

function uploadHeaders(contentType: string) {
  return {
    'content-type': contentType,
  }
}

function imageFileDescriptor(file: File) {
  return {
    contentType: file.type,
    name: file.name,
    size: file.size,
  } satisfies ImageFileDescriptor
}

function createOriginalKey(imageId: string, file: ImageFileDescriptor) {
  return `images/${imageId}/original/${safeFilename(file.name)}`
}

function createThumbnailKey(imageId: string, file: ImageFileDescriptor) {
  const stem = filenameStem(safeFilename(file.name))
  const extension = extensionFromContentType(file.contentType)
  return `images/${imageId}/thumbnail/${stem}.${extension}`
}

function createModelAvatarKey(modelId: string, file: ImageFileDescriptor) {
  const stem = filenameStem(safeFilename(file.name))
  const extension = extensionFromContentType(file.contentType)
  return `model-avatars/${modelId}/${stem}.${extension}`
}

async function sha256Hex(bytes: ArrayBuffer) {
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}
