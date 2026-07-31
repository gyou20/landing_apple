import assert from "node:assert/strict";
import test from "node:test";
import { buildPublicNavigation } from "../lib/public-navigation.ts";

const page = {
  id: "page-11111111-1111-1111-1111-111111111111",
  draft: { title: "회사 소개", slug: "/about-us", type: "Custom page", status: "published" },
  published: { title: "회사 소개", slug: "/about-us", type: "Custom page", status: "published" },
  sortOrder: 100,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
  publishedAt: "2026-08-01T00:00:00.000Z",
};

test("published custom pages are appended to the public menu", () => {
  assert.deepEqual(buildPublicNavigation([page], [], new Set()).map(({ label, href }) => ({ label, href })), [
    { label: "Home", href: "/home" },
    { label: "Contact", href: "/contact" },
    { label: "Vlog", href: "/vlog" },
    { label: "회사 소개", href: "/about-us" },
  ]);
});

test("draft-only, hidden, and deleted custom pages stay out of the public menu", () => {
  const draftOnly = { ...page, id: "page-22222222-2222-2222-2222-222222222222", published: null };
  const visibility = [{ entityType: "page", entityId: page.id, draft: { menuVisible: false, searchIndexable: true }, published: { menuVisible: false, searchIndexable: true }, updatedAt: page.updatedAt, publishedAt: page.publishedAt }];
  assert.equal(buildPublicNavigation([page, draftOnly], visibility, new Set()).some((item) => item.id === page.id), false);
  assert.equal(buildPublicNavigation([page], [], new Set([`page:${page.id}`])).some((item) => item.id === page.id), false);
});
