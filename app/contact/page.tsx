import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { publishedVisibility, publishedVisibilityMap } from "../../db/content-visibility";
import { isPublishedDeleted } from "../../db/content-deletions";
import { loadPublicNavigation } from "../../db/public-navigation";
import { SiteHeader } from "../site-header";
import { PublishedCustomSections } from "../published-custom-sections";

export async function generateMetadata(): Promise<Metadata> {
  const visibility = await publishedVisibility("page", "contact");
  return { title: "Contact", description: "브랜드 전략, 캠페인, 디지털 경험에 관한 프로젝트를 Aether와 시작하세요.", robots: visibility.searchIndexable ? { index: true, follow: true } : { index: false, follow: false } };
}

export default async function ContactPage() {
  if (await isPublishedDeleted("page", "contact")) notFound();
  const visibility = await publishedVisibilityMap();
  const navigationItems = await loadPublicNavigation();
  return (
    <main className="route-page route-page-contact" data-page-id="contact">
      <SiteHeader currentPage="contact" pageNumber="02" items={navigationItems} />

      <section
        className="route-page-intro"
        aria-labelledby="contact-page-title"
        data-visibility-entity-type="section"
        data-visibility-entity-id="contact-intro"
        hidden={!(visibility["section:contact-intro"]?.menuVisible ?? true)}
      >
        <p className="route-page-kicker">New business · Seoul / Everywhere</p>
        <h1 id="contact-page-title">
          움직여야 할 것이
          <br />
          <span>있다면, 말해주세요.</span>
        </h1>
        <p className="route-page-summary">
          브랜드의 다음 방향부터 새로운 캠페인과 디지털 경험까지.
          <br />
          해결하고 싶은 문제를 함께 정의합니다.
        </p>
        <a className="route-page-cta" href="mailto:hello@aether.studio">
          hello@aether.studio
          <span aria-hidden="true">↗</span>
        </a>
      </section>

      <PublishedCustomSections pageId="contact" />

      <footer className="route-page-foot">
        <span>Page 02 · Contact</span>
        <span>Strategy / Creative / Experience</span>
      </footer>
    </main>
  );
}
