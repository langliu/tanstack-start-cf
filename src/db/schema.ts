import { isNotNull, relations } from 'drizzle-orm'
import {
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { user } from './auth-schema.ts'

export * from './auth-schema.ts'

export const todos = pgTable('todos', {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
})

const timestamps = () => ({
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .$defaultFn(() => new Date()),
})

export const agencies = pgTable(
  'agencies',
  {
    ...timestamps(),
    description: text('description'),
    id: text('id').primaryKey(),
    logoImageId: text('logo_image_id'),
    name: text('name').notNull(),
    notes: text('notes'),
    slug: text('slug').notNull(),
    websiteUrl: text('website_url'),
  },
  (table) => [
    uniqueIndex('agencies_slug_unique').on(table.slug),
    uniqueIndex('agencies_name_unique').on(table.name),
  ],
)

export const albums = pgTable(
  'albums',
  {
    agencyId: text('agency_id').references(() => agencies.id, {
      onDelete: 'set null',
    }),
    coverImageId: text('cover_image_id'),
    ...timestamps(),
    description: text('description'),
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    notes: text('notes'),
    slug: text('slug').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (table) => [
    index('albums_agency_id_idx').on(table.agencyId),
    uniqueIndex('albums_slug_unique').on(table.slug),
    uniqueIndex('albums_name_unique').on(table.name),
  ],
)

export const tags = pgTable(
  'tags',
  {
    color: text('color'),
    ...timestamps(),
    description: text('description'),
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
  },
  (table) => [
    uniqueIndex('tags_slug_unique').on(table.slug),
    uniqueIndex('tags_name_unique').on(table.name),
  ],
)

export const models = pgTable(
  'models',
  {
    alias: text('alias'),
    avatarImageId: text('avatar_image_id'),
    avatarObjectKey: text('avatar_object_key'),
    bio: text('bio'),
    ...timestamps(),
    id: text('id').primaryKey(),
    instagramUrl: text('instagram_url'),
    name: text('name').notNull(),
    weiboUrl: text('weibo_url'),
    xUrl: text('x_url'),
  },
  (table) => [
    index('models_name_idx').on(table.name),
    index('models_alias_idx').on(table.alias),
  ],
)

export const images = pgTable(
  'images',
  {
    albumId: text('album_id').references(() => albums.id, {
      onDelete: 'set null',
    }),
    checksumSha256: text('checksum_sha256'),
    contentType: text('content_type').notNull(),
    ...timestamps(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    dominantColors: jsonb('dominant_colors').$type<string[]>(),
    exif: jsonb('exif').$type<Record<string, unknown>>(),
    filename: text('filename').notNull(),
    fileSize: integer('file_size').notNull(),
    format: text('format').notNull(),
    height: integer('height'),
    id: text('id').primaryKey(),
    note: text('note'),
    originalFilename: text('original_filename').notNull(),
    originalKey: text('original_key').notNull(),
    processingStatus: text('processing_status').notNull().default('ready'),
    rating: integer().notNull().default(0),
    sourceUrl: text('source_url'),
    thumbnailContentType: text('thumbnail_content_type'),
    thumbnailHeight: integer('thumbnail_height'),
    thumbnailKey: text('thumbnail_key'),
    thumbnailSize: integer('thumbnail_size'),
    thumbnailWidth: integer('thumbnail_width'),
    title: text('title').notNull(),
    uploadedAt: timestamp('uploaded_at', { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
    uploadedByUserId: text('uploaded_by_user_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    width: integer(),
  },
  (table) => [
    index('images_album_id_idx').on(table.albumId),
    uniqueIndex('images_checksum_sha256_unique')
      .on(table.checksumSha256)
      .where(isNotNull(table.checksumSha256)),
    index('images_created_at_idx').on(table.createdAt),
    index('images_deleted_at_idx').on(table.deletedAt),
    index('images_processing_status_idx').on(table.processingStatus),
    index('images_uploaded_by_user_id_idx').on(table.uploadedByUserId),
    index('images_uploaded_at_idx').on(table.uploadedAt),
  ],
)

export const imageTags = pgTable(
  'image_tags',
  {
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
    imageId: text('image_id')
      .notNull()
      .references(() => images.id, { onDelete: 'cascade' }),
    tagId: text('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.imageId, table.tagId] }),
    index('image_tags_tag_id_idx').on(table.tagId),
  ],
)

export const imageModels = pgTable(
  'image_models',
  {
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
    imageId: text('image_id')
      .notNull()
      .references(() => images.id, { onDelete: 'cascade' }),
    modelId: text('model_id')
      .notNull()
      .references(() => models.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.imageId, table.modelId] }),
    index('image_models_model_id_idx').on(table.modelId),
  ],
)

export const agenciesRelations = relations(agencies, ({ many }) => ({
  albums: many(albums),
}))

export const albumsRelations = relations(albums, ({ many, one }) => ({
  agency: one(agencies, {
    fields: [albums.agencyId],
    references: [agencies.id],
  }),
  images: many(images),
}))

export const tagsRelations = relations(tags, ({ many }) => ({
  imageTags: many(imageTags),
}))

export const modelsRelations = relations(models, ({ many }) => ({
  imageModels: many(imageModels),
}))

export const imagesRelations = relations(images, ({ many, one }) => ({
  album: one(albums, {
    fields: [images.albumId],
    references: [albums.id],
  }),
  imageModels: many(imageModels),
  imageTags: many(imageTags),
  uploadedByUser: one(user, {
    fields: [images.uploadedByUserId],
    references: [user.id],
  }),
}))

export const imageTagsRelations = relations(imageTags, ({ one }) => ({
  image: one(images, {
    fields: [imageTags.imageId],
    references: [images.id],
  }),
  tag: one(tags, {
    fields: [imageTags.tagId],
    references: [tags.id],
  }),
}))

export const imageModelsRelations = relations(imageModels, ({ one }) => ({
  image: one(images, {
    fields: [imageModels.imageId],
    references: [images.id],
  }),
  model: one(models, {
    fields: [imageModels.modelId],
    references: [models.id],
  }),
}))
