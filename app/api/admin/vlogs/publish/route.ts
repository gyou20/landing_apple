import { NextResponse } from "next/server";
import { getAdminUser } from "../../../../chatgpt-auth";
import { getContentVlogDb, publishContentVlog, publishContentVlogs } from "../../../../../db/content-vlogs";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
  try {
    const body = await request.json().catch(() => ({})) as { vlogId?: string };
    const result = body.vlogId ? await publishContentVlog(await getContentVlogDb(), body.vlogId) : await publishContentVlogs(await getContentVlogDb());
    console.info("[vlog:publish-complete]", { user: user.email, scope: body.vlogId ? "vlog" : "all", ...result });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[vlog:publish-failed]", { user: user.email, error });
    return NextResponse.json({ error: "Vlog를 공개하지 못했습니다." }, { status: 500 });
  }
}