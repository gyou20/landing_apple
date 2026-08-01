import { NextResponse } from "next/server";
import { getAdminUser } from "../../../../chatgpt-auth";
import { getVisibilityDb, publishVisibility, publishVisibilityTargets } from "../../../../../db/content-visibility";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const body = await request.json().catch(() => ({})) as { targets?: Array<{ entityType: "page" | "section" | "vlog"; entityId: string }> };
    const scoped = body.targets ? await publishVisibilityTargets(await getVisibilityDb(), body.targets) : null;
    const publishedCount = scoped?.publishedCount ?? await publishVisibility(await getVisibilityDb());
    console.info("[visibility:publish-complete]", { publishedCount, user: user.email, scope: body.targets ? "targets" : "all", targetCount: body.targets?.length ?? null });
    return NextResponse.json({ publishedCount });
  } catch (error) {
    console.error("[visibility:publish-failed]", { error });
    return NextResponse.json({ error: error instanceof Error ? error.message : "publish-failed" }, { status: 500 });
  }
}
