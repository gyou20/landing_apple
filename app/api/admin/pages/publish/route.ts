import { NextResponse } from "next/server";
import { getAdminUser } from "../../../../chatgpt-auth";
import { getContentPageDb, publishContentPage, publishContentPages } from "../../../../../db/content-pages";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
  try {
    const body = await request.json().catch(() => ({})) as { pageId?: string };
    const result = body.pageId ? await publishContentPage(await getContentPageDb(), body.pageId) : await publishContentPages(await getContentPageDb());
    console.info("[page:publish-complete]", { user: user.email, scope: body.pageId ? "page" : "all", ...result });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[page:publish-failed]", { user: user.email, error });
    return NextResponse.json({ error: "페이지를 공개하지 못했습니다." }, { status: 500 });
  }
}
