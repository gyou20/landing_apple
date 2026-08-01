export type ChangeHistoryEntity = "page" | "section" | "vlog" | "image";

export type ChangeHistoryRecord = {
  id: string;
  entityType: ChangeHistoryEntity;
  entityId: string;
  entityTitle: string;
  summary: string;
  actorEmail: string;
  createdAt: string;
};

type D1Result<T> = { results?: T[]; meta?: { changes?: number } };
type D1Statement = {
  bind(...values: unknown[]): D1Statement;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<D1Result<T>>;
  run(): Promise<D1Result<unknown>>;
};
export type ChangeHistoryDb = { prepare(sql: string): D1Statement };

export const CHANGE_HISTORY_RETENTION_DAYS = 180;
export const CHANGE_HISTORY_MAX_RECORDS = 10_000;

type ChangeHistoryRow = {
  id: string;
  entity_type: ChangeHistoryEntity;
  entity_id: string;
  entity_title: string;
  summary: string;
  actor_email: string;
  created_at: string;
};

const CREATE_TABLE_SQL = `CREATE TABLE IF NOT EXISTS change_history (
  id TEXT PRIMARY KEY NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  entity_title TEXT NOT NULL,
  summary TEXT NOT NULL,
  actor_email TEXT NOT NULL,
  created_at TEXT NOT NULL
)`;
const CREATE_DATE_INDEX_SQL = "CREATE INDEX IF NOT EXISTS idx_change_history_created_at ON change_history(created_at DESC)";
const CREATE_ENTITY_INDEX_SQL = "CREATE INDEX IF NOT EXISTS idx_change_history_entity ON change_history(entity_type, entity_id, created_at DESC)";

export async function getChangeHistoryDb(): Promise<ChangeHistoryDb> {
  const { env } = await import("cloudflare:workers");
  const db = (env as unknown as { DB?: ChangeHistoryDb }).DB;
  if (!db) throw new Error("Change history requires the DB binding.");
  return db;
}

export async function ensureChangeHistoryTable(db: ChangeHistoryDb) {
  await db.prepare(CREATE_TABLE_SQL).run();
  await db.prepare(CREATE_DATE_INDEX_SQL).run();
  await db.prepare(CREATE_ENTITY_INDEX_SQL).run();
}

export function getChangeHistoryCutoff(now = new Date(), retentionDays = CHANGE_HISTORY_RETENTION_DAYS) {
  if (!Number.isInteger(retentionDays) || retentionDays < 1) throw new Error("invalid-retention-days");
  return new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
}

export function getChangeHistoryOverflow(total: number, maxRecords = CHANGE_HISTORY_MAX_RECORDS) {
  if (!Number.isInteger(maxRecords) || maxRecords < 1) throw new Error("invalid-history-limit");
  return Math.max(0, Math.trunc(total) - maxRecords);
}

export async function cleanupChangeHistory(
  db: ChangeHistoryDb,
  options: { now?: Date; retentionDays?: number; maxRecords?: number; source?: "scheduled" | "admin" | "test" } = {},
) {
  await ensureChangeHistoryTable(db);
  const retentionDays = options.retentionDays ?? CHANGE_HISTORY_RETENTION_DAYS;
  const maxRecords = options.maxRecords ?? CHANGE_HISTORY_MAX_RECORDS;
  const cutoff = getChangeHistoryCutoff(options.now, retentionDays);
  const ageResult = await db.prepare("DELETE FROM change_history WHERE created_at < ?").bind(cutoff).run();
  const remainingAfterAge = await db.prepare("SELECT COUNT(*) AS count FROM change_history").first<{ count: number }>();
  const overflow = getChangeHistoryOverflow(Number(remainingAfterAge?.count ?? 0), maxRecords);
  const limitResult = overflow > 0
    ? await db.prepare("DELETE FROM change_history WHERE id IN (SELECT id FROM change_history ORDER BY created_at ASC, id ASC LIMIT ?)").bind(overflow).run()
    : { meta: { changes: 0 } };
  const remainingCount = Math.max(0, Number(remainingAfterAge?.count ?? 0) - (limitResult.meta?.changes ?? 0));
  await db.prepare("PRAGMA optimize").run();
  const result = {
    source: options.source ?? "scheduled",
    retentionDays,
    maxRecords,
    cutoff,
    deletedByAge: ageResult.meta?.changes ?? 0,
    deletedByLimit: limitResult.meta?.changes ?? 0,
    deletedCount: (ageResult.meta?.changes ?? 0) + (limitResult.meta?.changes ?? 0),
    remainingCount,
  };
  console.info("[change-history:cleanup-complete]", result);
  return result;
}

export async function recordChange(db: ChangeHistoryDb, input: Omit<ChangeHistoryRecord, "id" | "createdAt">) {
  await ensureChangeHistoryTable(db);
  const record: ChangeHistoryRecord = {
    ...input,
    id: `change-${crypto.randomUUID()}`,
    entityTitle: input.entityTitle.trim().slice(0, 160) || input.entityId,
    summary: input.summary.trim().slice(0, 240) || "내용 수정",
    createdAt: new Date().toISOString(),
  };
  await db.prepare("INSERT INTO change_history (id, entity_type, entity_id, entity_title, summary, actor_email, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(record.id, record.entityType, record.entityId, record.entityTitle, record.summary, record.actorEmail, record.createdAt).run();
  console.info("[change-history:recorded]", { id: record.id, entityType: record.entityType, entityId: record.entityId, summary: record.summary });
  return record;
}

export async function listChangeHistory(db: ChangeHistoryDb, limit = 100) {
  await ensureChangeHistoryTable(db);
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 200);
  const rows = (await db.prepare("SELECT id, entity_type, entity_id, entity_title, summary, actor_email, created_at FROM change_history ORDER BY created_at DESC LIMIT ?")
    .bind(safeLimit).all<ChangeHistoryRow>()).results ?? [];
  return rows.map((row): ChangeHistoryRecord => ({
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    entityTitle: row.entity_title,
    summary: row.summary,
    actorEmail: row.actor_email,
    createdAt: row.created_at,
  }));
}