import { NextResponse } from "next/server";
import { getAdminUser } from "../../../chatgpt-auth";
import { createContentSection, getContentSectionDb, listContentSections, updateContentSectionDraft } from "../../../../db/content-sections";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
  try {
    const sections = await listContentSections(await getContentSectionDb());
    console.info("[section:admin-load]", { user: user.email, count: sections.length });
    return NextResponse.json({ sections });
  } catch (error) {
    console.error("[section:admin-load-failed]", { user: user.email, error });
    return NextResponse.json({ error: "섹션 목록을 불러오지 못했습니다." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
  try {
    const section = await createContentSection(await getContentSectionDb(), await request.json() as Record<string, unknown>);
    console.info("[section:draft-created]", { user: user.email, sectionId: section.id, pageId: section.pageId });
    return NextResponse.json({ section }, { status: 201 });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "section-create-failed";
    console.error("[section:draft-create-failed]", { user: user.email, reason });
    return NextResponse.json({ error: reason }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const section = await updateContentSectionDraft(await getContentSectionDb(), String(body.id ?? ""), body);
    console.info("[section:draft-updated]", { user: user.email, sectionId: section.id, pageId: section.pageId });
    return NextResponse.json({ section });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "section-update-failed";
    console.error("[section:draft-update-failed]", { user: user.email, reason });
    return NextResponse.json({ error: reason }, { status: reason === "section-not-found" ? 404 : 400 });
  }
}
