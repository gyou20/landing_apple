import assert from "node:assert/strict";
import test from "node:test";
import { validateSectionBlocks, validateSectionDraft, validateSectionItems } from "../db/content-sections.ts";
import { SECTION_TEMPLATE_REGISTRY, getSectionTemplateDefinition } from "../lib/section-templates.ts";

test("a new section receives the constrained default template", () => {
  const section = validateSectionDraft({ pageId: "home", title: "새 캠페인" });
  assert.equal(section.pageId, "home");
  assert.equal(section.title, "새 캠페인");
  assert.equal(section.content.templateId, "editorialHero");
  assert.equal(section.content.eyebrow, "Aether One");
  assert.equal(section.content.headlinePrimary, "아이디어를 선명한 경험으로");
  assert.equal(section.content.headlineAccent, "의도를 움직이는 결과로");
});

test("sections accept stable custom page ids and reject unknown parents", () => {
  const pageId = "page-11111111-1111-1111-1111-111111111111";
  assert.equal(validateSectionDraft({ pageId, title: "소개" }).pageId, pageId);
  assert.throws(() => validateSectionDraft({ pageId: "unknown", title: "소개" }), /invalid-section-page/);
  assert.throws(() => validateSectionDraft({ pageId: "home", title: "" }), /invalid-section-title/);
});

test("section content is normalized to the supported fields", () => {
  const section = validateSectionDraft({ pageId: "contact", title: "연락", content: { eyebrow: "Hello", ctaLabel: "문의하기" } });
  assert.deepEqual(Object.keys(section.content), ["templateId", "eyebrow", "headlinePrimary", "headlineAccent", "subheadline", "description", "ctaLabel", "items", "blocks"]);
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
test("the code registry exposes unique automatically selectable templates", () => {
  assert.equal(SECTION_TEMPLATE_REGISTRY.length, 8);
  assert.equal(new Set(SECTION_TEMPLATE_REGISTRY.map((template) => template.id)).size, SECTION_TEMPLATE_REGISTRY.length);
  for (const template of SECTION_TEMPLATE_REGISTRY) {
    assert.equal(template.renderer, template.id);
    assert.ok(template.label);
    assert.ok(template.description);
  }
});

test("a requested template supplies its own schema defaults", () => {
  const section = validateSectionDraft({ pageId: "home", title: "프로젝트", templateId: "projectGrid" });
  assert.equal(section.content.templateId, "projectGrid");
  assert.equal(section.content.items.length, 3);
  assert.throws(() => validateSectionDraft({ pageId: "home", title: "잘못된 템플릿", templateId: "unknown" }), /invalid-section-template/);
});

test("template items enforce stable ids, safe links, and per-template limits", () => {
  const items = validateSectionItems([
    { id: "item-project-a", title: "Project A", href: "/contact", imageSrc: "https://example.com/a.jpg" },
  ], "projectGrid");
  assert.equal(items[0].title, "Project A");
  assert.throws(() => validateSectionItems([
    { id: "item-duplicate", title: "A" },
    { id: "item-duplicate", title: "B" },
  ], "projectGrid"), /invalid-section-item/);
  assert.throws(() => validateSectionItems([
    { id: "item-bad-link", title: "Bad", href: "javascript:alert(1)" },
  ], "projectGrid"), /invalid-section-block-url/);
});

test("contact template registers the durable submission endpoint", () => {
  const contact = getSectionTemplateDefinition("contactForm");
  assert.equal(contact.submissionEndpoint, "/api/contact");
});
test("every automatically listed admin template creates a valid section draft", () => {
  for (const template of SECTION_TEMPLATE_REGISTRY) {
    const section = validateSectionDraft({ pageId: "home", title: template.label, templateId: template.id });
    assert.equal(section.content.templateId, template.id);
    assert.equal(section.content.items.length, template.defaults.items.length);
    assert.ok(section.content.items.length <= template.maxItems);
  }
});