"use client";

import {
  type ChangeEvent,
  type CSSProperties,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

const STORAGE_KEY = "aether-wallpaper-v1";

type WallpaperSettings = {
  color: string;
  fit: "cover" | "contain";
  image: string | null;
  scale: number;
  x: number;
  y: number;
};

const DEFAULT_SETTINGS: WallpaperSettings = {
  color: "#000000",
  fit: "cover",
  image: null,
  scale: 100,
  x: 0,
  y: 0,
};

function isWallpaperSettings(value: unknown): value is WallpaperSettings {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<WallpaperSettings>;

  return (
    typeof candidate.color === "string" &&
    (candidate.fit === "cover" || candidate.fit === "contain") &&
    (candidate.image === null ||
      (typeof candidate.image === "string" &&
        candidate.image.startsWith("data:image/"))) &&
    typeof candidate.scale === "number" &&
    typeof candidate.x === "number" &&
    typeof candidate.y === "number"
  );
}

function optimizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("image-type"));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("file-read"));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("image-decode"));
      image.onload = () => {
        const maxWidth = 1600;
        const maxHeight = 2400;
        const ratio = Math.min(
          1,
          maxWidth / image.naturalWidth,
          maxHeight / image.naturalHeight,
        );
        const width = Math.max(1, Math.round(image.naturalWidth * ratio));
        const height = Math.max(1, Math.round(image.naturalHeight * ratio));
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        if (!context) {
          reject(new Error("canvas-context"));
          return;
        }

        canvas.width = width;
        canvas.height = height;
        context.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL("image/webp", 0.86));
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, value));
}

function smoothstep(start: number, end: number, value: number) {
  const progress = clamp((value - start) / (end - start));
  return progress * progress * (3 - 2 * progress);
}

