export const SITE_DOCUMENT_SCHEMA_VERSION = 2 as const;
export const ASSET_USAGE_INDEX_SCHEMA_VERSION = 1 as const;
export const CLEANUP_CANDIDATE_SCHEMA_VERSION = 1 as const;
export const IMAGE_ORPHAN_RETENTION_DAYS = 90;
export const CLEANUP_BATCH_LIMIT = 25;
export const CONTENT_MAINTENANCE_LEASE_KEY =
  "locks/content-maintenance.json";

export type JsonPrimitive = boolean | number | string | null;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface VisibilityState {
  menuVisible: boolean;
  searchIndexable: boolean;
}

export type PublicationStatus =
  | "deleted"
  | "draft"
  | "hidden"
  | "published";

export type PageType = "contact" | "generic" | "home" | "vlog-index";

export type SectionType =
  | "agency-closing"
  | "agency-process"
  | "agency-projects"
  | "agency-statement"
  | "contact"
  | "hero-phone"
  | "phone-experience"
  | "rich-content";

export interface OriginalImage {
  bytes: number;
  format: "jpeg" | "png";
  height: number;
  url: string;
  width: number;
}

export interface ImageVariant {
  bytes: number;
  contentHash: string;
  format: "jpeg" | "png" | "webp";
  height: number;
  url: string;
  width: number;
}

export interface AssetReference {
  alt: string;
  aspectRatio: number;
  assetId: string;
  createdAt: string;
  dominantColor: string;
  fallbackVariants: ImageVariant[];
  height: number;
  original: OriginalImage;
  sourceHash: string;
  transformProfileVersion: string;
  variants: ImageVariant[];
  width: number;
}

export interface SeoSettings {
  canonicalPath?: string;
  description: string;
  noIndex: boolean;
  openGraphImage?: AssetReference;
  title: string;
}

export interface DesignTokens {
  accentColor?: string;
  backgroundColor?: string;
  foregroundColor?: string;
  layout: string;
  spacing: "compact" | "default" | "spacious";
}

export interface MotionPreset {
  enabled: boolean;
  name:
    | "editorial-stack"
    | "final-scale"
    | "none"
    | "side-wipe"
    | "split-rise";
  reducedMotionFallback: "none" | "opacity";
}

export interface SectionBlock {
  content: { [key: string]: JsonValue };
  design: DesignTokens;
  enabled: boolean;
  motion: MotionPreset;
  order: number;
  sectionId: string;
  type: SectionType;
  visibility: VisibilityState;
}

export interface PageDocument {
  createdAt: string;
  deletedAt?: string;
  deleteAfter?: string;
  navigationLabel: string;
  pageId: string;
  pageNumber: string;
  sections: SectionBlock[];
  seo: SeoSettings;
  showInNavigation: boolean;
  visibility: VisibilityState;
  slug: string;
  status: PublicationStatus;
  title: string;
  type: PageType;
  updatedAt: string;
}

export interface AuthorReference {
  authorId: string;
  name: string;
  url?: string;
}

export interface VideoMetadata {
  description: string;
  duration?: string;
  embedUrl?: string;
  name: string;
  thumbnail: AssetReference;
  uploadDate: string;
}

export interface VlogArticleDocument {
  articleId: string;
  author: AuthorReference;
  body: SectionBlock[];
  coverImage: AssetReference;
  createdAt: string;
  deletedAt?: string;
  deleteAfter?: string;
  headline: string;
  modifiedAt: string;
  publishedAt?: string;
  seo: SeoSettings;
  slug: string;
  status: PublicationStatus;
  summary: string;
  tags: string[];
  video?: VideoMetadata;
  visibility: VisibilityState;
}

export interface NavigationItem {
  enabled: boolean;
  itemId: string;
  label: string;
  order: number;
  pageId: string;
}

export interface TrackingSettings {
  enabledProviderIds: string[];
  requireConsent: boolean;
}

export interface SiteDocumentV2 {
  articles: VlogArticleDocument[];
  createdAt: string;
  documentId: string;
  locale: "ko";
  navigation: NavigationItem[];
  pages: PageDocument[];
  schemaVersion: typeof SITE_DOCUMENT_SCHEMA_VERSION;
  siteName: string;
  tracking: TrackingSettings;
  updatedAt: string;
  versionId: string;
}

export interface AssetUsageReference {
  entityId: string;
  entityType: "page" | "section" | "site-setting" | "vlog-article";
  fieldPath: string;
}

export interface AssetUsageIndex {
  activeCount: number;
  activeReferences: AssetUsageReference[];
  assetId: string;
  eligibleDeleteAt: string | null;
  orphanedAt: string | null;
  schemaVersion: typeof ASSET_USAGE_INDEX_SCHEMA_VERSION;
  status: "active" | "deleted" | "deleting";
  updatedAt: string;
  verifiedVersionId: string | null;
}

