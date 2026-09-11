CREATE TABLE `project_items` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`category` text DEFAULT 'seed-mix' NOT NULL,
	`quantity_milli` integer DEFAULT 1000 NOT NULL,
	`unit` text DEFAULT '' NOT NULL,
	`unit_cost_cents` integer DEFAULT 0 NOT NULL,
	`billable` integer DEFAULT true NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`source_url` text DEFAULT '' NOT NULL,
	`image_key` text,
	`archived` integer DEFAULT false NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_project_items_project_id` ON `project_items` (`project_id`);