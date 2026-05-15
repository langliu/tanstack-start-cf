import '@tanstack/react-start/server-only'

import {
  and,
  asc,
  count,
  desc,
  eq,
  exists,
  inArray,
  isNull,
  like,
  notExists,
  or,
} from 'drizzle-orm'
import { db } from '#/db/index'
import {
  agencies,
  albums,
  imageModels,
  images,
  imageTags,
  models,
  tags,
} from '#/db/schema'
import { deleteImageObjects, type StoredUploadObjects } from './storage'
import {
  createId,
  filenameStem,
  makeSlug,
  now,
  nullableText,
  publicAssetPath,
  uniqueValues,
} from './utils'

type Agency = typeof agencies.$inferSelect
type Album = typeof albums.$inferSelect
type Image = typeof images.$inferSelect
type Model = typeof models.$inferSelect
type Tag = typeof tags.$inferSelect

type JoinedImageRow = {
  agency: Agency | null
  album: Album | null
  image: Image
}

export type CreateImageRecordInput = {
  albumId?: null | string
  dominantColors?: string[]
  exif?: Record<string, unknown>
  height?: null | number
  id?: string
  modelIds?: string[]
  note?: null | string
  originalFilename: string
  rating?: number
  sourceUrl?: null | string
  storage: StoredUploadObjects
  tagIds?: string[]
  title?: string
  uploadedByUserId?: null | string
  width?: null | number
}

export type ListImagesInput = {
  agencyId?: string
  albumId?: string
  filter?: 'all' | 'unalbumed' | 'untagged'
  limit?: number
  modelId?: string
  offset?: number
  q?: string
  tagId?: string
}

export async function listLibraryStats() {
  const [total] = await db.select({ value: count() }).from(images)
  const [untagged] = await db
    .select({ value: count() })
    .from(images)
    .where(
      notExists(
        db
          .select({ imageId: imageTags.imageId })
          .from(imageTags)
          .where(eq(imageTags.imageId, images.id)),
      ),
    )
  const [unalbumed] = await db
    .select({ value: count() })
    .from(images)
    .where(isNull(images.albumId))

  return {
    total: total?.value ?? 0,
    unalbumed: unalbumed?.value ?? 0,
    untagged: untagged?.value ?? 0,
  }
}

export async function listAgencies(input: { q?: string } = {}) {
  const q = input.q?.trim()

  return db.query.agencies.findMany({
    orderBy: [asc(agencies.name)],
    where: q ? like(agencies.name, `%${q}%`) : undefined,
  })
}

export async function createAgency(input: {
  description?: null | string
  name: string
  notes?: null | string
  websiteUrl?: null | string
}) {
  const id = createId()
  const date = now()
  const [agency] = await db
    .insert(agencies)
    .values({
      createdAt: date,
      description: nullableText(input.description),
      id,
      name: input.name.trim(),
      notes: nullableText(input.notes),
      slug: makeSlug(input.name, id),
      updatedAt: date,
      websiteUrl: nullableText(input.websiteUrl),
    })
    .returning()

  return agency
}

export async function updateAgency(input: {
  description?: null | string
  id: string
  name?: string
  notes?: null | string
  websiteUrl?: null | string
}) {
  const values: Partial<typeof agencies.$inferInsert> = {
    updatedAt: now(),
  }

  if (input.name !== undefined) {
    values.name = input.name.trim()
    values.slug = makeSlug(input.name, input.id)
  }
  if (input.description !== undefined) {
    values.description = nullableText(input.description)
  }
  if (input.notes !== undefined) {
    values.notes = nullableText(input.notes)
  }
  if (input.websiteUrl !== undefined) {
    values.websiteUrl = nullableText(input.websiteUrl)
  }

  const [agency] = await db
    .update(agencies)
    .set(values)
    .where(eq(agencies.id, input.id))
    .returning()

  return agency ?? null
}

export async function deleteAgency(id: string) {
  await db.delete(agencies).where(eq(agencies.id, id))
  return { id }
}

export async function listAlbums(
  input: { agencyId?: string; q?: string } = {},
) {
  const conditions = []
  const q = input.q?.trim()

  if (input.agencyId) {
    conditions.push(eq(albums.agencyId, input.agencyId))
  }
  if (q) {
    conditions.push(like(albums.name, `%${q}%`))
  }

  return db.query.albums.findMany({
    orderBy: [asc(albums.sortOrder), asc(albums.name)],
    where: conditions.length > 0 ? and(...conditions) : undefined,
    with: {
      agency: true,
    },
  })
}

