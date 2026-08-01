import assert from "node:assert/strict";
import test from "node:test";
import { validateSectionBlocks, validateSectionDraft } from "../db/content-sections.ts";

test("a new section receives the constrained default template", () => {
  const section = validateSectionDraft({ pageId: "home", title: "새 캠페인" });
  assert.equal(section.pageId, "home");
  assert.equal(section.title, "새 캠페인");
  assert.equal(section.content.eyebrow, "New section");
  assert.equal(section.content.headlinePrimary, "새로운 이야기를");
  assert.equal(section.content.headlineAccent, "시작하세요.");
});

test("sections accept stable custom page ids and reject unknown parents", () => {
  const pageId = "page-11111111-1111-1111-1111-111111111111";
  assert.equal(validateSectionDraft({ pageId, title: "소개" }).pageId, pageId);
  assert.throws(() => validateSectionDraft({ pageId: "unknown", title: "소개" }), /invalid-section-page/);
  assert.throws(() => validateSectionDraft({ pageId: "home", title: "" }), /invalid-section-title/);
});

test("section content is normalized to the supported fields", () => {
  const section = validateSectionDraft({ pageId: "contact", title: "연락", content: { eyebrow: "Hello", ctaLabel: "문의하기" } });
  assert.deepEqual(Object.keys(section.content), ["eyebrow", "headlinePrimary", "headlineAccent", "subheadline", "description", "ctaLabel", "blocks"]);
  assert.equal(section.content.eyebrow, "Hello");
  assert.equal(section.content.ctaLabel, "문의하기");
});

test("section blocks enforce supported types, safe URLs, and limits", () => {
  const blocks = validateSectionBlocks([
    { id: "block-text-1", type: "text", text: "핵심 설명" },
    { id: "block-button-1", type: "button", label: "문의하기", href: "/contact" },
    { id: "block-image-1", type: "image", src: "https://example.com/image.jpg", alt: "제품 이미지" },
  ]);
  assert.deepEqual(blocks.map((block) => block.type), ["text", "button", "image"]);
  assert.throws(() => validateSectionBlocks(Array.from({ length: 4 }, (_, index) => ({ id: `block-text-${index}`, type: "text", text: "x" }))), /section-block-limit-exceeded/);
  assert.throws(() => validateSectionBlocks([{ id: "block-image-1", type: "image", src: "javascript:alert(1)", alt: "x" }]), /invalid-section-block-url/);
  assert.throws(() => validateSectionBlocks([{ id: "block-text-1", type: "text", text: "x" }, { id: "block-text-1", type: "text", text: "y" }]), /invalid-section-block/);
});