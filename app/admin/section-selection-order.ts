export type SectionSelectionMovement = -1 | 1 | "first" | "last";

export function moveSelectedItems<T extends { id: string }>(items: T[], selectedIds: string[], movement: SectionSelectionMovement) {
  const selectedSet = new Set(selectedIds);
  const selected = items.filter((item) => selectedSet.has(item.id));
  if (selected.length === 0 || selected.length === items.length) return items;

  const firstIndex = items.findIndex((item) => selectedSet.has(item.id));
  const lastIndex = items.findLastIndex((item) => selectedSet.has(item.id));
  const alreadyAtFront = items.slice(0, selected.length).every((item) => selectedSet.has(item.id));
  const alreadyAtBack = items.slice(-selected.length).every((item) => selectedSet.has(item.id));
  if (movement === -1 && firstIndex === 0) return items;
  if (movement === "first" && alreadyAtFront) return items;
  if (movement === 1 && lastIndex === items.length - 1) return items;
  if (movement === "last" && alreadyAtBack) return items;

  const remaining = items.filter((item) => !selectedSet.has(item.id));
  const remainingBefore = items.slice(0, firstIndex).filter((item) => !selectedSet.has(item.id)).length;
  const insertIndex = movement === "first"
    ? 0
    : movement === "last"
      ? remaining.length
      : movement === -1
        ? Math.max(0, remainingBefore - 1)
        : Math.min(remaining.length, remainingBefore + 1);
  return [...remaining.slice(0, insertIndex), ...selected, ...remaining.slice(insertIndex)];
}
