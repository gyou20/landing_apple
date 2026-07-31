import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isPublishedDeleted } from "../../../db/content-deletions";
import { getContentVlogDb, getPublishedContentVlogBySlug } from "../../../db/content-vlogs";
import { loadPublicNavigation } from "../../../db/public-navigation";
import { publishedVisibility } from "../../../db/content-visibility";
import { SiteHeader } from "../../site-header";

const STATIC_ARTICLES = [
  { id: "brand-strategy", slug: "brand-strategy", category: "Brand Strategy", title: "좋은 브랜드는 무엇을 반복하는가", summary: "브랜드가 오래 기억되는 방식에 대한 기록입니다.", body: "Article coming soon" },
  { id: "creative", slug: "creative", category: "Creative", title: "사람을 멈추게 하는 한 장면의 조건", summary: "관심을 행동으로 바꾸는 크리에이티브의 구조입니다.", body: "Article coming soon" },
  { id: "culture", slug: "culture", category: "Culture", title: "문화에서 시작해 비즈니스로 이어지는 아이디어", summary: "문화적 긴장을 브랜드의 다음 장면으로 연결합니다.", body: "Article coming soon" },
];

async function findArticle(slug: string) {
  const staticArticle = STATIC_ARTICLES.find((article) => article.slug === slug);
  if (staticArticle) return staticArticle;
  try {
    const record = await getPublishedContentVlogBySlug(await getContentVlogDb(), slug);
    return record?.published ? { id: record.id, ...record.published } : null;
  } catch (error) {
    console.error("[vlog:public-detail-load-failed]", { slug, error });
    return null;
  }
}

export function generateStaticParams() {
  return STATIC_ARTICLES.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = await findArticle(slug);
  if (!article) return { title: "Vlog" };
  const visibility = await publishedVisibility("vlog", article.id);
  return { title: article.title, description: article.summary, openGraph: { type: "article", title: article.title, description: article.summary }, robots: visibility.searchIndexable ? { index: true, follow: true } : { index: false, follow: false } };
}

export default async function VlogArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await findArticle(slug);
  if (!article || await isPublishedDeleted("vlog", article.id)) notFound();
  const navigationItems = await loadPublicNavigation();
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const structuredData = { "@context": "https://schema.org", "@type": "Article", headline: article.title, articleSection: article.category, description: article.summary, mainEntityOfPage: `${base}/vlog/${slug}` };
  const paragraphs = article.body.split(/\n{2,}/).filter(Boolean);
  console.info("[vlog:public-detail-loaded]", { vlogId: article.id, slug });

  return (
    <main className="route-page route-page-vlog vlog-article" data-page-id="vlog-article" data-vlog-id={article.id}>
      <SiteHeader currentPage="vlog" pageNumber="03" items={navigationItems} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <article className="vlog-article-body">
        <p className="route-page-kicker">{article.category} · Article</p>
        <h1>{article.title}</h1>
        <p className="vlog-article-summary">{article.summary}</p>
        <div className="vlog-article-content">{paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
      </article>
      <footer className="route-page-foot"><Link href="/vlog">Back to Vlog</Link><span>Page 03 · Vlog</span></footer>
    </main>
  );
}