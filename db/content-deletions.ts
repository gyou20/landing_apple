import type { ContentEntityType } from "./content-entities";

export type DeletionTarget = { entityType: ContentEntityType; entityId: string };
export type DeletionRecord = DeletionTarget & {
  draftDeleted: boolean;
  publishedDeleted: boolean;
  operationId: string;
  requestedBy: string;
  pendingAt: string;
  publishedAt: string | null;
  deleteAfter: string | null;
  restoredAt: string | null;
  updatedAt: string;
};

type D1Result<T> = { results?: T[]; meta?: { changes?: number } };
type D1Statement = { bind(...values: unknown[]): D1Statement; first<T>(): Promise<T | null>; all<T>(): Promise<D1Result<T>>; run(): Promise<D1Result<unknown>> };
export type D1DatabaseLike = { prepare(sql: string): D1Statement; batch?(statements: D1Statement[]): Promise<unknown[]> };
type DeletionRow = { entity_type: ContentEntityType; entity_id: string; draft_deleted: number; published_deleted: number; operation_id: string; requested_by: string; pending_at: string; published_at: string | null; delete_after: string | null; restored_at: string | null; updated_at: string };
type AuthorizationRow = { authorization_id: string; actor_email: string; operation: string; target_hash: string; expires_at: string; consumed_at: string | null };

const CREATE_AUTHORIZATIONS_SQL = `CREATE TABLE IF NOT EXISTS deletion_authorizations (
  authorization_id TEXT PRIMARY KEY NOT NULL, token_hash TEXT NOT NULL UNIQUE,
  actor_email TEXT NOT NULL, operation TEXT NOT NULL, target_hash TEXT NOT NULL,
  target_json TEXT NOT NULL, target_count INTEGER NOT NULL, issued_at TEXT NOT NULL,
  expires_at TEXT NOT NULL, consumed_at TEXT
)`;
const CREATE_DELETIONS_SQL = `CREATE TABLE IF NOT EXISTS content_deletions (
  entity_type TEXT NOT NULL, entity_id TEXT NOT NULL,
  draft_deleted INTEGER NOT NULL, published_deleted INTEGER NOT NULL,
  operation_id TEXT NOT NULL, requested_by TEXT NOT NULL, pending_at TEXT NOT NULL,
  published_at TEXT, delete_after TEXT, restored_at TEXT, updated_at TEXT NOT NULL,
  PRIMARY KEY (entity_type, entity_id)
)`;
const TOKEN_TTL_MS = 5 * 60 * 1000;
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export async function getDeletionDb(): Promise<D1DatabaseLike> {
  const { env } = await import("cloudflare:workers");
  const db = (env as unknown as { DB?: D1DatabaseLike }).DB;
  if (!db) throw new Error("Deletion storage requires the DB binding.");
  return db;
}

export async function ensureDeletionTables(db: D1DatabaseLike) {
  if (db.batch) await db.batch([db.prepare(CREATE_AUTHORIZATIONS_SQL), db.prepare(CREATE_DELETIONS_SQL)]);
  else { await db.prepare(CREATE_AUTHORIZATIONS_SQL).run(); await db.prepare(CREATE_DELETIONS_SQL).run(); }
}

export function canonicalTargets(input: unknown): DeletionTarget[] {
  if (!Array.isArray(input) || input.length === 0 || input.length > 100) throw new Error("invalid-targets");
  const unique = new Map<string, DeletionTarget>();
  for (const value of input) {
    if (!value || typeof value !== "object") throw new Error("invalid-target");
    const entityType = String((value as Record<string, unknown>).entityType ?? "") as ContentEntityType;
    const entityId = String((value as Record<string, unknown>).entityId ?? "");
    if ((entityType !== "page" && entityType !== "section" && entityType !== "vlog") || !/^[a-z0-9][a-z0-9-]{0,79}$/.test(entityId)) throw new Error("invalid-target");
    unique.set(`${entityType}:${entityId}`, { entityType, entityId });
  }
  return [...unique.values()].sort((a, b) => `${a.entityType}:${a.entityId}`.localeCompare(`${b.entityType}:${b.entityId}`));
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function secureEqual(left: string, right: string) {
  const [a, b] = await Promise.all([sha256(left), sha256(right)]);
  let difference = a.length ^ b.length;
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    difference |= a.charCodeAt(index % a.length) ^ b.charCodeAt(index % b.length);
  }
  return difference === 0;
}

export async function verifyDeletionPassword(password: string) {
  const configured = process.env.ADMIN_DELETE_PASSWORD;
  if (!configured) throw new Error("delete-password-not-configured");
  return secureEqual(password, configured);
}

function randomToken() {
  const values = new Uint8Array(32);
  crypto.getRandomValues(values);
  return [...values].map((value) => value.toString(16).padStart(2, "0")).join("");
}

export async function issueDeletionAuthorization(db: D1DatabaseLike, actorEmail: string, targets: DeletionTarget[]) {
  await ensureDeletionTables(db);
  const canonical = canonicalTargets(targets);
  const targetJson = JSON.stringify(canonical);
  const token = randomToken();
  const now = new Date();
  const authorizationId = crypto.randomUUID();
  const expiresAt = new Date(now.getTime() + TOKEN_TTL_MS).toISOString();
  await db.prepare(`INSERT INTO deletion_authorizations (authorization_id, token_hash, actor_email, operation, target_hash, target_json, target_count, issued_at, expires_at)
    VALUES (?, ?, ?, 'soft_delete_batch', ?, ?, ?, ?, ?)`)
    .bind(authorizationId, await sha256(token), actorEmail, await sha256(targetJson), targetJson, canonical.length, now.toISOString(), expiresAt).run();
  return { token, authorizationId, expiresAt, targets: canonical };
}

