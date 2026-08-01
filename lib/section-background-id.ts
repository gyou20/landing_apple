export const HOME_SECTION_IDS = [
  "home-section-01",
  "home-section-02",
  "home-section-03",
  "home-section-04",
  "home-section-05",
  "home-section-06",
] as const;

export type SectionBackgroundId = string;

export function isSectionBackgroundId(value: string): value is SectionBackgroundId {
  return HOME_SECTION_IDS.includes(value as (typeof HOME_SECTION_IDS)[number])
    || /^(contact-(intro|form)|vlog-(intro|article-list)|section-[a-f0-9-]{36})$/.test(value);
}