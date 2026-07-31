import { NextResponse } from "next/server";
import { getAdminUser } from "../../../../chatgpt-auth";
import { canonicalTargets, getDeletionDb, issueDeletionAuthorization, verifyDeletionPassword } from "../../../../../db/content-deletions";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const targets = canonicalTargets(body.targets);
    if (typeof body.password !== "string" || !(await verifyDeletionPassword(body.password))) {
      console.warn("[deletion:authorization-denied]", { user: user.email, targetCount: targets.length, reason: "password-mismatch" });
      return NextResponse.json({ error: "관리자 작업 암호가 올바르지 않습니다." }, { status: 403 });
    }
    const authorization = await issueDeletionAuthorization(await getDeletionDb(), user.email, targets);
    console.info("[deletion:authorization-issued]", { authorizationId: authorization.authorizationId, user: user.email, targets, expiresAt: authorization.expiresAt });
    return NextResponse.json(authorization);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "authorization-failed";
    console.error("[deletion:authorization-failed]", { user: user.email, reason });
    const status = reason === "delete-password-not-configured" ? 503 : 400;
    return NextResponse.json({ error: reason === "delete-password-not-configured" ? "삭제 작업 암호가 서버에 설정되지 않았습니다." : "삭제 대상을 확인하지 못했습니다." }, { status });
  }
}