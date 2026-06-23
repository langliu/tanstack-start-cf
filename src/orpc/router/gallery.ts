import * as z from 'zod'
import { publicProcedure } from '#/orpc/context'
import {
  getPublicAlbum,
  listPublicAlbums,
  listPublicFacets,
  listPublicImages,
  listPublicStats,
} from '#/server/public/assets'

const IdSchema = z.string().trim().min(1)
const TextSearchSchema = z.string().trim().max(120).optional()

const ImageListInputSchema = z.object({
  agencyId: IdSchema.optional(),
  albumId: IdSchema.optional(),
  albumSlug: IdSchema.optional(),
  limit: z.number().int().min(1).max(120).optional(),
  modelId: IdSchema.optional(),
  offset: z.number().int().min(0).optional(),
  q: TextSearchSchema,
  seed: z.string().trim().max(80).optional(),
  sort: z.enum(['latest', 'random', 'top']).optional(),
  tagId: IdSchema.optional(),
})

const AlbumListInputSchema = z.object({
  agencyId: IdSchema.optional(),
  limit: z.number().int().min(1).max(120).optional(),
  offset: z.number().int().min(0).optional(),
  q: TextSearchSchema,
})

export const gallery = {
  albums: {
    detail: publicProcedure
      .input(z.object({ slug: IdSchema }))
      .handler(({ input }) => getPublicAlbum(input.slug)),
    list: publicProcedure
      .input(AlbumListInputSchema)
      .handler(({ input }) => listPublicAlbums(input)),
  },
  facets: publicProcedure.input(z.object({})).handler(() => listPublicFacets()),
  images: {
    list: publicProcedure
      .input(ImageListInputSchema)
      .handler(({ input }) => listPublicImages(input)),
  },
  stats: publicProcedure.input(z.object({})).handler(() => listPublicStats()),
}
