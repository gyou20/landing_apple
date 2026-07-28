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
      setPoint(restored);
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

    console.info("[aether:agency:init]", {
      expectedSectionIds: EXPECTED_SECTION_IDS,
      sectionIds,
      draggableIds,
      sectionOrderValid,
      draggableNestingValid,
    });

    if (
      sections.length !== EXPECTED_SECTION_IDS.length ||
      uniqueIds.size !== EXPECTED_SECTION_IDS.length ||
      !sectionOrderValid ||
      draggableCopy.length !== EXPECTED_SECTION_IDS.length ||
      uniqueDraggableIds.size !== EXPECTED_SECTION_IDS.length ||
      !draggableNestingValid
    ) {
      console.error("[aether:agency:structure-invalid]", {
        sectionCount: sections.length,
        sectionIds,
        uniqueSectionCount: uniqueIds.size,
        draggableCount: draggableCopy.length,
        uniqueDraggableCount: uniqueDraggableIds.size,
        sectionOrderValid,
        draggableNestingValid,
      });
    }
  }, []);

  return null;
}

export function AgencySections() {
  return (
    <div
      className="agency-sections"
      data-testid="agency-sections"
      data-section-range="03-06"
    >
      <AgencyDiagnostics />

      <section
        className="agency-section agency-section-03"
        id="section-03"
        data-section-id="03"
        data-section-kind="agency"
        data-testid="agency-section-03"
        aria-labelledby="agency-title-03"
      >
        <header className="agency-section-header">
          <span>Section 03</span>
          <span>Independent creative office · Seoul</span>
        </header>
        <div className="agency-orbit" aria-hidden="true">
          <span>Culture</span>
          <span>Commerce</span>
          <span>Craft</span>
        </div>
        <div className="agency-section-body">
          <p className="agency-kicker">Attention is earned, not bought.</p>
          <DraggableCopy
            className="agency-draggable agency-headline agency-headline-03"
            dragId="section-03-headline"
            label="섹션 3 헤드라인"
            testId="draggable-copy-section-03"
          >
            <h2 id="agency-title-03">
              Make noise.
              <br />
              <span>Move minds.</span>
            </h2>
          </DraggableCopy>
          <div className="agency-lower-copy">
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
        id="section-04"
        data-section-id="04"
        data-section-kind="agency"
        data-testid="agency-section-04"
        aria-labelledby="agency-title-04"
      >
        <header className="agency-section-header agency-section-header-dark">
          <span>Section 04</span>
          <span>Selected work · 2024—2026</span>
        </header>
        <div className="agency-section-body agency-section-body-04">
          <p className="agency-kicker agency-kicker-dark">Ordinary gets ignored.</p>
          <DraggableCopy
            className="agency-draggable agency-headline agency-headline-04"
            dragId="section-04-headline"
            label="섹션 4 헤드라인"
            testId="draggable-copy-section-04"
          >
            <h2 id="agency-title-04">
              평범한 건
              <br />
              <span>통과되지 않는다.</span>
            </h2>
          </DraggableCopy>
          <div className="agency-case-list" aria-label="대표 프로젝트">
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
        id="section-05"
        data-section-id="05"
        data-section-kind="agency"
        data-testid="agency-section-05"
        aria-labelledby="agency-title-05"
      >
        <header className="agency-section-header">
          <span>Section 05</span>
          <span>Our operating system</span>
        </header>
        <div className="agency-section-body agency-section-body-05">
          <p className="agency-kicker">Strategy × Culture × Craft</p>
          <DraggableCopy
            className="agency-draggable agency-headline agency-headline-05"
            dragId="section-05-headline"
            label="섹션 5 헤드라인"
            testId="draggable-copy-section-05"
          >
            <h2 id="agency-title-05">
              Culture is
              <br />
              <span>the strategy.</span>
            </h2>
          </DraggableCopy>
          <div className="agency-method-grid">
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
        </div>
      </section>

      <section
        className="agency-section agency-section-06"
        id="section-06"
        data-section-id="06"
        data-section-kind="agency"
        data-testid="agency-section-06"
        aria-labelledby="agency-title-06"
      >
        <header className="agency-section-header agency-section-header-dark">
          <span>Section 06</span>
          <span>New business · Always open</span>
        </header>
        <div className="agency-section-body agency-section-body-06">
          <p className="agency-kicker agency-kicker-dark">Let&apos;s make the next move.</p>
          <DraggableCopy
            className="agency-draggable agency-headline agency-headline-06"
            dragId="section-06-headline"
            label="섹션 6 헤드라인"
            testId="draggable-copy-section-06"
          >
            <h2 id="agency-title-06">
              다음 장면을
              <br />
              <span>같이 만들죠.</span>
            </h2>
          </DraggableCopy>
          <div className="agency-contact-row">
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
