import type { Metadata } from "next";
import { EditablePhone } from "./editable-phone";
import { HeroDiagnostics } from "./hero-diagnostics";

export const metadata: Metadata = {
  title: "Aether One | Pro의 새로운 기준",
  description:
    "티타늄의 정교함과 몰입감 있는 디스플레이를 담은 Aether One 프리미엄 스마트폰.",
};

function Wordmark() {
  return (
    <span className="wordmark" aria-label="Aether">
      <span className="wordmark-mark" aria-hidden="true">
        ◐
      </span>
      Aether
    </span>
  );
}

function SectionTwoContent() {
  return (
    <div className="section-two-content">
      <p className="section-two-eyebrow">Aether OS · Inside</p>
      <h2>
        화면의 경계가
        <br />
        <span>사라지는 순간.</span>
      </h2>
      <p className="section-two-description">
        당신이 선택한 화면에서 새로운 경험이 이어집니다.
        <br />
        빠르고, 조용하고, 온전히 당신답게.
      </p>
      <div className="section-two-meta" aria-label="Aether OS 주요 특징">
        <span>Adaptive UI</span>
        <span>120Hz Motion</span>
        <span>Private by design</span>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="site-shell" id="top">
      <HeroDiagnostics />

      <section
        className="hero"
        data-section="hero"
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

          <nav className="hero-nav" aria-label="메인 내비게이션">
            <a className="brand-link" href="#top" aria-label="Aether 홈">
              <Wordmark />
            </a>
            <div className="nav-meta">
              <span>One Pro</span>
              <a href="#experience">Inside Aether</a>
            </div>
          </nav>

          <div className="hero-copy">
            <p className="eyebrow">Aether One Pro</p>
            <h1 id="hero-title">
              깊이를 넘어,
              <br />
              <span>경험이 되다.</span>
            </h1>
            <p className="hero-description">
              항공우주 등급 티타늄의 섬세한 질감.
              <br />
              스크롤해 화면 안으로 들어가 보세요.
            </p>
            <div className="hero-actions" aria-label="제품 탐색 안내">
              <a className="action action-primary" href="#experience">
                화면 안으로
                <span aria-hidden="true">↓</span>
              </a>
              <span className="availability">Scroll to enter</span>
            </div>
          </div>

          <EditablePhone
            screenContent={
              <section
                className="section-two"
                data-section="experience"
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
    </main>
  );
}
