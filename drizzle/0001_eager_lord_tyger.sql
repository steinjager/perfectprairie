ALTER TABLE `clients` ADD `revision` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `estimate_items` ADD `unit_cost_cents` integer;--> statement-breakpoint
ALTER TABLE `estimates` ADD `markup_bps` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `estimates` ADD `revision` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `invoice_items` ADD `unit_cost_cents` integer;--> statement-breakpoint
ALTER TABLE `invoices` ADD `markup_bps` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `invoices` ADD `revision` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `public_summary` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `map_json` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `share_token` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `revision` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_projects_share_token` ON `projects` (`share_token`);