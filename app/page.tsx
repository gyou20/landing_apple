import type { Metadata } from "next";
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

function PhoneStage() {
  return (
    <div
      className="phone-stage"
      id="device"
      data-testid="hero-product-visual"
      aria-label="Aether One 스마트폰 전면과 후면 디자인"
      role="img"
    >
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <div className="phone phone-back" aria-hidden="true">
        <div className="camera-island">
          <span />
          <span />
          <span />
          <i />
        </div>
        <div className="back-mark">◐</div>
      </div>

      <div className="phone phone-front" aria-hidden="true">
        <div className="phone-screen">
          <div className="dynamic-island" />
          <div className="screen-orbit orbit-one" />
          <div className="screen-orbit orbit-two" />
          <div className="screen-glow" />
        </div>
      </div>

      <div className="phone phone-edge" aria-hidden="true">
        <span />
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
        aria-labelledby="hero-title"
      >
        <nav className="hero-nav" aria-label="메인 내비게이션">
          <a className="brand-link" href="#top" aria-label="Aether 홈">
            <Wordmark />
          </a>
          <div className="nav-meta">
            <span>One Pro</span>
            <a href="#device">디자인 보기</a>
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
            손끝에서 시작되는 가장 선명한 몰입.
          </p>
          <div className="hero-actions" aria-label="제품 바로가기">
            <a className="action action-primary" href="#device">
              디자인 살펴보기
              <span aria-hidden="true">↘</span>
            </a>
            <span className="availability">올가을 공개</span>
          </div>
        </div>

        <PhoneStage />

        <div className="hero-foot">
          <p>
            Precision.
            <br />
            Reimagined.
          </p>
          <a href="#device" aria-label="제품 이미지로 이동">
            <span aria-hidden="true">↓</span>
          </a>
          <p className="hero-foot-right">
            Titanium
            <br />
            Series 01
          </p>
        </div>
      </section>
    </main>
  );
}
