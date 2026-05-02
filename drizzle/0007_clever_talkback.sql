DROP INDEX `idx_page_activity_created_at`;--> statement-breakpoint
ALTER TABLE `page_activity_logs` ADD `local_log_id` integer NOT NULL;--> statement-breakpoint
ALTER TABLE `page_activity_logs` ADD `log_date` text NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_page_activity_log_id` ON `page_activity_logs` (`user_id`,`source`,`local_log_id`);--> statement-breakpoint
CREATE INDEX `idx_page_activity_date` ON `page_activity_logs` (`user_id`,`log_date`);