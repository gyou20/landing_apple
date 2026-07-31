CREATE TABLE `content_deletions` (
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`draft_deleted` integer NOT NULL,
	`published_deleted` integer NOT NULL,
	`operation_id` text NOT NULL,
	`requested_by` text NOT NULL,
	`pending_at` text NOT NULL,
	`published_at` text,
	`delete_after` text,
	`restored_at` text,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`entity_type`, `entity_id`)
);
--> statement-breakpoint
CREATE TABLE `deletion_authorizations` (
	`authorization_id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`actor_email` text NOT NULL,
	`operation` text NOT NULL,
	`target_hash` text NOT NULL,
	`target_json` text NOT NULL,
	`target_count` integer NOT NULL,
	`issued_at` text NOT NULL,
	`expires_at` text NOT NULL,
	`consumed_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `deletion_authorizations_token_hash_unique` ON `deletion_authorizations` (`token_hash`);