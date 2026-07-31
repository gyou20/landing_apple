export type ContentEntityType = "page" | "section" | "vlog";

export const CONTENT_ENTITY_IDS: Record<ContentEntityType, readonly string[]> = {
  page: ["home", "contact", "vlog"],
  section: ["home-section-01", "home-section-02", "home-section-03", "home-section-04", "home-section-05", "home-section-06", "contact-intro", "contact-form", "vlog-intro", "vlog-article-list"],
  vlog: ["brand-strategy", "creative", "culture"],
};

export function isContentEntity(type: string, id: string): type is ContentEntityType {
  if (type !== "page" && type !== "section" && type !== "vlog") return false;
  if (CONTENT_ENTITY_IDS[type].includes(id)) return true;
  if (type === "page") return /^page-[a-f0-9-]{36}$/.test(id);
  if (type === "section") return /^section-[a-f0-9-]{36}$/.test(id);
  return /^vlog-[a-f0-9-]{36}$/.test(id);
}