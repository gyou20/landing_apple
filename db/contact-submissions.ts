export const CONTACT_INQUIRY_TYPES = [
  "brand",
  "campaign",
  "digital",
  "collaboration",
  "other",
] as const;

export const CONTACT_BUDGETS = [
  "undecided",
  "under-5m",
  "5m-10m",
  "10m-30m",
  "over-30m",
] as const;

export type ContactInquiryType = (typeof CONTACT_INQUIRY_TYPES)[number];
export type ContactBudget = (typeof CONTACT_BUDGETS)[number];

export type ContactSubmissionDraft = {
  name: string;
  company: string;
  email: string;
  inquiryType: ContactInquiryType;
  budget: ContactBudget;
  message: string;
  website: string;
};

export type ContactSubmissionRecord = Omit<ContactSubmissionDraft, "website"> & {
  id: string;
  status: "new" | "read" | "archived";
  createdAt: string;
};

type D1Result<T> = { results?: T[]; meta?: { changes?: number } };
type D1Statement = {
  bind(...values: unknown[]): D1Statement;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<D1Result<T>>;
  run(): Promise<D1Result<unknown>>;
};
export type ContactDatabase = { prepare(sql: string): D1Statement };

type ContactRow = {
  id: string;
  name: string;
  company: string;
  email: string;
  inquiry_type: ContactInquiryType;
  budget: ContactBudget;
  message: string;
  status: "new" | "read" | "archived";
  created_at: string;
};

const CREATE_TABLE_SQL = `CREATE TABLE IF NOT EXISTS contact_submissions (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  company TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL,
  inquiry_type TEXT NOT NULL,
  budget TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TEXT NOT NULL
)`;

const CREATE_STATUS_INDEX_SQL = `CREATE INDEX IF NOT EXISTS idx_contact_submissions_status_created_at
ON contact_submissions(status, created_at DESC)`;

function requiredText(value: unknown, field: string, max: number) {
  if (typeof value !== "string") throw new Error(`contact-${field}-required`);
  const normalized = value.trim();
  if (!normalized || normalized.length > max) throw new Error(`contact-${field}-invalid`);
  return normalized;
}

function optionalText(value: unknown, field: string, max: number) {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") throw new Error(`contact-${field}-invalid`);
  const normalized = value.trim();
  if (normalized.length > max) throw new Error(`contact-${field}-invalid`);
  return normalized;
}

export function validateContactSubmission(input: unknown): ContactSubmissionDraft {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("contact-payload-invalid");
  const source = input as Record<string, unknown>;
  const email = requiredText(source.email, "email", 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("contact-email-invalid");
  const inquiryType = String(source.inquiryType ?? "");
  const budget = String(source.budget ?? "");
  if (!CONTACT_INQUIRY_TYPES.includes(inquiryType as ContactInquiryType)) throw new Error("contact-inquiry-type-invalid");
  if (!CONTACT_BUDGETS.includes(budget as ContactBudget)) throw new Error("contact-budget-invalid");
  const message = requiredText(source.message, "message", 4000);
  if (message.length < 20) throw new Error("contact-message-too-short");
  return {
    name: requiredText(source.name, "name", 120),
    company: optionalText(source.company, "company", 160),
    email,
    inquiryType: inquiryType as ContactInquiryType,
    budget: budget as ContactBudget,
    message,
    website: optionalText(source.website, "website", 200),
  };
}

export async function getContactDatabase(): Promise<ContactDatabase> {
  const { env } = await import("cloudflare:workers");
  const db = (env as unknown as { DB?: ContactDatabase }).DB;
  if (!db) throw new Error("contact-storage-unavailable");
  return db;
}

export async function ensureContactSubmissionsTable(db: ContactDatabase) {
  await db.prepare(CREATE_TABLE_SQL).run();
  await db.prepare(CREATE_STATUS_INDEX_SQL).run();
  await db.prepare("PRAGMA optimize").run();
}

export async function createContactSubmission(db: ContactDatabase, input: unknown) {
  const draft = validateContactSubmission(input);
  if (draft.website) {
    console.info("[contact:honeypot-discarded]", { hasWebsite: true });
    return { accepted: true as const, discarded: true as const, id: null };
  }
  await ensureContactSubmissionsTable(db);
  const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const recent = await db.prepare("SELECT COUNT(*) AS count FROM contact_submissions WHERE email = ? AND created_at >= ?")
    .bind(draft.email, cutoff)
    .first<{ count: number }>();
  if ((recent?.count ?? 0) >= 3) throw new Error("contact-rate-limited");

  const id = `contact-${crypto.randomUUID()}`;
  const createdAt = new Date().toISOString();
  await db.prepare(`INSERT INTO contact_submissions
    (id, name, company, email, inquiry_type, budget, message, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'new', ?)`)
    .bind(id, draft.name, draft.company, draft.email, draft.inquiryType, draft.budget, draft.message, createdAt)
    .run();
  return { accepted: true as const, discarded: false as const, id, createdAt };
}

function mapRow(row: ContactRow): ContactSubmissionRecord {
  return {
    id: row.id,
    name: row.name,
    company: row.company,
    email: row.email,
    inquiryType: row.inquiry_type,
    budget: row.budget,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function listContactSubmissions(db: ContactDatabase, limit = 100) {
  await ensureContactSubmissionsTable(db);
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 200);
  const rows = (await db.prepare("SELECT * FROM contact_submissions ORDER BY created_at DESC LIMIT ?")
    .bind(safeLimit)
    .all<ContactRow>()).results ?? [];
  return rows.map(mapRow);
}


const CONTACT_ID_PATTERN = /^contact-[a-f0-9-]{36}$/;
const CONTACT_STATUSES = ["new", "read", "archived"] as const;

export async function updateContactSubmissionStatus(db: ContactDatabase, id: string, status: ContactSubmissionRecord["status"]) {
  if (!CONTACT_ID_PATTERN.test(id)) throw new Error("contact-id-invalid");
  if (!CONTACT_STATUSES.includes(status)) throw new Error("contact-status-invalid");
  await ensureContactSubmissionsTable(db);
  const result = await db.prepare("UPDATE contact_submissions SET status = ? WHERE id = ?")
    .bind(status, id)
    .run();
  if ((result.meta?.changes ?? 0) !== 1) throw new Error("contact-submission-not-found");
  console.info("[contact:status-updated]", { id, status });
  return { id, status };
}