import { NextResponse } from "next/server";
import { defaultVisibility, listVisibility, getVisibilityDb, VISIBILITY_ENTITY_IDS, type VisibilityEntityType } from "../../../../db/content-visibility";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const records = await listVisibility(await getVisibilityDb());
    const published = (Object.entries(VISIBILITY_ENTITY_IDS) as Array<[VisibilityEntityType, readonly string[]]>).flatMap(([entityType, ids]) => ids.map((entityId) => { const record = records.find((candidate) => candidate.entityType === entityType && candidate.entityId === entityId); return { entityType, entityId, ...(record?.published ?? defaultVisibility(entityType)) }; }));
    return NextResponse.json({ records: published }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.warn("[visibility:public-load-defaults]", { error: error instanceof Error ? error.message : String(error) });
    const defaults = (Object.entries(VISIBILITY_ENTITY_IDS) as Array<[VisibilityEntityType, readonly string[]]>).flatMap(([entityType, ids]) => ids.map((entityId) => ({ entityType, entityId, ...defaultVisibility(entityType) })));
    return NextResponse.json({ records: defaults }, { headers: { "Cache-Control": "no-store" } });
  }
}