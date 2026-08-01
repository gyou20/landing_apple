import { NextResponse } from "next/server";
import { getAdminUser } from "../../../../chatgpt-auth";
import { getDeletionDb, publishDeletions } from "../../../../../db/content-deletions";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
  try {
    const body = await request.json().catch(() => ({})) as { targets?: Array<{ entityType: "page" | "section" | "vlog"; entityId: string }> };
    const result = await publishDeletions(await getDeletionDb(), body.targets);
    console.info("[deletion:publish-complete]", { user: user.email, scope: body.targets ? "targets" : "all", targetCount: body.targets?.length ?? null, ...result });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[deletion:publish-failed]", { user: user.email, error });
    return NextResponse.json({ error: "삭제·복원 변경을 공개하지 못했습니다." }, { status: 500 });
  }
}
