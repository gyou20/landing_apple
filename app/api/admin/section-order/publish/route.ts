import { NextResponse } from "next/server";
import { getAdminUser } from "../../../../chatgpt-auth";
import { getPageSectionOrderDb, publishAllPageSectionOrders, publishPageSectionOrder } from "../../../../../db/page-section-orders";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
  try {
    const body = await request.json().catch(() => ({})) as { pageId?: string };
    const db = await getPageSectionOrderDb();
    const result = body.pageId ? await publishPageSectionOrder(db, body.pageId) : await publishAllPageSectionOrders(db);
    console.info("[section-order:publish-complete]", { user: user.email, scope: body.pageId ? "page" : "all", ...result });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[section-order:publish-failed]", { user: user.email, error });
    return NextResponse.json({ error: "섹션 순서를 공개하지 못했습니다." }, { status: 500 });
  }
}