import { ORPCError } from '@orpc/server'
import * as z from 'zod'
import { adminProcedure } from '#/orpc/context'
import {
  batchAddModels,
  batchAddTags,
  batchAssignAlbum,
  createAgency,
  createAlbum,
  createModel,
  createTag,
  deleteAgency,
  deleteAlbum,
  deleteImages,
  deleteModel,
  deleteTag,
  getAlbum,
  getImageDetail,
  listAgencies,
  listAlbums,
  listImages,
  listLibraryStats,
  listModels,
  listTags,
  updateAgency,
  updateAlbum,
  updateImage,
  updateModel,
  updateTag,
} from '#/server/admin/assets'

const IdSchema = z.string().trim().min(1)
const NameSchema = z.string().trim().min(1).max(120)
const LongTextSchema = z.string().max(4000).nullable().optional()
const UrlTextSchema = z.string().max(1000).nullable().optional()
const IdsSchema = z.array(IdSchema).min(1).max(500)

const EntityListInputSchema = z.object({
  limit: z.number().int().min(1).max(200).optional(),
  offset: z.number().int().min(0).optional(),
  q: z.string().trim().max(120).optional(),
})

const AgencyInputSchema = z.object({
  description: LongTextSchema,
  name: NameSchema,
  notes: LongTextSchema,
  websiteUrl: UrlTextSchema,
})

const AgencyUpdateInputSchema = AgencyInputSchema.partial().extend({
  id: IdSchema,
})

const AlbumInputSchema = z.object({
  agencyId: IdSchema.nullable().optional(),
  description: LongTextSchema,
  name: NameSchema,
  notes: LongTextSchema,
  sortOrder: z.number().int().min(0).max(100_000).optional(),
})

const AlbumUpdateInputSchema = AlbumInputSchema.partial().extend({
  id: IdSchema,
})

const AlbumListInputSchema = EntityListInputSchema.extend({
  agencyId: IdSchema.optional(),
})

const TagInputSchema = z.object({
  color: z.string().trim().max(40).nullable().optional(),
  description: LongTextSchema,
  name: NameSchema,
})

const TagUpdateInputSchema = TagInputSchema.partial().extend({
  id: IdSchema,
})

const ModelInputSchema = z.object({
  alias: z.string().trim().max(160).nullable().optional(),
  avatarObjectKey: z.string().trim().max(1000).nullable().optional(),
  bio: LongTextSchema,
  instagramUrl: UrlTextSchema,
  name: NameSchema,
  weiboUrl: UrlTextSchema,
  xUrl: UrlTextSchema,
})

const ModelUpdateInputSchema = ModelInputSchema.partial()
  .extend({
    avatarImageId: IdSchema.nullable().optional(),
    id: IdSchema,
  })
  .partial({
    avatarImageId: true,
  })

const ImageListInputSchema = z.object({
  agencyId: IdSchema.optional(),
  albumId: IdSchema.optional(),
  filter: z.enum(['all', 'unalbumed', 'untagged']).optional(),
  limit: z.number().int().min(1).max(120).optional(),
  modelId: IdSchema.optional(),
  offset: z.number().int().min(0).optional(),
  q: z.string().trim().max(120).optional(),
  tagId: IdSchema.optional(),
})

const ImageUpdateInputSchema = z.object({
  albumId: IdSchema.nullable().optional(),
  dominantColors: z.array(z.string().trim().min(1).max(40)).max(16).optional(),
  exif: z.record(z.string(), z.unknown()).optional(),
  height: z.number().int().positive().nullable().optional(),
  id: IdSchema,
  modelIds: z.array(IdSchema).max(100).optional(),
  note: LongTextSchema,
  rating: z.number().int().min(0).max(5).optional(),
  sourceUrl: UrlTextSchema,
  tagIds: z.array(IdSchema).max(100).optional(),
  title: NameSchema.optional(),
  width: z.number().int().positive().nullable().optional(),
})

function requireFound<T>(value: T | null | undefined) {
  if (!value) {
    throw new ORPCError('NOT_FOUND')
  }

  return value
}

export const admin = {
  agencies: {
    create: adminProcedure
      .input(AgencyInputSchema)
      .handler(({ input }) => createAgency(input)),
    delete: adminProcedure
      .input(z.object({ id: IdSchema }))
      .handler(({ input }) => deleteAgency(input.id)),
    list: adminProcedure
      .input(EntityListInputSchema)
      .handler(({ input }) => listAgencies(input)),
    update: adminProcedure
      .input(AgencyUpdateInputSchema)
      .handler(async ({ input }) => requireFound(await updateAgency(input))),
  },
  albums: {
    create: adminProcedure
      .input(AlbumInputSchema)
      .handler(({ input }) => createAlbum(input)),
    delete: adminProcedure
      .input(z.object({ id: IdSchema }))
      .handler(({ input }) => deleteAlbum(input.id)),
    detail: adminProcedure
      .input(z.object({ id: IdSchema }))
      .handler(async ({ input }) =>
        requireFound(await getAlbum(input.id)),
      ),
    list: adminProcedure
      .input(AlbumListInputSchema)
      .handler(({ input }) => listAlbums(input)),
    update: adminProcedure
      .input(AlbumUpdateInputSchema)
      .handler(async ({ input }) => requireFound(await updateAlbum(input))),
  },
  images: {
    batchAddModels: adminProcedure
      .input(z.object({ imageIds: IdsSchema, modelIds: IdsSchema }))
      .handler(({ input }) => batchAddModels(input)),
    batchAddTags: adminProcedure
      .input(z.object({ imageIds: IdsSchema, tagIds: IdsSchema }))
      .handler(({ input }) => batchAddTags(input)),
    batchAssignAlbum: adminProcedure
      .input(z.object({ albumId: IdSchema.nullable(), imageIds: IdsSchema }))
      .handler(({ input }) => batchAssignAlbum(input)),
    delete: adminProcedure
      .input(z.object({ imageIds: IdsSchema }))
      .handler(({ input }) => deleteImages(input)),
    detail: adminProcedure
      .input(z.object({ id: IdSchema }))
      .handler(async ({ input }) =>
        requireFound(await getImageDetail(input.id)),
      ),
    list: adminProcedure
      .input(ImageListInputSchema)
      .handler(({ input }) => listImages(input)),
    update: adminProcedure
      .input(ImageUpdateInputSchema)
      .handler(async ({ input }) => requireFound(await updateImage(input))),
  },
  models: {
    create: adminProcedure
      .input(ModelInputSchema)
      .handler(({ input }) => createModel(input)),
    delete: adminProcedure
      .input(z.object({ id: IdSchema }))
      .handler(({ input }) => deleteModel(input.id)),
    list: adminProcedure
      .input(EntityListInputSchema)
      .handler(({ input }) => listModels(input)),
    update: adminProcedure
      .input(ModelUpdateInputSchema)
      .handler(async ({ input }) => requireFound(await updateModel(input))),
  },
  stats: adminProcedure.input(z.object({})).handler(() => listLibraryStats()),
  tags: {
    create: adminProcedure
      .input(TagInputSchema)
      .handler(({ input }) => createTag(input)),
    delete: adminProcedure
      .input(z.object({ id: IdSchema }))
      .handler(({ input }) => deleteTag(input.id)),
    list: adminProcedure
      .input(EntityListInputSchema)
      .handler(({ input }) => listTags(input)),
    update: adminProcedure
      .input(TagUpdateInputSchema)
      .handler(async ({ input }) => requireFound(await updateTag(input))),
  },
}