export interface CleanupCandidate {
  assetId: string;
  createdAt: string;
  eligibleDeleteAt: string;
  orphanedAt: string;
  reason: "never-published" | "removed-from-active";
  removedInVersionId: string | null;
  schemaVersion: typeof CLEANUP_CANDIDATE_SCHEMA_VERSION;
  sourceHash: string;
}

export interface ContentMaintenanceLease {
  acquiredAt: string;
  expiresAt: string;
  fencingToken: string;
  ownerId: string;
  ownerType: "cleanup" | "publish";
}

export interface SchemaIssue {
  code: string;
  message: string;
  path: string;
}

export interface SchemaValidationResult<T> {
  issues: SchemaIssue[];
  valid: boolean;
  value?: T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isIsoDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    Number.isFinite(Date.parse(value)) &&
    value.includes("T")
  );
}

function addIssue(
  issues: SchemaIssue[],
  path: string,
  code: string,
  message: string,
) {
  issues.push({ code, message, path });
}

function validateVisibilityState(issues: SchemaIssue[], value: unknown, path: string) {
  if (!isRecord(value) || typeof value.menuVisible !== "boolean" || typeof value.searchIndexable !== "boolean") {
    addIssue(issues, path, "visibility.invalid", "visibility must contain boolean menuVisible and searchIndexable values.");
  }
}
function validateUniqueValues(
  issues: SchemaIssue[],
  values: string[],
  path: string,
  code: string,
) {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      addIssue(issues, path, code, `Duplicate value: ${value}`);
    }
    seen.add(value);
  }
}

export function validateSiteDocumentV2(
  input: unknown,
): SchemaValidationResult<SiteDocumentV2> {
  const issues: SchemaIssue[] = [];
  if (!isRecord(input)) {
    return {
      issues: [
        {
          code: "document.type",
          message: "Site document must be an object.",
          path: "$",
        },
      ],
      valid: false,
    };
  }

  if (input.schemaVersion !== SITE_DOCUMENT_SCHEMA_VERSION) {
    addIssue(
      issues,
      "$.schemaVersion",
      "document.schema-version",
      `Expected schema version ${SITE_DOCUMENT_SCHEMA_VERSION}.`,
    );
  }

  for (const field of ["documentId", "siteName", "versionId"] as const) {
    if (!isNonEmptyString(input[field])) {
      addIssue(
        issues,
        `$.${field}`,
        "document.required-string",
        `${field} must be a non-empty string.`,
      );
    }
  }

  if (input.locale !== "ko") {
    addIssue(
      issues,
      "$.locale",
      "document.locale",
      "The initial document locale must be ko.",
    );
  }

  for (const field of ["createdAt", "updatedAt"] as const) {
    if (!isIsoDate(input[field])) {
      addIssue(
        issues,
        `$.${field}`,
        "document.invalid-date",
        `${field} must be an ISO date-time string.`,
      );
    }
  }

  if (!Array.isArray(input.pages)) {
    addIssue(
      issues,
      "$.pages",
      "document.pages",
      "pages must be an array.",
    );
  } else {
    const pageIds: string[] = [];
    const pageSlugs: string[] = [];
    input.pages.forEach((page, pageIndex) => {
      const pagePath = `$.pages[${pageIndex}]`;
      if (!isRecord(page)) {
        addIssue(
          issues,
          pagePath,
          "page.type",
          "Each page must be an object.",
        );
        return;
      }

      if (isNonEmptyString(page.pageId)) pageIds.push(page.pageId);
      else
        addIssue(
          issues,
          `${pagePath}.pageId`,
          "page.id",
          "pageId is required.",
        );

      if (isNonEmptyString(page.slug)) pageSlugs.push(page.slug);
      else
        addIssue(
          issues,
          `${pagePath}.slug`,
          "page.slug",
          "slug is required.",
        );

      validateVisibilityState(issues, page.visibility, `${pagePath}.visibility`);

      if (!Array.isArray(page.sections)) {
        addIssue(
          issues,
          `${pagePath}.sections`,
          "page.sections",
          "sections must be an array.",
        );
        return;
      }

      const sectionIds: string[] = [];
      page.sections.forEach((section, sectionIndex) => {
        const sectionPath = `${pagePath}.sections[${sectionIndex}]`;
        if (!isRecord(section)) {
          addIssue(
            issues,
            sectionPath,
            "section.type",
            "Each section must be an object.",
          );
          return;
        }
        if (isNonEmptyString(section.sectionId)) {
          sectionIds.push(section.sectionId);
        } else {
          addIssue(
            issues,
            `${sectionPath}.sectionId`,
            "section.id",
            "sectionId is required.",
          );
        }
        validateVisibilityState(issues, section.visibility, `${sectionPath}.visibility`);
        if (!Number.isInteger(section.order) || Number(section.order) < 0) {
          addIssue(
            issues,
            `${sectionPath}.order`,
            "section.order",
            "Section order must be a non-negative integer.",
          );
        }
      });
      validateUniqueValues(
        issues,
        sectionIds,
        `${pagePath}.sections`,
        "section.duplicate-id",
      );
    });
    validateUniqueValues(issues, pageIds, "$.pages", "page.duplicate-id");
    validateUniqueValues(issues, pageSlugs, "$.pages", "page.duplicate-slug");
  }

  if (!Array.isArray(input.articles)) {
    addIssue(
      issues,
      "$.articles",
      "document.articles",
      "articles must be an array.",
    );
  } else {
    input.articles.forEach((article, articleIndex) => {
      if (!isRecord(article)) {
        addIssue(issues, `$.articles[${articleIndex}]`, "article.type", "Each article must be an object.");
        return;
      }
      validateVisibilityState(issues, article.visibility, `$.articles[${articleIndex}].visibility`);
    });
  }
  if (!Array.isArray(input.navigation)) {
    addIssue(
      issues,
      "$.navigation",
      "document.navigation",
      "navigation must be an array.",
    );
  }

  const valid = issues.length === 0;
  return {
    issues,
    valid,
    value: valid ? (input as unknown as SiteDocumentV2) : undefined,
  };
}

