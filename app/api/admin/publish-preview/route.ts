import { NextResponse } from "next/server";
import { getAdminUser } from "../../../chatgpt-auth";
import { getContentPageDb, listContentPages } from "../../../../db/content-pages";
import { getContentSectionDb, listContentSections } from "../../../../db/content-sections";
import { getContentVlogDb, listContentVlogs } from "../../../../db/content-vlogs";
import { getVisibilityDb, listVisibility } from "../../../../db/content-visibility";
import { getDeletionDb, listDeletions } from "../../../../db/content-deletions";
import { getSectionBackgroundBindings, listSectionBackgrounds } from "../../../../db/section-backgrounds";
import { getPageSectionOrderDb, listPageSectionOrders } from "../../../../db/page-section-orders";

export const dynamic = "force-dynamic";

type PreviewItem = { id: string; title: string; detail: string };
type PreviewGroup = { key: string; label: string; items: PreviewItem[] };

export async function GET() {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
  try {
    const { db: backgroundDb } = getSectionBackgroundBindings();
    const [pages, sections, vlogs, visibility, backgrounds, deletions, sectionOrders] = await Promise.all([
      listContentPages(await getContentPageDb()),
      listContentSections(await getContentSectionDb()),
      listContentVlogs(await getContentVlogDb()),
      listVisibility(await getVisibilityDb()),
      listSectionBackgrounds(backgroundDb),
      listDeletions(await getDeletionDb()),
      listPageSectionOrders(await getPageSectionOrderDb()),
    ]);
    const pageTitles = new Map(pages.map((page) => [page.id, page.draft.title]));
    const sectionTitles = new Map(sections.map((section) => [section.id, section.draft.title]));
    const vlogTitles = new Map(vlogs.map((vlog) => [vlog.id, vlog.draft.title]));
    const entityTitle = (type: "page" | "section" | "vlog", id: string) => type === "page" ? pageTitles.get(id) ?? id : type === "section" ? sectionTitles.get(id) ?? id : vlogTitles.get(id) ?? id;

    const groups: PreviewGroup[] = [
      {
        key: "pages",
        label: "페이지",
        items: pages.filter((page) => !page.published || page.draft.title !== page.published.title || page.draft.slug !== page.published.slug || page.draft.type !== page.published.type || page.draft.summary !== page.published.summary || page.draft.body !== page.published.body)
          .map((page) => ({ id: page.id, title: page.draft.title, detail: page.published ? "변경 공개" : "새 페이지 공개" })),
      },
      {
        key: "sections",
        label: "섹션",
        items: sections.filter((section) => !section.published || section.draft.title !== section.published.title || JSON.stringify(section.draft.content) !== JSON.stringify(section.published.content))
          .map((section) => ({ id: section.id, title: section.draft.title, detail: `${pageTitles.get(section.pageId) ?? section.pageId} · ${section.published ? "변경 공개" : "새 섹션 공개"}` })),
      },
      {
        key: "vlogs",
        label: "Vlog",
        items: vlogs.filter((vlog) => !vlog.published || vlog.draft.title !== vlog.published.title || vlog.draft.slug !== vlog.published.slug || vlog.draft.category !== vlog.published.category || vlog.draft.summary !== vlog.published.summary || vlog.draft.body !== vlog.published.body)
          .map((vlog) => ({ id: vlog.id, title: vlog.draft.title, detail: vlog.published ? "변경 공개" : "새 글 공개" })),
      },
      {
        key: "visibility",
        label: "가시성",
        items: visibility.filter((record) => record.draft.menuVisible !== record.published.menuVisible || record.draft.searchIndexable !== record.published.searchIndexable)
          .map((record) => ({ id: `${record.entityType}:${record.entityId}`, title: entityTitle(record.entityType, record.entityId), detail: `${record.draft.menuVisible ? "메뉴 표시" : "메뉴 숨김"} · ${record.draft.searchIndexable ? "검색 허용" : "검색 제외"}` })),
      },
      {
        key: "section-orders",
        label: "섹션 순서",
        items: sectionOrders.filter((record) => JSON.stringify(record.draftOrder) !== JSON.stringify(record.publishedOrder))
          .map((record) => ({ id: record.pageId, title: pageTitles.get(record.pageId) ?? record.pageId, detail: `${record.draftOrder.length}개 섹션 순서 공개` })),
      },
      {
        key: "backgrounds",
        label: "배경 이미지",
        items: backgrounds.filter((row) => row.draft_key && row.draft_key !== row.published_key)
          .map((row) => ({ id: row.section_id, title: sectionTitles.get(row.section_id) ?? row.section_id, detail: row.draft_original_name ?? "새 배경 이미지" })),
      },
      {
        key: "deletions",
        label: "삭제·복원",
        items: deletions.filter((record) => record.draftDeleted !== record.publishedDeleted)
          .map((record) => ({ id: `${record.entityType}:${record.entityId}`, title: entityTitle(record.entityType, record.entityId), detail: record.draftDeleted ? "삭제 공개 대기" : "복원 공개 대기" })),
      },
    ].filter((group) => group.items.length > 0);
    const total = groups.reduce((sum, group) => sum + group.items.length, 0);
    console.info("[publish-preview:admin-load]", { user: user.email, total, counts: Object.fromEntries(groups.map((group) => [group.key, group.items.length])) });
    return NextResponse.json({ total, groups });
  } catch (error) {
    console.error("[publish-preview:admin-load-failed]", { user: user.email, error });
    return NextResponse.json({ error: "Publish 대상을 불러오지 못했습니다." }, { status: 500 });
  }
}