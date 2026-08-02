import { NextResponse } from "next/server";
import { getAdminUser } from "../../../chatgpt-auth";
import { getPageSectionOrderDb, listPageSectionOrders, saveDraftPageSectionOrder } from "../../../../db/page-section-orders";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
  try {
    const orders = await listPageSectionOrders(await getPageSectionOrderDb());
    console.info("[section-order:admin-loaded]", { user: user.email, count: orders.length });
    return NextResponse.json({ orders });
  } catch (error) {
    console.error("[section-order:admin-load-failed]", { user: user.email, error });
    return NextResponse.json({ error: "섹션 순서를 불러오지 못했습니다." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
  try {
    const body = await request.json() as { pageId?: unknown; sectionIds?: unknown };
    const order = await saveDraftPageSectionOrder(await getPageSectionOrderDb(), body.pageId, body.sectionIds);
    console.info("[section-order:admin-save-complete]", { user: user.email, pageId: order.pageId, sectionIds: order.draftOrder });
    return NextResponse.json({ order });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "section-order-save-failed";
    console.error("[section-order:admin-save-failed]", { user: user.email, reason });
    return NextResponse.json({ error: reason }, { status: 400 });
  }
}