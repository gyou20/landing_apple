"use client";

import {
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { DEFAULT_SITE_CONTENT } from "./site-content";
import { useSiteContent } from "./use-site-content";

type DragPoint = {
  x: number;
  y: number;
};

const EXPECTED_SECTION_IDS = ["03", "04", "05", "06"];
const DRAG_STORAGE_PREFIX = "aether-agency-drag-v1";

function isDragPoint(value: unknown): value is DragPoint {
  if (!value || typeof value !== "object") return false;
  const point = value as Partial<DragPoint>;
  return (
    typeof point.x === "number" &&
    Number.isFinite(point.x) &&
    typeof point.y === "number" &&
    Number.isFinite(point.y)
  );
}

function clampDrag(point: DragPoint): DragPoint {
  const maxX = Math.min(240, window.innerWidth * 0.22);
  const maxY = Math.min(150, window.innerHeight * 0.2);

  return {
    x: Math.min(maxX, Math.max(-maxX, point.x)),
    y: Math.min(maxY, Math.max(-maxY, point.y)),
  };
}

function DraggableCopy({
  children,
  className,
  dragId,
  label,
  testId,
}: {
  children: ReactNode;
  className: string;
  dragId: string;
  label: string;
  testId: string;
}) {
  const [point, setPoint] = useState<DragPoint>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const pointerOrigin = useRef<DragPoint>({ x: 0, y: 0 });
  const pointOrigin = useRef<DragPoint>({ x: 0, y: 0 });
  const pointCurrent = useRef<DragPoint>({ x: 0, y: 0 });
  const draggingCurrent = useRef(false);
  const storageKey = `${DRAG_STORAGE_PREFIX}:${dragId}`;

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (!saved) return;
      const parsed: unknown = JSON.parse(saved);
      if (!isDragPoint(parsed)) return;

      const restored = clampDrag(parsed);
      queueMicrotask(() => setPoint(restored));
      pointCurrent.current = restored;
      console.info("[aether:agency:drag-restore]", {
        dragId,
        point: restored,
      });
    } catch (error) {
      console.warn("[aether:agency:drag-restore-failed]", {
        dragId,
        error,
      });
    }
  }, [dragId, storageKey]);

  const savePoint = (nextPoint: DragPoint, source: "pointer" | "keyboard") => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(nextPoint));
      console.info("[aether:agency:drag-save]", {
        dragId,
        point: nextPoint,
        source,
      });
    } catch (error) {
      console.error("[aether:agency:drag-save-failed]", {
        dragId,
        error,
      });
    }
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerOrigin.current = { x: event.clientX, y: event.clientY };
    pointOrigin.current = point;
    draggingCurrent.current = true;
    setDragging(true);
    console.info("[aether:agency:drag-start]", {
      dragId,
      pointerType: event.pointerType,
      point,
    });
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggingCurrent.current) return;

    const nextPoint = clampDrag({
      x: pointOrigin.current.x + event.clientX - pointerOrigin.current.x,
      y: pointOrigin.current.y + event.clientY - pointerOrigin.current.y,
    });
    pointCurrent.current = nextPoint;
    setPoint(nextPoint);
  };

  const finishPointerDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggingCurrent.current) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    draggingCurrent.current = false;
    setDragging(false);
    savePoint(pointCurrent.current, "pointer");
    console.info("[aether:agency:drag-end]", {
      dragId,
      point: pointCurrent.current,
    });
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const direction = {
      ArrowDown: { x: 0, y: 1 },
      ArrowLeft: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 },
      ArrowUp: { x: 0, y: -1 },
    }[event.key];

    if (!direction) return;
    event.preventDefault();
    const distance = event.shiftKey ? 20 : 5;
    const nextPoint = clampDrag({
      x: point.x + direction.x * distance,
      y: point.y + direction.y * distance,
    });
    pointCurrent.current = nextPoint;
    setPoint(nextPoint);
    savePoint(nextPoint, "keyboard");
  };

  const resetPosition = () => {
    const resetPoint = { x: 0, y: 0 };
    pointCurrent.current = resetPoint;
    setPoint(resetPoint);
    savePoint(resetPoint, "keyboard");
    console.info("[aether:agency:drag-reset]", { dragId });
  };

  const style = {
    "--drag-x": `${point.x}px`,
    "--drag-y": `${point.y}px`,
  } as CSSProperties;

  return (
    <div
      className={`${className}${dragging ? " is-dragging" : ""}`}
      role="group"
      tabIndex={0}
      aria-label={`${label}. 드래그하거나 방향키로 위치를 옮길 수 있습니다.`}
      data-drag-id={dragId}
      data-drag-state={dragging ? "dragging" : "idle"}
      data-testid={testId}
      style={style}
      onDoubleClick={resetPosition}
      onKeyDown={handleKeyDown}
      onPointerCancel={finishPointerDrag}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishPointerDrag}
    >
      {children}
    </div>
  );
}

