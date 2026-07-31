import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isPublishedDeleted } from "../../db/content-deletions";
import { getContentVlogDb, listContentVlogs } from "../../db/content-vlogs";
import { loadPublicNavigation } from "../../db/public-navigation";
import { publishedVisibility, publishedVisibilityMap } from "../../db/content-visibility";
import { PublishedCustomSections } from "../published-custom-sections";
import { SiteHeader } from "../site-header";

export async function generateMetadata(): Promise<Metadata> {
  const visibility = await publishedVisibility("page", "vlog");
  return { title: "Marketing Vlog", description: "브랜드 전략, 광고 크리에이티브, 문화와 마케팅에 관한 Aether의 관점과 기록.", robots: visibility.searchIndexable ? { index: true, follow: true } : { index: false, follow: false } };
}

const STATIC_TOPICS = [
  { id: "brand-strategy", slug: "brand-strategy", category: "Brand Strategy", title: "좋은 브랜드는 무엇을 반복하는가" },
  { id: "creative", slug: "creative", category: "Creative", title: "사람을 멈추게 하는 한 장면의 조건" },
  { id: "culture", slug: "culture", category: "Culture", title: "문화에서 시작해 비즈니스로 이어지는 아이디어" },
];

export default async function VlogPage() {
  if (await isPublishedDeleted("page", "vlog")) notFound();
  const visibility = await publishedVisibilityMap();
  const navigationItems = await loadPublicNavigation();
  let customTopics: Array<{ id: string; slug: string; category: string; title: string }> = [];
  try {
    customTopics = (await listContentVlogs(await getContentVlogDb())).filter((vlog) => vlog.published).map((vlog) => ({ id: vlog.id, slug: vlog.published!.slug, category: vlog.published!.category, title: vlog.published!.title }));
    console.info("[vlog:public-list-loaded]", { count: customTopics.length });
  } catch (error) {
    console.error("[vlog:public-list-failed]", { error });
  }
  const topics = [...STATIC_TOPICS, ...customTopics].filter((topic) => visibility[`vlog:${topic.id}`]?.menuVisible ?? false);

  return (
    <main className="route-page route-page-vlog" data-page-id="vlog">
      <SiteHeader currentPage="vlog" pageNumber="03" items={navigationItems} />

      <section className="vlog-intro" aria-labelledby="vlog-page-title" data-visibility-entity-type="section" data-visibility-entity-id="vlog-intro" hidden={!(visibility["section:vlog-intro"]?.menuVisible ?? true)}>
        <p className="route-page-kicker">Marketing notes · Field reports</p>
        <h1 id="vlog-page-title">생각은 기록될 때<br /><span>다음 전략이 됩니다.</span></h1>
        <p>브랜드, 광고, 문화에 관한 실전의 관점.<br />우리가 발견한 긴장과 만든 장면을 기록합니다.</p>
      </section>

      <section className="vlog-topic-grid" aria-label="Vlog 글 목록" data-visibility-entity-type="section" data-visibility-entity-id="vlog-article-list" hidden={!(visibility["section:vlog-article-list"]?.menuVisible ?? true)}>
        {topics.map((topic, index) => (
          <article key={topic.id} data-vlog-id={topic.id} data-visibility-entity-type="vlog" data-visibility-entity-id={topic.id}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <p>{topic.category}</p>
            <h2><Link href={`/vlog/${topic.slug}`}>{topic.title}</Link></h2>
            <small>Read article</small>
          </article>
        ))}
      </section>

      <PublishedCustomSections pageId="vlog" />
      <footer className="route-page-foot"><span>Page 03 · Vlog</span><span>Aether editorial archive</span></footer>
    </main>
  );
}