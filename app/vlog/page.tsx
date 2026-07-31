import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { publishedVisibility, publishedVisibilityMap } from "../../db/content-visibility";
import { isPublishedDeleted } from "../../db/content-deletions";
import { SiteHeader } from "../site-header";

export async function generateMetadata(): Promise<Metadata> {
  const visibility = await publishedVisibility("page", "vlog");
  return { title: "Marketing Vlog", description: "브랜드 전략, 광고 크리에이티브, 문화와 마케팅에 관한 Aether의 관점과 기록.", robots: visibility.searchIndexable ? { index: true, follow: true } : { index: false, follow: false } };
}

const VLOG_TOPICS = [
  {
    id: "brand-strategy",
    category: "Brand Strategy",
    number: "01",
    title: "좋은 브랜드는 무엇을 반복하는가",
  },
  {
    id: "creative",
    category: "Creative",
    number: "02",
    title: "사람을 멈추게 하는 한 장면의 조건",
  },
  {
    id: "culture",
    category: "Culture",
    number: "03",
    title: "문화에서 시작해 비즈니스로 이어지는 아이디어",
  },
];

export default async function VlogPage() {
  if (await isPublishedDeleted("page", "vlog")) notFound();
  const visibility = await publishedVisibilityMap();
  const visiblePageIds = ["home", "contact", "vlog"].filter((id) => visibility[`page:${id}`]?.menuVisible);
  return (
    <main className="route-page route-page-vlog" data-page-id="vlog">
      <SiteHeader currentPage="vlog" pageNumber="03" visiblePageIds={visiblePageIds} />

      <section className="vlog-intro" aria-labelledby="vlog-page-title" data-visibility-entity-type="section" data-visibility-entity-id="vlog-intro" hidden={!(visibility["section:vlog-intro"]?.menuVisible ?? true)}>
        <p className="route-page-kicker">Marketing notes · Field reports</p>
        <h1 id="vlog-page-title">
          생각은 기록될 때
          <br />
          <span>다음 전략이 됩니다.</span>
        </h1>
        <p>
          브랜드, 광고, 문화에 관한 실전의 관점.
          <br />
          우리가 발견한 긴장과 만든 장면을 기록합니다.
        </p>
      </section>

      <section className="vlog-topic-grid" aria-label="브이로그 예정 주제" data-visibility-entity-type="section" data-visibility-entity-id="vlog-article-list" hidden={!(visibility["section:vlog-article-list"]?.menuVisible ?? true)}>
        {VLOG_TOPICS.filter((topic) => visibility[`vlog:${topic.id}`]?.menuVisible ?? false).map((topic) => (
          <article key={topic.number} data-vlog-topic={topic.number} data-visibility-entity-type="vlog" data-visibility-entity-id={topic.id}>
            <span>{topic.number}</span>
            <p>{topic.category}</p>
            <h2>
              <a href={`/vlog/${topic.category.toLowerCase().replaceAll(" ", "-")}`}>
                {topic.title}
              </a>
            </h2>
            <small>Article coming soon</small>
          </article>
        ))}
      </section>

      <footer className="route-page-foot">
        <span>Page 03 · Vlog</span>
        <span>Aether editorial archive</span>
      </footer>
    </main>
  );
}
