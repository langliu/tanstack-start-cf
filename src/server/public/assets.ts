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
  or,
  sql,
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
import { publicAssetPath } from '#/server/admin/utils'

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

type PublicImageListInput = {
  agencyId?: string
  albumId?: string
  albumSlug?: string
  limit?: number
  modelId?: string
  offset?: number
  q?: string
  seed?: string
  sort?: 'latest' | 'random' | 'top'
  tagId?: string
}

type PublicAlbumListInput = {
  agencyId?: string
  limit?: number
  offset?: number
  q?: string
}

type PublicAlbumCover = {
  dominantColors: null | string[]
  height: null | number
  id: string
  thumbnailUrl: string
  title: string
  width: null | number
}

export async function listPublicStats() {
  const activeImage = isNull(images.deletedAt)
  const [imageTotal, albumTotal, tagTotal, modelTotal, agencyTotal] =
    await Promise.all([
      db.select({ value: count() }).from(images).where(activeImage),
      db.select({ value: count() }).from(albums),
      db.select({ value: count() }).from(tags),
      db.select({ value: count() }).from(models),
      db.select({ value: count() }).from(agencies),
    ])

  return {
    agencies: agencyTotal[0]?.value ?? 0,
    albums: albumTotal[0]?.value ?? 0,
    images: imageTotal[0]?.value ?? 0,
    models: modelTotal[0]?.value ?? 0,
    tags: tagTotal[0]?.value ?? 0,
  }
}

export async function listPublicImages(input: PublicImageListInput = {}) {
  const limit = clampLimit(input.limit, 48, 120)
  const offset = Math.max(input.offset ?? 0, 0)
  const conditions = buildImageConditions(input)
  const where = conditions.length > 0 ? and(...conditions) : undefined

  const orderBy =
    input.sort === 'random'
      ? [
          sql`md5(${images.id} || ${sanitizeSeed(input.seed)})`,
          desc(images.uploadedAt),
        ]
      : input.sort === 'top'
        ? [desc(images.rating), desc(images.uploadedAt), desc(images.id)]
        : [desc(images.uploadedAt), desc(images.id)]

  const rows = await db
    .select({
      agency: agencies,
      album: albums,
      image: images,
    })
    .from(images)
    .leftJoin(albums, eq(images.albumId, albums.id))
    .leftJoin(agencies, eq(albums.agencyId, agencies.id))
    .where(where)
    .orderBy(...orderBy)
    .limit(limit)
    .offset(offset)

  const [total] = await db
    .select({ value: count() })
    .from(images)
    .leftJoin(albums, eq(images.albumId, albums.id))
    .leftJoin(agencies, eq(albums.agencyId, agencies.id))
    .where(where)

  const relationMaps = await fetchImageRelationMaps(
    rows.map((row) => row.image.id),
  )

  return {
    items: await Promise.all(
      rows.map((row) => formatPublicImage(row, relationMaps)),
    ),
    limit,
    offset,
    total: total?.value ?? 0,
  }
}

export async function listPublicAlbums(input: PublicAlbumListInput = {}) {
  const limit = clampLimit(input.limit, 24, 120)
  const offset = Math.max(input.offset ?? 0, 0)
  const conditions = buildAlbumConditions(input)
  const where = conditions.length > 0 ? and(...conditions) : undefined

  const rows = await db
    .select({
      agency: agencies,
      album: albums,
    })
    .from(albums)
    .leftJoin(agencies, eq(albums.agencyId, agencies.id))
    .where(where)
    .orderBy(asc(albums.sortOrder), asc(albums.name))
    .limit(limit)
    .offset(offset)

  const [total] = await db.select({ value: count() }).from(albums).where(where)
  const albumRows = rows.map((row) => row.album)
  const [countMap, coverMap] = await Promise.all([
    fetchAlbumImageCountMap(albumRows.map((album) => album.id)),
    fetchAlbumCoverMap(albumRows),
  ])

  return {
    items: rows.map((row) =>
      formatPublicAlbum({
        agency: row.agency,
        album: row.album,
        coverImage: coverMap.get(row.album.id) ?? null,
        imageCount: countMap.get(row.album.id) ?? 0,
      }),
    ),
    limit,
    offset,
    total: total?.value ?? 0,
  }
}

export async function getPublicAlbum(slug: string) {
  const normalizedSlug = slug.trim()
  if (!normalizedSlug) {
    return null
  }

  const [row] = await db
    .select({
      agency: agencies,
      album: albums,
    })
    .from(albums)
    .leftJoin(agencies, eq(albums.agencyId, agencies.id))
    .where(eq(albums.slug, normalizedSlug))
    .limit(1)

  if (!row) {
    return null
  }

  const [countMap, coverMap, facets] = await Promise.all([
    fetchAlbumImageCountMap([row.album.id]),
    fetchAlbumCoverMap([row.album]),
    fetchAlbumFacets(row.album.id),
  ])

  return {
    ...formatPublicAlbum({
      agency: row.agency,
      album: row.album,
      coverImage: coverMap.get(row.album.id) ?? null,
      imageCount: countMap.get(row.album.id) ?? 0,
    }),
    facets,
  }
}

