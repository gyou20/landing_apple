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
    const vortexCanvas = document.querySelector<HTMLCanvasElement>(
      '[data-testid="vortex-canvas"]',
    );
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    console.info("[aether:hero:init]", {
      heroFound: Boolean(hero),
      productVisualFound: Boolean(productVisual),
      editorToggleFound: Boolean(editorToggle),
      vortexCanvasFound: Boolean(vortexCanvas),
      webglState: vortexCanvas?.dataset.webgl ?? "missing",
      viewport: `${window.innerWidth}x${window.innerHeight}`,
    });
    console.info("[aether:hero:motion]", {
      reducedMotion,
      animationsEnabled: !reducedMotion,
    });

    if (!hero || !productVisual || !editorToggle || !vortexCanvas) {
      console.error("[aether:hero:missing-element]", {
        heroFound: Boolean(hero),
        productVisualFound: Boolean(productVisual),
        editorToggleFound: Boolean(editorToggle),
        vortexCanvasFound: Boolean(vortexCanvas),
      });
    }
  }, []);

  return null;
}
