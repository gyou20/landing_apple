import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { publishedVisibility, publishedVisibilityMap } from "../../db/content-visibility";
import { isPublishedDeleted } from "../../db/content-deletions";
import { resolveHomeLeadMode } from "../../lib/home-lead-mode";
import { AgencySections } from "../agency-sections";
import { EditablePhone } from "../editable-phone";
import { HeroDiagnostics } from "../hero-diagnostics";
import { SiteHeader } from "../site-header";
import { HomeHeroCopy, SectionTwoContent } from "../home-section-copy";
import { PublishedSectionBackgrounds } from "../published-section-backgrounds";

export async function generateMetadata(): Promise<Metadata> {
  const visibility = await publishedVisibility("page", "home");
  return { title: "Aether One | Pro의 새로운 기준", description: "티타늄의 정교함과 몰입감 있는 디스플레이를 담은 Aether One 프리미엄 스마트폰.", robots: visibility.searchIndexable ? { index: true, follow: true } : { index: false, follow: false } };
}

function HomeNavigation({ visiblePageIds, direct = false }: { visiblePageIds: string[]; direct?: boolean }) {
  return <SiteHeader className={direct ? "hero-nav home-direct-nav" : "hero-nav"} currentPage="home" pageNumber="01" visiblePageIds={visiblePageIds} />;
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

function HeroLead({ fullMotion, visiblePageIds }: { fullMotion: boolean; visiblePageIds: string[] }) {
  return (
    <section
      className={fullMotion ? "hero" : "hero hero-static"}
      data-section="hero"
      data-background-section-id="home-section-01"
      data-visibility-entity-type="section"
      data-visibility-entity-id="home-section-01"
      data-testid="hero-section"
      data-zoom-phase="intro"
      aria-labelledby="hero-title"
    >
      <div className="hero-sticky">
        <span className="section-index section-index-one" aria-hidden="true" data-testid="section-index-one">Section 01</span>
        <HomeNavigation visiblePageIds={visiblePageIds} />
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

function SectionTwoDirect({ visiblePageIds }: { visiblePageIds: string[] }) {
  return (
    <div className="section-two-direct">
      <HomeNavigation direct visiblePageIds={visiblePageIds} />
      <SectionTwo standalone />
    </div>
  );
}

export default async function Home() {
  if (await isPublishedDeleted("page", "home")) notFound();
  const visibility = await publishedVisibilityMap();
  const visiblePageIds = ["home", "contact", "vlog"].filter((id) => visibility["page:" + id]?.menuVisible);
  const sectionVisible = (id: string) => visibility["section:" + id]?.menuVisible ?? true;
  const leadMode = resolveHomeLeadMode(sectionVisible("home-section-01"), sectionVisible("home-section-02"));
  const laterSectionIds = ["home-section-03", "home-section-04", "home-section-05", "home-section-06"].filter(sectionVisible);

  return (
    <main className="site-shell" id="top" data-home-lead-mode={leadMode}>
      {leadMode === "full-motion" && <HeroDiagnostics />}
      <PublishedSectionBackgrounds />

      {leadMode === "full-motion" && <HeroLead fullMotion visiblePageIds={visiblePageIds} />}
      {leadMode === "section-one-static" && <HeroLead fullMotion={false} visiblePageIds={visiblePageIds} />}
      {leadMode === "section-two-direct" && <SectionTwoDirect visiblePageIds={visiblePageIds} />}
      {leadMode === "sections-hidden" && (
        <div className="home-direct-start"><HomeNavigation direct visiblePageIds={visiblePageIds} /></div>
      )}

      <AgencySections visibleSectionIds={laterSectionIds} />
    </main>
  );
}