export async function listPublicFacets() {
  const [tagRows, modelRows, agencyRows] = await Promise.all([
    db
      .select({
        color: tags.color,
        id: tags.id,
        imageCount: count(images.id),
        name: tags.name,
        slug: tags.slug,
      })
      .from(tags)
      .leftJoin(imageTags, eq(imageTags.tagId, tags.id))
      .leftJoin(
        images,
        and(eq(imageTags.imageId, images.id), isNull(images.deletedAt)),
      )
      .groupBy(tags.id, tags.name, tags.slug, tags.color)
      .orderBy(desc(count(images.id)), asc(tags.name))
      .limit(80),
    db
      .select({
        alias: models.alias,
        id: models.id,
        imageCount: count(images.id),
        name: models.name,
      })
      .from(models)
      .leftJoin(imageModels, eq(imageModels.modelId, models.id))
      .leftJoin(
        images,
        and(eq(imageModels.imageId, images.id), isNull(images.deletedAt)),
      )
      .groupBy(models.id, models.name, models.alias)
      .orderBy(desc(count(images.id)), asc(models.name))
      .limit(80),
    db
      .select({
        albumCount: count(albums.id),
        id: agencies.id,
        name: agencies.name,
        slug: agencies.slug,
      })
      .from(agencies)
      .leftJoin(albums, eq(albums.agencyId, agencies.id))
      .groupBy(agencies.id, agencies.name, agencies.slug)
      .orderBy(asc(agencies.name))
      .limit(80),
  ])

  return {
    agencies: agencyRows,
    models: modelRows,
    tags: tagRows,
  }
}