export async function consumeDeletionAuthorization(db: D1DatabaseLike, actorEmail: string, token: string, targets: DeletionTarget[]) {
  await ensureDeletionTables(db);
  const authorization = await db.prepare("SELECT authorization_id, actor_email, operation, target_hash, expires_at, consumed_at FROM deletion_authorizations WHERE token_hash = ?")
    .bind(await sha256(token)).first<AuthorizationRow>();
  if (!authorization || authorization.actor_email !== actorEmail || authorization.operation !== "soft_delete_batch") throw new Error("invalid-deletion-token");
  if (authorization.consumed_at || Date.parse(authorization.expires_at) <= Date.now()) throw new Error("expired-deletion-token");
  const canonical = canonicalTargets(targets);
  if (!(await secureEqual(authorization.target_hash, await sha256(JSON.stringify(canonical))))) throw new Error("target-set-changed");
  const now = new Date().toISOString();
  const consumed = await db.prepare("UPDATE deletion_authorizations SET consumed_at = ? WHERE authorization_id = ? AND consumed_at IS NULL").bind(now, authorization.authorization_id).run();
  if ((consumed.meta?.changes ?? 0) !== 1) throw new Error("deletion-token-already-used");
  const operationId = crypto.randomUUID();
  const statements = canonical.map((target) => db.prepare(`INSERT INTO content_deletions (entity_type, entity_id, draft_deleted, published_deleted, operation_id, requested_by, pending_at, updated_at)
    VALUES (?, ?, 1, 0, ?, ?, ?, ?)
    ON CONFLICT(entity_type, entity_id) DO UPDATE SET draft_deleted = 1, operation_id = excluded.operation_id, requested_by = excluded.requested_by, pending_at = excluded.pending_at, restored_at = NULL, updated_at = excluded.updated_at`)
    .bind(target.entityType, target.entityId, operationId, actorEmail, now, now));
  if (db.batch) await db.batch(statements); else for (const statement of statements) await statement.run();
  return { operationId, pendingAt: now, targets: canonical };
}

function mapDeletion(row: DeletionRow): DeletionRecord {
  return { entityType: row.entity_type, entityId: row.entity_id, draftDeleted: Boolean(row.draft_deleted), publishedDeleted: Boolean(row.published_deleted), operationId: row.operation_id, requestedBy: row.requested_by, pendingAt: row.pending_at, publishedAt: row.published_at, deleteAfter: row.delete_after, restoredAt: row.restored_at, updatedAt: row.updated_at };
}

export async function listDeletions(db: D1DatabaseLike) {
  await ensureDeletionTables(db);
  const rows = (await db.prepare("SELECT * FROM content_deletions WHERE draft_deleted = 1 OR published_deleted = 1 ORDER BY updated_at DESC").all<DeletionRow>()).results ?? [];
  return rows.map(mapDeletion);
}

export async function restoreDeletionDraft(db: D1DatabaseLike, actorEmail: string, target: DeletionTarget) {
  await ensureDeletionTables(db);
  const now = new Date().toISOString();
  const result = await db.prepare("UPDATE content_deletions SET draft_deleted = 0, restored_at = ?, updated_at = ?, requested_by = ? WHERE entity_type = ? AND entity_id = ? AND draft_deleted = 1 AND (published_deleted = 0 OR delete_after > ?)")
    .bind(now, now, actorEmail, target.entityType, target.entityId, now).run();
  return { restored: result.meta?.changes ?? 0, restoredAt: now };
}

export async function undoDeletionOperation(db: D1DatabaseLike, actorEmail: string, operationId: string) {
  await ensureDeletionTables(db);
  const now = new Date().toISOString();
  const result = await db.prepare("UPDATE content_deletions SET draft_deleted = 0, restored_at = ?, updated_at = ?, requested_by = ? WHERE operation_id = ? AND draft_deleted = 1 AND published_deleted = 0")
    .bind(now, now, actorEmail, operationId).run();
  return result.meta?.changes ?? 0;
}

export async function publishDeletions(db: D1DatabaseLike) {
  await ensureDeletionTables(db);
  const now = new Date();
  const publishedAt = now.toISOString();
  const deleteAfter = new Date(now.getTime() + RETENTION_MS).toISOString();
  const deleting = await db.prepare("UPDATE content_deletions SET published_deleted = 1, published_at = ?, delete_after = ?, updated_at = ? WHERE draft_deleted = 1 AND published_deleted = 0")
    .bind(publishedAt, deleteAfter, publishedAt).run();
  const restoring = await db.prepare("UPDATE content_deletions SET published_deleted = 0, published_at = NULL, delete_after = NULL, updated_at = ? WHERE draft_deleted = 0 AND published_deleted = 1")
    .bind(publishedAt).run();
  return { deletedCount: deleting.meta?.changes ?? 0, restoredCount: restoring.meta?.changes ?? 0, publishedAt };
}

export async function publishedDeletionSet(db: D1DatabaseLike) {
  await ensureDeletionTables(db);
  const rows = (await db.prepare("SELECT entity_type, entity_id FROM content_deletions WHERE published_deleted = 1").all<{ entity_type: string; entity_id: string }>()).results ?? [];
  return new Set(rows.map((row) => `${row.entity_type}:${row.entity_id}`));
}
export async function isPublishedDeleted(entityType: ContentEntityType, entityId: string) {
  try {
    return (await publishedDeletionSet(await getDeletionDb())).has(`${entityType}:${entityId}`);
  } catch (error) {
    console.warn("[deletion:public-default]", { entityType, entityId, error: error instanceof Error ? error.message : String(error) });
    return false;
  }
}