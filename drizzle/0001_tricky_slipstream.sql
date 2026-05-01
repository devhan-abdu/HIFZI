ALTER TABLE `hifz_plans_local` ADD `preferred_time` text;--> statement-breakpoint
ALTER TABLE `hifz_plans_local` ADD `is_custom_time` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `weekly_muraja_plan` ADD `preferred_time` text;--> statement-breakpoint
ALTER TABLE `weekly_muraja_plan` ADD `is_custom_time` integer DEFAULT false;