import { NextResponse } from "next/server";
import { getAdminUser } from "../../../chatgpt-auth";
import { defaultVisibility, getVisibilityDb, isVisibilityEntity, listVisibility, saveDraftVisibility } from "../../../../db/content-visibility";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const records = await listVisibility(await getVisibilityDb());
    console.info("[visibility:admin-load]", { count: records.length, user: user.email });
    return NextResponse.json({ records });
  } catch (error) {
    console.error("[visibility:admin-load-failed]", { error });
    return NextResponse.json({ error: error instanceof Error ? error.message : "load-failed" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const entityType = String(body.entityType ?? "");
    const entityId = String(body.entityId ?? "");
    if (!isVisibilityEntity(entityType, entityId)) return NextResponse.json({ error: "invalid-entity" }, { status: 400 });
    if (typeof body.menuVisible !== "boolean" || typeof body.searchIndexable !== "boolean") return NextResponse.json({ error: "invalid-visibility" }, { status: 400 });
    const updatedAt = await saveDraftVisibility(await getVisibilityDb(), entityType, entityId, { menuVisible: body.menuVisible, searchIndexable: body.searchIndexable });
    console.info("[visibility:draft-saved]", { entityType, entityId, menuVisible: body.menuVisible, searchIndexable: body.searchIndexable, user: user.email });
    return NextResponse.json({ draft: { menuVisible: body.menuVisible, searchIndexable: body.searchIndexable }, published: defaultVisibility(entityType), updatedAt });
  } catch (error) {
    console.error("[visibility:draft-save-failed]", { error });
    return NextResponse.json({ error: error instanceof Error ? error.message : "save-failed" }, { status: 500 });
  }
}