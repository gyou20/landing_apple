import { NextResponse } from "next/server";
import { getAdminUser } from "../../../chatgpt-auth";
import { getChangeHistoryDb, listChangeHistory } from "../../../../db/change-history";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
  try {
    const limitValue = new URL(request.url).searchParams.get("limit");
    const records = await listChangeHistory(await getChangeHistoryDb(), Number(limitValue ?? 100));
    console.info("[change-history:admin-load]", { user: user.email, count: records.length });
    return NextResponse.json({ records });
  } catch (error) {
    console.error("[change-history:admin-load-failed]", { user: user.email, error });
    return NextResponse.json({ error: "변경 이력을 불러오지 못했습니다." }, { status: 500 });
  }
}