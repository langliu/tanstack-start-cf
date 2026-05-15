CREATE TABLE `agencies` (
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`description` text,
	`id` text PRIMARY KEY NOT NULL,
	`logo_image_id` text,
	`name` text NOT NULL,
	`notes` text,
	`slug` text NOT NULL,
	`website_url` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agencies_slug_unique` ON `agencies` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `agencies_name_unique` ON `agencies` (`name`);--> statement-breakpoint
CREATE TABLE `albums` (
	`agency_id` text,
	`cover_image_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`description` text,
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`notes` text,
	`slug` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `albums_agency_id_idx` ON `albums` (`agency_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `albums_slug_unique` ON `albums` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `albums_name_unique` ON `albums` (`name`);--> statement-breakpoint
CREATE TABLE `image_models` (
	`created_at` integer NOT NULL,
	`image_id` text NOT NULL,
	`model_id` text NOT NULL,
	PRIMARY KEY(`image_id`, `model_id`),
	FOREIGN KEY (`image_id`) REFERENCES `images`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`model_id`) REFERENCES `models`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `image_models_model_id_idx` ON `image_models` (`model_id`);--> statement-breakpoint
CREATE TABLE `image_tags` (
	`created_at` integer NOT NULL,
	`image_id` text NOT NULL,
	`tag_id` text NOT NULL,
	PRIMARY KEY(`image_id`, `tag_id`),
	FOREIGN KEY (`image_id`) REFERENCES `images`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `image_tags_tag_id_idx` ON `image_tags` (`tag_id`);--> statement-breakpoint
CREATE TABLE `images` (
	`album_id` text,
	`checksum_sha256` text,
	`content_type` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`dominant_colors` text,
	`exif` text,
	`file_size` integer NOT NULL,
	`filename` text NOT NULL,
	`format` text NOT NULL,
	`height` integer,
	`id` text PRIMARY KEY NOT NULL,
	`note` text,
	`original_filename` text NOT NULL,
	`original_key` text NOT NULL,
	`processing_status` text DEFAULT 'ready' NOT NULL,
	`rating` integer DEFAULT 0 NOT NULL,
	`source_url` text,
	`thumbnail_content_type` text,
	`thumbnail_height` integer,
	`thumbnail_key` text,
	`thumbnail_size` integer,
	`thumbnail_width` integer,
	`title` text NOT NULL,
	`uploaded_at` integer NOT NULL,
	`uploaded_by_user_id` text,
	`width` integer,
	FOREIGN KEY (`album_id`) REFERENCES `albums`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `images_album_id_idx` ON `images` (`album_id`);--> statement-breakpoint
CREATE INDEX `images_created_at_idx` ON `images` (`created_at`);--> statement-breakpoint
CREATE INDEX `images_processing_status_idx` ON `images` (`processing_status`);--> statement-breakpoint
CREATE INDEX `images_uploaded_by_user_id_idx` ON `images` (`uploaded_by_user_id`);--> statement-breakpoint
CREATE INDEX `images_uploaded_at_idx` ON `images` (`uploaded_at`);--> statement-breakpoint
CREATE TABLE `models` (
	`alias` text,
	`avatar_image_id` text,
	`avatar_object_key` text,
	`bio` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`instagram_url` text,
	`name` text NOT NULL,
	`weibo_url` text,
	`x_url` text
);
--> statement-breakpoint
CREATE INDEX `models_name_idx` ON `models` (`name`);--> statement-breakpoint
CREATE INDEX `models_alias_idx` ON `models` (`alias`);--> statement-breakpoint
CREATE TABLE `tags` (
	`color` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`description` text,
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_slug_unique` ON `tags` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_unique` ON `tags` (`name`);