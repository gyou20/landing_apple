import { NextResponse } from "next/server";
import { getAdminUser } from "../../../../chatgpt-auth";
import { getContentSectionDb, publishContentSections } from "../../../../../db/content-sections";

export const dynamic = "force-dynamic";

export async function POST() {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
  try {
    const result = await publishContentSections(await getContentSectionDb());
    console.info("[section:publish-complete]", { user: user.email, ...result });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[section:publish-failed]", { user: user.email, error });
    return NextResponse.json({ error: "섹션을 공개하지 못했습니다." }, { status: 500 });
  }
}
