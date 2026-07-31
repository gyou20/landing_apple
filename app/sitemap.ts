import type { MetadataRoute } from "next";
import { defaultVisibility, getVisibilityDb, listVisibility, type VisibilityEntityType } from "../db/content-visibility";
import { publishedDeletionSet } from "../db/content-deletions";

const ITEMS = [
  { type: "page" as const, id: "home", path: "/home" },
  { type: "page" as const, id: "contact", path: "/contact" },
  { type: "page" as const, id: "vlog", path: "/vlog" },
  { type: "vlog" as const, id: "brand-strategy", path: "/vlog/brand-strategy" },
  { type: "vlog" as const, id: "creative", path: "/vlog/creative" },
  { type: "vlog" as const, id: "culture", path: "/vlog/culture" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  let records: Awaited<ReturnType<typeof listVisibility>> = [];
  let deleted = new Set<string>();
  try { const db = await getVisibilityDb(); records = await listVisibility(db); deleted = await publishedDeletionSet(db); }
  catch (error) { console.warn("[visibility:sitemap-defaults]", { error: error instanceof Error ? error.message : String(error) }); }
  return ITEMS.filter((item) => {
    if (deleted.has(`${item.type}:${item.id}`)) return false;
    const record = records.find((candidate) => candidate.entityType === item.type && candidate.entityId === item.id);
    const visibility = record?.published ?? defaultVisibility(item.type as VisibilityEntityType);
    return visibility.searchIndexable;
  }).map((item) => ({ url: `${base}${item.path}`, lastModified: new Date() }));
}