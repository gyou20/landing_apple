import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "../../site-header";
import { publishedVisibility, publishedVisibilityMap } from "../../../db/content-visibility";
import { isPublishedDeleted } from "../../../db/content-deletions";

const TOPICS = [
  { category: "Brand Strategy", number: "01", title: "醫뗭? 釉뚮옖?쒕뒗 臾댁뾿?? 諛섎났?섎뒗媛" },
  { category: "Creative", number: "02", title: "?щ엺??硫덉텛寃??섎뒗 ???λ㈃??議곌굔" },
  { category: "Culture", number: "03", title: "臾명솕?먯꽌 ?쒖옉??鍮꾩쫰?덉뒪濡??댁뼱吏???꾩씠?붿뼱" },
] as const;

function slugFor(category: string) {
  return category.toLowerCase().replaceAll(" ", "-");
}

export function generateStaticParams() {
  return TOPICS.map((topic) => ({ slug: slugFor(topic.category) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const topic = TOPICS.find((item) => slugFor(item.category) === slug);
  if (!topic) return { title: "Vlog" };
  const articleId = slug === "brand-strategy" ? "brand-strategy" : slug === "creative" ? "creative" : "culture";
  const visibility = await publishedVisibility("vlog", articleId);
  return {
    title: topic.title,
    description: topic.title,
    openGraph: { type: "article", title: topic.title, description: topic.title },
    robots: visibility.searchIndexable ? { index: true, follow: true } : { index: false, follow: false },
  };
}

export default async function VlogArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const topic = TOPICS.find((item) => slugFor(item.category) === slug);
  if (!topic) notFound();
  const articleId = slug === "brand-strategy" ? "brand-strategy" : slug === "creative" ? "creative" : "culture";
  if (await isPublishedDeleted("vlog", articleId)) notFound();
  const visibility = await publishedVisibilityMap();
  const visiblePageIds = ["home", "contact", "vlog"].filter((id) => visibility[`page:${id}`]?.menuVisible);

  const articleUrl = `http://localhost:3000/vlog/${slug}`;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: topic.title,
    articleSection: topic.category,
    mainEntityOfPage: articleUrl,
  };

  return (
    <main className="route-page route-page-vlog vlog-article" data-page-id="vlog-article">
      <SiteHeader currentPage="vlog" pageNumber="03" visiblePageIds={visiblePageIds} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <article className="vlog-article-body">
        <p className="route-page-kicker">{topic.category} · Article</p>
        <h1>{topic.title}</h1>
        <p className="vlog-article-placeholder">Article coming soon</p>
      </article>
      <footer className="route-page-foot">
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/vlog">Back to Vlog</a>
        <span>Page 03 · Vlog</span>
      </footer>
    </main>
  );
}
