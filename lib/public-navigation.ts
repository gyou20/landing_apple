export type PublicNavigationItem = { id: string; href: string; label: string };
export type NavigationPageInput = {
  id: string;
  published: { title: string; slug: string } | null;
};
export type NavigationVisibilityInput = {
  entityType: string;
  entityId: string;
  published: { menuVisible: boolean };
};

const STATIC_ITEMS: PublicNavigationItem[] = [
  { id: "home", href: "/home", label: "Home" },
  { id: "contact", href: "/contact", label: "Contact" },
  { id: "vlog", href: "/vlog", label: "Vlog" },
];

export function buildPublicNavigation(
  customPages: NavigationPageInput[],
  visibilityRecords: NavigationVisibilityInput[],
  deletedKeys: Set<string>,
) {
  const customItems = customPages
    .filter((page) => page.published)
    .map((page) => ({ id: page.id, href: page.published!.slug, label: page.published!.title }));
  return [...STATIC_ITEMS, ...customItems].filter((item) => {
    if (deletedKeys.has(`page:${item.id}`)) return false;
    const visibility = visibilityRecords.find((record) => record.entityType === "page" && record.entityId === item.id);
    return visibility?.published.menuVisible ?? true;
  });
}

export function defaultPublicNavigation() {
  return [...STATIC_ITEMS];
}
