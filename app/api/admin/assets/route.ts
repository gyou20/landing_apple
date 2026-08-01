import { NextResponse } from "next/server";
import { getAdminUser } from "../../../chatgpt-auth";
import { getSectionBackgroundBindings, listSectionBackgrounds } from "../../../../db/section-backgrounds";
import { listContentSections } from "../../../../db/content-sections";
import { buildAssetUsage } from "../../../../lib/asset-usage";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
  try {
    const { db } = getSectionBackgroundBindings();
    const [backgrounds, sections] = await Promise.all([listSectionBackgrounds(db), listContentSections(db)]);
    const assets = buildAssetUsage(backgrounds, sections);
    console.info("[asset-usage:admin-load]", { user: user.email, assetCount: assets.length, usageCount: assets.reduce((sum, asset) => sum + asset.usageCount, 0) });
    return NextResponse.json({ assets });
  } catch (error) {
    console.error("[asset-usage:admin-load-failed]", { user: user.email, error });
    return NextResponse.json({ error: "이미지 사용 위치를 불러오지 못했습니다." }, { status: 500 });
  }
}