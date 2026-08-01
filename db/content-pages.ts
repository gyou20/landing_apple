export type PageType = "Custom page" | "Block page" | "Article page";
export type PageContent = { title: string; slug: string; type: PageType; summary: string; body: string };
export type ContentPageRecord = {
  id: string;
  draft: PageContent & { status: "draft" | "published" };
  published: (PageContent & { status: "published" }) | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};

type D1Result<T> = { results?: T[]; meta?: { changes?: number } };
type D1Statement = { bind(...values: unknown[]): D1Statement; first<T>(): Promise<T | null>; all<T>(): Promise<D1Result<T>>; run(): Promise<D1Result<unknown>> };
export type D1DatabaseLike = { prepare(sql: string): D1Statement };
type PageRow = {
  id: string; draft_title: string; draft_slug: string; draft_type: PageType; draft_summary: string; draft_body: string; draft_status: "draft" | "published";
  published_title: string | null; published_slug: string | null; published_type: PageType | null; published_summary: string | null; published_body: string | null; published_status: "published" | null;
  sort_order: number; created_at: string; updated_at: string; published_at: string | null;
};

const CREATE_SQL = `CREATE TABLE IF NOT EXISTS content_pages (
  id TEXT PRIMARY KEY NOT NULL,
  draft_title TEXT NOT NULL,
  draft_slug TEXT NOT NULL UNIQUE,
  draft_type TEXT NOT NULL,
  draft_summary TEXT NOT NULL DEFAULT '',
  draft_body TEXT NOT NULL DEFAULT '',
  draft_status TEXT NOT NULL,
  published_title TEXT,
  published_slug TEXT UNIQUE,
  published_type TEXT,
  published_summary TEXT,
  published_body TEXT,
  published_status TEXT,
  sort_order INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  published_at TEXT
)`;
const PAGE_ID_PATTERN = /^page-[a-f0-9-]{36}$/;
const SLUG_PATTERN = /^\/[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RESERVED_SLUGS = new Set(["/", "/admin", "/api", "/home", "/contact", "/vlog"]);
const PAGE_TYPES = new Set<PageType>(["Custom page", "Block page", "Article page"]);
const CONTENT_COLUMNS = [
  "ALTER TABLE content_pages ADD COLUMN draft_summary TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE content_pages ADD COLUMN draft_body TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE content_pages ADD COLUMN published_summary TEXT",
  "ALTER TABLE content_pages ADD COLUMN published_body TEXT",
];

export async function getContentPageDb(): Promise<D1DatabaseLike> {
  const { env } = await import("cloudflare:workers");
  const db = (env as unknown as { DB?: D1DatabaseLike }).DB;
  if (!db) throw new Error("Page storage requires the DB binding.");
  return db;
}

export async function ensureContentPagesTable(db: D1DatabaseLike) {
  await db.prepare(CREATE_SQL).run();
  for (const sql of CONTENT_COLUMNS) {
    try { await db.prepare(sql).run(); }
    catch (error) {
      if (!String(error).toLowerCase().includes("duplicate column")) throw error;
    }
  }
}

export function normalizePageSlug(input: string) {
  const value = input.trim().toLowerCase();
  const withSlash = value.startsWith("/") ? value : `/${value}`;
  if (!SLUG_PATTERN.test(withSlash) || RESERVED_SLUGS.has(withSlash)) throw new Error("invalid-page-slug");
  return withSlash;
}

function limited(value: unknown, field: string, max: number, required = false) {
  const result = String(value ?? "").trim();
  if ((required && !result) || result.length > max) throw new Error(`invalid-page-${field}`);
  return result;
}

export function validatePageDraft(input: Record<string, unknown>) {
  const title = limited(input.title, "title", 120, true);
  const slug = normalizePageSlug(String(input.slug ?? ""));
  const type = String(input.type ?? "Custom page");
  if (!PAGE_TYPES.has(type as PageType)) throw new Error("invalid-page-type");
  return {
    title,
    slug,
    type: type as PageType,
    summary: limited(input.summary, "summary", 500),
    body: limited(input.body, "body", 20_000),
  };
}

function mapRow(row: PageRow): ContentPageRecord {
  return {
    id: row.id,
    draft: { title: row.draft_title, slug: row.draft_slug, type: row.draft_type, summary: row.draft_summary ?? "", body: row.draft_body ?? "", status: row.draft_status },
    published: row.published_title && row.published_slug && row.published_type && row.published_status
      ? { title: row.published_title, slug: row.published_slug, type: row.published_type, summary: row.published_summary ?? "", body: row.published_body ?? "", status: row.published_status }
      : null,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
  };
}

export async function listContentPages(db: D1DatabaseLike) {
  await ensureContentPagesTable(db);
  const rows = (await db.prepare("SELECT * FROM content_pages ORDER BY sort_order, created_at").all<PageRow>()).results ?? [];
  return rows.map(mapRow);
}

export async function createContentPage(db: D1DatabaseLike, input: Record<string, unknown>) {
  await ensureContentPagesTable(db);
  const draft = validatePageDraft(input);
  const id = `page-${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  const order = await db.prepare("SELECT COALESCE(MAX(sort_order), 99) + 1 AS next_order FROM content_pages").first<{ next_order: number }>();
  try {
    await db.prepare("INSERT INTO content_pages (id, draft_title, draft_slug, draft_type, draft_summary, draft_body, draft_status, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)")
      .bind(id, draft.title, draft.slug, draft.type, draft.summary, draft.body, order?.next_order ?? 100, now, now).run();
  } catch (error) {
    if (String(error).toLowerCase().includes("unique")) throw new Error("page-slug-already-exists");
    throw error;
  }
  return (await getContentPage(db, id))!;
}

export async function getContentPage(db: D1DatabaseLike, id: string) {
  if (!PAGE_ID_PATTERN.test(id)) throw new Error("invalid-page-id");
  await ensureContentPagesTable(db);
  const row = await db.prepare("SELECT * FROM content_pages WHERE id = ?").bind(id).first<PageRow>();
  return row ? mapRow(row) : null;
}

export async function updateContentPageDraft(db: D1DatabaseLike, id: string, input: Record<string, unknown>) {
  if (!PAGE_ID_PATTERN.test(id)) throw new Error("invalid-page-id");
  await ensureContentPagesTable(db);
  const draft = validatePageDraft(input);
  const now = new Date().toISOString();
  try {
    const result = await db.prepare("UPDATE content_pages SET draft_title = ?, draft_slug = ?, draft_type = ?, draft_summary = ?, draft_body = ?, draft_status = 'draft', updated_at = ? WHERE id = ?")
      .bind(draft.title, draft.slug, draft.type, draft.summary, draft.body, now, id).run();
    if ((result.meta?.changes ?? 0) !== 1) throw new Error("page-not-found");
  } catch (error) {
    if (String(error).toLowerCase().includes("unique")) throw new Error("page-slug-already-exists");
    throw error;
  }
  return (await getContentPage(db, id))!;
}

export async function publishContentPages(db: D1DatabaseLike) {
  await ensureContentPagesTable(db);
  const now = new Date().toISOString();
  const result = await db.prepare(`UPDATE content_pages SET
    published_title = draft_title, published_slug = draft_slug, published_type = draft_type,
    published_summary = draft_summary, published_body = draft_body,
    published_status = 'published', draft_status = 'published', published_at = ?, updated_at = ?
    WHERE published_title IS NULL OR published_title != draft_title OR published_slug != draft_slug OR published_type != draft_type OR COALESCE(published_summary, '') != draft_summary OR COALESCE(published_body, '') != draft_body`)
    .bind(now, now).run();
  return { publishedCount: result.meta?.changes ?? 0, publishedAt: now };
}

export async function publishContentPage(db: D1DatabaseLike, id: string) {
  if (!PAGE_ID_PATTERN.test(id)) throw new Error("invalid-page-id");
  await ensureContentPagesTable(db);
  const now = new Date().toISOString();
  const result = await db.prepare(`UPDATE content_pages SET
    published_title = draft_title, published_slug = draft_slug, published_type = draft_type,
    published_summary = draft_summary, published_body = draft_body,
    published_status = 'published', draft_status = 'published', published_at = ?, updated_at = ?
    WHERE id = ? AND (published_title IS NULL OR published_title != draft_title OR published_slug != draft_slug OR published_type != draft_type OR COALESCE(published_summary, '') != draft_summary OR COALESCE(published_body, '') != draft_body)`)
    .bind(now, now, id).run();
  if ((result.meta?.changes ?? 0) === 0 && !(await getContentPage(db, id))) throw new Error("page-not-found");
  return { publishedCount: result.meta?.changes ?? 0, publishedAt: now, pageId: id };
}

export async function getPublishedContentPageBySlug(db: D1DatabaseLike, slug: string) {
  await ensureContentPagesTable(db);
  const row = await db.prepare("SELECT * FROM content_pages WHERE published_slug = ? AND published_status = 'published'").bind(slug).first<PageRow>();
  return row ? mapRow(row) : null;
}