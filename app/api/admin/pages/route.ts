import { NextResponse } from "next/server";
import { getAdminUser } from "../../../chatgpt-auth";
import { createContentPage, getContentPageDb, listContentPages, updateContentPageDraft } from "../../../../db/content-pages";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
  try {
    const pages = await listContentPages(await getContentPageDb());
    console.info("[page:admin-load]", { user: user.email, count: pages.length });
    return NextResponse.json({ pages });
  } catch (error) {
    console.error("[page:admin-load-failed]", { user: user.email, error });
    return NextResponse.json({ error: "페이지 목록을 불러오지 못했습니다." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
  try {
    const page = await createContentPage(await getContentPageDb(), await request.json());
    console.info("[page:draft-created]", { user: user.email, pageId: page.id, slug: page.draft.slug });
    return NextResponse.json({ page }, { status: 201 });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "page-create-failed";
    console.error("[page:draft-create-failed]", { user: user.email, reason });
    const status = reason === "page-slug-already-exists" ? 409 : 400;
    return NextResponse.json({ error: reason }, { status });
  }
}

export async function PUT(request: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const page = await updateContentPageDraft(await getContentPageDb(), String(body.id ?? ""), body);
    console.info("[page:draft-updated]", { user: user.email, pageId: page.id, slug: page.draft.slug });
    return NextResponse.json({ page });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "page-update-failed";
    console.error("[page:draft-update-failed]", { user: user.email, reason });
    const status = reason === "page-slug-already-exists" ? 409 : reason === "page-not-found" ? 404 : 400;
    return NextResponse.json({ error: reason }, { status });
  }
}