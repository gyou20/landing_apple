import assert from "node:assert/strict";
import test from "node:test";
import {
  CONTACT_BUDGETS,
  CONTACT_INQUIRY_TYPES,
  createContactSubmission,
  updateContactSubmissionStatus,
  validateContactSubmission,
} from "../db/contact-submissions.ts";

const validSubmission = {
  name: "홍길동",
  company: "Aether Lab",
  email: "HELLO@EXAMPLE.COM",
  inquiryType: "brand",
  budget: "10m-30m",
  message: "브랜드의 다음 웹 경험을 함께 설계하고 싶습니다.",
  website: "",
};

test("contact submissions normalize a complete valid payload", () => {
  const result = validateContactSubmission(validSubmission);
  assert.equal(result.email, "hello@example.com");
  assert.equal(result.name, "홍길동");
  assert.equal(result.inquiryType, "brand");
});

test("contact submissions reject invalid fields and unsafe sizes", () => {
  assert.throws(() => validateContactSubmission({ ...validSubmission, email: "not-an-email" }), /contact-email-invalid/);
  assert.throws(() => validateContactSubmission({ ...validSubmission, message: "너무 짧음" }), /contact-message-too-short/);
  assert.throws(() => validateContactSubmission({ ...validSubmission, inquiryType: "unknown" }), /contact-inquiry-type-invalid/);
  assert.throws(() => validateContactSubmission({ ...validSubmission, budget: "unknown" }), /contact-budget-invalid/);
  assert.throws(() => validateContactSubmission({ ...validSubmission, name: "x".repeat(121) }), /contact-name-invalid/);
});

test("contact select values remain explicit stable contracts", () => {
  assert.deepEqual(CONTACT_INQUIRY_TYPES, ["brand", "campaign", "digital", "collaboration", "other"]);
  assert.deepEqual(CONTACT_BUDGETS, ["undecided", "under-5m", "5m-10m", "10m-30m", "over-30m"]);
});


function fakeContactDatabase(recentCount = 0) {
  const calls = [];
  return {
    calls,
    prepare(sql) {
      const call = { sql, values: [] };
      calls.push(call);
      const statement = {
        bind(...values) { call.values = values; return statement; },
        async first() { return { count: recentCount }; },
        async all() { return { results: [] }; },
        async run() { return { meta: { changes: 1 } }; },
      };
      return statement;
    },
  };
}

test("contact persistence creates schema, checks rate limits, and inserts one normalized row", async () => {
  const db = fakeContactDatabase();
  const result = await createContactSubmission(db, validSubmission);
  assert.equal(result.accepted, true);
  assert.equal(result.discarded, false);
  assert.match(result.id, /^contact-[a-f0-9-]{36}$/);
  assert.equal(db.calls.some((call) => call.sql.includes("CREATE TABLE IF NOT EXISTS contact_submissions")), true);
  assert.equal(db.calls.some((call) => call.sql === "PRAGMA optimize"), true);
  const insert = db.calls.find((call) => call.sql.includes("INSERT INTO contact_submissions"));
  assert.equal(insert.values[3], "hello@example.com");
});

test("contact persistence discards honeypots and limits repeated email submissions", async () => {
  const honeypotDb = fakeContactDatabase();
  const honeypot = await createContactSubmission(honeypotDb, { ...validSubmission, website: "https://spam.example" });
  assert.equal(honeypot.discarded, true);
  assert.equal(honeypotDb.calls.length, 0);
  await assert.rejects(() => createContactSubmission(fakeContactDatabase(3), validSubmission), /contact-rate-limited/);
});
test("contact status updates validate stable ids and persist one state change", async () => {
  const db = fakeContactDatabase();
  const id = "contact-12345678-1234-1234-1234-123456789abc";
  const result = await updateContactSubmissionStatus(db, id, "read");
  assert.deepEqual(result, { id, status: "read" });
  const update = db.calls.find((call) => call.sql.includes("UPDATE contact_submissions SET status"));
  assert.deepEqual(update.values, ["read", id]);
});

test("contact status updates reject unstable ids and unsupported states", async () => {
  await assert.rejects(() => updateContactSubmissionStatus(fakeContactDatabase(), "contact-1", "read"), /contact-id-invalid/);
  await assert.rejects(() => updateContactSubmissionStatus(fakeContactDatabase(), "contact-12345678-1234-1234-1234-123456789abc", "deleted"), /contact-status-invalid/);
});