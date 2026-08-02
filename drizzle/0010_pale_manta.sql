CREATE TABLE `page_section_orders` (
	`page_id` text PRIMARY KEY NOT NULL,
	`draft_order` text NOT NULL,
	`published_order` text,
	`updated_at` text NOT NULL,
	`published_at` text
);
