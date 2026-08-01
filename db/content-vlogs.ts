export type VlogContent = { title: string; slug: string; category: string; summary: string; body: string };
export type ContentVlogRecord = {
  id: string;
  draft: VlogContent & { status: "draft" | "published" };
  published: (VlogContent & { status: "published" }) | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};

type D1Result<T> = { results?: T[]; meta?: { changes?: number } };
type D1Statement = { bind(...values: unknown[]): D1Statement; first<T>(): Promise<T | null>; all<T>(): Promise<D1Result<T>>; run(): Promise<D1Result<unknown>> };
export type D1DatabaseLike = { prepare(sql: string): D1Statement };
type VlogRow = {
  id: string; draft_title: string; draft_slug: string; draft_category: string; draft_summary: string; draft_body: string; draft_status: "draft" | "published";
  published_title: string | null; published_slug: string | null; published_category: string | null; published_summary: string | null; published_body: string | null; published_status: "published" | null;
  sort_order: number; created_at: string; updated_at: string; published_at: string | null;
};

const CREATE_SQL = `CREATE TABLE IF NOT EXISTS content_vlogs (
  id TEXT PRIMARY KEY NOT NULL,
  draft_title TEXT NOT NULL,
  draft_slug TEXT NOT NULL UNIQUE,
  draft_category TEXT NOT NULL,
  draft_summary TEXT NOT NULL,
  draft_body TEXT NOT NULL,
  draft_status TEXT NOT NULL,
  published_title TEXT,
  published_slug TEXT UNIQUE,
  published_category TEXT,
  published_summary TEXT,
  published_body TEXT,
  published_status TEXT,
  sort_order INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  published_at TEXT
)`;
const VLOG_ID_PATTERN = /^vlog-[a-f0-9-]{36}$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RESERVED_SLUGS = new Set(["brand-strategy", "creative", "culture"]);

export async function getContentVlogDb(): Promise<D1DatabaseLike> {
  const { env } = await import("cloudflare:workers");
  const db = (env as unknown as { DB?: D1DatabaseLike }).DB;
  if (!db) throw new Error("Vlog storage requires the DB binding.");
  return db;
}

export async function ensureContentVlogsTable(db: D1DatabaseLike) {
  await db.prepare(CREATE_SQL).run();
}

function limited(value: unknown, field: string, max: number, required = true) {
  const result = String(value ?? "").trim();
  if ((required && !result) || result.length > max) throw new Error(`invalid-vlog-${field}`);
  return result;
}

export function normalizeVlogSlug(input: unknown) {
  const value = String(input ?? "").trim().toLowerCase().replace(/^\/+|\/+$/g, "");
  if (!SLUG_PATTERN.test(value) || RESERVED_SLUGS.has(value)) throw new Error("invalid-vlog-slug");
  return value;
}

export function validateVlogDraft(input: Record<string, unknown>): VlogContent {
  return {
    title: limited(input.title, "title", 160),
    slug: normalizeVlogSlug(input.slug),
    category: limited(input.category, "category", 80),
    summary: limited(input.summary, "summary", 500, false),
    body: limited(input.body, "body", 20_000, false),
  };
}

function mapRow(row: VlogRow): ContentVlogRecord {
  return {
    id: row.id,
    draft: { title: row.draft_title, slug: row.draft_slug, category: row.draft_category, summary: row.draft_summary, body: row.draft_body, status: row.draft_status },
    published: row.published_title && row.published_slug && row.published_category && row.published_summary !== null && row.published_body !== null && row.published_status
      ? { title: row.published_title, slug: row.published_slug, category: row.published_category, summary: row.published_summary, body: row.published_body, status: row.published_status }
      : null,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
  };
}

export async function listContentVlogs(db: D1DatabaseLike) {
  await ensureContentVlogsTable(db);
  const rows = (await db.prepare("SELECT * FROM content_vlogs ORDER BY sort_order, created_at").all<VlogRow>()).results ?? [];
  return rows.map(mapRow);
}