export function EditablePhone({
  transitionContent,
}: {
  transitionContent: ReactNode;
}) {
  const [isMounted, setIsMounted] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [settings, setSettings] =
    useState<WallpaperSettings>(DEFAULT_SETTINGS);
  const [status, setStatus] = useState("이 기기에 자동 저장됩니다.");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (!saved) return;

      const parsed: unknown = JSON.parse(saved);
      if (isWallpaperSettings(parsed)) {
        setSettings(parsed);
        console.info("[aether:editor:restore]", {
          hasImage: Boolean(parsed.image),
          fit: parsed.fit,
        });
      }
    } catch (error) {
      console.warn("[aether:editor:restore-failed]", error);
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const imageValue = settings.image ? `url("${settings.image}")` : "none";

    root.style.setProperty("--experience-wallpaper-color", settings.color);
    root.style.setProperty("--experience-wallpaper-image", imageValue);
    root.style.setProperty("--experience-wallpaper-fit", settings.fit);
    root.style.setProperty(
      "--experience-wallpaper-position",
      `${50 + settings.x}% ${50 + settings.y}%`,
    );
    root.style.setProperty(
      "--experience-wallpaper-scale",
      String(settings.scale / 100),
    );

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      console.info("[aether:editor:save]", {
        hasImage: Boolean(settings.image),
        fit: settings.fit,
        scale: settings.scale,
      });
    } catch (error) {
      setStatus("저장 공간이 부족합니다. 더 작은 이미지를 선택해 주세요.");
      console.error("[aether:editor:save-failed]", error);
    }
  }, [settings]);

  useEffect(() => {
    const hero = document.querySelector<HTMLElement>('[data-section="hero"]');
    const screen = screenRef.current;
    if (!hero || !screen) {
      console.error("[aether:zoom:missing-element]", {
        heroFound: Boolean(hero),
        screenFound: Boolean(screen),
      });
      return;
    }

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let frameId = 0;
    let lastPhase = "";

    const updateZoom = () => {
      const travel = Math.max(1, hero.offsetHeight - window.innerHeight);
      const progress = clamp(-hero.getBoundingClientRect().top / travel);
      const mobile = window.innerWidth < 700;
      const startX = mobile ? 50 : 72;
      const startY = mobile ? 67 : 57;
      const centerProgress = smoothstep(0.08, 0.46, progress);
      const zoomProgress = smoothstep(0.2, 0.9, progress);
      const revealProgress = smoothstep(0.76, 0.94, progress);
      const screenWidth = Math.max(1, screen.offsetWidth);
      const screenHeight = Math.max(1, screen.offsetHeight);
      const coverScale =
        Math.max(
          window.innerWidth / screenWidth,
          window.innerHeight / screenHeight,
        ) * 1.08;
      const phoneScale = reducedMotion
        ? 1
        : 1 + (coverScale - 1) * zoomProgress;
      const copyOpacity = 1 - smoothstep(0.12, 0.42, progress);
      const hardwareOpacity = 1 - smoothstep(0.66, 0.86, progress);
      const phase =
        progress >= 0.76 ? "inside" : progress >= 0.18 ? "zoom" : "intro";

      hero.style.setProperty(
        "--phone-center-x",
        `${startX + (50 - startX) * centerProgress}%`,
      );
      hero.style.setProperty(
        "--phone-center-y",
        `${startY + (50 - startY) * centerProgress}%`,
      );
      hero.style.setProperty("--phone-scale", String(phoneScale));
      hero.style.setProperty("--hero-copy-opacity", String(copyOpacity));
      hero.style.setProperty(
        "--hardware-opacity",
        String(hardwareOpacity),
      );
      hero.style.setProperty(
        "--section-two-reveal",
        reducedMotion ? "0" : String(revealProgress),
      );
      hero.style.setProperty("--scroll-progress", String(progress));
      hero.dataset.zoomPhase = phase;

      if (phase !== lastPhase) {
        lastPhase = phase;
        console.info("[aether:zoom:phase]", {
          phase,
          progress: Number(progress.toFixed(3)),
          phoneScale: Number(phoneScale.toFixed(3)),
        });
      }
    };

    const requestUpdate = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(updateZoom);
    };

    updateZoom();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate, { passive: true });

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, []);

  const updateSettings = (patch: Partial<WallpaperSettings>) => {
    setSettings((current) => ({ ...current, ...patch }));
  };

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setStatus("이미지를 최적화하고 있습니다…");
    console.info("[aether:editor:upload-start]", {
      type: file.type,
      size: file.size,
    });

    try {
      const image = await optimizeImage(file);
      updateSettings({ image, scale: 100, x: 0, y: 0 });
      setStatus("배경화면을 저장했습니다.");
      console.info("[aether:editor:upload-complete]");
    } catch (error) {
      setStatus("이미지를 불러오지 못했습니다. 다른 파일을 선택해 주세요.");
      console.error("[aether:editor:upload-failed]", error);
    } finally {
      event.target.value = "";
    }
  };

  const wallpaperStyle = {
    "--wallpaper-color": settings.color,
    "--wallpaper-image": settings.image
      ? `url("${settings.image}")`
      : "none",
    "--wallpaper-fit": settings.fit,
    "--wallpaper-position-x": `${50 + settings.x}%`,
    "--wallpaper-position-y": `${50 + settings.y}%`,
    "--wallpaper-scale": settings.scale / 100,
  } as CSSProperties;

  const editor = (
    <>
      <button
        className="edit-mode-toggle"
        type="button"
        aria-expanded={isEditing}
        aria-controls="wallpaper-editor"
        data-testid="edit-mode-toggle"
        onClick={() => setIsEditing((current) => !current)}
      >
        <span aria-hidden="true">✦</span>
        {isEditing ? "편집 닫기" : "Edit Mode"}
      </button>

      <aside
        className={`wallpaper-editor${isEditing ? " is-open" : ""}`}
        id="wallpaper-editor"
        aria-label="휴대폰 배경화면 편집기"
        aria-hidden={!isEditing}
        inert={!isEditing}
        data-testid="wallpaper-editor"
      >
        <div className="editor-heading">
          <div>
            <span>Wallpaper Studio</span>
            <strong>휴대폰 화면 편집</strong>
          </div>
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            aria-label="편집기 닫기"
          >
            ×
          </button>
        </div>

        <div className="editor-control editor-upload">
          <span>이미지</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/avif"
            onChange={handleImageUpload}
          />
          <button type="button" onClick={() => fileInputRef.current?.click()}>
            이미지 선택
          </button>
        </div>

        <label className="editor-control color-control">
          <span>배경색</span>
          <span className="color-value">{settings.color.toUpperCase()}</span>
          <input
            type="color"
            value={settings.color}
            onChange={(event) => updateSettings({ color: event.target.value })}
          />
        </label>

        <div className="editor-control">
          <span>맞춤</span>
          <div className="segmented-control">
            <button
              type="button"
              className={settings.fit === "cover" ? "is-active" : ""}
              aria-pressed={settings.fit === "cover"}
              onClick={() => updateSettings({ fit: "cover" })}
            >
              채우기
            </button>
            <button
              type="button"
              className={settings.fit === "contain" ? "is-active" : ""}
              aria-pressed={settings.fit === "contain"}
              onClick={() => updateSettings({ fit: "contain" })}
            >
              맞추기
            </button>
          </div>
        </div>

        <label className="editor-control range-control">
          <span>확대</span>
          <output>{settings.scale}%</output>
          <input
            type="range"
            min="100"
            max="180"
            value={settings.scale}
            onChange={(event) =>
              updateSettings({ scale: Number(event.target.value) })
            }
          />
        </label>

        <label className="editor-control range-control">
          <span>가로 위치</span>
          <output>{settings.x}</output>
          <input
            type="range"
            min="-40"
            max="40"
            value={settings.x}
            onChange={(event) =>
              updateSettings({ x: Number(event.target.value) })
            }
          />
        </label>

        <label className="editor-control range-control">
          <span>세로 위치</span>
          <output>{settings.y}</output>
          <input
            type="range"
            min="-40"
            max="40"
            value={settings.y}
            onChange={(event) =>
              updateSettings({ y: Number(event.target.value) })
            }
          />
        </label>

        <div className="editor-footer">
          <p aria-live="polite">{status}</p>
          <button
            type="button"
            onClick={() => {
              setSettings(DEFAULT_SETTINGS);
              setStatus("기본 검정 화면으로 되돌렸습니다.");
            }}
          >
            초기화
          </button>
        </div>
      </aside>
    </>
  );

  return (
    <>
      <div
        className="phone-stage"
        id="device"
        data-testid="hero-product-visual"
        aria-label="스크롤하면 화면 안으로 확대되는 Aether One 스마트폰"
      >
        <div className="ambient ambient-one" aria-hidden="true" />
        <div className="ambient ambient-two" aria-hidden="true" />

        <div
          ref={phoneRef}
          className="phone phone-front"
          data-testid="scroll-zoom-phone"
        >
          <div
            ref={screenRef}
            className="phone-screen"
            style={wallpaperStyle}
          >
            <div className="wallpaper-layer" aria-hidden="true" />
            <div className="screen-reflection" aria-hidden="true" />
            <div className="dynamic-island" aria-hidden="true" />
          </div>
        </div>

        <div
          className="zoom-destination"
          aria-hidden="true"
          data-testid="zoom-destination"
        >
          <div className="zoom-destination-wallpaper" />
          <div className="section-two-scrim" />
          {transitionContent}
        </div>
      </div>

      {isMounted ? createPortal(editor, document.body) : null}
    </>
  );
}
