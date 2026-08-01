ALTER TABLE `content_pages` ADD `draft_summary` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `content_pages` ADD `draft_body` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `content_pages` ADD `published_summary` text;--> statement-breakpoint
ALTER TABLE `content_pages` ADD `published_body` text;