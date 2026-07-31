import { getAdminUser } from "../../../../chatgpt-auth";
import { getSectionBackground, getSectionBackgroundBindings, isHomeSectionId } from "../../../../../db/section-backgrounds";

export async function GET(_request: Request, context: { params: Promise<{ sectionId: string }> }) {
  if (!(await getAdminUser())) return new Response("Unauthorized", { status: 401 });
  const { sectionId } = await context.params;
  if (!isHomeSectionId(sectionId)) return new Response("Not found", { status: 404 });
  try {
    const { db, media } = getSectionBackgroundBindings();
    const row = await getSectionBackground(db, sectionId);
    if (!row?.draft_key) return new Response("Not found", { status: 404 });
    const object = await media.get(row.draft_key);
    if (!object) return new Response("Not found", { status: 404 });
    return new Response(object.body, {
      headers: {
        "Content-Type": row.draft_content_type ?? object.httpMetadata?.contentType ?? "application/octet-stream",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("[section-background:admin-image-failed]", { sectionId, error });
    return new Response("Image unavailable", { status: 500 });
  }
}