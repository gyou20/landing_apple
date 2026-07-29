"use client";

import { type ChangeEvent, useState } from "react";

const MAX_BYTES = 20 * 1024 * 1024;
const MAX_PIXELS = 25_000_000;
const VARIANT_WIDTHS = [400, 800, 1200, 1600];

type ProcessedImage = {
  width: number;
  height: number;
  dominantColor: string;
  variants: number[];
};

function dominantColor(source: ImageBitmap): string {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const context = canvas.getContext("2d");
  if (!context) return "#000000";
  context.drawImage(source, 0, 0, 32, 32);
  const pixels = context.getImageData(0, 0, 32, 32).data;
  let red = 0;
  let green = 0;
  let blue = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    red += pixels[index];
    green += pixels[index + 1];
    blue += pixels[index + 2];
  }
  const average = [red, green, blue].map((value) => Math.round(value / (pixels.length / 4)));
  return `#${average.map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

function createVariant(source: ImageBitmap, requestedWidth: number) {
  const width = Math.min(requestedWidth, 2000, source.width);
  const height = Math.max(1, Math.round((source.height * width) / source.width));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas-context");
  context.drawImage(source, 0, 0, width, height);
  return { width, height };
}

export function ImageProcessor({ authenticated }: { authenticated: boolean }) {
  const [status, setStatus] = useState("JPEG · PNG · WebP · 최대 20MB · 최대 25MP");
  const [result, setResult] = useState<ProcessedImage | null>(null);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setStatus("JPEG, PNG 또는 WebP 파일만 허용됩니다.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setStatus("20MB를 초과한 파일입니다.");
      return;
    }
    try {
      const source = await createImageBitmap(file, { imageOrientation: "from-image" });
      if (source.width * source.height > MAX_PIXELS) {
        source.close();
        setStatus("25MP를 초과한 이미지입니다.");
        return;
      }
      const variants = VARIANT_WIDTHS.map((width) => createVariant(source, width).width);
      setResult({ width: source.width, height: source.height, dominantColor: dominantColor(source), variants });
      source.close();
      setStatus("변환 미리보기가 준비되었습니다. 저장·게시 전 단계입니다.");
    } catch {
      setStatus("이미지를 읽지 못했습니다. WebP 실패 시 JPEG·PNG fallback을 사용해야 합니다.");
    }
  }

  return (
    <section className="admin-image-processor" aria-labelledby="admin-image-title">
      <div className="admin-image-copy">
        <p className="route-page-kicker">Admin · Browser image transform</p>
        <h1 id="admin-image-title">이미지 변환</h1>
        <p>브라우저에서 원본을 읽고 400, 800, 1200, 1600px variant와 dominantColor를 계산합니다.</p>
        {!authenticated && <p className="admin-auth-note">로컬 측정 모드입니다. Cloudflare Access 인증 후 저장·게시를 연결합니다.</p>}
      </div>
      <label className="admin-image-upload">
        이미지 선택
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} />
      </label>
      <p className="admin-image-status" role="status">{status}</p>
      {result && (
        <dl className="admin-image-result">
          <div><dt>원본</dt><dd>{result.width} × {result.height}</dd></div>
          <div><dt>dominantColor</dt><dd>{result.dominantColor}</dd></div>
          <div><dt>variant</dt><dd>{result.variants.join(" / ")}px</dd></div>
        </dl>
      )}
    </section>
  );
}
