CREATE TABLE `test_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`plan_id` integer,
	`type` text NOT NULL,
	`pages_range` text NOT NULL,
	`score` real NOT NULL,
	`total_questions` integer NOT NULL,
	`date` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `test_logs_user_date_idx` ON `test_logs` (`user_id`,`date`);--> statement-breakpoint
ALTER TABLE `user_stats` ADD `has_recovery_shield` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `user_stats` ADD `last_test_date` text;