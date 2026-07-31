import assert from "node:assert/strict";
import test from "node:test";
import { normalizePageSlug, validatePageDraft } from "../db/content-pages.ts";

test("page slug is normalized and validated", () => {
  assert.equal(normalizePageSlug("new-page"), "/new-page");
  assert.equal(normalizePageSlug(" /campaign-2026 "), "/campaign-2026");
  assert.throws(() => normalizePageSlug("/admin"), /invalid-page-slug/);
  assert.throws(() => normalizePageSlug("/한글 경로"), /invalid-page-slug/);
});

test("block pages preserve the existing custom-page rules", () => {
  assert.deepEqual(validatePageDraft({ title: "새 페이지", slug: "/new-page" }), { title: "새 페이지", slug: "/new-page", type: "Custom page", summary: "", body: "" });
  assert.deepEqual(validatePageDraft({ title: "블록 페이지", slug: "/blocks", type: "Block page" }), { title: "블록 페이지", slug: "/blocks", type: "Block page", summary: "", body: "" });
  assert.throws(() => validatePageDraft({ title: "", slug: "/new-page" }), /invalid-page-title/);
  assert.throws(() => validatePageDraft({ title: "New", slug: "/new-page", type: "Homepage" }), /invalid-page-type/);
});

test("article pages accept summary and free-form body with limits", () => {
  assert.deepEqual(validatePageDraft({ title: "게시글 페이지", slug: "/article-page", type: "Article page", summary: "요약", body: "첫 문단\n\n둘째 문단" }), { title: "게시글 페이지", slug: "/article-page", type: "Article page", summary: "요약", body: "첫 문단\n\n둘째 문단" });
  assert.throws(() => validatePageDraft({ title: "게시글", slug: "/article", type: "Article page", summary: "x".repeat(501), body: "" }), /invalid-page-summary/);
  assert.throws(() => validatePageDraft({ title: "게시글", slug: "/article", type: "Article page", summary: "", body: "x".repeat(20001) }), /invalid-page-body/);
});