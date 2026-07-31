"use client";

import { useSiteContent } from "./use-site-content";

export function HomeHeroCopy() {
  const { homeSections } = useSiteContent();
  const section = homeSections.find((item) => item.id === "home-section-01");
  if (!section) return null;

  return (
    <div className="hero-copy" data-content-section-id={section.id}>
      <p className="eyebrow">{section.eyebrow}</p>
      <h1 id="hero-title">
        {section.headlinePrimary}
        <br />
        <span>{section.headlineAccent}</span>
      </h1>
      <p className="hero-description">
        {section.subheadline}
        <br />
        {section.description}
      </p>
      <div className="hero-actions" aria-label="제품 탐색 안내">
        <a className="action action-primary" href="#experience">
          {section.ctaLabel}
          <span aria-hidden="true">↓</span>
        </a>
        <span className="availability">Scroll to enter</span>
      </div>
    </div>
  );
}

export function SectionTwoContent() {
  const { homeSections } = useSiteContent();
  const section = homeSections.find((item) => item.id === "home-section-02");
  if (!section) return null;

  return (
    <div className="section-two-content" data-content-section-id={section.id}>
      <p className="section-two-eyebrow">{section.eyebrow}</p>
      <h2>
        {section.headlinePrimary}
        <br />
        <span>{section.headlineAccent}</span>
      </h2>
      <p className="section-two-description">
        {section.subheadline}
        <br />
        {section.description}
      </p>
      <div className="section-two-meta" aria-label="Aether OS 주요 특징">
        <span>Adaptive UI</span>
        <span>120Hz Motion</span>
        <span>Private by design</span>
      </div>
    </div>
  );
}
