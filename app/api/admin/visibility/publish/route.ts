import { NextResponse } from "next/server";
import { getAdminUser } from "../../../../chatgpt-auth";
import { getVisibilityDb, publishVisibility } from "../../../../../db/content-visibility";

export const dynamic = "force-dynamic";
export async function POST() {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const publishedCount = await publishVisibility(await getVisibilityDb());
    console.info("[visibility:publish-complete]", { publishedCount, user: user.email });
    return NextResponse.json({ publishedCount });
  } catch (error) {
    console.error("[visibility:publish-failed]", { error });
    return NextResponse.json({ error: error instanceof Error ? error.message : "publish-failed" }, { status: 500 });
  }
}