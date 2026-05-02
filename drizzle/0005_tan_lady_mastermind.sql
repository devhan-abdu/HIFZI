CREATE TABLE `page_activity_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`page_id` integer NOT NULL,
	`source` text NOT NULL,
	`session_quality` text NOT NULL,
	`mistakes_count` integer DEFAULT 0,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_page_activity_user_page` ON `page_activity_logs` (`user_id`,`page_id`);--> statement-breakpoint
CREATE INDEX `idx_page_activity_created_at` ON `page_activity_logs` (`created_at`);