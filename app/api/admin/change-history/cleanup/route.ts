import { NextResponse } from "next/server";
import { getAdminUser } from "../../../../chatgpt-auth";
import { cleanupChangeHistory, getChangeHistoryDb } from "../../../../../db/change-history";

export const dynamic = "force-dynamic";

export async function POST() {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
  try {
    const result = await cleanupChangeHistory(await getChangeHistoryDb(), { source: "admin" });
    console.info("[change-history:admin-cleanup]", { user: user.email, ...result });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[change-history:admin-cleanup-failed]", { user: user.email, error });
    return NextResponse.json({ error: "오래된 변경 이력을 정리하지 못했습니다." }, { status: 500 });
  }
}