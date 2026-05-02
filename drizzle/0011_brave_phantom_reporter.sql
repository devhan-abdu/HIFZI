PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_page_activity_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`page_id` integer NOT NULL,
	`source` text NOT NULL,
	`local_log_id` integer DEFAULT 0 NOT NULL,
	`log_date` text DEFAULT '' NOT NULL,
	`session_quality` text NOT NULL,
	`mistakes_count` integer DEFAULT 0,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_page_activity_logs`("id", "user_id", "page_id", "source", "local_log_id", "log_date", "session_quality", "mistakes_count", "created_at") SELECT "id", "user_id", "page_id", "source", "local_log_id", "log_date", "session_quality", "mistakes_count", "created_at" FROM `page_activity_logs`;--> statement-breakpoint
DROP TABLE `page_activity_logs`;--> statement-breakpoint
ALTER TABLE `__new_page_activity_logs` RENAME TO `page_activity_logs`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_page_activity_user_page` ON `page_activity_logs` (`user_id`,`page_id`);--> statement-breakpoint
CREATE INDEX `idx_page_activity_log_id` ON `page_activity_logs` (`user_id`,`source`,`local_log_id`);--> statement-breakpoint
CREATE INDEX `idx_page_activity_date` ON `page_activity_logs` (`user_id`,`log_date`);--> statement-breakpoint
CREATE TABLE `__new_page_performance` (
	`page_number` integer NOT NULL,
	`user_id` text DEFAULT 'unknown' NOT NULL,
	`strength` real DEFAULT 0 NOT NULL,
	`last_reviewed_at` text,
	`next_review_at` text,
	`stability` real DEFAULT 1 NOT NULL,
	`difficulty` real DEFAULT 1 NOT NULL,
	`consecutive_perfects` integer DEFAULT 0 NOT NULL,
	`last_session_quality` text,
	`last_mistakes_count` integer DEFAULT 0,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`user_id`, `page_number`)
);
--> statement-breakpoint
INSERT INTO `__new_page_performance`("page_number", "user_id", "strength", "last_reviewed_at", "next_review_at", "stability", "difficulty", "consecutive_perfects", "last_session_quality", "last_mistakes_count", "updated_at") SELECT "page_number", "user_id", "strength", "last_reviewed_at", "next_review_at", "stability", "difficulty", "consecutive_perfects", "last_session_quality", "last_mistakes_count", "updated_at" FROM `page_performance`;--> statement-breakpoint
DROP TABLE `page_performance`;--> statement-breakpoint
ALTER TABLE `__new_page_performance` RENAME TO `page_performance`;