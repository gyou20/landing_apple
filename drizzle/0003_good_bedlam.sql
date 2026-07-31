CREATE TABLE `content_pages` (
	`id` text PRIMARY KEY NOT NULL,
	`draft_title` text NOT NULL,
	`draft_slug` text NOT NULL,
	`draft_type` text NOT NULL,
	`draft_status` text NOT NULL,
	`published_title` text,
	`published_slug` text,
	`published_type` text,
	`published_status` text,
	`sort_order` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`published_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `content_pages_draft_slug_unique` ON `content_pages` (`draft_slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `content_pages_published_slug_unique` ON `content_pages` (`published_slug`);