import { NextResponse } from "next/server";
import { getAdminUser } from "../../../chatgpt-auth";
import { canonicalTargets, consumeDeletionAuthorization, getDeletionDb, listDeletions } from "../../../../db/content-deletions";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
  try {
    const records = await listDeletions(await getDeletionDb());
    console.info("[deletion:admin-load]", { user: user.email, count: records.length });
    return NextResponse.json({ records });
  } catch (error) {
    console.error("[deletion:admin-load-failed]", { user: user.email, error });
    return NextResponse.json({ error: "삭제 상태를 불러오지 못했습니다." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const targets = canonicalTargets(body.targets);
    const token = typeof body.token === "string" ? body.token : "";
    const result = await consumeDeletionAuthorization(await getDeletionDb(), user.email, token, targets);
    console.info("[deletion:draft-created]", { user: user.email, operationId: result.operationId, targets: result.targets });
    return NextResponse.json(result);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "delete-failed";
    console.error("[deletion:draft-create-failed]", { user: user.email, reason });
    const messages: Record<string, string> = {
      "expired-deletion-token": "삭제 권한이 만료되었거나 이미 사용되었습니다.",
      "deletion-token-already-used": "이미 사용한 삭제 권한입니다.",
      "target-set-changed": "암호 확인 뒤 선택 항목이 바뀌었습니다. 다시 확인해 주세요.",
      "invalid-deletion-token": "삭제 권한을 확인할 수 없습니다.",
    };
    return NextResponse.json({ error: messages[reason] ?? "삭제 대기 상태를 저장하지 못했습니다." }, { status: 400 });
  }
}