function buildImageConditions(input: PublicImageListInput) {
  const conditions = [isNull(images.deletedAt)]
  const q = input.q?.trim()

  if (q) {
    const term = `%${q}%`
    const search = or(
      like(images.title, term),
      like(images.originalFilename, term),
      like(images.sourceUrl, term),
      like(images.note, term),
      like(albums.name, term),
      like(agencies.name, term),
    )
    if (search) {
      conditions.push(search)
    }
  }
  if (input.albumId) {
    conditions.push(eq(images.albumId, input.albumId))
  }
  if (input.albumSlug) {
    conditions.push(eq(albums.slug, input.albumSlug))
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

  return conditions
}

function buildAlbumConditions(input: PublicAlbumListInput) {
  const conditions = []
  const q = input.q?.trim()

  if (input.agencyId) {
    conditions.push(eq(albums.agencyId, input.agencyId))
  }
  if (q) {
    const term = `%${q}%`
    const search = or(
      like(albums.name, term),
      like(albums.description, term),
      like(agencies.name, term),
    )
    if (search) {
      conditions.push(search)
    }
  }

  return conditions
}

async function fetchAlbumImageCountMap(albumIds: string[]) {
  if (albumIds.length === 0) {
    return new Map<string, number>()
  }

  const rows = await db
    .select({
      albumId: images.albumId,
      value: count(),
    })
    .from(images)
    .where(and(inArray(images.albumId, albumIds), isNull(images.deletedAt)))
    .groupBy(images.albumId)

  return new Map(
    rows.flatMap((row) =>
      row.albumId ? [[row.albumId, row.value] as const] : [],
    ),
  )
}

async function fetchAlbumCoverMap(albumRows: Album[]) {
  if (albumRows.length === 0) {
    return new Map<string, PublicAlbumCover>()
  }

  const coverByAlbumId = new Map<string, PublicAlbumCover>()
  const coverImageIds = uniqueValues(
    albumRows.flatMap((album) =>
      album.coverImageId ? [album.coverImageId] : [],
    ),
  )

  if (coverImageIds.length > 0) {
    const coverRows = await db
      .select({
        albumId: images.albumId,
        dominantColors: images.dominantColors,
        height: images.height,
        id: images.id,
        originalKey: images.originalKey,
        thumbnailKey: images.thumbnailKey,
        title: images.title,
        width: images.width,
      })
      .from(images)
      .where(and(inArray(images.id, coverImageIds), isNull(images.deletedAt)))

    for (const album of albumRows) {
      const coverRow = coverRows.find(
        (image) =>
          image.id === album.coverImageId && image.albumId === album.id,
      )
      if (coverRow) {
        coverByAlbumId.set(album.id, await formatAlbumCover(coverRow))
      }
    }
  }

  const missingAlbumIds = albumRows
    .map((album) => album.id)
    .filter((albumId) => !coverByAlbumId.has(albumId))

  if (missingAlbumIds.length > 0) {
    const fallbackRows = await db
      .select({
        albumId: images.albumId,
        dominantColors: images.dominantColors,
        height: images.height,
        id: images.id,
        originalKey: images.originalKey,
        thumbnailKey: images.thumbnailKey,
        title: images.title,
        width: images.width,
      })
      .from(images)
      .where(
        and(inArray(images.albumId, missingAlbumIds), isNull(images.deletedAt)),
      )
      .orderBy(desc(images.uploadedAt), desc(images.id))

    for (const image of fallbackRows) {
      if (image.albumId && !coverByAlbumId.has(image.albumId)) {
        coverByAlbumId.set(image.albumId, await formatAlbumCover(image))
      }
    }
  }

  return coverByAlbumId
}

async function fetchAlbumFacets(albumId: string) {
  const [tagRows, modelRows] = await Promise.all([
    db
      .select({
        color: tags.color,
        id: tags.id,
        imageCount: count(),
        name: tags.name,
        slug: tags.slug,
      })
      .from(imageTags)
      .innerJoin(images, eq(imageTags.imageId, images.id))
      .innerJoin(tags, eq(imageTags.tagId, tags.id))
      .where(and(eq(images.albumId, albumId), isNull(images.deletedAt)))
      .groupBy(tags.id, tags.name, tags.slug, tags.color)
      .orderBy(asc(tags.name)),
    db
      .select({
        alias: models.alias,
        id: models.id,
        imageCount: count(),
        name: models.name,
      })
      .from(imageModels)
      .innerJoin(images, eq(imageModels.imageId, images.id))
      .innerJoin(models, eq(imageModels.modelId, models.id))
      .where(and(eq(images.albumId, albumId), isNull(images.deletedAt)))
      .groupBy(models.id, models.name, models.alias)
      .orderBy(asc(models.name)),
  ])

  return {
    models: modelRows,
    tags: tagRows,
  }
}

async function fetchImageRelationMaps(imageIds: string[]) {
  if (imageIds.length === 0) {
    return {
      modelsByImageId: new Map<
        string,
        Awaited<ReturnType<typeof formatModel>>[]
      >(),
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
  const modelsByImageId = new Map<
    string,
    Awaited<ReturnType<typeof formatModel>>[]
  >()

  for (const row of tagRows) {
    const existing = tagsByImageId.get(row.imageId) ?? []
    existing.push(row.tag)
    tagsByImageId.set(row.imageId, existing)
  }

  for (const row of modelRows) {
    const existing = modelsByImageId.get(row.imageId) ?? []
    existing.push(await formatModel(row.model))
    modelsByImageId.set(row.imageId, existing)
  }

  return { modelsByImageId, tagsByImageId }
}

async function formatPublicImage(
  row: JoinedImageRow,
  relationMaps: Awaited<ReturnType<typeof fetchImageRelationMaps>>,
) {
  const image = row.image

  return {
    agency: row.agency
      ? {
          id: row.agency.id,
          name: row.agency.name,
          slug: row.agency.slug,
        }
      : null,
    album: row.album
      ? {
          id: row.album.id,
          name: row.album.name,
          slug: row.album.slug,
        }
      : null,
    dominantColors: image.dominantColors,
    height: image.height,
    id: image.id,
    models: relationMaps.modelsByImageId.get(image.id) ?? [],
    originalFilename: image.originalFilename,
    originalUrl: await assetUrl(image.originalKey),
    rating: image.rating,
    sourceUrl: image.sourceUrl,
    tags: (relationMaps.tagsByImageId.get(image.id) ?? []).map((tag) => ({
      color: tag.color,
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
    })),
    thumbnailUrl: await assetUrl(image.thumbnailKey ?? image.originalKey),
    title: image.title,
    uploadedAt: image.uploadedAt,
    width: image.width,
  }
}

function formatPublicAlbum(input: {
  agency: Agency | null
  album: Album
  coverImage: PublicAlbumCover | null
  imageCount: number
}) {
  return {
    agency: input.agency
      ? {
          id: input.agency.id,
          name: input.agency.name,
          slug: input.agency.slug,
        }
      : null,
    coverImage: input.coverImage,
    description: input.album.description,
    id: input.album.id,
    imageCount: input.imageCount,
    name: input.album.name,
    slug: input.album.slug,
    sortOrder: input.album.sortOrder,
    updatedAt: input.album.updatedAt,
  }
}

async function formatAlbumCover(image: {
  dominantColors: null | string[]
  height: null | number
  id: string
  originalKey: string
  thumbnailKey: null | string
  title: string
  width: null | number
}) {
  return {
    dominantColors: image.dominantColors,
    height: image.height,
    id: image.id,
    thumbnailUrl: await assetUrl(image.thumbnailKey ?? image.originalKey),
    title: image.title,
    width: image.width,
  }
}

async function formatModel(model: Model) {
  return {
    alias: model.alias,
    avatarUrl: model.avatarObjectKey
      ? await assetUrl(model.avatarObjectKey)
      : null,
    id: model.id,
    name: model.name,
  }
}

function assetUrl(key: string) {
  return publicAssetPath(key)
}

function clampLimit(
  value: number | undefined,
  defaultValue: number,
  max: number,
) {
  return Math.min(Math.max(value ?? defaultValue, 1), max)
}

function sanitizeSeed(seed: string | undefined) {
  return seed?.trim().slice(0, 80) || 'gallery'
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)))
}
