CREATE TABLE `quran_activity_plans` (
    `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    `user_id` text NOT NULL,
    `activity_type` text NOT NULL,
    `local_ref_id` integer,
    `title` text,
    `start_date` text,
    `end_date` text,
    `status` text DEFAULT 'active' NOT NULL,
    `metadata` text,
    `remote_id` text,
    `is_synced` integer DEFAULT 0 NOT NULL,
    `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
    `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_quran_activity_plans_user_type` ON `quran_activity_plans` (`user_id`,`activity_type`,`status`);--> statement-breakpoint
CREATE TABLE `quran_activity_logs` (
    `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    `user_id` text NOT NULL,
    `date` text NOT NULL,
    `activity_type` text NOT NULL,
    `plan_id` integer,
    `local_ref_id` integer,
    `minutes_spent` integer DEFAULT 0 NOT NULL,
    `units_completed` integer DEFAULT 0 NOT NULL,
    `note` text,
    `metadata` text,
    `remote_id` text,
    `is_synced` integer DEFAULT 0 NOT NULL,
    `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
    `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (`plan_id`) REFERENCES `quran_activity_plans`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_quran_activity_logs_user_date` ON `quran_activity_logs` (`user_id`,`date`);--> statement-breakpoint
CREATE INDEX `idx_quran_activity_logs_sync` ON `quran_activity_logs` (`user_id`,`is_synced`);--> statement-breakpoint
CREATE INDEX `idx_quran_activity_logs_type` ON `quran_activity_logs` (`user_id`,`activity_type`,`date`);--> statement-breakpoint
CREATE TABLE `adaptive_guidance_cache` (
    `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    `user_id` text NOT NULL,
    `activity_hash` text NOT NULL,
    `payload` text NOT NULL,
    `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
    `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `adaptive_guidance_cache_user_id_unique` ON `adaptive_guidance_cache` (`user_id`);--> statement-breakpoint
CREATE TABLE `quran_weekly_summary_seen` (
    `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    `user_id` text NOT NULL,
    `week_key` text NOT NULL,
    `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `hifz_plans_local` (
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
    `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_hifz_plans_local_user` ON `hifz_plans_local` (`user_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_hifz_plans_local_user_id` ON `hifz_plans_local` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_hifz_plans_local_sync` ON `hifz_plans_local` (`sync_status`);--> statement-breakpoint
CREATE TABLE `hifz_logs_local` (
    `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    `remote_id` text,
    `user_id` text NOT NULL,
    `hifz_plan_id` integer NOT NULL,
    `actual_start_page` integer NOT NULL,
    `actual_end_page` integer NOT NULL,
    `actual_pages_completed` integer NOT NULL,
    `date` text NOT NULL,
    `log_day` integer NOT NULL,
    `status` text NOT NULL,
    `notes` text,
    `mistakes_count` integer DEFAULT 0 NOT NULL,
    `hesitation_count` integer DEFAULT 0 NOT NULL,
    `quality_score` integer,
    `sync_status` integer DEFAULT 0 NOT NULL,
    `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
    `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_hifz_logs_local_date` ON `hifz_logs_local` (`date`);--> statement-breakpoint
CREATE INDEX `idx_hifz_logs_local_sync` ON `hifz_logs_local` (`sync_status`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_hifz_logs_local_user_plan_date` ON `hifz_logs_local` (`user_id`,`hifz_plan_id`,`date`);--> statement-breakpoint
CREATE TABLE `weekly_muraja_plan` (
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
    `note` text
);
--> statement-breakpoint
CREATE INDEX `idx_weekly_muraja_plan_user_id` ON `weekly_muraja_plan` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_weekly_muraja_plan_active_user` ON `weekly_muraja_plan` (`user_id`,`is_active`);--> statement-breakpoint
CREATE TABLE `daily_muraja_logs` (
    `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    `remote_id` text,
    `plan_id` integer,
    `date` text,
    `completed_pages` integer DEFAULT 0,
    `actual_time_min` integer DEFAULT 0,
    `status` text,
    `is_catchup` integer DEFAULT false,
    `sync_status` integer DEFAULT 0,
    `start_page` integer,
    `mistakes_count` integer DEFAULT 0 NOT NULL,
    `hesitation_count` integer DEFAULT 0 NOT NULL,
    `quality_score` integer,
    FOREIGN KEY (`plan_id`) REFERENCES `weekly_muraja_plan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_daily_muraja_logs_plan_date` ON `daily_muraja_logs` (`plan_id`,`date`);--> statement-breakpoint
CREATE INDEX `idx_daily_muraja_logs_date` ON `daily_muraja_logs` (`date`);--> statement-breakpoint
CREATE INDEX `idx_daily_muraja_logs_sync` ON `daily_muraja_logs` (`sync_status`);--> statement-breakpoint
CREATE TABLE `habit_events` (
    `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    `user_id` text NOT NULL,
    `habit_type` text NOT NULL,
    `status` text NOT NULL,
    `date` text NOT NULL,
    `xp_gained` integer DEFAULT 0 NOT NULL,
    `remote_id` text,
    `sync_status` integer DEFAULT 0 NOT NULL,
    `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
    `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `unq_user_habit_date` ON `habit_events` (`user_id`,`habit_type`,`date`);--> statement-breakpoint
CREATE INDEX `idx_habit_events_user_date` ON `habit_events` (`user_id`,`date`);--> statement-breakpoint
CREATE TABLE `notifications` (
    `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    `user_id` text NOT NULL,
    `type` text NOT NULL,
    `title` text NOT NULL,
    `message` text NOT NULL,
    `is_read` integer DEFAULT 0 NOT NULL,
    `event_key` text NOT NULL,
    `last_notified_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
    `sync_status` integer DEFAULT 0 NOT NULL,
    `remote_id` text,
    `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
    `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `unq_user_notification_event` ON `notifications` (`user_id`,`event_key`);--> statement-breakpoint
CREATE INDEX `idx_notifications_user_created` ON `notifications` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `notification_queue` (
    `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    `user_id` text NOT NULL,
    `notification_id` integer NOT NULL,
    `sync_status` integer DEFAULT 0 NOT NULL,
    `remote_id` text,
    `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `unq_notif_queue_user_notif` ON `notification_queue` (`user_id`,`notification_id`);--> statement-breakpoint
CREATE TABLE `scheduled_notifications` (
    `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    `user_id` text NOT NULL,
    `kind` text NOT NULL,
    `habit_type` text,
    `event_key` text NOT NULL,
    `scheduled_for` text NOT NULL,
    `notification_identifier` text,
    `status` text DEFAULT 'scheduled' NOT NULL,
    `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
    `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `unq_scheduled_user_event` ON `scheduled_notifications` (`user_id`,`event_key`);--> statement-breakpoint
CREATE INDEX `idx_scheduled_user_kind` ON `scheduled_notifications` (`user_id`,`kind`,`scheduled_for`);--> statement-breakpoint
CREATE TABLE `aya` (
    `soraid` integer NOT NULL,
    `ayaid` integer NOT NULL,
    `page` integer,
    `quarter` integer,
    `hezb` integer,
    `joza` integer,
    `sajda` integer,
    `text` text,
    `uthmanitext` integer,
    `searchtext` integer,
    `quarterstart` integer,
    PRIMARY KEY(`soraid`, `ayaid`)
);
--> statement-breakpoint
CREATE INDEX `idx_aya_page` ON `aya` (`page`);--> statement-breakpoint
CREATE INDEX `idx_aya_joza` ON `aya` (`joza`);--> statement-breakpoint
CREATE INDEX `idx_aya_sura` ON `aya` (`soraid`);--> statement-breakpoint
CREATE TABLE `ayah_bbox` (
    `sura` integer,
    `ayah` integer,
    `min_x` integer,
    `max_x` integer,
    `min_y` integer,
    `max_y` integer,
    `page` integer
);
--> statement-breakpoint
CREATE INDEX `idx_ayah_bbox_page` ON `ayah_bbox` (`page`);--> statement-breakpoint
CREATE INDEX `idx_page_sura` ON `ayah_bbox` (`page`,`sura`);--> statement-breakpoint
CREATE TABLE `sora` (
    `soraid` integer PRIMARY KEY NOT NULL,
    `name` text,
    `name_english` text,
    `place` integer
);
--> statement-breakpoint
CREATE TABLE `audio_manifests` (
    `reciter_id` integer NOT NULL,
    `surah_id` integer NOT NULL,
    `local_uri` text,
    `status` text DEFAULT 'idle' NOT NULL,
    `bytes_downloaded` integer DEFAULT 0 NOT NULL,
    `total_bytes` integer,
    `resume_data` text,
    `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY(`reciter_id`, `surah_id`)
);
--> statement-breakpoint
CREATE TABLE `bookmarks_local` (
    `local_id` text PRIMARY KEY NOT NULL,
    `remote_id` text,
    `user_id` text NOT NULL,
    `verse_key` text NOT NULL,
    `page_number` integer NOT NULL,
    `sync_status` text DEFAULT 'pending' NOT NULL,
    `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
    `deleted_at` text,
    `sync_error` text
);
--> statement-breakpoint
CREATE INDEX `idx_bookmarks_local_user_page` ON `bookmarks_local` (`user_id`,`page_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_bookmarks_local_user_verse` ON `bookmarks_local` (`user_id`,`verse_key`);--> statement-breakpoint
CREATE TABLE `quran_download_jobs` (
    `job_id` text PRIMARY KEY NOT NULL,
    `job_type` text NOT NULL,
    `resource_id` text NOT NULL,
    `resource_scope` text,
    `status` text DEFAULT 'queued' NOT NULL,
    `priority` integer DEFAULT 0 NOT NULL,
    `progress` real DEFAULT 0 NOT NULL,
    `bytes_downloaded` integer DEFAULT 0 NOT NULL,
    `total_bytes` integer,
    `local_uri` text,
    `resume_data` text,
    `error_message` text,
    `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
    `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_quran_download_jobs_status_priority` ON `quran_download_jobs` (`status`,`priority`,`created_at`);--> statement-breakpoint
CREATE TABLE `quran_packages` (
    `package_key` text PRIMARY KEY NOT NULL,
    `package_type` text NOT NULL,
    `version` text,
    `status` text DEFAULT 'idle' NOT NULL,
    `progress` real DEFAULT 0 NOT NULL,
    `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `quran_sync_state` (
    `key` text PRIMARY KEY NOT NULL,
    `value` text,
    `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `translation_resources` (
    `translation_id` integer PRIMARY KEY NOT NULL,
    `language` text,
    `name` text NOT NULL,
    `version` text,
    `downloaded` integer DEFAULT 0 NOT NULL,
    `local_path` text,
    `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `page_performance` (
    `page_number` integer PRIMARY KEY NOT NULL,
    `strength` real DEFAULT 0 NOT NULL,
    `last_reviewed_at` text,
    `next_review_at` text,
    `stability` real DEFAULT 1 NOT NULL,
    `difficulty` real DEFAULT 1 NOT NULL,
    `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_badges` (
    `badge_id` text PRIMARY KEY NOT NULL,
    `user_id` text NOT NULL,
    `badge_type` text NOT NULL,
    `achieved_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
    `metadata` text
);
--> statement-breakpoint
CREATE TABLE `user_stats` (
    `user_id` text PRIMARY KEY NOT NULL,
    `muraja_last_page` integer DEFAULT 0 NOT NULL,
    `muraja_current_streak` integer DEFAULT 0 NOT NULL,
    `hifz_last_page` integer DEFAULT 0 NOT NULL,
    `hifz_current_streak` integer DEFAULT 0 NOT NULL,
    `global_longest_streak` integer DEFAULT 0 NOT NULL,
    `total_xp` integer DEFAULT 0 NOT NULL,
    `level` integer DEFAULT 0 NOT NULL,
    `last_notified_at` text,
    `last_activity_date` text
);