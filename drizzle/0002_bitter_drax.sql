ALTER TABLE `hifz_plans_local` ADD `completed_pages` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `hifz_plans_local` ADD `missed_days_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `hifz_plans_local` ADD `perfect_days_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `weekly_muraja_plan` ADD `completed_pages` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `weekly_muraja_plan` ADD `missed_days_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `weekly_muraja_plan` ADD `perfect_days_count` integer DEFAULT 0 NOT NULL;