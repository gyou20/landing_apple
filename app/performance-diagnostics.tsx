"use client";

import { useEffect } from "react";

export function PerformanceDiagnostics() {
  useEffect(() => {
    let lcp: number | null = null;
    let cls = 0;
    let inp: number | null = null;
    let frameCount = 0;
    let lowFrameWindows = 0;
    let longTaskCount = 0;
    let longestTaskMs = 0;
    const sampleStart = performance.now();
    let windowStart = sampleStart;
    let windowFrames = 0;
    let rafId = 0;

    const observe = (type: string, callback: (entry: PerformanceEntry) => void) => {
      if (!("PerformanceObserver" in window)) return null;
      try {
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach(callback);
        });
        observer.observe({ type, buffered: true } as PerformanceObserverInit);
        return observer;
      } catch {
        return null;
      }
    };

    const lcpObserver = observe("largest-contentful-paint", (entry) => {
      lcp = entry.startTime;
    });
    const clsObserver = observe("layout-shift", (entry) => {
      const shift = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number };
      if (!shift.hadRecentInput) cls += shift.value ?? 0;
    });
    const inpObserver = observe("event", (entry) => {
      const event = entry as PerformanceEntry & { duration?: number; interactionId?: number };
      if (event.interactionId) inp = Math.max(inp ?? 0, event.duration ?? 0);
    });
    const longTaskObserver = observe("longtask", (entry) => {
      longTaskCount += 1;
      longestTaskMs = Math.max(longestTaskMs, entry.duration);
    });

    const frame = (now: number) => {
      frameCount += 1;
      windowFrames += 1;
      if (now - windowStart >= 500) {
        const fps = (windowFrames * 1000) / (now - windowStart);
        if (fps < 45) lowFrameWindows += 1;
        windowStart = now;
        windowFrames = 0;
      }
      rafId = requestAnimationFrame(frame);
    };
    rafId = requestAnimationFrame(frame);

    const reportId = window.setTimeout(() => {
      const elapsed = Math.max(1, performance.now() - sampleStart);
      const averageFps = Math.round((frameCount * 1000) / elapsed);
      console.info("[aether:performance:measured]", JSON.stringify({
        path: window.location.pathname,
        lcpMs: lcp === null ? null : Math.round(lcp),
        inpMs: inp === null ? null : Math.round(inp),
        cls: Number(cls.toFixed(3)),
        averageFps,
        lowFrameWindows,
        longTaskCount,
        longestTaskMs: Math.round(longestTaskMs),
        sampleMs: Math.round(elapsed),
      }));
    }, 3000);

    return () => {
      window.clearTimeout(reportId);
      cancelAnimationFrame(rafId);
      lcpObserver?.disconnect();
      clsObserver?.disconnect();
      inpObserver?.disconnect();
      longTaskObserver?.disconnect();
    };
  }, []);

  return null;
}
