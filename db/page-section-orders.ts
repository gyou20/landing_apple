import { getContentSectionDb, type D1DatabaseLike } from "./content-sections.ts";

export const DEFAULT_PAGE_SECTION_ORDERS: Record<string, string[]> = {
  home: ["home-section-01", "home-section-02", "home-section-03", "home-section-04", "home-section-05", "home-section-06"],
  contact: ["contact-intro", "contact-form"],
  vlog: ["vlog-intro", "vlog-article-list"],
};

export type PageSectionOrderRecord = {
  pageId: string;
  draftOrder: string[];
  publishedOrder: string[] | null;
  updatedAt: string;
  publishedAt: string | null;
};

type SectionOrderRow = {
  page_id: string;
  draft_order: string;
  published_order: string | null;
  updated_at: string;
  published_at: string | null;
};

const CREATE_SQL = `CREATE TABLE IF NOT EXISTS page_section_orders (
  page_id TEXT PRIMARY KEY NOT NULL,
  draft_order TEXT NOT NULL,
  published_order TEXT,
  updated_at TEXT NOT NULL,
  published_at TEXT
)`;
const PAGE_ID_PATTERN = /^(home|contact|vlog|page-[a-f0-9-]{36})$/;
const FIXED_SECTION_ID_PATTERN = /^(home-section-\d{2}|contact-[a-z0-9-]{1,48}|vlog-[a-z0-9-]{1,48})$/;
const DYNAMIC_SECTION_ID_PATTERN = /^section-[a-f0-9-]{36}$/;

function validSectionId(value: string) {
  return FIXED_SECTION_ID_PATTERN.test(value) || DYNAMIC_SECTION_ID_PATTERN.test(value);
}

export function validatePageSectionOrder(pageIdInput: unknown, sectionIdsInput: unknown) {
  const pageId = String(pageIdInput ?? "");
  if (!PAGE_ID_PATTERN.test(pageId)) throw new Error("invalid-section-order-page");
  if (!Array.isArray(sectionIdsInput) || sectionIdsInput.length > 100) throw new Error("invalid-section-order");
  const sectionIds = sectionIdsInput.map((value) => String(value));
  if (sectionIds.some((id) => !validSectionId(id)) || new Set(sectionIds).size !== sectionIds.length) throw new Error("invalid-section-order");
  return { pageId, sectionIds };
}

export function mergePageSectionOrder(storedOrder: string[] | null | undefined, availableIds: string[]) {
  const available = new Set(availableIds);
  const ordered = (storedOrder ?? []).filter((id) => available.has(id));
  const included = new Set(ordered);
  return [...ordered, ...availableIds.filter((id) => !included.has(id))];
}

function parseOrder(value: string | null) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return null;
    const ids = parsed.map((item) => String(item));
    return ids.every(validSectionId) && new Set(ids).size === ids.length ? ids : null;
  } catch {
    return null;
  }
}

function mapRow(row: SectionOrderRow): PageSectionOrderRecord {
  return {
    pageId: row.page_id,
    draftOrder: parseOrder(row.draft_order) ?? [],
    publishedOrder: parseOrder(row.published_order),
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
  };
}

export async function getPageSectionOrderDb() {
  return getContentSectionDb();
}

export async function ensurePageSectionOrdersTable(db: D1DatabaseLike) {
  await db.prepare(CREATE_SQL).run();
}

export async function listPageSectionOrders(db: D1DatabaseLike) {
  await ensurePageSectionOrdersTable(db);
  const rows = (await db.prepare("SELECT * FROM page_section_orders ORDER BY page_id").all<SectionOrderRow>()).results ?? [];
  return rows.map(mapRow);
}

export async function getPageSectionOrder(db: D1DatabaseLike, pageId: string) {
  if (!PAGE_ID_PATTERN.test(pageId)) throw new Error("invalid-section-order-page");
  await ensurePageSectionOrdersTable(db);
  const row = await db.prepare("SELECT * FROM page_section_orders WHERE page_id = ?").bind(pageId).first<SectionOrderRow>();
  return row ? mapRow(row) : null;
}

export async function saveDraftPageSectionOrder(db: D1DatabaseLike, pageIdInput: unknown, sectionIdsInput: unknown) {
  const { pageId, sectionIds } = validatePageSectionOrder(pageIdInput, sectionIdsInput);
  await ensurePageSectionOrdersTable(db);
  const now = new Date().toISOString();
  await db.prepare(`INSERT INTO page_section_orders (page_id, draft_order, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(page_id) DO UPDATE SET draft_order = excluded.draft_order, updated_at = excluded.updated_at`)
    .bind(pageId, JSON.stringify(sectionIds), now).run();
  console.info("[section-order:draft-saved]", { pageId, sectionIds, updatedAt: now });
  return (await getPageSectionOrder(db, pageId))!;
}

export async function publishPageSectionOrder(db: D1DatabaseLike, pageId: string) {
  if (!PAGE_ID_PATTERN.test(pageId)) throw new Error("invalid-section-order-page");
  await ensurePageSectionOrdersTable(db);
  const now = new Date().toISOString();
  const result = await db.prepare(`UPDATE page_section_orders SET
    published_order = draft_order, published_at = ?, updated_at = ?
    WHERE page_id = ? AND (published_order IS NULL OR published_order != draft_order)`)
    .bind(now, now, pageId).run();
  return { publishedCount: result.meta?.changes ?? 0, publishedAt: now, pageId };
}

export async function publishAllPageSectionOrders(db: D1DatabaseLike) {
  await ensurePageSectionOrdersTable(db);
  const now = new Date().toISOString();
  const result = await db.prepare(`UPDATE page_section_orders SET
    published_order = draft_order, published_at = ?, updated_at = ?
    WHERE published_order IS NULL OR published_order != draft_order`)
    .bind(now, now).run();
  return { publishedCount: result.meta?.changes ?? 0, publishedAt: now };
}

export async function loadPublishedPageSectionOrder(pageId: string, availableIds: string[]) {
  const record = await getPageSectionOrder(await getPageSectionOrderDb(), pageId);
  const fallback = DEFAULT_PAGE_SECTION_ORDERS[pageId] ?? availableIds;
  return mergePageSectionOrder(record?.publishedOrder ?? fallback, availableIds);
}