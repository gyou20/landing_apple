import { getAdminUser } from "../../../../chatgpt-auth";
import { getSectionBackgroundBindings, listSectionBackgrounds } from "../../../../../db/section-backgrounds";

export async function POST() {
  if (!(await getAdminUser())) {
    return Response.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
  }
  try {
    const { db } = getSectionBackgroundBindings();
    const rows = await listSectionBackgrounds(db);
    const pending = rows.filter((row) => row.draft_key && row.draft_key !== row.published_key);
    const publishedAt = new Date().toISOString();
    console.info("[section-background:publish-start]", { sectionIds: pending.map((row) => row.section_id) });
    for (const row of pending) {
      await db.prepare(
        `UPDATE section_backgrounds SET
          published_key = draft_key,
          published_content_type = draft_content_type,
          published_at = ?
        WHERE section_id = ? AND draft_key IS NOT NULL`,
      ).bind(publishedAt, row.section_id).run();
    }
    console.info("[section-background:publish-complete]", { count: pending.length, publishedAt });
    return Response.json({ publishedCount: pending.length, publishedAt });
  } catch (error) {
    console.error("[section-background:publish-failed]", { error });
    return Response.json({ error: "배경 이미지를 Publish하지 못했습니다." }, { status: 500 });
  }
}