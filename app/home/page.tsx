import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { publishedVisibility, publishedVisibilityMap } from "../../db/content-visibility";
import { isPublishedDeleted } from "../../db/content-deletions";
import { loadPublicNavigation, type PublicNavigationItem } from "../../db/public-navigation";
import { DEFAULT_PAGE_SECTION_ORDERS, loadPublishedPageSectionOrder } from "../../db/page-section-orders";
import { AgencySections } from "../agency-sections";
import { EditablePhone } from "../editable-phone";
import { HeroDiagnostics } from "../hero-diagnostics";
import { SiteHeader } from "../site-header";
import { HomeHeroCopy, SectionTwoContent } from "../home-section-copy";
import { PublishedSectionBackgrounds } from "../published-section-backgrounds";
import { loadVisiblePublishedCustomSections, PublishedCustomSections } from "../published-custom-sections";

export async function generateMetadata(): Promise<Metadata> {
  const visibility = await publishedVisibility("page", "home");
  return { title: "Aether One | Pro의 새로운 기준", description: "티타늄의 정교함과 몰입감 있는 디스플레이를 담은 Aether One 프리미엄 스마트폰.", robots: visibility.searchIndexable ? { index: true, follow: true } : { index: false, follow: false } };
}

function HomeNavigation({ items, direct = false }: { items: PublicNavigationItem[]; direct?: boolean }) {
  return <SiteHeader className={direct ? "hero-nav home-direct-nav" : "hero-nav"} currentPage="home" pageNumber="01" items={items} />;
}

function SectionTwo({ standalone = false }: { standalone?: boolean }) {
  return (
    <section
      className={standalone ? "section-two section-two-standalone" : "section-two"}
      data-section="experience"
      data-background-section-id="home-section-02"
      data-visibility-entity-type="section"
      data-visibility-entity-id="home-section-02"
      data-testid="phone-section-two"
      aria-labelledby="section-two-title"
    >
      <span className="section-index section-index-two" aria-hidden="true" data-testid="section-index-two">Section 02</span>
      <div className="section-two-scrim" aria-hidden="true" />
      <div id="section-two-title" className="sr-only">Aether OS</div>
      <SectionTwoContent />
    </section>
  );
}

function HeroLead({ fullMotion, navigationItems, order, showNavigation }: { fullMotion: boolean; navigationItems: PublicNavigationItem[]; order: number; showNavigation: boolean }) {
  return (
    <section
      className={fullMotion ? "hero" : "hero hero-static"}
      style={{ order }}
      data-section="hero"
      data-public-section-order={order}
      data-background-section-id="home-section-01"
      data-visibility-entity-type="section"
      data-visibility-entity-id="home-section-01"
      data-testid="hero-section"
      data-zoom-phase="intro"
      aria-labelledby="hero-title"
    >
      <div className="hero-sticky">
        <span className="section-index section-index-one" aria-hidden="true" data-testid="section-index-one">Section 01</span>
        {showNavigation && <HomeNavigation items={navigationItems} />}
        <HomeHeroCopy />
        <EditablePhone motionEnabled={fullMotion} screenContent={fullMotion ? <SectionTwo /> : null} />
        <div className="hero-foot">
          <p>Precision.<br />Reimagined.</p>
          {fullMotion && <a href="#experience" aria-label="두 번째 섹션으로 이동"><span aria-hidden="true">↓</span></a>}
          <p className="hero-foot-right">{fullMotion ? <>Scroll<br />To Enter</> : <>Section 01<br />Static view</>}</p>
        </div>
      </div>
      {fullMotion && <span className="experience-anchor" id="experience" aria-hidden="true" />}
    </section>
  );
}

function SectionTwoDirect({ navigationItems, order, showNavigation }: { navigationItems: PublicNavigationItem[]; order: number; showNavigation: boolean }) {
  return (
    <div className="section-two-direct" style={{ order }} data-public-section-order={order}>
      {showNavigation && <HomeNavigation direct items={navigationItems} />}
      <SectionTwo standalone />
    </div>
  );
}

export default async function Home() {
  if (await isPublishedDeleted("page", "home")) notFound();
  const visibility = await publishedVisibilityMap();
  const navigationItems = await loadPublicNavigation();
  const customSections = await loadVisiblePublishedCustomSections("home");
  const fixedSectionIds = DEFAULT_PAGE_SECTION_ORDERS.home;
  const availableSectionIds = [...fixedSectionIds, ...customSections.map((section) => section.id)];
  const publishedSectionOrder = await loadPublishedPageSectionOrder("home", availableSectionIds);
  const sectionOrder = Object.fromEntries(publishedSectionOrder.map((id, index) => [id, index]));
  const sectionVisible = (id: string) => visibility["section:" + id]?.menuVisible ?? true;
  const sectionOneVisible = sectionVisible("home-section-01");
  const sectionTwoVisible = sectionVisible("home-section-02");
  const laterSectionIds = ["home-section-03", "home-section-04", "home-section-05", "home-section-06"].filter(sectionVisible);
  const visibleCustomIds = new Set(customSections.map((section) => section.id));
  const visibleOrderedIds = publishedSectionOrder.filter((id) => id.startsWith("section-") ? visibleCustomIds.has(id) : sectionVisible(id));
  const firstVisibleId = visibleOrderedIds[0] ?? null;
  const sectionOneIndex = publishedSectionOrder.indexOf("home-section-01");
  const sectionTwoIndex = publishedSectionOrder.indexOf("home-section-02");
  const leadSectionsArePaired = sectionOneVisible && sectionTwoVisible && sectionTwoIndex === sectionOneIndex + 1;
  const needsDirectNavigation = !firstVisibleId || (firstVisibleId !== "home-section-01" && firstVisibleId !== "home-section-02");

  console.info("[section-order:public-resolved]", {
    pageId: "home",
    publishedSectionOrder,
    visibleOrderedIds,
    leadSectionsArePaired,
  });

  return (
    <main className="site-shell site-shell--ordered" id="top" data-home-lead-mode={leadSectionsArePaired ? "full-motion" : "ordered"}>
      {leadSectionsArePaired && <HeroDiagnostics />}
      <PublishedSectionBackgrounds />

      {needsDirectNavigation && <div className="home-direct-start home-ordered-navigation"><HomeNavigation direct items={navigationItems} /></div>}
      {sectionOneVisible && <HeroLead fullMotion={leadSectionsArePaired} navigationItems={navigationItems} order={sectionOrder["home-section-01"]} showNavigation={firstVisibleId === "home-section-01"} />}
      {sectionTwoVisible && !leadSectionsArePaired && <SectionTwoDirect navigationItems={navigationItems} order={sectionOrder["home-section-02"]} showNavigation={firstVisibleId === "home-section-02"} />}

      <AgencySections visibleSectionIds={laterSectionIds} sectionOrder={sectionOrder} />
      <PublishedCustomSections pageId="home" sections={customSections} orderById={sectionOrder} />
    </main>
  );
}