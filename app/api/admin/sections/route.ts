import { NextResponse } from "next/server";
import { getAdminUser } from "../../../chatgpt-auth";
import { createContentSection, getContentSection, getContentSectionDb, listContentSections, updateContentSectionDraft } from "../../../../db/content-sections";
import { getChangeHistoryDb, recordChange } from "../../../../db/change-history";
import { summarizeSectionChange } from "../../../../lib/change-summary";

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
    await recordChange(await getChangeHistoryDb(), { entityType: "section", entityId: section.id, entityTitle: section.draft.title, summary: summarizeSectionChange(null, section.draft), actorEmail: user.email });
    console.info("[section:draft-created]", { user: user.email, sectionId: section.id, pageId: section.pageId, templateId: section.draft.content.templateId, itemCount: section.draft.content.items.length, blockCount: section.draft.content.blocks.length });
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
    const db = await getContentSectionDb();
    const previous = await getContentSection(db, String(body.id ?? ""));
    const section = await updateContentSectionDraft(db, String(body.id ?? ""), body);
    await recordChange(await getChangeHistoryDb(), { entityType: "section", entityId: section.id, entityTitle: section.draft.title, summary: summarizeSectionChange(previous?.draft ?? null, section.draft), actorEmail: user.email });
    console.info("[section:draft-updated]", { user: user.email, sectionId: section.id, pageId: section.pageId, templateId: section.draft.content.templateId, itemCount: section.draft.content.items.length, blockCount: section.draft.content.blocks.length });
    return NextResponse.json({ section });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "section-update-failed";
    console.error("[section:draft-update-failed]", { user: user.email, reason });
    return NextResponse.json({ error: reason }, { status: reason === "section-not-found" ? 404 : 400 });
  }
}