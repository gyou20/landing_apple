"use client";

import { useCallback, useEffect, useState, type ChangeEvent } from "react";

type SectionBackgroundStatus = {
  sectionId: string;
  draftOriginalName: string | null;
  hasDraft: boolean;
  isPublished: boolean;
  hasUnpublishedChange: boolean;
  updatedAt: string;
  publishedAt: string | null;
  draftImageUrl: string | null;
};

type StatusResponse = { sections?: SectionBackgroundStatus[]; error?: string };

export function SectionBackgroundUploader({ sectionId }: { sectionId: string }) {
  const [record, setRecord] = useState<SectionBackgroundStatus | null>(null);
  const [message, setMessage] = useState("배경 이미지 1장을 업로드할 수 있습니다.");
  const [uploading, setUploading] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/section-backgrounds", { cache: "no-store" });
      const data = await response.json() as StatusResponse;
      if (!response.ok) throw new Error(data.error ?? "status-load-failed");
      setRecord(data.sections?.find((item) => item.sectionId === sectionId) ?? null);
      console.info("[section-background:admin-status]", { sectionId, found: Boolean(data.sections?.some((item) => item.sectionId === sectionId)) });
    } catch (error) {
      console.error("[section-background:admin-status-failed]", { sectionId, error });
      setMessage("배경 이미지 상태를 불러오지 못했습니다.");
    }
  }, [sectionId]);

  useEffect(() => {
    queueMicrotask(() => void loadStatus());
    const handlePublished = () => void loadStatus();
    window.addEventListener("section-background:published", handlePublished);
    return () => window.removeEventListener("section-background:published", handlePublished);
  }, [loadStatus]);

  async function uploadImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage("R2에 이미지를 저장하고 D1에 초안을 기록하고 있습니다…");
    const formData = new FormData();
    formData.set("sectionId", sectionId);
    formData.set("image", file);
    try {
      console.info("[section-background:admin-upload-request]", { sectionId, name: file.name, size: file.size, type: file.type });
      const response = await fetch("/api/admin/section-backgrounds", { method: "POST", body: formData });
      const data = await response.json() as SectionBackgroundStatus & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "upload-failed");
      setRecord((current) => ({
        sectionId,
        draftOriginalName: data.draftOriginalName,
        hasDraft: true,
        isPublished: current?.isPublished ?? false,
        hasUnpublishedChange: true,
        updatedAt: data.updatedAt,
        publishedAt: current?.publishedAt ?? null,
        draftImageUrl: data.draftImageUrl,
      }));
      setMessage("초안 저장 완료. Publish를 눌러야 홈페이지에 공개됩니다.");
      console.info("[section-background:admin-upload-complete]", { sectionId, updatedAt: data.updatedAt });
    } catch (error) {
      console.error("[section-background:admin-upload-failed]", { sectionId, error });
      setMessage(error instanceof Error ? error.message : "이미지를 저장하지 못했습니다.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  return (
    <section className="admin-section-background" aria-label={`${sectionId} 배경 이미지`}>
      <div className="admin-section-background-heading">
        <div>
          <strong>배경 이미지</strong>
          <small>섹션당 1장 · JPEG, PNG, WebP · 최대 20MB</small>
        </div>
        <span className={record?.hasUnpublishedChange ? "is-pending" : record?.isPublished ? "is-published" : ""}>
          {record?.hasUnpublishedChange ? "Publish 대기" : record?.isPublished ? "게시됨" : "미설정"}
        </span>
      </div>
      {record?.draftImageUrl && (
        <div
          className="admin-section-background-preview"
          role="img"
          aria-label={`${record.draftOriginalName ?? sectionId} 미리보기`}
          style={{ backgroundImage: `url(${JSON.stringify(record.draftImageUrl).slice(1, -1)})` }}
        />
      )}
      <label className="admin-section-background-upload">
        {uploading ? "업로드 중…" : record?.hasDraft ? "이미지 교체" : "이미지 업로드"}
        <input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={uploadImage} />
      </label>
      <p role="status">{message}</p>
      {record?.draftOriginalName && <small className="admin-section-background-file">{record.draftOriginalName}</small>}
    </section>
  );
}