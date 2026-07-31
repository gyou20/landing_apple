CREATE TABLE `content_sections` (
	`id` text PRIMARY KEY NOT NULL,
	`page_id` text NOT NULL,
	`draft_title` text NOT NULL,
	`draft_content` text NOT NULL,
	`draft_status` text NOT NULL,
	`published_title` text,
	`published_content` text,
	`published_status` text,
	`sort_order` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`published_at` text
);
