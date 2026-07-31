import { CONTENT_ENTITY_IDS, isContentEntity, type ContentEntityType } from "./content-entities";
import { publishedDeletionSet } from "./content-deletions";

export type VisibilityEntityType = ContentEntityType;
export type VisibilityState = { menuVisible: boolean; searchIndexable: boolean };
export type VisibilityRecord = { entityType: VisibilityEntityType; entityId: string; draft: VisibilityState; published: VisibilityState; updatedAt: string; publishedAt: string | null };

type D1Result<T> = { results?: T[]; meta?: { changes?: number } };
type D1Statement = { bind(...values: unknown[]): D1Statement; first<T>(): Promise<T | null>; all<T>(): Promise<D1Result<T>>; run(): Promise<D1Result<unknown>> };
type D1DatabaseLike = { prepare(sql: string): D1Statement };
type Row = { entity_type: VisibilityEntityType; entity_id: string; draft_menu_visible: number; draft_search_indexable: number; published_menu_visible: number; published_search_indexable: number; updated_at: string; published_at: string | null };

export const VISIBILITY_ENTITY_IDS = CONTENT_ENTITY_IDS;

const CREATE_SQL = `CREATE TABLE IF NOT EXISTS content_visibility (
  entity_type TEXT NOT NULL, entity_id TEXT NOT NULL,
  draft_menu_visible INTEGER NOT NULL, draft_search_indexable INTEGER NOT NULL,
  published_menu_visible INTEGER NOT NULL, published_search_indexable INTEGER NOT NULL,
  updated_at TEXT NOT NULL, published_at TEXT,
  PRIMARY KEY (entity_type, entity_id)
)`;

export function defaultVisibility(type: VisibilityEntityType): VisibilityState {
  return type === "vlog" ? { menuVisible: false, searchIndexable: false } : { menuVisible: true, searchIndexable: true };
}
export function isVisibilityEntity(type: string, id: string): type is VisibilityEntityType {
  return isContentEntity(type, id);
}
export async function getVisibilityDb(): Promise<D1DatabaseLike> {
  const { env } = await import("cloudflare:workers");
  const db = (env as unknown as { DB?: D1DatabaseLike }).DB;
  if (!db) throw new Error("Visibility storage requires the DB binding.");
  return db;
}
export async function ensureVisibilityTable(db: D1DatabaseLike) { await db.prepare(CREATE_SQL).run(); }
function mapRow(row: Row): VisibilityRecord {
  return { entityType: row.entity_type, entityId: row.entity_id, draft: { menuVisible: Boolean(row.draft_menu_visible), searchIndexable: Boolean(row.draft_search_indexable) }, published: { menuVisible: Boolean(row.published_menu_visible), searchIndexable: Boolean(row.published_search_indexable) }, updatedAt: row.updated_at, publishedAt: row.published_at };
}
export async function listVisibility(db: D1DatabaseLike): Promise<VisibilityRecord[]> {
  await ensureVisibilityTable(db);
  const rows = (await db.prepare("SELECT * FROM content_visibility ORDER BY entity_type, entity_id").all<Row>()).results ?? [];
  return rows.map(mapRow);
}
export async function saveDraftVisibility(db: D1DatabaseLike, type: VisibilityEntityType, id: string, state: VisibilityState) {
  await ensureVisibilityTable(db);
  const defaults = defaultVisibility(type);
  const now = new Date().toISOString();
  await db.prepare(`INSERT INTO content_visibility (entity_type, entity_id, draft_menu_visible, draft_search_indexable, published_menu_visible, published_search_indexable, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(entity_type, entity_id) DO UPDATE SET draft_menu_visible = excluded.draft_menu_visible, draft_search_indexable = excluded.draft_search_indexable, updated_at = excluded.updated_at`)
    .bind(type, id, Number(state.menuVisible), Number(state.searchIndexable), Number(defaults.menuVisible), Number(defaults.searchIndexable), now).run();
  return now;
}
export async function publishVisibility(db: D1DatabaseLike) {
  await ensureVisibilityTable(db);
  const now = new Date().toISOString();
  const result = await db.prepare(`UPDATE content_visibility SET published_menu_visible = draft_menu_visible, published_search_indexable = draft_search_indexable, published_at = ?
    WHERE published_menu_visible != draft_menu_visible OR published_search_indexable != draft_search_indexable`).bind(now).run();
  return result.meta?.changes ?? 0;
}
export async function publishedVisibility(type: VisibilityEntityType, id: string): Promise<VisibilityState> {
  try {
    const db = await getVisibilityDb();
    await ensureVisibilityTable(db);
    const row = await db.prepare("SELECT published_menu_visible, published_search_indexable FROM content_visibility WHERE entity_type = ? AND entity_id = ?")
      .bind(type, id).first<{ published_menu_visible: number; published_search_indexable: number }>();
    if ((await publishedDeletionSet(db)).has(`${type}:${id}`)) return { menuVisible: false, searchIndexable: false };
    return row ? { menuVisible: Boolean(row.published_menu_visible), searchIndexable: Boolean(row.published_search_indexable) } : defaultVisibility(type);
  } catch (error) {
    console.warn("[visibility:public-default]", { type, id, error: error instanceof Error ? error.message : String(error) });
    return defaultVisibility(type);
  }
}
export async function publishedVisibilityMap(): Promise<Record<string, VisibilityState>> {
  const values: Record<string, VisibilityState> = {};
  for (const [type, ids] of Object.entries(VISIBILITY_ENTITY_IDS) as Array<[VisibilityEntityType, readonly string[]]>) {
    for (const id of ids) values[`${type}:${id}`] = defaultVisibility(type);
  }
  try {
    const records = await listVisibility(await getVisibilityDb());
    for (const record of records) values[`${record.entityType}:${record.entityId}`] = record.published;
    console.info("[visibility:server-render-loaded]", { recordCount: records.length });
  } catch (error) {
    console.warn("[visibility:server-render-defaults]", { error: error instanceof Error ? error.message : String(error) });
  }
  return values;
}