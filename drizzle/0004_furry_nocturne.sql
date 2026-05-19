ALTER TABLE `images` ADD `deleted_at` integer;--> statement-breakpoint
CREATE INDEX `images_deleted_at_idx` ON `images` (`deleted_at`);