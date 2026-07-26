"use client";

import { useEffect } from "react";

export function HeroDiagnostics() {
  useEffect(() => {
    const hero = document.querySelector<HTMLElement>('[data-section="hero"]');
    const productVisual = document.querySelector<HTMLElement>(
      '[data-testid="hero-product-visual"]',
    );
    const editorToggle = document.querySelector<HTMLElement>(
      '[data-testid="edit-mode-toggle"]',
    );
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    console.info("[aether:hero:init]", {
      heroFound: Boolean(hero),
      productVisualFound: Boolean(productVisual),
      editorToggleFound: Boolean(editorToggle),
      viewport: `${window.innerWidth}x${window.innerHeight}`,
    });
    console.info("[aether:hero:motion]", {
      reducedMotion,
      animationsEnabled: !reducedMotion,
    });

    if (!hero || !productVisual || !editorToggle) {
      console.error("[aether:hero:missing-element]", {
        heroFound: Boolean(hero),
        productVisualFound: Boolean(productVisual),
        editorToggleFound: Boolean(editorToggle),
      });
    }
  }, []);

  return null;
}