export async function createContentVlog(db: D1DatabaseLike, input: Record<string, unknown>) {
  await ensureContentVlogsTable(db);
  const draft = validateVlogDraft(input);
  const id = `vlog-${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  const order = await db.prepare("SELECT COALESCE(MAX(sort_order), 99) + 1 AS next_order FROM content_vlogs").first<{ next_order: number }>();
  try {
    await db.prepare("INSERT INTO content_vlogs (id, draft_title, draft_slug, draft_category, draft_summary, draft_body, draft_status, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)")
      .bind(id, draft.title, draft.slug, draft.category, draft.summary, draft.body, order?.next_order ?? 100, now, now).run();
  } catch (error) {
    if (String(error).toLowerCase().includes("unique")) throw new Error("vlog-slug-already-exists");
    throw error;
  }
  return (await getContentVlog(db, id))!;
}

export async function getContentVlog(db: D1DatabaseLike, id: string) {
  if (!VLOG_ID_PATTERN.test(id)) throw new Error("invalid-vlog-id");
  await ensureContentVlogsTable(db);
  const row = await db.prepare("SELECT * FROM content_vlogs WHERE id = ?").bind(id).first<VlogRow>();
  return row ? mapRow(row) : null;
}

export async function updateContentVlogDraft(db: D1DatabaseLike, id: string, input: Record<string, unknown>) {
  if (!VLOG_ID_PATTERN.test(id)) throw new Error("invalid-vlog-id");
  await ensureContentVlogsTable(db);
  const draft = validateVlogDraft(input);
  const now = new Date().toISOString();
  try {
    const result = await db.prepare("UPDATE content_vlogs SET draft_title = ?, draft_slug = ?, draft_category = ?, draft_summary = ?, draft_body = ?, draft_status = 'draft', updated_at = ? WHERE id = ?")
      .bind(draft.title, draft.slug, draft.category, draft.summary, draft.body, now, id).run();
    if ((result.meta?.changes ?? 0) !== 1) throw new Error("vlog-not-found");
  } catch (error) {
    if (String(error).toLowerCase().includes("unique")) throw new Error("vlog-slug-already-exists");
    throw error;
  }
  return (await getContentVlog(db, id))!;
}

export async function publishContentVlogs(db: D1DatabaseLike) {
  await ensureContentVlogsTable(db);
  const now = new Date().toISOString();
  const result = await db.prepare(`UPDATE content_vlogs SET
    published_title = draft_title, published_slug = draft_slug, published_category = draft_category,
    published_summary = draft_summary, published_body = draft_body, published_status = 'published',
    draft_status = 'published', published_at = ?, updated_at = ?
    WHERE published_title IS NULL OR published_title != draft_title OR published_slug != draft_slug OR published_category != draft_category OR published_summary != draft_summary OR published_body != draft_body`)
    .bind(now, now).run();
  return { publishedCount: result.meta?.changes ?? 0, publishedAt: now };
}

export async function publishContentVlog(db: D1DatabaseLike, id: string) {
  if (!VLOG_ID_PATTERN.test(id)) throw new Error("invalid-vlog-id");
  await ensureContentVlogsTable(db);
  const now = new Date().toISOString();
  const result = await db.prepare(`UPDATE content_vlogs SET
    published_title = draft_title, published_slug = draft_slug, published_category = draft_category,
    published_summary = draft_summary, published_body = draft_body, published_status = 'published',
    draft_status = 'published', published_at = ?, updated_at = ?
    WHERE id = ? AND (published_title IS NULL OR published_title != draft_title OR published_slug != draft_slug OR published_category != draft_category OR published_summary != draft_summary OR published_body != draft_body)`)
    .bind(now, now, id).run();
  if ((result.meta?.changes ?? 0) === 0 && !(await getContentVlog(db, id))) throw new Error("vlog-not-found");
  return { publishedCount: result.meta?.changes ?? 0, publishedAt: now, vlogId: id };
}
export async function getPublishedContentVlogBySlug(db: D1DatabaseLike, slug: string) {
  await ensureContentVlogsTable(db);
  const row = await db.prepare("SELECT * FROM content_vlogs WHERE published_slug = ? AND published_status = 'published'").bind(slug).first<VlogRow>();
  return row ? mapRow(row) : null;
}
