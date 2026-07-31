import { NextResponse } from "next/server";
import { getAdminUser } from "../../../../chatgpt-auth";
import { getContentVlogDb, publishContentVlogs } from "../../../../../db/content-vlogs";

export const dynamic = "force-dynamic";

export async function POST() {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
  try {
    const result = await publishContentVlogs(await getContentVlogDb());
    console.info("[vlog:publish-complete]", { user: user.email, ...result });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[vlog:publish-failed]", { user: user.email, error });
    return NextResponse.json({ error: "Vlog를 공개하지 못했습니다." }, { status: 500 });
  }
}
