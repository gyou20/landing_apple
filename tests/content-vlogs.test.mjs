import assert from "node:assert/strict";
import test from "node:test";
import { normalizeVlogSlug, validateVlogDraft } from "../db/content-vlogs.ts";

test("vlog slug is normalized and protects reserved articles", () => {
  assert.equal(normalizeVlogSlug(" New-Story "), "new-story");
  assert.throws(() => normalizeVlogSlug("brand-strategy"), /invalid-vlog-slug/);
  assert.throws(() => normalizeVlogSlug("한글 경로"), /invalid-vlog-slug/);
});

test("vlog draft validates the complete editable shape", () => {
  assert.deepEqual(validateVlogDraft({
    title: "새 이야기",
    slug: "new-story",
    category: "Culture",
    summary: "짧은 요약",
    body: "공개할 본문",
  }), {
    title: "새 이야기",
    slug: "new-story",
    category: "Culture",
    summary: "짧은 요약",
    body: "공개할 본문",
  });
  assert.throws(() => validateVlogDraft({ title: "", slug: "new-story", category: "Culture" }), /invalid-vlog-title/);
  assert.throws(() => validateVlogDraft({ title: "새 이야기", slug: "new-story", category: "" }), /invalid-vlog-category/);
});
