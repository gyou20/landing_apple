import { env } from "cloudflare:workers";

export const HOME_SECTION_IDS = [
  "home-section-01",
  "home-section-02",
  "home-section-03",
  "home-section-04",
  "home-section-05",
  "home-section-06",
] as const;

export type HomeSectionId = (typeof HOME_SECTION_IDS)[number];

export type SectionBackgroundRow = {
  section_id: HomeSectionId;
  draft_key: string | null;
  draft_content_type: string | null;
  draft_original_name: string | null;
  published_key: string | null;
  published_content_type: string | null;
  updated_at: string;
  published_at: string | null;
};

type D1Result<T> = { results?: T[] };
type D1Statement = {
  bind(...values: unknown[]): D1Statement;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<D1Result<T>>;
  run(): Promise<unknown>;
};
type D1DatabaseLike = { prepare(sql: string): D1Statement };
type R2ObjectLike = { body: ReadableStream; httpMetadata?: { contentType?: string } };
type R2BucketLike = {
  put(key: string, value: ReadableStream, options?: { httpMetadata?: { contentType?: string }; customMetadata?: Record<string, string> }): Promise<unknown>;
  get(key: string): Promise<R2ObjectLike | null>;
  delete(key: string): Promise<void>;
};
type RuntimeBindings = { DB?: D1DatabaseLike; MEDIA?: R2BucketLike };

const CREATE_TABLE_SQL = `CREATE TABLE IF NOT EXISTS section_backgrounds (
  section_id TEXT PRIMARY KEY NOT NULL,
  draft_key TEXT,
  draft_content_type TEXT,
  draft_original_name TEXT,
  published_key TEXT,
  published_content_type TEXT,
  updated_at TEXT NOT NULL,
  published_at TEXT
)`;

export function isHomeSectionId(value: string): value is HomeSectionId {
  return HOME_SECTION_IDS.includes(value as HomeSectionId);
}

export function getSectionBackgroundBindings() {
  const bindings = env as unknown as RuntimeBindings;
  if (!bindings.DB || !bindings.MEDIA) {
    throw new Error("Section background storage requires DB and MEDIA bindings.");
  }
  return { db: bindings.DB, media: bindings.MEDIA };
}

export async function ensureSectionBackgroundTable(db: D1DatabaseLike) {
  await db.prepare(CREATE_TABLE_SQL).run();
}

export async function listSectionBackgrounds(db: D1DatabaseLike) {
  await ensureSectionBackgroundTable(db);
  const result = await db.prepare(
    `SELECT section_id, draft_key, draft_content_type, draft_original_name,
      published_key, published_content_type, updated_at, published_at
     FROM section_backgrounds ORDER BY section_id`,
  ).all<SectionBackgroundRow>();
  return result.results ?? [];
}

export async function getSectionBackground(db: D1DatabaseLike, sectionId: HomeSectionId) {
  await ensureSectionBackgroundTable(db);
  return db.prepare(
    `SELECT section_id, draft_key, draft_content_type, draft_original_name,
      published_key, published_content_type, updated_at, published_at
     FROM section_backgrounds WHERE section_id = ?`,
  ).bind(sectionId).first<SectionBackgroundRow>();
}