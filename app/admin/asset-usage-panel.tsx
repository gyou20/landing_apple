"use client";

import { useEffect, useState } from "react";

type AssetUsage = { id: string; entityId: string; label: string; role: string; states: Array<"draft" | "published"> };
type Asset = { id: string; name: string; source: "R2" | "URL"; usageCount: number; usages: AssetUsage[] };

export function AssetUsagePanel() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [status, setStatus] = useState("이미지 사용 위치를 확인하고 있습니다…");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/assets", { cache: "no-store" }).then(async (response) => {
      const data = await response.json() as { assets?: Asset[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "asset-usage-load-failed");
      if (!cancelled) {
        setAssets(data.assets ?? []);
        setStatus((data.assets?.length ?? 0) ? "" : "등록된 이미지가 없습니다.");
      }
    }).catch((error) => {
      console.error("[asset-usage:admin-ui-failed]", { error });
      if (!cancelled) setStatus("이미지 사용 위치를 불러오지 못했습니다.");
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <section className="admin-asset-usage" aria-labelledby="asset-usage-title">
      <header><div><span className="admin-eyebrow">Usage map</span><h2 id="asset-usage-title">이미지 사용 위치</h2></div><strong>{assets.length}</strong></header>
      <p>R2 섹션 배경과 콘텐츠 이미지 블록을 초안·게시 상태별로 확인합니다.</p>
      {status && <div className="admin-empty-state" role="status">{status}</div>}
      <div className="admin-asset-list">
        {assets.map((asset) => (
          <article key={asset.id} data-asset-id={asset.id}>
            <header><div><span>{asset.source}</span><strong>{asset.name}</strong></div><b>이 이미지는 {asset.usageCount}곳에서 사용 중</b></header>
            <ul>{asset.usages.map((usage) => <li key={usage.id}><span>{usage.label} · {usage.role}</span><small>{usage.states.map((state) => state === "draft" ? "초안" : "게시").join(" · ")}</small></li>)}</ul>
            <details><summary>삭제 확인</summary><p>사용 중인 이미지는 삭제할 수 없습니다. 위 위치에서 이미지를 교체하거나 제거한 뒤 다시 확인하세요.</p></details>
          </article>
        ))}
      </div>
    </section>
  );
}