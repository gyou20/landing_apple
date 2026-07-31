import { NextResponse } from "next/server";
import { getAdminUser } from "../../../../chatgpt-auth";
import { getContentPageDb, publishContentPages } from "../../../../../db/content-pages";

export const dynamic = "force-dynamic";

export async function POST() {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
  try {
    const result = await publishContentPages(await getContentPageDb());
    console.info("[page:publish-complete]", { user: user.email, ...result });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[page:publish-failed]", { user: user.email, error });
    return NextResponse.json({ error: "페이지를 공개하지 못했습니다." }, { status: 500 });
  }
}