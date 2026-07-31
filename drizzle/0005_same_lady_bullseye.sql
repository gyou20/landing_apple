CREATE TABLE `content_vlogs` (
	`id` text PRIMARY KEY NOT NULL,
	`draft_title` text NOT NULL,
	`draft_slug` text NOT NULL,
	`draft_category` text NOT NULL,
	`draft_summary` text NOT NULL,
	`draft_body` text NOT NULL,
	`draft_status` text NOT NULL,
	`published_title` text,
	`published_slug` text,
	`published_category` text,
	`published_summary` text,
	`published_body` text,
	`published_status` text,
	`sort_order` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`published_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `content_vlogs_draft_slug_unique` ON `content_vlogs` (`draft_slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `content_vlogs_published_slug_unique` ON `content_vlogs` (`published_slug`);