export async function createAlbum(input: {
  agencyId?: null | string
  description?: null | string
  name: string
  notes?: null | string
  sortOrder?: number
}) {
  const id = createId()
  const date = now()
  const [album] = await db
    .insert(albums)
    .values({
      agencyId: input.agencyId ?? null,
      createdAt: date,
      description: nullableText(input.description),
      id,
      name: input.name.trim(),
      notes: nullableText(input.notes),
      slug: makeSlug(input.name, id),
      sortOrder: input.sortOrder ?? 0,
      updatedAt: date,
    })
    .returning()

  return album
}

export async function updateAlbum(input: {
  agencyId?: null | string
  description?: null | string
  id: string
  name?: string
  notes?: null | string
  sortOrder?: number
}) {
  const values: Partial<typeof albums.$inferInsert> = {
    updatedAt: now(),
  }

  if (input.name !== undefined) {
    values.name = input.name.trim()
    values.slug = makeSlug(input.name, input.id)
  }
  if (input.agencyId !== undefined) {
    values.agencyId = input.agencyId
  }
  if (input.description !== undefined) {
    values.description = nullableText(input.description)
  }
  if (input.notes !== undefined) {
    values.notes = nullableText(input.notes)
  }
  if (input.sortOrder !== undefined) {
    values.sortOrder = input.sortOrder
  }

  const [album] = await db
    .update(albums)
    .set(values)
    .where(eq(albums.id, input.id))
    .returning()

  return album ?? null
}

export async function deleteAlbum(id: string) {
  await db.delete(albums).where(eq(albums.id, id))
  return { id }
}

export async function listTags(input: { q?: string } = {}) {
  const q = input.q?.trim()

  return db.query.tags.findMany({
    orderBy: [asc(tags.name)],
    where: q ? like(tags.name, `%${q}%`) : undefined,
  })
}

export async function createTag(input: {
  color?: null | string
  description?: null | string
  name: string
}) {
  const id = createId()
  const date = now()
  const [tag] = await db
    .insert(tags)
    .values({
      color: nullableText(input.color),
      createdAt: date,
      description: nullableText(input.description),
      id,
      name: input.name.trim(),
      slug: makeSlug(input.name, id),
      updatedAt: date,
    })
    .returning()

  return tag
}

export async function updateTag(input: {
  color?: null | string
  description?: null | string
  id: string
  name?: string
}) {
  const values: Partial<typeof tags.$inferInsert> = {
    updatedAt: now(),
  }

  if (input.name !== undefined) {
    values.name = input.name.trim()
    values.slug = makeSlug(input.name, input.id)
  }
  if (input.color !== undefined) {
    values.color = nullableText(input.color)
  }
  if (input.description !== undefined) {
    values.description = nullableText(input.description)
  }

  const [tag] = await db
    .update(tags)
    .set(values)
    .where(eq(tags.id, input.id))
    .returning()

  return tag ?? null
}

export async function deleteTag(id: string) {
  await db.delete(tags).where(eq(tags.id, id))
  return { id }
}

export async function listModels(input: { q?: string } = {}) {
  const q = input.q?.trim()

  return db.query.models.findMany({
    orderBy: [asc(models.name)],
    where: q
      ? or(like(models.name, `%${q}%`), like(models.alias, `%${q}%`))
      : undefined,
  })
}

export async function createModel(input: {
  alias?: null | string
  avatarObjectKey?: null | string
  bio?: null | string
  instagramUrl?: null | string
  name: string
  weiboUrl?: null | string
  xUrl?: null | string
}) {
  const id = createId()
  const date = now()
  const [model] = await db
    .insert(models)
    .values({
      alias: nullableText(input.alias),
      avatarObjectKey: nullableText(input.avatarObjectKey),
      bio: nullableText(input.bio),
      createdAt: date,
      id,
      instagramUrl: nullableText(input.instagramUrl),
      name: input.name.trim(),
      updatedAt: date,
      weiboUrl: nullableText(input.weiboUrl),
      xUrl: nullableText(input.xUrl),
    })
    .returning()

  return model
}

