CREATE TABLE `todos` (
	`created_at` integer DEFAULT (unixepoch()),
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL
);
