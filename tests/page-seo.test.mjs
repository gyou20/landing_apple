import assert from "node:assert/strict";
import test from "node:test";
import { buildArticleStructuredData, pageOpenGraphType, pageRobots } from "../lib/page-seo.ts";

test("article pages use Article SEO while block pages remain websites", () => {
  assert.equal(pageOpenGraphType("Article page"), "article");
  assert.equal(pageOpenGraphType("Block page"), "website");
  assert.equal(pageOpenGraphType("Custom page"), "website");
});

test("search visibility controls both indexing and link following", () => {
  assert.deepEqual(pageRobots(true), { index: true, follow: true });
  assert.deepEqual(pageRobots(false), { index: false, follow: false });
});

test("Article structured data uses the published page identity", () => {
  assert.deepEqual(buildArticleStructuredData({
    title: "새로운 관점",
    slug: "/new-view",
    type: "Article page",
    summary: "글 요약",
    body: "본문",
  }, "https://example.com/"), {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "새로운 관점",
    description: "글 요약",
    mainEntityOfPage: "https://example.com/new-view",
  });
});
