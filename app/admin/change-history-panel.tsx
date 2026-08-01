"use client";

import { useCallback, useEffect, useState } from "react";

type ChangeRecord = {
  id: string;
  entityType: "page" | "section" | "vlog" | "image";
  entityId: string;
  entityTitle: string;
  summary: string;
  actorEmail: string;
  createdAt: string;
};
type CleanupResult = { deletedCount: number; deletedByAge: number; deletedByLimit: number; remainingCount: number };

const LABELS = { page: "페이지", section: "섹션", vlog: "Vlog", image: "이미지" } as const;

export function ChangeHistoryPanel() {
  const [records, setRecords] = useState<ChangeRecord[]>([]);
  const [status, setStatus] = useState("변경 이력을 불러오는 중입니다…");
  const [cleaning, setCleaning] = useState(false);

  const loadHistory = useCallback(async () => {
    const response = await fetch("/api/admin/change-history?limit=100", { cache: "no-store" });
    const data = await response.json() as { records?: ChangeRecord[]; error?: string };
    if (!response.ok) throw new Error(data.error ?? "history-load-failed");
    setRecords(data.records ?? []);
    setStatus((data.records?.length ?? 0) ? "" : "아직 기록된 변경 이력이 없습니다.");
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => void loadHistory().catch((error) => {
      console.error("[change-history:admin-ui-failed]", { error });
      if (!cancelled) setStatus("변경 이력을 불러오지 못했습니다.");
    }));
    return () => { cancelled = true; };
  }, [loadHistory]);

  async function cleanupNow() {
    setCleaning(true);
    setStatus("180일 또는 10,000건 기준으로 변경 이력을 정리하고 있습니다…");
    try {
      const response = await fetch("/api/admin/change-history/cleanup", { method: "POST" });
      const data = await response.json() as CleanupResult & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "history-cleanup-failed");
      await loadHistory();
      setStatus(data.deletedCount
        ? `오래된 기록 ${data.deletedCount}건을 정리했습니다. 현재 ${data.remainingCount}건입니다.`
        : `정리할 기록이 없습니다. 현재 ${data.remainingCount}건입니다.`);
      console.info("[change-history:admin-ui-cleanup]", data);
    } catch (error) {
      console.error("[change-history:admin-ui-cleanup-failed]", { error });
      setStatus("변경 이력을 정리하지 못했습니다.");
    } finally {
      setCleaning(false);
    }
  }

  return (
    <section className="admin-history-panel" aria-labelledby="change-history-title">
      <header>
        <div><span className="admin-eyebrow">Audit trail</span><h2 id="change-history-title">변경 이력</h2></div>
        <div className="admin-history-tools"><strong>{records.length}</strong><button type="button" disabled={cleaning} onClick={cleanupNow}>{cleaning ? "정리 중…" : "지금 정리"}</button></div>
      </header>
      <p>최근 100건을 표시합니다. 실제 데이터는 180일 동안 최대 10,000건을 보관하며 매일 자동 정리합니다.</p>
      {status && <div className="admin-history-status" role="status">{status}</div>}
      <div className="admin-history-list">
        {records.map((record) => (
          <article key={record.id} data-change-id={record.id} data-entity-id={record.entityId}>
            <time dateTime={record.createdAt}>{new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(record.createdAt))}</time>
            <div><span>{LABELS[record.entityType]}</span><strong>{record.entityTitle}</strong><p>{record.summary}</p></div>
          </article>
        ))}
      </div>
    </section>
  );
}