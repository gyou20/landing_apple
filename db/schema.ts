import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const sectionBackgrounds = sqliteTable("section_backgrounds", {
  sectionId: text("section_id").primaryKey(),
  draftKey: text("draft_key"),
  draftContentType: text("draft_content_type"),
  draftOriginalName: text("draft_original_name"),
  publishedKey: text("published_key"),
  publishedContentType: text("published_content_type"),
  updatedAt: text("updated_at").notNull(),
  publishedAt: text("published_at"),
});
export const contentVisibility = sqliteTable("content_visibility", {
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  draftMenuVisible: integer("draft_menu_visible", { mode: "boolean" }).notNull(),
  draftSearchIndexable: integer("draft_search_indexable", { mode: "boolean" }).notNull(),
  publishedMenuVisible: integer("published_menu_visible", { mode: "boolean" }).notNull(),
  publishedSearchIndexable: integer("published_search_indexable", { mode: "boolean" }).notNull(),
  updatedAt: text("updated_at").notNull(),
  publishedAt: text("published_at"),
}, (table) => [primaryKey({ columns: [table.entityType, table.entityId] })]);
export const deletionAuthorizations = sqliteTable("deletion_authorizations", {
  authorizationId: text("authorization_id").primaryKey(),
  tokenHash: text("token_hash").notNull().unique(),
  actorEmail: text("actor_email").notNull(),
  operation: text("operation").notNull(),
  targetHash: text("target_hash").notNull(),
  targetJson: text("target_json").notNull(),
  targetCount: integer("target_count").notNull(),
  issuedAt: text("issued_at").notNull(),
  expiresAt: text("expires_at").notNull(),
  consumedAt: text("consumed_at"),
});

export const contentDeletions = sqliteTable("content_deletions", {
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  draftDeleted: integer("draft_deleted", { mode: "boolean" }).notNull(),
  publishedDeleted: integer("published_deleted", { mode: "boolean" }).notNull(),
  operationId: text("operation_id").notNull(),
  requestedBy: text("requested_by").notNull(),
  pendingAt: text("pending_at").notNull(),
  publishedAt: text("published_at"),
  deleteAfter: text("delete_after"),
  restoredAt: text("restored_at"),
  updatedAt: text("updated_at").notNull(),
}, (table) => [primaryKey({ columns: [table.entityType, table.entityId] })]);
