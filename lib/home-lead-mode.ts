export type HomeLeadMode =
  | "full-motion"
  | "section-one-static"
  | "section-two-direct"
  | "sections-hidden";

export function resolveHomeLeadMode(sectionOneVisible: boolean, sectionTwoVisible: boolean): HomeLeadMode {
  if (sectionOneVisible && sectionTwoVisible) return "full-motion";
  if (sectionOneVisible) return "section-one-static";
  if (sectionTwoVisible) return "section-two-direct";
  return "sections-hidden";
}