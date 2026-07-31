import { NextResponse } from "next/server";
import { getAdminUser } from "../../../../chatgpt-auth";
import { canonicalTargets, getDeletionDb, restoreDeletionDraft } from "../../../../../db/content-deletions";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const [target] = canonicalTargets([body.target]);
    const result = await restoreDeletionDraft(await getDeletionDb(), user.email, target);
    if (result.restored !== 1) return NextResponse.json({ error: "복원할 삭제 대기 항목이 없습니다." }, { status: 409 });
    console.info("[deletion:restore-draft]", { user: user.email, target, restoredAt: result.restoredAt });
    return NextResponse.json({ target, ...result });
  } catch (error) {
    console.error("[deletion:restore-failed]", { user: user.email, error });
    return NextResponse.json({ error: "항목을 복원하지 못했습니다." }, { status: 400 });
  }
}