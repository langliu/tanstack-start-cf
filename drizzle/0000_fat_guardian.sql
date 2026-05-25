CREATE TABLE "agencies" (
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"description" text,
	"id" text PRIMARY KEY NOT NULL,
	"logo_image_id" text,
	"name" text NOT NULL,
	"notes" text,
	"slug" text NOT NULL,
	"website_url" text
);
--> statement-breakpoint
CREATE TABLE "albums" (
	"agency_id" text,
	"cover_image_id" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"description" text,
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"notes" text,
	"slug" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "image_models" (
	"created_at" timestamp with time zone NOT NULL,
	"image_id" text NOT NULL,
	"model_id" text NOT NULL,
	CONSTRAINT "image_models_image_id_model_id_pk" PRIMARY KEY("image_id","model_id")
);
--> statement-breakpoint
CREATE TABLE "image_tags" (
	"created_at" timestamp with time zone NOT NULL,
	"image_id" text NOT NULL,
	"tag_id" text NOT NULL,
	CONSTRAINT "image_tags_image_id_tag_id_pk" PRIMARY KEY("image_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "images" (
	"album_id" text,
	"checksum_sha256" text,
	"content_type" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	"dominant_colors" jsonb,
	"exif" jsonb,
	"filename" text NOT NULL,
	"file_size" integer NOT NULL,
	"format" text NOT NULL,
	"height" integer,
	"id" text PRIMARY KEY NOT NULL,
	"note" text,
	"original_filename" text NOT NULL,
	"original_key" text NOT NULL,
	"processing_status" text DEFAULT 'ready' NOT NULL,
	"rating" integer DEFAULT 0 NOT NULL,
	"source_url" text,
	"thumbnail_content_type" text,
	"thumbnail_height" integer,
	"thumbnail_key" text,
	"thumbnail_size" integer,
	"thumbnail_width" integer,
	"title" text NOT NULL,
	"uploaded_at" timestamp with time zone NOT NULL,
	"uploaded_by_user_id" text,
	"width" integer
);
--> statement-breakpoint
CREATE TABLE "models" (
	"alias" text,
	"avatar_image_id" text,
	"avatar_object_key" text,
	"bio" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"instagram_url" text,
	"name" text NOT NULL,
	"weibo_url" text,
	"x_url" text
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"color" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"description" text,
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "todos" (
	"created_at" timestamp with time zone DEFAULT now(),
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account" (
	"access_token" text,
	"access_token_expires_at" timestamp with time zone,
	"account_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"id_token" text,
	"password" text,
	"provider_id" text NOT NULL,
	"refresh_token" text,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"updated_at" timestamp with time zone NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"created_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"ip_address" text,
	"token" text NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"created_at" timestamp with time zone NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"image" text,
	"name" text NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"created_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "albums" ADD CONSTRAINT "albums_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "image_models" ADD CONSTRAINT "image_models_image_id_images_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."images"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "image_models" ADD CONSTRAINT "image_models_model_id_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."models"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "image_tags" ADD CONSTRAINT "image_tags_image_id_images_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."images"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "image_tags" ADD CONSTRAINT "image_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "images" ADD CONSTRAINT "images_album_id_albums_id_fk" FOREIGN KEY ("album_id") REFERENCES "public"."albums"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "images" ADD CONSTRAINT "images_uploaded_by_user_id_user_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "agencies_slug_unique" ON "agencies" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "agencies_name_unique" ON "agencies" USING btree ("name");--> statement-breakpoint
CREATE INDEX "albums_agency_id_idx" ON "albums" USING btree ("agency_id");--> statement-breakpoint
CREATE UNIQUE INDEX "albums_slug_unique" ON "albums" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "albums_name_unique" ON "albums" USING btree ("name");--> statement-breakpoint
CREATE INDEX "image_models_model_id_idx" ON "image_models" USING btree ("model_id");--> statement-breakpoint
CREATE INDEX "image_tags_tag_id_idx" ON "image_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "images_album_id_idx" ON "images" USING btree ("album_id");--> statement-breakpoint
CREATE UNIQUE INDEX "images_checksum_sha256_unique" ON "images" USING btree ("checksum_sha256") WHERE "images"."checksum_sha256" is not null;--> statement-breakpoint
CREATE INDEX "images_created_at_idx" ON "images" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "images_deleted_at_idx" ON "images" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "images_processing_status_idx" ON "images" USING btree ("processing_status");--> statement-breakpoint
CREATE INDEX "images_uploaded_by_user_id_idx" ON "images" USING btree ("uploaded_by_user_id");--> statement-breakpoint
CREATE INDEX "images_uploaded_at_idx" ON "images" USING btree ("uploaded_at");--> statement-breakpoint
CREATE INDEX "models_name_idx" ON "models" USING btree ("name");--> statement-breakpoint
CREATE INDEX "models_alias_idx" ON "models" USING btree ("alias");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_slug_unique" ON "tags" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_name_unique" ON "tags" USING btree ("name");--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");