export async function updateModel(input: {
  alias?: null | string
  avatarImageId?: null | string
  avatarObjectKey?: null | string
  bio?: null | string
  id: string
  instagramUrl?: null | string
  name?: string
  weiboUrl?: null | string
  xUrl?: null | string
}) {
  const values: Partial<typeof models.$inferInsert> = {
    updatedAt: now(),
  }

  if (input.name !== undefined) {
    values.name = input.name.trim()
  }
  if (input.alias !== undefined) {
    values.alias = nullableText(input.alias)
  }
  if (input.avatarImageId !== undefined) {
    values.avatarImageId = nullableText(input.avatarImageId)
  }
  if (input.avatarObjectKey !== undefined) {
    values.avatarObjectKey = nullableText(input.avatarObjectKey)
  }
  if (input.bio !== undefined) {
    values.bio = nullableText(input.bio)
  }
  if (input.instagramUrl !== undefined) {
    values.instagramUrl = nullableText(input.instagramUrl)
  }
  if (input.weiboUrl !== undefined) {
    values.weiboUrl = nullableText(input.weiboUrl)
  }
  if (input.xUrl !== undefined) {
    values.xUrl = nullableText(input.xUrl)
  }

  const [model] = await db
    .update(models)
    .set(values)
    .where(eq(models.id, input.id))
    .returning()

  return model ?? null
}

export async function deleteModel(id: string) {
  await db.delete(models).where(eq(models.id, id))
  return { id }
}

