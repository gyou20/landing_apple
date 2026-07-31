import { sqliteTable, text } from "drizzle-orm/sqlite-core";

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