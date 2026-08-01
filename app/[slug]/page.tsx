import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getContentPageDb, getPublishedContentPageBySlug } from "../../db/content-pages";
import { isPublishedDeleted } from "../../db/content-deletions";
import { loadPublicNavigation } from "../../db/public-navigation";
import { publishedVisibility } from "../../db/content-visibility";
import { SiteHeader } from "../site-header";
import { PublishedCustomSections } from "../published-custom-sections";
import { buildArticleStructuredData, pageOpenGraphType, pageRobots } from "../../lib/page-seo";

export const dynamic = "force-dynamic";

async function findPage(slug: string) {
  try {
    return await getPublishedContentPageBySlug(await getContentPageDb(), `/${slug}`);
  } catch (error) {
    console.error("[page:public-load-failed]", { slug, error });
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = await findPage(slug);
  if (!page?.published) return { title: "Page", robots: { index: false, follow: false } };
  const visibility = await publishedVisibility("page", page.id);
  console.info("[page:metadata-resolved]", { pageId: page.id, slug: page.published.slug, type: page.published.type, menuVisible: visibility.menuVisible, searchIndexable: visibility.searchIndexable });
  return {
    title: page.published.title,
    description: page.published.summary || undefined,
    openGraph: { type: pageOpenGraphType(page.published.type), title: page.published.title, description: page.published.summary || undefined },
    robots: pageRobots(visibility.searchIndexable),
  };
}

export default async function CustomPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await findPage(slug);
  if (!page?.published || await isPublishedDeleted("page", page.id)) notFound();
  const navigationItems = await loadPublicNavigation();
  const navigationIndex = navigationItems.findIndex((item) => item.id === page.id);
  const isArticle = page.published.type === "Article page";
  console.info("[page:public-render]", { pageId: page.id, slug: page.published.slug, type: page.published.type, navigationIndex });

  if (isArticle) {
    const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
    const structuredData = buildArticleStructuredData(page.published, base);
    const paragraphs = page.published.body.split(/\n{2,}/).filter(Boolean);
    return (
      <main className="route-page route-page-vlog vlog-article custom-article-page" data-content-page-id={page.id} data-page-type="article">
        <SiteHeader currentPage={page.id} pageNumber={String(Math.max(0, navigationIndex) + 1).padStart(2, "0")} items={navigationItems} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
        <article className="vlog-article-body">
          <p className="route-page-kicker">Article page</p>
          <h1>{page.published.title}</h1>
          {page.published.summary && <p className="vlog-article-summary">{page.published.summary}</p>}
          <div className="vlog-article-content">{paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
        </article>
      </main>
    );
  }

  return (
    <main className="route-page custom-content-page" data-content-page-id={page.id} data-page-type="blocks">
      <SiteHeader currentPage={page.id} pageNumber={String(Math.max(0, navigationIndex) + 1).padStart(2, "0")} items={navigationItems} />
      <section>
        <span>Custom page</span>
        <h1>{page.published.title}</h1>
        <p>이 페이지는 관리자에서 생성하고 Publish한 공개 페이지입니다.</p>
      </section>
      <PublishedCustomSections pageId={page.id} />
    </main>
  );
}