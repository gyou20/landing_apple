import assert from "node:assert/strict";
import test from "node:test";
import { summarizePageChange, summarizeSectionChange, summarizeVlogChange } from "../lib/change-summary.ts";
import { buildAssetUsage } from "../lib/asset-usage.ts";
import { isSectionBackgroundId } from "../lib/section-background-id.ts";
import { cleanupChangeHistory, getChangeHistoryCutoff, getChangeHistoryOverflow } from "../db/change-history.ts";

test("change summaries describe only the modified fields", () => {
  assert.equal(summarizePageChange(null, { title: "새 페이지" }), "페이지 생성");
  assert.equal(summarizePageChange({ title: "A", slug: "/a" }, { title: "B", slug: "/a" }), "페이지 제목 수정");
  assert.equal(summarizeVlogChange({ title: "A", body: "old" }, { title: "A", body: "new" }), "본문 수정");
  assert.equal(summarizeSectionChange(
    { title: "소개", content: { headlinePrimary: "전", blocks: [] } },
    { title: "소개", content: { headlinePrimary: "후", blocks: [{ id: "block-text-1", type: "text", text: "설명" }] } },
  ), "메인 문구 수정 · 콘텐츠 블록 수정");
});

test("section backgrounds accept fixed and durable dynamic section ids", () => {
  assert.equal(isSectionBackgroundId("home-section-01"), true);
  assert.equal(isSectionBackgroundId("contact-form"), true);
  assert.equal(isSectionBackgroundId("section-11111111-1111-1111-1111-111111111111"), true);
  assert.equal(isSectionBackgroundId("page-11111111-1111-1111-1111-111111111111"), false);
});

test("asset usage merges draft and published references at the same location", () => {
  const assets = buildAssetUsage([
    {
      section_id: "home-section-01",
      draft_key: "section-backgrounds/home-section-01/photo.jpg",
      draft_content_type: "image/jpeg",
      draft_original_name: "photo.jpg",
      published_key: "section-backgrounds/home-section-01/photo.jpg",
      published_content_type: "image/jpeg",
      published_original_name: "photo.jpg",
      updated_at: "2026-08-01T00:00:00.000Z",
      published_at: "2026-08-01T00:00:00.000Z",
    },
  ], []);
  assert.equal(assets.length, 1);
  assert.equal(assets[0].usageCount, 1);
  assert.deepEqual(assets[0].usages[0].states, ["draft", "published"]);
});
test("change history retention uses the approved age and hard cap", () => {
  assert.equal(getChangeHistoryCutoff(new Date("2026-08-01T00:00:00.000Z")), "2026-02-02T00:00:00.000Z");
  assert.equal(getChangeHistoryOverflow(9_999), 0);
  assert.equal(getChangeHistoryOverflow(10_000), 0);
  assert.equal(getChangeHistoryOverflow(10_025), 25);
});
test("change history cleanup removes expired rows before enforcing the hard cap", async () => {
  const rows = [
    { id: "old", created_at: "2025-01-01T00:00:00.000Z" },
    { id: "new-1", created_at: "2026-07-01T00:00:00.000Z" },
    { id: "new-2", created_at: "2026-07-02T00:00:00.000Z" },
    { id: "new-3", created_at: "2026-07-03T00:00:00.000Z" },
    { id: "new-4", created_at: "2026-07-04T00:00:00.000Z" },
  ];
  const db = {
    prepare(sql) {
      let bindings = [];
      return {
        bind(...values) { bindings = values; return this; },
        async all() { return { results: [] }; },
        async first() {
          if (sql.startsWith("SELECT COUNT")) return { count: rows.length };
          return null;
        },
        async run() {
          if (sql.startsWith("DELETE FROM change_history WHERE created_at")) {
            const before = rows.length;
            for (let index = rows.length - 1; index >= 0; index -= 1) if (rows[index].created_at < bindings[0]) rows.splice(index, 1);
            return { meta: { changes: before - rows.length } };
          }
          if (sql.startsWith("DELETE FROM change_history WHERE id IN")) {
            const count = Number(bindings[0]);
            rows.sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
            rows.splice(0, count);
            return { meta: { changes: count } };
          }
          return { meta: { changes: 0 } };
        },
      };
    },
  };
  const result = await cleanupChangeHistory(db, { now: new Date("2026-08-01T00:00:00.000Z"), retentionDays: 180, maxRecords: 2, source: "test" });
  assert.deepEqual({ deletedByAge: result.deletedByAge, deletedByLimit: result.deletedByLimit, remainingCount: result.remainingCount }, { deletedByAge: 1, deletedByLimit: 2, remainingCount: 2 });
  assert.deepEqual(rows.map((row) => row.id), ["new-3", "new-4"]);
});