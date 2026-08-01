export type SectionBlock =
  | { id: string; type: "text"; text: string }
  | { id: string; type: "button"; label: string; href: string }
  | { id: string; type: "image"; src: string; alt: string };

export type SectionContent = {
  eyebrow: string;
  headlinePrimary: string;
  headlineAccent: string;
  subheadline: string;
  description: string;
  ctaLabel: string;
  blocks: SectionBlock[];
};

export type ContentSectionRecord = {
  id: string;
  pageId: string;
  draft: { title: string; content: SectionContent; status: "draft" | "published" };
  published: { title: string; content: SectionContent; status: "published" } | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};

type D1Result<T> = { results?: T[]; meta?: { changes?: number } };
type D1Statement = { bind(...values: unknown[]): D1Statement; first<T>(): Promise<T | null>; all<T>(): Promise<D1Result<T>>; run(): Promise<D1Result<unknown>> };
export type D1DatabaseLike = { prepare(sql: string): D1Statement };
type SectionRow = {
  id: string; page_id: string; draft_title: string; draft_content: string; draft_status: "draft" | "published";
  published_title: string | null; published_content: string | null; published_status: "published" | null;
  sort_order: number; created_at: string; updated_at: string; published_at: string | null;
};

const CREATE_SQL = `CREATE TABLE IF NOT EXISTS content_sections (
  id TEXT PRIMARY KEY NOT NULL,
  page_id TEXT NOT NULL,
  draft_title TEXT NOT NULL,
  draft_content TEXT NOT NULL,
  draft_status TEXT NOT NULL,
  published_title TEXT,
  published_content TEXT,
  published_status TEXT,
  sort_order INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  published_at TEXT
)`;
const SECTION_ID_PATTERN = /^section-[a-f0-9-]{36}$/;
const PAGE_ID_PATTERN = /^(home|contact|vlog|page-[a-f0-9-]{36})$/;
const EMPTY_CONTENT: SectionContent = { eyebrow: "New section", headlinePrimary: "새로운 이야기를", headlineAccent: "시작하세요.", subheadline: "이곳에 핵심 메시지를 입력하세요.", description: "섹션 설명을 입력하세요.", ctaLabel: "", blocks: [] };

export async function getContentSectionDb(): Promise<D1DatabaseLike> {
  const { env } = await import("cloudflare:workers");
  const db = (env as unknown as { DB?: D1DatabaseLike }).DB;
  if (!db) throw new Error("Section storage requires the DB binding.");
  return db;
}

export async function ensureContentSectionsTable(db: D1DatabaseLike) {
  await db.prepare(CREATE_SQL).run();
}

function text(value: unknown, fallback: string, max: number) {
  const result = typeof value === "string" ? value.trim() : fallback;
  if (result.length > max) throw new Error("invalid-section-content");
  return result;
}

const BLOCK_ID_PATTERN = /^block-[a-z0-9-]{1,72}$/;

function blockUrl(value: unknown, kind: "href" | "src") {
  const result = text(value, "", 2048);
  if (!result) return "";
  const allowed = kind === "href"
    ? /^(\/|https:\/\/|mailto:|tel:)/i
    : /^(\/|https:\/\/)/i;
  if (!allowed.test(result)) throw new Error("invalid-section-block-url");
  return result;
}

export function validateSectionBlocks(input: unknown): SectionBlock[] {
  if (input === undefined) return [];
  if (!Array.isArray(input) || input.length > 6) throw new Error("invalid-section-blocks");
  const ids = new Set<string>();
  const counts = { text: 0, button: 0, image: 0 };
  const blocks = input.map((value): SectionBlock => {
    if (!value || typeof value !== "object") throw new Error("invalid-section-block");
    const source = value as Record<string, unknown>;
    const id = String(source.id ?? "");
    const type = String(source.type ?? "") as SectionBlock["type"];
    if (!BLOCK_ID_PATTERN.test(id) || ids.has(id) || !(type in counts)) throw new Error("invalid-section-block");
    ids.add(id);
    counts[type] += 1;
    if (type === "text") return { id, type, text: text(source.text, "", 1200) };
    if (type === "button") return { id, type, label: text(source.label, "", 80), href: blockUrl(source.href, "href") };
    return { id, type: "image", src: blockUrl(source.src, "src"), alt: text(source.alt, "", 200) };
  });
  if (counts.text > 3 || counts.button > 2 || counts.image > 1) throw new Error("section-block-limit-exceeded");
  return blocks;
}

function parseContent(value: string): SectionContent {
  const source = JSON.parse(value) as Record<string, unknown>;
  return {
    eyebrow: text(source.eyebrow, EMPTY_CONTENT.eyebrow, 100),
    headlinePrimary: text(source.headlinePrimary, EMPTY_CONTENT.headlinePrimary, 160),
    headlineAccent: text(source.headlineAccent, EMPTY_CONTENT.headlineAccent, 160),
    subheadline: text(source.subheadline, EMPTY_CONTENT.subheadline, 300),
    description: text(source.description, EMPTY_CONTENT.description, 500),
    ctaLabel: text(source.ctaLabel, EMPTY_CONTENT.ctaLabel, 80),
    blocks: validateSectionBlocks(source.blocks),
  };
}

