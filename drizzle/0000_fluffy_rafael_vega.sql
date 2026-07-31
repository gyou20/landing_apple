CREATE TABLE `section_backgrounds` (
	`section_id` text PRIMARY KEY NOT NULL,
	`draft_key` text,
	`draft_content_type` text,
	`draft_original_name` text,
	`published_key` text,
	`published_content_type` text,
	`updated_at` text NOT NULL,
	`published_at` text
);
