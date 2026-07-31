import assert from "node:assert/strict";
import test from "node:test";
import {
  canonicalTargets,
  consumeDeletionAuthorization,
  issueDeletionAuthorization,
  verifyDeletionPassword,
} from "../db/content-deletions.ts";

class FakeStatement {
  constructor(db, sql) { this.db = db; this.sql = sql; this.values = []; }
  bind(...values) { this.values = values; return this; }
  async first() {
    if (this.sql.includes("FROM deletion_authorizations WHERE token_hash")) {
      return this.db.authorizations.find((row) => row.token_hash === this.values[0]) ?? null;
    }
    return null;
  }
  async all() { return { results: [] }; }
  async run() {
    if (this.sql.startsWith("CREATE TABLE")) return { meta: { changes: 0 } };
    if (this.sql.includes("INSERT INTO deletion_authorizations")) {
      const [authorization_id, token_hash, actor_email, target_hash, target_json, target_count, issued_at, expires_at] = this.values;
      this.db.authorizations.push({ authorization_id, token_hash, actor_email, operation: "soft_delete_batch", target_hash, target_json, target_count, issued_at, expires_at, consumed_at: null });
      return { meta: { changes: 1 } };
    }
    if (this.sql.startsWith("UPDATE deletion_authorizations SET consumed_at")) {
      const [consumed_at, authorization_id] = this.values;
      const row = this.db.authorizations.find((candidate) => candidate.authorization_id === authorization_id && candidate.consumed_at === null);
      if (!row) return { meta: { changes: 0 } };
      row.consumed_at = consumed_at;
      return { meta: { changes: 1 } };
    }
    if (this.sql.includes("INSERT INTO content_deletions")) {
      const [entityType, entityId, operationId, requestedBy, pendingAt, updatedAt] = this.values;
      this.db.deletions.set(entityType + ":" + entityId, { entityType, entityId, operationId, requestedBy, pendingAt, updatedAt });
      return { meta: { changes: 1 } };
    }
    throw new Error("Unhandled SQL: " + this.sql);
  }
}

class FakeDb {
  authorizations = [];
  deletions = new Map();
  prepare(sql) { return new FakeStatement(this, sql); }
  async batch(statements) { return Promise.all(statements.map((statement) => statement.run())); }
}

test("canonical deletion targets are unique, sorted, and accept stable future ids", () => {
  assert.deepEqual(canonicalTargets([
    { entityType: "vlog", entityId: "future-post" },
    { entityType: "page", entityId: "home" },
    { entityType: "page", entityId: "home" },
  ]), [
    { entityType: "page", entityId: "home" },
    { entityType: "vlog", entityId: "future-post" },
  ]);
  assert.throws(() => canonicalTargets([{ entityType: "page", entityId: "../home" }]), /invalid-target/);
});

test("deletion password must match the configured operation password", async () => {
  const previous = process.env.ADMIN_DELETE_PASSWORD;
  process.env.ADMIN_DELETE_PASSWORD = "test-only-password";
  try {
    assert.equal(await verifyDeletionPassword("test-only-password"), true);
    assert.equal(await verifyDeletionPassword("wrong"), false);
  } finally {
    if (previous === undefined) delete process.env.ADMIN_DELETE_PASSWORD;
    else process.env.ADMIN_DELETE_PASSWORD = previous;
  }
});

test("one token is bound to the exact target set and can be consumed only once", async () => {
  const db = new FakeDb();
  const targets = canonicalTargets([
    { entityType: "section", entityId: "home-section-02" },
    { entityType: "page", entityId: "contact" },
  ]);
  const authorization = await issueDeletionAuthorization(db, "admin@example.test", targets);

  await assert.rejects(
    consumeDeletionAuthorization(db, "admin@example.test", authorization.token, [targets[0]]),
    /target-set-changed/,
  );

  const result = await consumeDeletionAuthorization(db, "admin@example.test", authorization.token, [...targets].reverse());
  assert.equal(result.targets.length, 2);
  assert.equal(db.deletions.size, 2);

  await assert.rejects(
    consumeDeletionAuthorization(db, "admin@example.test", authorization.token, targets),
    /expired-deletion-token/,
  );
});