ALTER TABLE `quran_activity_plans` ADD `evaluation_day` integer DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE `hifz_plans_local` ADD `evaluation_day` integer DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE `weekly_muraja_plan` ADD `evaluation_day` integer DEFAULT 5 NOT NULL;