export async function listImages(input: ListImagesInput = {}) {
  const limit = Math.min(input.limit ?? 60, 120)
  const offset = input.offset ?? 0
  const conditions = buildImageConditions(input)

  const rows = await db
    .select({
      agency: agencies,
      album: albums,
      image: images,
    })
    .from(images)
    .leftJoin(albums, eq(images.albumId, albums.id))
    .leftJoin(agencies, eq(albums.agencyId, agencies.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(images.uploadedAt), desc(images.id))
    .limit(limit)
    .offset(offset)

  const [total] = await db
    .select({ value: count() })
    .from(images)
    .leftJoin(albums, eq(images.albumId, albums.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)

  const relationMaps = await fetchImageRelationMaps(
    rows.map((row) => row.image.id),
  )

  return {
    items: rows.map((row) => formatImage(row, relationMaps)),
    limit,
    offset,
    total: total?.value ?? 0,
  }
}

export async function getImageDetail(id: string) {
  const [row] = await db
    .select({
      agency: agencies,
      album: albums,
      image: images,
    })
    .from(images)
    .leftJoin(albums, eq(images.albumId, albums.id))
    .leftJoin(agencies, eq(albums.agencyId, agencies.id))
    .where(eq(images.id, id))
    .limit(1)

  if (!row) {
    return null
  }

  const relationMaps = await fetchImageRelationMaps([id])
  return formatImage(row, relationMaps)
}

export async function createImageRecord(input: CreateImageRecordInput) {
  const id = input.id ?? createId()
  const date = now()
  const title = input.title?.trim() || filenameStem(input.originalFilename)
  const originalFormat = input.storage.original.contentType.split('/')[1] ?? ''

  await db.insert(images).values({
    albumId: input.albumId ?? null,
    checksumSha256: input.storage.original.sha256 ?? null,
    contentType: input.storage.original.contentType,
    createdAt: date,
    dominantColors: input.dominantColors ?? null,
    exif: input.exif ?? null,
    filename: input.originalFilename,
    fileSize: input.storage.original.size,
    format: originalFormat.toUpperCase(),
    height: input.height ?? null,
    id,
    note: nullableText(input.note),
    originalFilename: input.originalFilename,
    originalKey: input.storage.original.key,
    processingStatus: input.storage.thumbnail ? 'ready' : 'thumbnail_pending',
    rating: input.rating ?? 0,
    sourceUrl: nullableText(input.sourceUrl),
    thumbnailContentType: input.storage.thumbnail?.contentType ?? null,
    thumbnailKey: input.storage.thumbnail?.key ?? null,
    thumbnailSize: input.storage.thumbnail?.size ?? null,
    title,
    updatedAt: date,
    uploadedAt: date,
    uploadedByUserId: input.uploadedByUserId ?? null,
    width: input.width ?? null,
  })

  await replaceImageTags(id, input.tagIds ?? [])
  await replaceImageModels(id, input.modelIds ?? [])

  const detail = await getImageDetail(id)
  if (!detail) {
    throw new Error('Failed to load uploaded image')
  }

  return detail
}

export async function updateImage(input: {
  albumId?: null | string
  dominantColors?: string[]
  exif?: Record<string, unknown>
  height?: null | number
  id: string
  modelIds?: string[]
  note?: null | string
  rating?: number
  sourceUrl?: null | string
  tagIds?: string[]
  title?: string
  width?: null | number
}) {
  const values: Partial<typeof images.$inferInsert> = {
    updatedAt: now(),
  }

  if (input.albumId !== undefined) {
    values.albumId = input.albumId
  }
  if (input.dominantColors !== undefined) {
    values.dominantColors = input.dominantColors
  }
  if (input.exif !== undefined) {
    values.exif = input.exif
  }
  if (input.height !== undefined) {
    values.height = input.height
  }
  if (input.note !== undefined) {
    values.note = nullableText(input.note)
  }
  if (input.rating !== undefined) {
    values.rating = input.rating
  }
  if (input.sourceUrl !== undefined) {
    values.sourceUrl = nullableText(input.sourceUrl)
  }
  if (input.title !== undefined) {
    values.title = input.title.trim()
  }
  if (input.width !== undefined) {
    values.width = input.width
  }

  const [updated] = await db
    .update(images)
    .set(values)
    .where(eq(images.id, input.id))
    .returning({ id: images.id })

  if (!updated) {
    return null
  }

  if (input.tagIds !== undefined) {
    await replaceImageTags(input.id, input.tagIds)
  }
  if (input.modelIds !== undefined) {
    await replaceImageModels(input.id, input.modelIds)
  }

  return getImageDetail(input.id)
}

export async function batchAddTags(input: {
  imageIds: string[]
  tagIds: string[]
}) {
  const imageIds = uniqueValues(input.imageIds)
  const tagIds = uniqueValues(input.tagIds)
  const date = now()

  if (imageIds.length === 0 || tagIds.length === 0) {
    return { imageCount: imageIds.length, tagCount: tagIds.length }
  }

  await db
    .insert(imageTags)
    .values(
      imageIds.flatMap((imageId) =>
        tagIds.map((tagId) => ({ createdAt: date, imageId, tagId })),
      ),
    )
    .onConflictDoNothing()

  return { imageCount: imageIds.length, tagCount: tagIds.length }
}

export async function batchAssignAlbum(input: {
  albumId: null | string
  imageIds: string[]
}) {
  const imageIds = uniqueValues(input.imageIds)

  if (imageIds.length === 0) {
    return { imageCount: 0 }
  }

  await db
    .update(images)
    .set({ albumId: input.albumId, updatedAt: now() })
    .where(inArray(images.id, imageIds))

  return { imageCount: imageIds.length }
}

export async function batchAddModels(input: {
  imageIds: string[]
  modelIds: string[]
}) {
  const imageIds = uniqueValues(input.imageIds)
  const modelIds = uniqueValues(input.modelIds)
  const date = now()

  if (imageIds.length === 0 || modelIds.length === 0) {
    return { imageCount: imageIds.length, modelCount: modelIds.length }
  }

  await db
    .insert(imageModels)
    .values(
      imageIds.flatMap((imageId) =>
        modelIds.map((modelId) => ({ createdAt: date, imageId, modelId })),
      ),
    )
    .onConflictDoNothing()

  return { imageCount: imageIds.length, modelCount: modelIds.length }
}

export async function deleteImages(input: { imageIds: string[] }) {
  const imageIds = uniqueValues(input.imageIds)

  if (imageIds.length === 0) {
    return { imageCount: 0 }
  }

  const rows = await db
    .select({
      originalKey: images.originalKey,
      thumbnailKey: images.thumbnailKey,
    })
    .from(images)
    .where(inArray(images.id, imageIds))

  await deleteImageObjects(
    rows.flatMap((row) =>
      row.thumbnailKey
        ? [row.originalKey, row.thumbnailKey]
        : [row.originalKey],
    ),
  )

  await db.delete(images).where(inArray(images.id, imageIds))

  return { imageCount: rows.length }
}

function buildImageConditions(input: ListImagesInput) {
  const conditions = []
  const q = input.q?.trim()

  if (q) {
    const term = `%${q}%`
    const search = or(
      like(images.title, term),
      like(images.originalFilename, term),
      like(images.sourceUrl, term),
      like(images.note, term),
    )
    if (search) {
      conditions.push(search)
    }
  }

  if (input.albumId) {
    conditions.push(eq(images.albumId, input.albumId))
  }
  if (input.agencyId) {
    conditions.push(eq(albums.agencyId, input.agencyId))
  }
  if (input.tagId) {
    conditions.push(
      exists(
        db
          .select({ tagId: imageTags.tagId })
          .from(imageTags)
          .where(
            and(
              eq(imageTags.imageId, images.id),
              eq(imageTags.tagId, input.tagId),
            ),
          ),
      ),
    )
  }
  if (input.modelId) {
    conditions.push(
      exists(
        db
          .select({ modelId: imageModels.modelId })
          .from(imageModels)
          .where(
            and(
              eq(imageModels.imageId, images.id),
              eq(imageModels.modelId, input.modelId),
            ),
          ),
      ),
    )
  }
  if (input.filter === 'untagged') {
    conditions.push(
      notExists(
        db
          .select({ imageId: imageTags.imageId })
          .from(imageTags)
          .where(eq(imageTags.imageId, images.id)),
      ),
    )
  }
  if (input.filter === 'unalbumed') {
    conditions.push(isNull(images.albumId))
  }

  return conditions
}

async function replaceImageTags(imageId: string, tagIds: string[]) {
  const uniqueTagIds = uniqueValues(tagIds)

  await db.delete(imageTags).where(eq(imageTags.imageId, imageId))

  if (uniqueTagIds.length === 0) {
    return
  }

  const date = now()
  await db.insert(imageTags).values(
    uniqueTagIds.map((tagId) => ({
      createdAt: date,
      imageId,
      tagId,
    })),
  )
}

async function replaceImageModels(imageId: string, modelIds: string[]) {
  const uniqueModelIds = uniqueValues(modelIds)

  await db.delete(imageModels).where(eq(imageModels.imageId, imageId))

  if (uniqueModelIds.length === 0) {
    return
  }

  const date = now()
  await db.insert(imageModels).values(
    uniqueModelIds.map((modelId) => ({
      createdAt: date,
      imageId,
      modelId,
    })),
  )
}

async function fetchImageRelationMaps(imageIds: string[]) {
  if (imageIds.length === 0) {
    return {
      modelsByImageId: new Map<string, Model[]>(),
      tagsByImageId: new Map<string, Tag[]>(),
    }
  }

  const [tagRows, modelRows] = await Promise.all([
    db
      .select({
        imageId: imageTags.imageId,
        tag: tags,
      })
      .from(imageTags)
      .innerJoin(tags, eq(imageTags.tagId, tags.id))
      .where(inArray(imageTags.imageId, imageIds)),
    db
      .select({
        imageId: imageModels.imageId,
        model: models,
      })
      .from(imageModels)
      .innerJoin(models, eq(imageModels.modelId, models.id))
      .where(inArray(imageModels.imageId, imageIds)),
  ])

  const tagsByImageId = new Map<string, Tag[]>()
  const modelsByImageId = new Map<string, Model[]>()

  for (const row of tagRows) {
    const existing = tagsByImageId.get(row.imageId) ?? []
    existing.push(row.tag)
    tagsByImageId.set(row.imageId, existing)
  }

  for (const row of modelRows) {
    const existing = modelsByImageId.get(row.imageId) ?? []
    existing.push(row.model)
    modelsByImageId.set(row.imageId, existing)
  }

  return { modelsByImageId, tagsByImageId }
}

function formatImage(
  row: JoinedImageRow,
  relationMaps: Awaited<ReturnType<typeof fetchImageRelationMaps>>,
) {
  return {
    ...row.image,
    agency: row.agency,
    album: row.album,
    models: relationMaps.modelsByImageId.get(row.image.id) ?? [],
    originalUrl: publicAssetPath(row.image.originalKey),
    tags: relationMaps.tagsByImageId.get(row.image.id) ?? [],
    thumbnailUrl: row.image.thumbnailKey
      ? publicAssetPath(row.image.thumbnailKey)
      : publicAssetPath(row.image.originalKey),
  }
}
