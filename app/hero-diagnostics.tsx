"use client";

import { useEffect } from "react";

export function HeroDiagnostics() {
  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      const hero = document.querySelector<HTMLElement>('[data-section="hero"]');
      const productVisual = document.querySelector<HTMLElement>(
        '[data-testid="hero-product-visual"]',
      );
      const zoomPhone = document.querySelector<HTMLElement>(
        '[data-testid="scroll-zoom-phone"]',
      );
      const phoneExperience = document.querySelector<HTMLElement>(
        '[data-testid="phone-experience"]',
      );
      const sectionTwo = document.querySelector<HTMLElement>(
        '[data-testid="phone-section-two"]',
      );
      const sectionTwoCount = document.querySelectorAll(
        '[data-section="experience"]',
      ).length;
      const sectionTwoInsidePhone = Boolean(
        phoneExperience && sectionTwo && phoneExperience.contains(sectionTwo),
      );
      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      console.info("[aether:hero:init]", {
        heroFound: Boolean(hero),
        productVisualFound: Boolean(productVisual),
        zoomPhoneFound: Boolean(zoomPhone),
        phoneExperienceFound: Boolean(phoneExperience),
        sectionTwoCount,
        sectionTwoInsidePhone,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
      });
      console.info("[aether:hero:motion]", {
        reducedMotion,
        animationsEnabled: !reducedMotion,
      });

      if (
        !hero ||
        !productVisual ||
        !zoomPhone ||
        !phoneExperience ||
        !sectionTwo ||
        sectionTwoCount !== 1 ||
        !sectionTwoInsidePhone
      ) {
        console.error("[aether:hero:missing-element]", {
          heroFound: Boolean(hero),
          productVisualFound: Boolean(productVisual),
          zoomPhoneFound: Boolean(zoomPhone),
          phoneExperienceFound: Boolean(phoneExperience),
          sectionTwoFound: Boolean(sectionTwo),
          sectionTwoCount,
          sectionTwoInsidePhone,
        });
      }
    });

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  return null;
}
