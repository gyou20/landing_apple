import type { Metadata } from "next";
import { AgencySections } from "../agency-sections";
import { EditablePhone } from "../editable-phone";
import { HeroDiagnostics } from "../hero-diagnostics";
import { SiteHeader } from "../site-header";
import { HomeHeroCopy, SectionTwoContent } from "../home-section-copy";
import { PublishedSectionBackgrounds } from "../published-section-backgrounds";

export const metadata: Metadata = {
  title: "Aether One | Pro의 새로운 기준",
  description:
    "티타늄의 정교함과 몰입감 있는 디스플레이를 담은 Aether One 프리미엄 스마트폰.",
};

export default function Home() {
  return (
    <main className="site-shell" id="top">
      <HeroDiagnostics />
      <PublishedSectionBackgrounds />

      <section
        className="hero"
        data-section="hero"
        data-background-section-id="home-section-01"
        data-testid="hero-section"
        data-zoom-phase="intro"
        aria-labelledby="hero-title"
      >
        <div className="hero-sticky">
          <span
            className="section-index section-index-one"
            aria-hidden="true"
            data-testid="section-index-one"
          >
            Section 01
          </span>

          <SiteHeader
            className="hero-nav"
            currentPage="home"
            pageNumber="01"
          />

          <HomeHeroCopy />

          <EditablePhone
            screenContent={
              <section
                className="section-two"
                data-section="experience"
                data-background-section-id="home-section-02"
                data-testid="phone-section-two"
                aria-labelledby="section-two-title"
              >
                <span
                  className="section-index section-index-two"
                  aria-hidden="true"
                  data-testid="section-index-two"
                >
                  Section 02
                </span>
                <div className="section-two-scrim" aria-hidden="true" />
                <div id="section-two-title" className="sr-only">
                  Aether OS
                </div>
                <SectionTwoContent />
              </section>
            }
          />

          <div className="hero-foot">
            <p>
              Precision.
              <br />
              Reimagined.
            </p>
            <a href="#experience" aria-label="두 번째 섹션으로 이동">
              <span aria-hidden="true">↓</span>
            </a>
            <p className="hero-foot-right">
              Scroll
              <br />
              To Enter
            </p>
          </div>
        </div>
        <span
          className="experience-anchor"
          id="experience"
          aria-hidden="true"
        />
      </section>

      <AgencySections />
    </main>
  );
}
