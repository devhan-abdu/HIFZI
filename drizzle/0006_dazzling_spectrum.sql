DROP INDEX `unq_user_habit_date`;--> statement-breakpoint
CREATE UNIQUE INDEX `unq_user_habit_date` ON `habit_events` (`user_id`,`habit_type`,`date`);--> statement-breakpoint
DROP INDEX `unq_notif_queue_user_notif`;--> statement-breakpoint
CREATE UNIQUE INDEX `unq_notif_queue_user_notif` ON `notification_queue` (`user_id`,`notification_id`);--> statement-breakpoint
DROP INDEX `unq_user_notification_event`;--> statement-breakpoint
CREATE UNIQUE INDEX `unq_user_notification_event` ON `notifications` (`user_id`,`event_key`);--> statement-breakpoint
DROP INDEX `unq_scheduled_user_event`;--> statement-breakpoint
CREATE UNIQUE INDEX `unq_scheduled_user_event` ON `scheduled_notifications` (`user_id`,`event_key`);--> statement-breakpoint
ALTER TABLE `page_performance` ADD `consecutive_perfects` integer DEFAULT 0 NOT NULL;