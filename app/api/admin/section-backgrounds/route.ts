import { getAdminUser } from "../../../chatgpt-auth";
import {
  getSectionBackground,
  getSectionBackgroundBindings,
  isSectionBackgroundId,
  listSectionBackgrounds,
} from "../../../../db/section-backgrounds";
import { recordChange } from "../../../../db/change-history";

const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const CONTENT_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

function unauthorized() {
  return Response.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
}

export async function GET() {
  if (!(await getAdminUser())) return unauthorized();
  try {
    const { db } = getSectionBackgroundBindings();
    const rows = await listSectionBackgrounds(db);
    return Response.json({
      sections: rows.map((row) => ({
        sectionId: row.section_id,
        draftOriginalName: row.draft_original_name,
        hasDraft: Boolean(row.draft_key),
        isPublished: Boolean(row.published_key),
        hasUnpublishedChange: Boolean(row.draft_key && row.draft_key !== row.published_key),
        updatedAt: row.updated_at,
        publishedAt: row.published_at,
        draftImageUrl: row.draft_key ? `/api/admin/section-backgrounds/${row.section_id}?v=${encodeURIComponent(row.updated_at)}` : null,
      })),
    });
  } catch (error) {
    console.error("[section-background:list-failed]", { error });
    return Response.json({ error: "배경 이미지 상태를 불러오지 못했습니다." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getAdminUser();
  if (!user) return unauthorized();
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
    const extension = CONTENT_TYPES.get(fileValue.type);
    if (!extension) {
      return Response.json({ error: "JPEG, PNG, WebP만 업로드할 수 있습니다." }, { status: 400 });
    }
    if (fileValue.size <= 0 || fileValue.size > MAX_IMAGE_BYTES) {
      return Response.json({ error: "이미지는 20MB 이하여야 합니다." }, { status: 400 });
    }

    const { db, media } = getSectionBackgroundBindings();
    const current = await getSectionBackground(db, sectionId);
    uploadedKey = `section-backgrounds/${sectionId}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
    console.info("[section-background:upload-start]", { sectionId, size: fileValue.size, type: fileValue.type });
    await media.put(uploadedKey, fileValue.stream(), {
      httpMetadata: { contentType: fileValue.type },
      customMetadata: { sectionId, originalName: fileValue.name },
    });
    console.info("[section-background:r2-saved]", { sectionId, key: uploadedKey });

    const updatedAt = new Date().toISOString();
    await db.prepare(
      `INSERT INTO section_backgrounds (
        section_id, draft_key, draft_content_type, draft_original_name, updated_at
      ) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(section_id) DO UPDATE SET
        draft_key = excluded.draft_key,
        draft_content_type = excluded.draft_content_type,
        draft_original_name = excluded.draft_original_name,
        updated_at = excluded.updated_at`,
    ).bind(sectionId, uploadedKey, fileValue.type, fileValue.name, updatedAt).run();
    await recordChange(db, {
      entityType: "image",
      entityId: uploadedKey,
      entityTitle: fileValue.name,
      summary: current?.draft_key ? "섹션 배경 이미지 교체" : "섹션 배경 이미지 업로드",
      actorEmail: user.email,
    });
    console.info("[section-background:d1-draft-saved]", { sectionId, updatedAt });

    if (current?.draft_key && current.draft_key !== current.published_key) {
      await media.delete(current.draft_key);
      console.info("[section-background:old-draft-removed]", { sectionId });
    }

    return Response.json({
      sectionId,
      draftOriginalName: fileValue.name,
      hasUnpublishedChange: true,
      updatedAt,
      draftImageUrl: `/api/admin/section-backgrounds/${sectionId}?v=${encodeURIComponent(updatedAt)}`,
    });
  } catch (error) {
    console.error("[section-background:upload-failed]", { uploadedKey, error });
    if (uploadedKey) {
      try {
        const { media } = getSectionBackgroundBindings();
        await media.delete(uploadedKey);
      } catch (cleanupError) {
        console.error("[section-background:cleanup-failed]", { uploadedKey, cleanupError });
      }
    }
    return Response.json({ error: "이미지를 저장하지 못했습니다." }, { status: 500 });
  }
}