import { buildPublicNavigation, defaultPublicNavigation } from "../lib/public-navigation";
import { listContentPages } from "./content-pages";
import { publishedDeletionSet } from "./content-deletions";
import { getVisibilityDb, listVisibility } from "./content-visibility";

export type { PublicNavigationItem } from "../lib/public-navigation";

export async function loadPublicNavigation() {
  try {
    const db = await getVisibilityDb();
    const [pages, visibility, deleted] = await Promise.all([
      listContentPages(db),
      listVisibility(db),
      publishedDeletionSet(db),
    ]);
    const items = buildPublicNavigation(pages, visibility, deleted);
    console.info("[navigation:published-loaded]", { itemCount: items.length, itemIds: items.map((item) => item.id) });
    return items;
  } catch (error) {
    console.warn("[navigation:published-fallback]", { error: error instanceof Error ? error.message : String(error) });
    return defaultPublicNavigation();
  }
}