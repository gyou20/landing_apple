CREATE TABLE `content_visibility` (
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`draft_menu_visible` integer NOT NULL,
	`draft_search_indexable` integer NOT NULL,
	`published_menu_visible` integer NOT NULL,
	`published_search_indexable` integer NOT NULL,
	`updated_at` text NOT NULL,
	`published_at` text,
	PRIMARY KEY(`entity_type`, `entity_id`)
);
