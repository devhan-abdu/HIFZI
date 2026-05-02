PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_page_performance` (
	`page_number` integer NOT NULL,
	`user_id` text NOT NULL,
	`strength` real DEFAULT 0 NOT NULL,
	`last_reviewed_at` text,
	`next_review_at` text,
	`stability` real DEFAULT 1 NOT NULL,
	`difficulty` real DEFAULT 1 NOT NULL,
	`consecutive_perfects` integer DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`user_id`, `page_number`)
);
--> statement-breakpoint
INSERT INTO `__new_page_performance`("page_number", "user_id", "strength", "last_reviewed_at", "next_review_at", "stability", "difficulty", "consecutive_perfects", "updated_at") SELECT "page_number", "user_id", "strength", "last_reviewed_at", "next_review_at", "stability", "difficulty", "consecutive_perfects", "updated_at" FROM `page_performance`;--> statement-breakpoint
DROP TABLE `page_performance`;--> statement-breakpoint
ALTER TABLE `__new_page_performance` RENAME TO `page_performance`;--> statement-breakpoint
PRAGMA foreign_keys=ON;