export function validateSectionDraft(input: Record<string, unknown>) {
  const pageId = String(input.pageId ?? "");
  if (!PAGE_ID_PATTERN.test(pageId)) throw new Error("invalid-section-page");
  const title = text(input.title, "새 섹션", 120);
  if (!title) throw new Error("invalid-section-title");
  const source = input.content && typeof input.content === "object" ? input.content as Record<string, unknown> : {};
  const content: SectionContent = {
    eyebrow: text(source.eyebrow, EMPTY_CONTENT.eyebrow, 100),
    headlinePrimary: text(source.headlinePrimary, EMPTY_CONTENT.headlinePrimary, 160),
    headlineAccent: text(source.headlineAccent, EMPTY_CONTENT.headlineAccent, 160),
    subheadline: text(source.subheadline, EMPTY_CONTENT.subheadline, 300),
    description: text(source.description, EMPTY_CONTENT.description, 500),
    ctaLabel: text(source.ctaLabel, EMPTY_CONTENT.ctaLabel, 80),
    blocks: validateSectionBlocks(source.blocks),
  };
  return { pageId, title, content };
}

function mapRow(row: SectionRow): ContentSectionRecord {
  return {
    id: row.id,
    pageId: row.page_id,
    draft: { title: row.draft_title, content: parseContent(row.draft_content), status: row.draft_status },
    published: row.published_title && row.published_content && row.published_status
      ? { title: row.published_title, content: parseContent(row.published_content), status: row.published_status }
      : null,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
  };
}

export async function listContentSections(db: D1DatabaseLike, pageId?: string) {
  await ensureContentSectionsTable(db);
  const statement = pageId
    ? db.prepare("SELECT * FROM content_sections WHERE page_id = ? ORDER BY sort_order, created_at").bind(pageId)
    : db.prepare("SELECT * FROM content_sections ORDER BY page_id, sort_order, created_at");
  const rows = (await statement.all<SectionRow>()).results ?? [];
  return rows.map(mapRow);
}

export async function createContentSection(db: D1DatabaseLike, input: Record<string, unknown>) {
  await ensureContentSectionsTable(db);
  const draft = validateSectionDraft(input);
  const id = `section-${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  const order = await db.prepare("SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order FROM content_sections WHERE page_id = ?").bind(draft.pageId).first<{ next_order: number }>();
  await db.prepare("INSERT INTO content_sections (id, page_id, draft_title, draft_content, draft_status, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, 'draft', ?, ?, ?)")
    .bind(id, draft.pageId, draft.title, JSON.stringify(draft.content), order?.next_order ?? 1, now, now).run();
  return (await getContentSection(db, id))!;
}

export async function getContentSection(db: D1DatabaseLike, id: string) {
  if (!SECTION_ID_PATTERN.test(id)) throw new Error("invalid-section-id");
  await ensureContentSectionsTable(db);
  const row = await db.prepare("SELECT * FROM content_sections WHERE id = ?").bind(id).first<SectionRow>();
  return row ? mapRow(row) : null;
}

export async function updateContentSectionDraft(db: D1DatabaseLike, id: string, input: Record<string, unknown>) {
  if (!SECTION_ID_PATTERN.test(id)) throw new Error("invalid-section-id");
  await ensureContentSectionsTable(db);
  const draft = validateSectionDraft(input);
  const now = new Date().toISOString();
  const result = await db.prepare("UPDATE content_sections SET draft_title = ?, draft_content = ?, draft_status = 'draft', updated_at = ? WHERE id = ? AND page_id = ?")
    .bind(draft.title, JSON.stringify(draft.content), now, id, draft.pageId).run();
  if ((result.meta?.changes ?? 0) !== 1) throw new Error("section-not-found");
  return (await getContentSection(db, id))!;
}

export async function publishContentSections(db: D1DatabaseLike) {
  await ensureContentSectionsTable(db);
  const now = new Date().toISOString();
  const result = await db.prepare(`UPDATE content_sections SET
    published_title = draft_title, published_content = draft_content,
    published_status = 'published', draft_status = 'published', published_at = ?, updated_at = ?
    WHERE published_title IS NULL OR published_title != draft_title OR published_content != draft_content`)
    .bind(now, now).run();
  return { publishedCount: result.meta?.changes ?? 0, publishedAt: now };
}

export async function publishContentSectionsForPage(db: D1DatabaseLike, pageId: string) {
  if (!PAGE_ID_PATTERN.test(pageId)) throw new Error("invalid-section-page");
  await ensureContentSectionsTable(db);
  const now = new Date().toISOString();
  const result = await db.prepare(`UPDATE content_sections SET
    published_title = draft_title, published_content = draft_content,
    published_status = 'published', draft_status = 'published', published_at = ?, updated_at = ?
    WHERE page_id = ? AND (published_title IS NULL OR published_title != draft_title OR published_content != draft_content)`)
    .bind(now, now, pageId).run();
  return { publishedCount: result.meta?.changes ?? 0, publishedAt: now, pageId };
}

export async function listPublishedContentSections(db: D1DatabaseLike, pageId: string) {
  return (await listContentSections(db, pageId)).filter((section) => section.published);
}
