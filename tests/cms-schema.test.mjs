import assert from "node:assert/strict";
import test from "node:test";
import {
  assetUsageIndexKey,
  cleanupCandidateKey,
  validateAssetUsageIndex,
  validateSiteDocumentV2,
} from "../lib/cms/schema.ts";

const validDocument = {
  articles: [],
  createdAt: "2026-07-29T00:00:00.000Z",
  documentId: "aether-site",
  locale: "ko",
  navigation: [],
  pages: [
    {
      createdAt: "2026-07-29T00:00:00.000Z",
      navigationLabel: "Home",
      pageId: "page-home",
      pageNumber: "01",
      sections: [
        {
          content: { headline: "Aether" },
          design: { layout: "hero", spacing: "default" },
          enabled: true,
          motion: {
            enabled: true,
            name: "split-rise",
            reducedMotionFallback: "opacity",
          },
          order: 0,
          sectionId: "section-01",
          type: "hero-phone",
        },
      ],
      seo: {
        description: "Aether home",
        noIndex: false,
        title: "Aether",
      },
      showInNavigation: true,
      slug: "home",
      status: "published",
      title: "Home",
      type: "home",
      updatedAt: "2026-07-29T00:00:00.000Z",
    },
  ],
  schemaVersion: 2,
  siteName: "Aether",
  tracking: { enabledProviderIds: [], requireConsent: true },
  updatedAt: "2026-07-29T00:00:00.000Z",
  versionId: "version-1",
};

test("accepts a valid SiteDocumentV2", () => {
  const result = validateSiteDocumentV2(validDocument);
  assert.equal(result.valid, true);
  assert.deepEqual(result.issues, []);
});

test("rejects duplicate page ids, slugs, and section ids", () => {
  const duplicatePage = structuredClone(validDocument.pages[0]);
  duplicatePage.sections.push(structuredClone(duplicatePage.sections[0]));
  const result = validateSiteDocumentV2({
    ...validDocument,
    pages: [validDocument.pages[0], duplicatePage],
  });

  assert.equal(result.valid, false);
  assert.deepEqual(
    new Set(result.issues.map((issue) => issue.code)),
    new Set([
      "page.duplicate-id",
      "page.duplicate-slug",
      "section.duplicate-id",
    ]),
  );
});

test("rejects an AssetUsageIndex count mismatch", () => {
  const result = validateAssetUsageIndex({
    activeCount: 0,
    activeReferences: [
      {
        entityId: "page-home",
        entityType: "page",
        fieldPath: "pages/page-home/seo/openGraphImage",
      },
    ],
    assetId: "asset-1",
    eligibleDeleteAt: null,
    orphanedAt: null,
    schemaVersion: 1,
    status: "active",
    updatedAt: "2026-07-29T00:00:00.000Z",
    verifiedVersionId: "version-1",
  });

  assert.equal(result.valid, false);
  assert.equal(
    result.issues.some(
      (issue) => issue.code === "asset-usage.count-mismatch",
    ),
    true,
  );
});

test("builds stable R2 keys and rejects unsafe ids", () => {
  assert.equal(
    assetUsageIndexKey("asset-01"),
    "assets/usage-index/asset-01.json",
  );
  assert.equal(
    cleanupCandidateKey({
      assetId: "asset-01",
      createdAt: "2026-07-29T00:00:00.000Z",
      eligibleDeleteAt: "2026-10-27T00:00:00.000Z",
      orphanedAt: "2026-07-29T00:00:00.000Z",
      reason: "never-published",
      removedInVersionId: null,
      schemaVersion: 1,
      sourceHash: "hash-01",
    }),
    "cleanup-candidates/2026-10-27/asset-01.json",
  );
  assert.throws(() => assetUsageIndexKey("../asset"));
});
