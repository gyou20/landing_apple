import { getSectionBackground, getSectionBackgroundBindings, isHomeSectionId } from "../../../../../db/section-backgrounds";

export async function GET(_request: Request, context: { params: Promise<{ sectionId: string }> }) {
  const { sectionId } = await context.params;
  if (!isHomeSectionId(sectionId)) return new Response("Not found", { status: 404 });
  try {
    const { db, media } = getSectionBackgroundBindings();
    const row = await getSectionBackground(db, sectionId);
    if (!row?.published_key) return new Response("Not found", { status: 404 });
    const object = await media.get(row.published_key);
    if (!object) return new Response("Not found", { status: 404 });
    return new Response(object.body, {
      headers: {
        "Content-Type": row.published_content_type ?? object.httpMetadata?.contentType ?? "application/octet-stream",
        "Cache-Control": "public, max-age=300, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("[section-background:public-image-failed]", { sectionId, error });
    return new Response("Image unavailable", { status: 500 });
  }
}