function AgencyDiagnostics() {
  useEffect(() => {
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>(
        '[data-section-kind="agency"][data-section-id]',
      ),
    );
    const sectionIds = sections.map((section) => section.dataset.sectionId);
    const uniqueIds = new Set(sectionIds);
    const draggableCopy = Array.from(
      document.querySelectorAll<HTMLElement>("[data-drag-id]"),
    );
    const draggableIds = draggableCopy.map((item) => item.dataset.dragId);
    const uniqueDraggableIds = new Set(draggableIds);
    const sectionOrderValid = EXPECTED_SECTION_IDS.every(
      (id, index) => sectionIds[index] === id,
    );
    const draggableNestingValid = draggableCopy.every((item) =>
      Boolean(item.closest('[data-section-kind="agency"][data-section-id]')),
    );
    const motionItems = Array.from(
      document.querySelectorAll<HTMLElement>(
        '[data-section-kind="agency"] [data-motion-item]',
      ),
    );
    const motionIds = motionItems.map((item) => item.dataset.motionItem);
    const uniqueMotionIds = new Set(motionIds);
    const motionNestingValid = motionItems.every((item) =>
      Boolean(item.closest('[data-section-kind="agency"][data-section-id]')),
    );
    const headingHierarchy = sections.map((section) => {
      const labelledBy = section.getAttribute("aria-labelledby");
      const headingTwo = section.querySelector("h2");
      return {
        sectionId: section.dataset.sectionId,
        h2Count: section.querySelectorAll("h2").length,
        h3Count: section.querySelectorAll("h3").length,
        h4Count: section.querySelectorAll("h4").length,
        labelMatchesHeading:
          Boolean(labelledBy) && headingTwo?.id === labelledBy,
      };
    });
    const headingHierarchyValid = headingHierarchy.every(
      (item) =>
        item.h2Count === 1 &&
        item.h3Count === 1 &&
        item.h4Count === 1 &&
        item.labelMatchesHeading,
    );

    console.info("[aether:agency:init]", {
      expectedSectionIds: EXPECTED_SECTION_IDS,
      sectionIds,
      draggableIds,
      motionIds,
      sectionOrderValid,
      draggableNestingValid,
      motionNestingValid,
      headingHierarchy,
      headingHierarchyValid,
    });

    if (
      sections.length !== EXPECTED_SECTION_IDS.length ||
      uniqueIds.size !== EXPECTED_SECTION_IDS.length ||
      !sectionOrderValid ||
      draggableCopy.length !== EXPECTED_SECTION_IDS.length ||
      uniqueDraggableIds.size !== EXPECTED_SECTION_IDS.length ||
      !draggableNestingValid ||
      motionItems.length < EXPECTED_SECTION_IDS.length ||
      uniqueMotionIds.size !== motionItems.length ||
      !motionNestingValid ||
      !headingHierarchyValid
    ) {
      console.error("[aether:agency:structure-invalid]", {
        sectionCount: sections.length,
        sectionIds,
        uniqueSectionCount: uniqueIds.size,
        draggableCount: draggableCopy.length,
        uniqueDraggableCount: uniqueDraggableIds.size,
        motionCount: motionItems.length,
        uniqueMotionCount: uniqueMotionIds.size,
        sectionOrderValid,
        draggableNestingValid,
        motionNestingValid,
        headingHierarchy,
        headingHierarchyValid,
      });
    }

    const sectionsWithMotion = Array.from(
      document.querySelectorAll<HTMLElement>(
        '[data-section-kind="agency"][data-section-id][data-motion-state]',
      ),
    );

    if (!("IntersectionObserver" in window)) {
      sectionsWithMotion.forEach((section) => {
        section.dataset.motionState = "visible";
      });
      console.warn("[aether:agency:motion-fallback]", {
        reason: "intersection-observer-unavailable",
        sectionIds,
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const section = entry.target as HTMLElement;
          section.dataset.motionState = "visible";
          console.info("[aether:agency:motion-enter]", {
            sectionId: section.dataset.sectionId,
            motionStyle: section.dataset.motionStyle,
            intersectionRatio: Number(entry.intersectionRatio.toFixed(3)),
          });
          observer.unobserve(section);
        });
      },
      { rootMargin: "0px 0px -14% 0px", threshold: 0.18 },
    );

    sectionsWithMotion.forEach((section) => observer.observe(section));
    console.info("[aether:agency:motion-ready]", {
      sectionIds: sectionsWithMotion.map((section) => section.dataset.sectionId),
      threshold: 0.18,
      rootMargin: "0px 0px -14% 0px",
    });

    return () => observer.disconnect();
  }, []);

  return null;
}

