"use client";

import { useEffect } from "react";

const ALLOWED_SECTION_IDS = new Set([
  "home-section-01",
  "home-section-02",
  "home-section-03",
  "home-section-04",
  "home-section-05",
  "home-section-06",
]);

type PublicBackground = { sectionId: string; imageUrl: string; publishedAt: string | null };

type PublicBackgroundResponse = { sections?: PublicBackground[] };

export function PublishedSectionBackgrounds() {
  useEffect(() => {
    let active = true;
    const applied = new Map<HTMLElement, string>();

    async function applyPublishedBackgrounds(source: string) {
      try {
        const response = await fetch("/api/site/section-backgrounds", { cache: "no-store" });
        const data = await response.json() as PublicBackgroundResponse;
        if (!active) return;
        for (const [element, previous] of applied) element.style.backgroundImage = previous;
        applied.clear();
        for (const background of data.sections ?? []) {
          if (!ALLOWED_SECTION_IDS.has(background.sectionId) || !background.imageUrl.startsWith("/api/site/section-backgrounds/")) continue;
          const element = document.querySelector<HTMLElement>(`[data-background-section-id="${background.sectionId}"]`);
          if (!element) continue;
          applied.set(element, element.style.backgroundImage);
          element.style.backgroundImage = `linear-gradient(rgba(0,0,0,.24), rgba(0,0,0,.24)), url("${background.imageUrl}")`;
          element.style.backgroundPosition = "center";
          element.style.backgroundSize = "cover";
        }
        console.info("[section-background:public-applied]", { source, sectionIds: (data.sections ?? []).map((item) => item.sectionId) });
      } catch (error) {
        console.error("[section-background:public-apply-failed]", { source, error });
      }
    }

    void applyPublishedBackgrounds("initial-load");
    const handlePublish = () => void applyPublishedBackgrounds("publish-notification");
    window.addEventListener("storage", handlePublish);
    window.addEventListener("section-background:published", handlePublish);
    return () => {
      active = false;
      window.removeEventListener("storage", handlePublish);
      window.removeEventListener("section-background:published", handlePublish);
      for (const [element, previous] of applied) element.style.backgroundImage = previous;
    };
  }, []);

  return null;
}