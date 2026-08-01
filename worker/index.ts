/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { cleanupChangeHistory, recordChange, type ChangeHistoryDb } from "../db/change-history";
import { isSectionBackgroundId } from "../lib/section-background-id";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  MEDIA: R2Bucket;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

interface ScheduledController {
  cron: string;
  scheduledTime: number;
}

const SECTION_BACKGROUND_MAX_BYTES = 20 * 1024 * 1024;
const SECTION_BACKGROUND_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);
const SECTION_BACKGROUND_TABLE_SQL = `CREATE TABLE IF NOT EXISTS section_backgrounds (
  section_id TEXT PRIMARY KEY NOT NULL,
  draft_key TEXT,
  draft_content_type TEXT,
  draft_original_name TEXT,
  published_key TEXT,
  published_content_type TEXT,
  published_original_name TEXT,
  updated_at TEXT NOT NULL,
  published_at TEXT
)`;

async function handleSectionBackgroundUpload(request: Request, env: Env) {
  const requestUrl = new URL(request.url);
  const isLocal = requestUrl.hostname === "localhost" || requestUrl.hostname === "127.0.0.1" || requestUrl.hostname === "[::1]";
  const accessEmail = request.headers.get("cf-access-authenticated-user-email")?.trim();
  if (!isLocal && !accessEmail) {
    return Response.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
  }

  let uploadedKey: string | null = null;
  try {
    const formData = await request.formData();
    const sectionIdValue = formData.get("sectionId");
    const fileValue = formData.get("image");
    const sectionId = typeof sectionIdValue === "string" ? sectionIdValue : "";
    if (!isSectionBackgroundId(sectionId)) {
      return Response.json({ error: "허용되지 않은 섹션입니다." }, { status: 400 });
    }
    if (!(fileValue instanceof File)) {
      return Response.json({ error: "이미지 파일을 선택해 주세요." }, { status: 400 });
    }
    const extension = SECTION_BACKGROUND_TYPES.get(fileValue.type);
    if (!extension) {
      return Response.json({ error: "JPEG, PNG, WebP만 업로드할 수 있습니다." }, { status: 400 });
    }
    if (fileValue.size <= 0 || fileValue.size > SECTION_BACKGROUND_MAX_BYTES) {
      return Response.json({ error: "이미지는 20MB 이하여야 합니다." }, { status: 400 });
    }

    await env.DB.prepare(SECTION_BACKGROUND_TABLE_SQL).run();
    const columns = (await env.DB.prepare("PRAGMA table_info(section_backgrounds)").all<{ name: string }>()).results ?? [];
    if (!columns.some((column) => column.name === "published_original_name")) {
      console.info("[section-background:worker-schema-upgrade]", { column: "published_original_name" });
      await env.DB.prepare("ALTER TABLE section_backgrounds ADD COLUMN published_original_name TEXT").run();
    }
    const current = await env.DB.prepare(
      "SELECT draft_key, published_key FROM section_backgrounds WHERE section_id = ?",
    ).bind(sectionId).first<{ draft_key: string | null; published_key: string | null }>();
    uploadedKey = `section-backgrounds/${sectionId}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
    console.info("[section-background:worker-upload-start]", { sectionId, size: fileValue.size, type: fileValue.type });
    await env.MEDIA.put(uploadedKey, fileValue.stream(), {
      httpMetadata: { contentType: fileValue.type },
      customMetadata: { sectionId, originalName: fileValue.name },
    });
    console.info("[section-background:worker-r2-saved]", { sectionId, key: uploadedKey });

    const updatedAt = new Date().toISOString();
    await env.DB.prepare(
      `INSERT INTO section_backgrounds (
        section_id, draft_key, draft_content_type, draft_original_name, updated_at
      ) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(section_id) DO UPDATE SET
        draft_key = excluded.draft_key,
        draft_content_type = excluded.draft_content_type,
        draft_original_name = excluded.draft_original_name,
        updated_at = excluded.updated_at`,
    ).bind(sectionId, uploadedKey, fileValue.type, fileValue.name, updatedAt).run();
    await recordChange(env.DB as unknown as ChangeHistoryDb, {
      entityType: "image",
      entityId: uploadedKey,
      entityTitle: fileValue.name,
      summary: current?.draft_key ? "섹션 배경 이미지 교체" : "섹션 배경 이미지 업로드",
      actorEmail: accessEmail ?? "local-admin@example.test",
    });
    console.info("[section-background:worker-d1-draft-saved]", { sectionId, updatedAt });

    if (current?.draft_key && current.draft_key !== current.published_key) {
      await env.MEDIA.delete(current.draft_key);
      console.info("[section-background:worker-old-draft-removed]", { sectionId });
    }

    return Response.json({
      sectionId,
      draftOriginalName: fileValue.name,
      hasUnpublishedChange: true,
      updatedAt,
      draftImageUrl: `/api/admin/section-backgrounds/${sectionId}?v=${encodeURIComponent(updatedAt)}`,
    });
  } catch (error) {
    console.error("[section-background:worker-upload-failed]", { uploadedKey, error });
    if (uploadedKey) await env.MEDIA.delete(uploadedKey).catch(() => undefined);
    return Response.json({ error: "이미지를 저장하지 못했습니다." }, { status: 500 });
  }
}
// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    console.info("[change-history:scheduled-start]", { cron: controller.cron, scheduledTime: controller.scheduledTime });
    ctx.waitUntil(cleanupChangeHistory(env.DB as unknown as ChangeHistoryDb, { source: "scheduled" }).catch((error) => {
      console.error("[change-history:scheduled-failed]", { error });
    }));
  },

  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/admin/section-backgrounds" && request.method === "POST") {
      return handleSectionBackgroundUpload(request, env);
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;