export function validateAssetUsageIndex(
  input: unknown,
): SchemaValidationResult<AssetUsageIndex> {
  const issues: SchemaIssue[] = [];
  if (!isRecord(input)) {
    return {
      issues: [
        {
          code: "asset-usage.type",
          message: "Asset usage index must be an object.",
          path: "$",
        },
      ],
      valid: false,
    };
  }

  if (input.schemaVersion !== ASSET_USAGE_INDEX_SCHEMA_VERSION) {
    addIssue(
      issues,
      "$.schemaVersion",
      "asset-usage.schema-version",
      `Expected schema version ${ASSET_USAGE_INDEX_SCHEMA_VERSION}.`,
    );
  }
  if (!isNonEmptyString(input.assetId)) {
    addIssue(
      issues,
      "$.assetId",
      "asset-usage.id",
      "assetId is required.",
    );
  }
  if (!Array.isArray(input.activeReferences)) {
    addIssue(
      issues,
      "$.activeReferences",
      "asset-usage.references",
      "activeReferences must be an array.",
    );
  }
  if (!Number.isInteger(input.activeCount) || Number(input.activeCount) < 0) {
    addIssue(
      issues,
      "$.activeCount",
      "asset-usage.count",
      "activeCount must be a non-negative integer.",
    );
  } else if (
    Array.isArray(input.activeReferences) &&
    input.activeCount !== input.activeReferences.length
  ) {
    addIssue(
      issues,
      "$.activeCount",
      "asset-usage.count-mismatch",
      "activeCount must equal activeReferences.length.",
    );
  }
  if (
    input.verifiedVersionId !== null &&
    !isNonEmptyString(input.verifiedVersionId)
  ) {
    addIssue(
      issues,
      "$.verifiedVersionId",
      "asset-usage.verified-version",
      "verifiedVersionId must be null or a non-empty string.",
    );
  }

  const valid = issues.length === 0;
  return {
    issues,
    valid,
    value: valid ? (input as unknown as AssetUsageIndex) : undefined,
  };
}

function assertStorageSegment(value: string, label: string) {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(value)) {
    throw new Error(`${label} contains unsafe storage-key characters.`);
  }
}

export function cleanupCandidateKey(candidate: CleanupCandidate): string {
  assertStorageSegment(candidate.assetId, "assetId");
  const eligibleDate = candidate.eligibleDeleteAt.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(eligibleDate)) {
    throw new Error("eligibleDeleteAt must be an ISO date-time string.");
  }
  return `cleanup-candidates/${eligibleDate}/${candidate.assetId}.json`;
}

export function assetUsageIndexKey(assetId: string): string {
  assertStorageSegment(assetId, "assetId");
  return `assets/usage-index/${assetId}.json`;
}

export function logSchemaValidation(
  scope: "asset-usage" | "site-document",
  result: SchemaValidationResult<unknown>,
) {
  const payload = {
    issueCodes: result.issues.map((issue) => issue.code),
    issueCount: result.issues.length,
    scope,
    valid: result.valid,
  };
  if (result.valid) {
    console.info("[aether:cms:schema-validation]", payload);
    return;
  }
  console.error("[aether:cms:schema-validation-failed]", payload);
}
