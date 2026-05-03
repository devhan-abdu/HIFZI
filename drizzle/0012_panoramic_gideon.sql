ALTER TABLE `page_activity_logs` ADD `hesitations_count` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `hifz_plans_local` ADD `is_reinforcement_enabled` integer DEFAULT true;--> statement-breakpoint
ALTER TABLE `page_performance` ADD `last_hesitations_count` integer DEFAULT 0;