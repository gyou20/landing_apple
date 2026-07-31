export type HomeSectionContent = {
  id: `home-section-0${1 | 2 | 3 | 4 | 5 | 6}`;
  eyebrow: string;
  headlinePrimary: string;
  headlineAccent: string;
  subheadline: string;
  description: string;
  ctaLabel: string;
};

export type SiteContent = {
  brandName: string;
  homeSections: HomeSectionContent[];
};

export const SITE_CONTENT_STORAGE_KEY = "review-in-house-site-content-v1";
export const SITE_CONTENT_EVENT = "review-in-house:site-content";

export const DEFAULT_SITE_CONTENT: SiteContent = {
  brandName: "리뷰인하우스",
  homeSections: [
    {
      id: "home-section-01",
      eyebrow: "Aether One Pro",
      headlinePrimary: "깊이를 넘어,",
      headlineAccent: "경험이 되다.",
      subheadline: "항공우주 등급 티타늄의 섬세한 질감.",
      description: "스크롤해 화면 안으로 들어가 보세요.",
      ctaLabel: "화면 안으로",
    },
    {
      id: "home-section-02",
      eyebrow: "Aether OS · Inside",
      headlinePrimary: "화면의 경계가",
      headlineAccent: "사라지는 순간.",
      subheadline: "당신이 선택한 화면에서 새로운 경험이 이어집니다.",
      description: "빠르고, 조용하고, 온전히 당신답게.",
      ctaLabel: "",
    },
    {
      id: "home-section-03",
      eyebrow: "Attention is earned, not bought.",
      headlinePrimary: "Make noise.",
      headlineAccent: "Move minds.",
      subheadline: "브랜드가 문화의 한가운데 서는 방법.",
      description: "Campaign systems · Brand worlds · Social ideas",
      ctaLabel: "",
    },
    {
      id: "home-section-04",
      eyebrow: "Ordinary gets ignored.",
      headlinePrimary: "평범한 건",
      headlineAccent: "통과되지 않는다.",
      subheadline: "예쁜 광고보다 강한 관점을 설계합니다.",
      description: "Selected transformations across brand, product and culture",
      ctaLabel: "",
    },
    {
      id: "home-section-05",
      eyebrow: "Strategy × Culture × Craft",
      headlinePrimary: "Culture is",
      headlineAccent: "the strategy.",
      subheadline: "전략은 보고서가 아니라 사람들이 기억하는 장면입니다.",
      description: "Find the tension · Frame the point · Make it travel",
      ctaLabel: "",
    },
    {
      id: "home-section-06",
      eyebrow: "Let's make the next move.",
      headlinePrimary: "다음 장면을",
      headlineAccent: "같이 만들죠.",
      subheadline: "새 브랜드, 새로운 캠페인, 다음 성장의 순간.",
      description: "Tell us what needs to move.",
      ctaLabel: "",
    },
  ],
};

export function normalizeSiteContent(value: unknown): SiteContent {
  if (!value || typeof value !== "object") return DEFAULT_SITE_CONTENT;
  const candidate = value as Partial<SiteContent>;
  const storedSections = Array.isArray(candidate.homeSections) ? candidate.homeSections : [];

  return {
    brandName:
      typeof candidate.brandName === "string"
        ? candidate.brandName
        : DEFAULT_SITE_CONTENT.brandName,
    homeSections: DEFAULT_SITE_CONTENT.homeSections.map((fallback) => {
      const stored = storedSections.find((section) => section?.id === fallback.id);
      return stored ? { ...fallback, ...stored, id: fallback.id } : fallback;
    }),
  };
}
