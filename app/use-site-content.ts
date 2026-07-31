"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_SITE_CONTENT,
  normalizeSiteContent,
  SITE_CONTENT_EVENT,
  SITE_CONTENT_STORAGE_KEY,
  type SiteContent,
} from "./site-content";

function readSiteContent(): SiteContent {
  try {
    const stored = window.localStorage.getItem(SITE_CONTENT_STORAGE_KEY);
    return stored ? normalizeSiteContent(JSON.parse(stored)) : DEFAULT_SITE_CONTENT;
  } catch (error) {
    console.warn("[site-content:read-failed]", { error });
    return DEFAULT_SITE_CONTENT;
  }
}

export function saveSiteContent(content: SiteContent, source: string) {
  try {
    window.localStorage.setItem(SITE_CONTENT_STORAGE_KEY, JSON.stringify(content));
    window.dispatchEvent(new CustomEvent(SITE_CONTENT_EVENT, { detail: content }));
    console.info("[site-content:save]", {
      source,
      brandName: content.brandName,
      sectionIds: content.homeSections.map((section) => section.id),
    });
  } catch (error) {
    console.error("[site-content:save-failed]", { source, error });
  }
}

export function useSiteContent() {
  const [content, setContent] = useState<SiteContent>(DEFAULT_SITE_CONTENT);

  useEffect(() => {
    const restored = readSiteContent();
    queueMicrotask(() => setContent(restored));
    console.info("[site-content:ready]", {
      storageKey: SITE_CONTENT_STORAGE_KEY,
      brandName: restored.brandName,
      sectionIds: restored.homeSections.map((section) => section.id),
    });

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== SITE_CONTENT_STORAGE_KEY) return;
      const next = event.newValue
        ? normalizeSiteContent(JSON.parse(event.newValue))
        : DEFAULT_SITE_CONTENT;
      setContent(next);
      console.info("[site-content:sync]", { source: "storage-event" });
    };
    const handleLocalUpdate = (event: Event) => {
      const next = normalizeSiteContent((event as CustomEvent).detail);
      setContent(next);
      console.info("[site-content:sync]", { source: "same-tab-event" });
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(SITE_CONTENT_EVENT, handleLocalUpdate);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(SITE_CONTENT_EVENT, handleLocalUpdate);
    };
  }, []);

  return content;
}
