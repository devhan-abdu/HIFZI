CREATE TABLE `plan_achievements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`plan_type` text NOT NULL,
	`local_ref_id` integer NOT NULL,
	`achievement_type` text NOT NULL,
	`seen_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_plan_achievements_user_plan` ON `plan_achievements` (`user_id`,`plan_type`,`local_ref_id`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_quran_activity_plans` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`activity_type` text NOT NULL,
	`local_ref_id` integer,
	`title` text,
	`start_date` text,
	`end_date` text,
	`status` text DEFAULT 'active' NOT NULL,
	`metadata` text,
	`evaluation_day` integer DEFAULT 7 NOT NULL,
	`remote_id` text,
	`is_synced` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_quran_activity_plans`("id", "user_id", "activity_type", "local_ref_id", "title", "start_date", "end_date", "status", "metadata", "evaluation_day", "remote_id", "is_synced", "created_at", "updated_at") SELECT "id", "user_id", "activity_type", "local_ref_id", "title", "start_date", "end_date", "status", "metadata", "evaluation_day", "remote_id", "is_synced", "created_at", "updated_at" FROM `quran_activity_plans`;--> statement-breakpoint
DROP TABLE `quran_activity_plans`;--> statement-breakpoint
ALTER TABLE `__new_quran_activity_plans` RENAME TO `quran_activity_plans`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_quran_activity_plans_user_type` ON `quran_activity_plans` (`user_id`,`activity_type`,`status`);--> statement-breakpoint
CREATE TABLE `__new_hifz_plans_local` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`remote_id` text,
	`user_id` text NOT NULL,
	`start_surah` integer NOT NULL,
	`start_page` integer NOT NULL,
	`total_pages` integer NOT NULL,
	`pages_per_day` real NOT NULL,
	`selected_days` text NOT NULL,
	`days_per_week` integer NOT NULL,
	`start_date` text NOT NULL,
	`estimated_end_date` text NOT NULL,
	`direction` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`sync_status` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`preferred_time` text,
	`is_custom_time` integer DEFAULT false,
	`is_reinforcement_enabled` integer DEFAULT true,
	`evaluation_day` integer DEFAULT 7 NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_hifz_plans_local`("id", "remote_id", "user_id", "start_surah", "start_page", "total_pages", "pages_per_day", "selected_days", "days_per_week", "start_date", "estimated_end_date", "direction", "status", "sync_status", "created_at", "updated_at", "preferred_time", "is_custom_time", "is_reinforcement_enabled", "evaluation_day") SELECT "id", "remote_id", "user_id", "start_surah", "start_page", "total_pages", "pages_per_day", "selected_days", "days_per_week", "start_date", "estimated_end_date", "direction", "status", "sync_status", "created_at", "updated_at", "preferred_time", "is_custom_time", "is_reinforcement_enabled", "evaluation_day" FROM `hifz_plans_local`;--> statement-breakpoint
DROP TABLE `hifz_plans_local`;--> statement-breakpoint
ALTER TABLE `__new_hifz_plans_local` RENAME TO `hifz_plans_local`;--> statement-breakpoint
CREATE INDEX `idx_hifz_plans_local_user` ON `hifz_plans_local` (`user_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_hifz_plans_local_user_id` ON `hifz_plans_local` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_hifz_plans_local_sync` ON `hifz_plans_local` (`sync_status`);--> statement-breakpoint
CREATE TABLE `__new_weekly_muraja_plan` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`remote_id` text,
	`user_id` text,
	`week_start_date` text,
	`week_end_date` text,
	`planned_pages_per_day` integer,
	`start_page` integer,
	`end_page` integer,
	`is_active` integer DEFAULT true,
	`selected_days` text,
	`sync_status` integer DEFAULT 1,
	`estimated_time_min` integer,
	`place` text,
	`note` text,
	`preferred_time` text,
	`is_custom_time` integer DEFAULT false,
	`evaluation_day` integer DEFAULT 6 NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_weekly_muraja_plan`("id", "remote_id", "user_id", "week_start_date", "week_end_date", "planned_pages_per_day", "start_page", "end_page", "is_active", "selected_days", "sync_status", "estimated_time_min", "place", "note", "preferred_time", "is_custom_time", "evaluation_day") SELECT "id", "remote_id", "user_id", "week_start_date", "week_end_date", "planned_pages_per_day", "start_page", "end_page", "is_active", "selected_days", "sync_status", "estimated_time_min", "place", "note", "preferred_time", "is_custom_time", "evaluation_day" FROM `weekly_muraja_plan`;--> statement-breakpoint
DROP TABLE `weekly_muraja_plan`;--> statement-breakpoint
ALTER TABLE `__new_weekly_muraja_plan` RENAME TO `weekly_muraja_plan`;--> statement-breakpoint
CREATE INDEX `idx_weekly_muraja_plan_user_id` ON `weekly_muraja_plan` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_weekly_muraja_plan_active_user` ON `weekly_muraja_plan` (`user_id`,`is_active`);