import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const sectionBackgrounds = sqliteTable("section_backgrounds", {
  sectionId: text("section_id").primaryKey(),
  draftKey: text("draft_key"),
  draftContentType: text("draft_content_type"),
  draftOriginalName: text("draft_original_name"),
  publishedKey: text("published_key"),
  publishedContentType: text("published_content_type"),
  publishedOriginalName: text("published_original_name"),
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

export const contentPages = sqliteTable("content_pages", {
  id: text("id").primaryKey(),
  draftTitle: text("draft_title").notNull(),
  draftSlug: text("draft_slug").notNull().unique(),
  draftType: text("draft_type").notNull(),
  draftSummary: text("draft_summary").notNull().default(""),
  draftBody: text("draft_body").notNull().default(""),
  draftStatus: text("draft_status").notNull(),
  publishedTitle: text("published_title"),
  publishedSlug: text("published_slug").unique(),
  publishedType: text("published_type"),
  publishedSummary: text("published_summary"),
  publishedBody: text("published_body"),
  publishedStatus: text("published_status"),
  sortOrder: integer("sort_order").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  publishedAt: text("published_at"),
});
export const contentSections = sqliteTable("content_sections", {
  id: text("id").primaryKey(),
  pageId: text("page_id").notNull(),
  draftTitle: text("draft_title").notNull(),
  draftContent: text("draft_content").notNull(),
  draftStatus: text("draft_status").notNull(),
  publishedTitle: text("published_title"),
  publishedContent: text("published_content"),
  publishedStatus: text("published_status"),
  sortOrder: integer("sort_order").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  publishedAt: text("published_at"),
});
export const pageSectionOrders = sqliteTable("page_section_orders", {
  pageId: text("page_id").primaryKey(),
  draftOrder: text("draft_order").notNull(),
  publishedOrder: text("published_order"),
  updatedAt: text("updated_at").notNull(),
  publishedAt: text("published_at"),
});

export const contentVlogs = sqliteTable("content_vlogs", {
  id: text("id").primaryKey(),
  draftTitle: text("draft_title").notNull(),
  draftSlug: text("draft_slug").notNull().unique(),
  draftCategory: text("draft_category").notNull(),
  draftSummary: text("draft_summary").notNull(),
  draftBody: text("draft_body").notNull(),
  draftStatus: text("draft_status").notNull(),
  publishedTitle: text("published_title"),
  publishedSlug: text("published_slug").unique(),
  publishedCategory: text("published_category"),
  publishedSummary: text("published_summary"),
  publishedBody: text("published_body"),
  publishedStatus: text("published_status"),
  sortOrder: integer("sort_order").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  publishedAt: text("published_at"),
});
export const changeHistory = sqliteTable("change_history", {
  id: text("id").primaryKey(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  entityTitle: text("entity_title").notNull(),
  summary: text("summary").notNull(),
  actorEmail: text("actor_email").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [
  index("idx_change_history_created_at").on(table.createdAt),
  index("idx_change_history_entity").on(table.entityType, table.entityId, table.createdAt),
]);
export const contactSubmissions = sqliteTable("contact_submissions", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  company: text("company").notNull().default(""),
  email: text("email").notNull(),
  inquiryType: text("inquiry_type").notNull(),
  budget: text("budget").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("new"),
  createdAt: text("created_at").notNull(),
}, (table) => [
  index("idx_contact_submissions_status_created_at").on(table.status, table.createdAt),
]);