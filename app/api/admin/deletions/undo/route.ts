import { NextResponse } from "next/server";
import { getAdminUser } from "../../../../chatgpt-auth";
import { getDeletionDb, undoDeletionOperation } from "../../../../../db/content-deletions";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const operationId = typeof body.operationId === "string" ? body.operationId : "";
    if (!/^[0-9a-f-]{36}$/i.test(operationId)) return NextResponse.json({ error: "잘못된 되돌리기 요청입니다." }, { status: 400 });
    const restoredCount = await undoDeletionOperation(await getDeletionDb(), user.email, operationId);
    console.info("[deletion:undo-complete]", { user: user.email, operationId, restoredCount });
    return NextResponse.json({ operationId, restoredCount });
  } catch (error) {
    console.error("[deletion:undo-failed]", { user: user.email, error });
    return NextResponse.json({ error: "삭제 작업을 되돌리지 못했습니다." }, { status: 500 });
  }
}