export function AgencySections({ visibleSectionIds, sectionOrder }: { visibleSectionIds: string[]; sectionOrder?: Record<string, number> }) {
  const { homeSections } = useSiteContent();
  const section03 = homeSections.find((section) => section.id === "home-section-03") ?? DEFAULT_SITE_CONTENT.homeSections[2];
  const section04 = homeSections.find((section) => section.id === "home-section-04") ?? DEFAULT_SITE_CONTENT.homeSections[3];
  const section05 = homeSections.find((section) => section.id === "home-section-05") ?? DEFAULT_SITE_CONTENT.homeSections[4];
  const section06 = homeSections.find((section) => section.id === "home-section-06") ?? DEFAULT_SITE_CONTENT.homeSections[5];

  return (
    <div
      className="agency-sections"
      data-testid="agency-sections"
      data-section-range="03-06"
    >
      <AgencyDiagnostics />

      <section
        className="agency-section agency-section-03"
        style={{ order: sectionOrder?.["home-section-03"] }}
        id="section-03"
        data-section-id="03"
        data-background-section-id="home-section-03"
        data-public-section-order={sectionOrder?.["home-section-03"]}
        data-visibility-entity-type="section"
        data-visibility-entity-id="home-section-03"
        hidden={!visibleSectionIds.includes("home-section-03")}
        data-section-kind="agency"
        data-motion-state="pending"
        data-motion-style="split-rise"
        data-testid="agency-section-03"
        aria-labelledby="agency-title-03"
      >
        <header className="agency-section-header">
          <span>Section 03</span>
          <span>Independent creative office · Seoul</span>
        </header>
        <div className="agency-signal agency-signal-03" aria-hidden="true">
          <span>A</span>
          <span>03</span>
        </div>
        <div className="agency-section-body">
          <p className="agency-kicker" data-motion-item="03-kicker">
            {section03.eyebrow}
          </p>
          <div className="agency-motion-item" data-motion-item="03-headline">
            <DraggableCopy
              className="agency-draggable agency-headline agency-headline-03"
              dragId="section-03-headline"
              label="섹션 3 헤드라인"
              testId="draggable-copy-section-03"
            >
              <h2 id="agency-title-03">
                <span className="agency-motion-line">
                  <span className="agency-motion-line-copy">{section03.headlinePrimary}</span>
                </span>
                <span className="agency-motion-line agency-motion-line-accent">
                  <span className="agency-motion-line-copy">{section03.headlineAccent}</span>
                </span>
              </h2>
            </DraggableCopy>
          </div>
          <div className="agency-subheads" data-motion-item="03-subheads">
            <h3>{section03.subheadline}</h3>
            <h4>{section03.description}</h4>
          </div>
          <div
            className="agency-lower-copy"
            data-motion-item="03-supporting-copy"
          >
            <p>
              사람을 멈추게 하고,
              <br />
              브랜드를 움직이게 합니다.
            </p>
            <span>Drag the type · Double-click to reset</span>
          </div>
        </div>
      </section>

      <section
        className="agency-section agency-section-04"
        style={{ order: sectionOrder?.["home-section-04"] }}
        id="section-04"
        data-section-id="04"
        data-background-section-id="home-section-04"
        data-public-section-order={sectionOrder?.["home-section-04"]}
        data-visibility-entity-type="section"
        data-visibility-entity-id="home-section-04"
        hidden={!visibleSectionIds.includes("home-section-04")}
        data-section-kind="agency"
        data-motion-state="pending"
        data-motion-style="side-wipe"
        data-testid="agency-section-04"
        aria-labelledby="agency-title-04"
      >
        <header className="agency-section-header agency-section-header-dark">
          <span>Section 04</span>
          <span>Selected work · 2024—2026</span>
        </header>
        <div className="agency-marquee" aria-hidden="true">
          <span>STRATEGY / CULTURE / DESIGN / EXPERIENCE /</span>
          <span>STRATEGY / CULTURE / DESIGN / EXPERIENCE /</span>
        </div>
        <div className="agency-section-body agency-section-body-04">
          <p
            className="agency-kicker agency-kicker-dark"
            data-motion-item="04-kicker"
          >
            {section04.eyebrow}
          </p>
          <div className="agency-motion-item" data-motion-item="04-headline">
            <DraggableCopy
              className="agency-draggable agency-headline agency-headline-04"
              dragId="section-04-headline"
              label="섹션 4 헤드라인"
              testId="draggable-copy-section-04"
            >
              <h2 id="agency-title-04">
                <span className="agency-motion-line">
                  <span className="agency-motion-line-copy">{section04.headlinePrimary}</span>
                </span>
                <span className="agency-motion-line agency-motion-line-accent">
                  <span className="agency-motion-line-copy">{section04.headlineAccent}</span>
                </span>
              </h2>
            </DraggableCopy>
          </div>
          <div className="agency-subheads" data-motion-item="04-subheads">
            <h3>{section04.subheadline}</h3>
            <h4>{section04.description}</h4>
          </div>
          <div
            className="agency-case-list"
            aria-label="대표 프로젝트"
            data-motion-item="04-case-list"
          >
            <article>
              <span>01</span>
              <strong>Reframe the category</strong>
              <small>Brand transformation</small>
            </article>
            <article>
              <span>02</span>
              <strong>Own the conversation</strong>
              <small>Integrated campaign</small>
            </article>
            <article>
              <span>03</span>
              <strong>Turn culture into growth</strong>
              <small>Social &amp; experience</small>
            </article>
          </div>
        </div>
      </section>

      <section
        className="agency-section agency-section-05"
        style={{ order: sectionOrder?.["home-section-05"] }}
        id="section-05"
        data-section-id="05"
        data-background-section-id="home-section-05"
        data-public-section-order={sectionOrder?.["home-section-05"]}
        data-visibility-entity-type="section"
        data-visibility-entity-id="home-section-05"
        hidden={!visibleSectionIds.includes("home-section-05")}
        data-section-kind="agency"
        data-motion-state="pending"
        data-motion-style="editorial-stack"
        data-testid="agency-section-05"
        aria-labelledby="agency-title-05"
      >
        <header className="agency-section-header">
          <span>Section 05</span>
          <span>Our operating system</span>
        </header>
        <div className="agency-section-body agency-section-body-05">
          <p className="agency-kicker" data-motion-item="05-kicker">
            {section05.eyebrow}
          </p>
          <div className="agency-motion-item" data-motion-item="05-headline">
            <DraggableCopy
              className="agency-draggable agency-headline agency-headline-05"
              dragId="section-05-headline"
              label="섹션 5 헤드라인"
              testId="draggable-copy-section-05"
            >
              <h2 id="agency-title-05">
                <span className="agency-motion-line">
                  <span className="agency-motion-line-copy">{section05.headlinePrimary}</span>
                </span>
                <span className="agency-motion-line agency-motion-line-accent">
                  <span className="agency-motion-line-copy">{section05.headlineAccent}</span>
                </span>
              </h2>
            </DraggableCopy>
          </div>
          <div className="agency-subheads" data-motion-item="05-subheads">
            <h3>{section05.subheadline}</h3>
            <h4>{section05.description}</h4>
          </div>
          <div className="agency-method-grid" data-motion-item="05-methods">
            <p>
              <span>01 / Find</span>
              사람들이 이미 말하고 있는 것에서 시작합니다.
            </p>
            <p>
              <span>02 / Frame</span>
              브랜드가 소유할 단 하나의 관점을 설계합니다.
            </p>
            <p>
              <span>03 / Make</span>
              전략을 보고, 듣고, 공유하고 싶은 장면으로 만듭니다.
            </p>
          </div>
          <div className="agency-stamp" aria-hidden="true">
            <span>MAKE</span>
            <span>IT</span>
            <span>MATTER</span>
          </div>
        </div>
      </section>

      <section
        className="agency-section agency-section-06"
        style={{ order: sectionOrder?.["home-section-06"] }}
        id="section-06"
        data-section-id="06"
        data-background-section-id="home-section-06"
        data-public-section-order={sectionOrder?.["home-section-06"]}
        data-visibility-entity-type="section"
        data-visibility-entity-id="home-section-06"
        hidden={!visibleSectionIds.includes("home-section-06")}
        data-section-kind="agency"
        data-motion-state="pending"
        data-motion-style="final-scale"
        data-testid="agency-section-06"
        aria-labelledby="agency-title-06"
      >
        <header className="agency-section-header">
          <span>Section 06</span>
          <span>New business · Always open</span>
        </header>
        <div className="agency-section-body agency-section-body-06">
          <p className="agency-kicker" data-motion-item="06-kicker">
            {section06.eyebrow}
          </p>
          <div className="agency-motion-item" data-motion-item="06-headline">
            <DraggableCopy
              className="agency-draggable agency-headline agency-headline-06"
              dragId="section-06-headline"
              label="섹션 6 헤드라인"
              testId="draggable-copy-section-06"
            >
              <h2 id="agency-title-06">
                <span className="agency-motion-line">
                  <span className="agency-motion-line-copy">{section06.headlinePrimary}</span>
                </span>
                <span className="agency-motion-line agency-motion-line-accent">
                  <span className="agency-motion-line-copy">{section06.headlineAccent}</span>
                </span>
              </h2>
            </DraggableCopy>
          </div>
          <div className="agency-subheads" data-motion-item="06-subheads">
            <h3>{section06.subheadline}</h3>
            <h4>{section06.description}</h4>
          </div>
          <div
            className="agency-contact-row"
            data-motion-item="06-contact"
          >
            <a href="mailto:hello@aether.studio">hello@aether.studio</a>
            <p>
              Seoul · Everywhere
              <br />
              Strategy / Creative / Experience
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
