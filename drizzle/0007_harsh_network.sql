CREATE TABLE `change_history` (
	`id` text PRIMARY KEY NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`entity_title` text NOT NULL,
	`summary` text NOT NULL,
	`actor_email` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `section_backgrounds` ADD `published_original_name` text;