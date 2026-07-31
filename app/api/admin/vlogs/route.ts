import { NextResponse } from "next/server";
import { getAdminUser } from "../../../chatgpt-auth";
import { createContentVlog, getContentVlogDb, listContentVlogs, updateContentVlogDraft } from "../../../../db/content-vlogs";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
  try {
    const vlogs = await listContentVlogs(await getContentVlogDb());
    console.info("[vlog:admin-load]", { user: user.email, count: vlogs.length });
    return NextResponse.json({ vlogs });
  } catch (error) {
    console.error("[vlog:admin-load-failed]", { user: user.email, error });
    return NextResponse.json({ error: "Vlog 목록을 불러오지 못했습니다." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
  try {
    const vlog = await createContentVlog(await getContentVlogDb(), await request.json() as Record<string, unknown>);
    console.info("[vlog:draft-created]", { user: user.email, vlogId: vlog.id, slug: vlog.draft.slug });
    return NextResponse.json({ vlog }, { status: 201 });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "vlog-create-failed";
    console.error("[vlog:draft-create-failed]", { user: user.email, reason });
    return NextResponse.json({ error: reason }, { status: reason === "vlog-slug-already-exists" ? 409 : 400 });
  }
}

export async function PUT(request: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const vlog = await updateContentVlogDraft(await getContentVlogDb(), String(body.id ?? ""), body);
    console.info("[vlog:draft-updated]", { user: user.email, vlogId: vlog.id, slug: vlog.draft.slug });
    return NextResponse.json({ vlog });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "vlog-update-failed";
    console.error("[vlog:draft-update-failed]", { user: user.email, reason });
    return NextResponse.json({ error: reason }, { status: reason === "vlog-slug-already-exists" ? 409 : reason === "vlog-not-found" ? 404 : 400 });
  }
}
