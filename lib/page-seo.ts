import type { PageContent, PageType } from "../db/content-pages";

export function pageRobots(searchIndexable: boolean) {
  return searchIndexable ? { index: true, follow: true } : { index: false, follow: false };
}

export function pageOpenGraphType(type: PageType) {
  return type === "Article page" ? "article" as const : "website" as const;
}

export function buildArticleStructuredData(page: PageContent, siteUrl: string) {
  const base = siteUrl.replace(/\/$/, "");
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: page.title,
    description: page.summary,
    mainEntityOfPage: `${base}${page.slug}`,
  };
}
