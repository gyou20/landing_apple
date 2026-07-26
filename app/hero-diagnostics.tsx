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
      const zoomDestination = document.querySelector<HTMLElement>(
        '[data-testid="zoom-destination"]',
      );
      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      console.info("[aether:hero:init]", {
        heroFound: Boolean(hero),
        productVisualFound: Boolean(productVisual),
        zoomPhoneFound: Boolean(zoomPhone),
        zoomDestinationFound: Boolean(zoomDestination),
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
        !zoomDestination
      ) {
        console.error("[aether:hero:missing-element]", {
          heroFound: Boolean(hero),
          productVisualFound: Boolean(productVisual),
          zoomPhoneFound: Boolean(zoomPhone),
          zoomDestinationFound: Boolean(zoomDestination),
        });
      }
    });

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  return null;
}
