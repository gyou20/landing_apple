import { getSectionBackgroundBindings, listSectionBackgrounds } from "../../../../db/section-backgrounds";

export async function GET() {
  try {
    const { db } = getSectionBackgroundBindings();
    const rows = await listSectionBackgrounds(db);
    return Response.json({
      sections: rows.filter((row) => row.published_key).map((row) => ({
        sectionId: row.section_id,
        imageUrl: `/api/site/section-backgrounds/${row.section_id}?v=${encodeURIComponent(row.published_at ?? "")}`,
        publishedAt: row.published_at,
      })),
    }, { headers: { "Cache-Control": "no-cache" } });
  } catch (error) {
    console.error("[section-background:public-list-failed]", { error });
    return Response.json({ sections: [] }, { headers: { "Cache-Control": "no-cache" } });
  }
}