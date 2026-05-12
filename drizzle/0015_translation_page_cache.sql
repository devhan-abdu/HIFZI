ALTER TABLE `translation_resources` ADD `total_pages` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `translation_resources` ADD `download_progress` real DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE TABLE `translation_page_cache` (
	`translation_id` integer NOT NULL,
	`page` integer NOT NULL,
	`data` text NOT NULL,
	`cached_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`translation_id`, `page`)
);--> statement-breakpoint
CREATE TABLE `arabic_page_cache` (
	`page` integer PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`cached_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
