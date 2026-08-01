import type { ContentSectionRecord } from "../db/content-sections";
import type { SectionBackgroundRow } from "../db/section-backgrounds";

export type AssetUsageState = "draft" | "published";
export type AssetUsageLocation = {
  id: string;
  entityId: string;
  label: string;
  role: "섹션 배경" | "이미지 블록";
  states: AssetUsageState[];
};
export type AssetUsageItem = {
  id: string;
  name: string;
  source: "R2" | "URL";
  usageCount: number;
  usages: AssetUsageLocation[];
};

type MutableAsset = Omit<AssetUsageItem, "usageCount" | "usages"> & { usages: Map<string, AssetUsageLocation> };

function filename(value: string) {
  const clean = value.split("?")[0].split("#")[0];
  return decodeURIComponent(clean.slice(clean.lastIndexOf("/") + 1)) || value;
}

function addUsage(assets: Map<string, MutableAsset>, input: Omit<AssetUsageItem, "usageCount" | "usages">, usage: Omit<AssetUsageLocation, "states">, state: AssetUsageState) {
  const asset = assets.get(input.id) ?? { ...input, usages: new Map<string, AssetUsageLocation>() };
  const current = asset.usages.get(usage.id) ?? { ...usage, states: [] };
  if (!current.states.includes(state)) current.states.push(state);
  asset.usages.set(usage.id, current);
  assets.set(input.id, asset);
}

export function buildAssetUsage(backgrounds: SectionBackgroundRow[], sections: ContentSectionRecord[]): AssetUsageItem[] {
  const assets = new Map<string, MutableAsset>();
  for (const row of backgrounds) {
    if (row.draft_key) {
      addUsage(assets, { id: row.draft_key, name: row.draft_original_name ?? filename(row.draft_key), source: "R2" }, {
        id: row.section_id + ":background", entityId: row.section_id, label: row.section_id, role: "섹션 배경",
      }, "draft");
    }
    if (row.published_key) {
      addUsage(assets, { id: row.published_key, name: row.published_original_name ?? filename(row.published_key), source: "R2" }, {
        id: row.section_id + ":background", entityId: row.section_id, label: row.section_id, role: "섹션 배경",
      }, "published");
    }
  }

  for (const section of sections) {
    const versions = [
      { state: "draft" as const, title: section.draft.title, blocks: section.draft.content.blocks },
      ...(section.published ? [{ state: "published" as const, title: section.published.title, blocks: section.published.content.blocks }] : []),
    ];
    for (const version of versions) {
      for (const block of version.blocks) {
        if (block.type !== "image" || !block.src) continue;
        addUsage(assets, { id: block.src, name: filename(block.src), source: "URL" }, {
          id: section.id + ":block:" + block.id,
          entityId: section.id,
          label: version.title,
          role: "이미지 블록",
        }, version.state);
      }
    }
  }

  return [...assets.values()].map((asset) => {
    const usages = [...asset.usages.values()].sort((a, b) => a.label.localeCompare(b.label, "ko"));
    return { id: asset.id, name: asset.name, source: asset.source, usageCount: usages.length, usages };
  }).sort((a, b) => b.usageCount - a.usageCount || a.name.localeCompare(b.name, "ko"));
}