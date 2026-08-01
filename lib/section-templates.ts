export const SECTION_TEMPLATE_IDS = [
  "editorialHero",
  "profileStory",
  "brandWall",
  "mediaGrid",
  "projectGrid",
  "classCards",
  "contactForm",
  "footerBand",
] as const;

export type SectionTemplateId = (typeof SECTION_TEMPLATE_IDS)[number];

export type SectionTemplateItem = {
  id: string;
  title: string;
  meta: string;
  description: string;
  href: string;
  imageSrc: string;
  imageAlt: string;
};

export type SectionTemplateDefinition = {
  id: SectionTemplateId;
  label: string;
  description: string;
  renderer: SectionTemplateId;
  itemLabel: string | null;
  maxItems: number;
  submissionEndpoint?: string;
  defaults: {
    eyebrow: string;
    headlinePrimary: string;
    headlineAccent: string;
    subheadline: string;
    description: string;
    ctaLabel: string;
    items: SectionTemplateItem[];
  };
};

function item(id: string, title: string, meta = ""): SectionTemplateItem {
  return { id, title, meta, description: "", href: "", imageSrc: "", imageAlt: "" };
}

export const SECTION_TEMPLATE_REGISTRY: readonly SectionTemplateDefinition[] = [
  {
    id: "editorialHero",
    label: "Editorial Hero",
    description: "큰 제목과 핵심 지표로 첫 인상을 만드는 도입 섹션",
    renderer: "editorialHero",
    itemLabel: "핵심 지표",
    maxItems: 4,
    defaults: {
      eyebrow: "Aether One",
      headlinePrimary: "아이디어를 선명한 경험으로",
      headlineAccent: "의도를 움직이는 결과로",
      subheadline: "브랜드와 제품의 다음 장면을 설계합니다.",
      description: "전략과 디자인, 디지털 경험을 하나의 흐름으로 연결합니다.",
      ctaLabel: "프로젝트 살펴보기",
      items: [item("item-focus", "Strategy", "01"), item("item-craft", "Creative", "02"), item("item-impact", "Experience", "03")],
    },
  },
  {
    id: "profileStory",
    label: "Profile Story",
    description: "소개 문장과 주요 이력을 함께 보여주는 스토리 섹션",
    renderer: "profileStory",
    itemLabel: "이력",
    maxItems: 8,
    defaults: {
      eyebrow: "About",
      headlinePrimary: "복잡한 문제를",
      headlineAccent: "명확한 방향으로",
      subheadline: "관찰하고 정의하고 끝까지 구현합니다.",
      description: "분야를 넘나드는 팀이 브랜드의 본질과 사용자의 행동을 함께 살핍니다.",
      ctaLabel: "",
      items: [item("item-strategy", "Brand strategy"), item("item-design", "Experience design"), item("item-production", "Creative production")],
    },
  },
  {
    id: "brandWall",
    label: "Brand Wall",
    description: "파트너나 고객 이름을 균형 있는 목록으로 소개하는 섹션",
    renderer: "brandWall",
    itemLabel: "브랜드",
    maxItems: 16,
    defaults: {
      eyebrow: "Selected partners",
      headlinePrimary: "함께 만든",
      headlineAccent: "의미 있는 변화",
      subheadline: "",
      description: "프로젝트에 맞는 실제 파트너 정보로 교체하세요.",
      ctaLabel: "",
      items: [item("item-brand-1", "Partner 01"), item("item-brand-2", "Partner 02"), item("item-brand-3", "Partner 03"), item("item-brand-4", "Partner 04")],
    },
  },
  {
    id: "mediaGrid",
    label: "Media Grid",
    description: "영상과 콘텐츠를 카드 그리드로 소개하는 섹션",
    renderer: "mediaGrid",
    itemLabel: "미디어",
    maxItems: 12,
    defaults: {
      eyebrow: "Insights",
      headlinePrimary: "생각을 나누고",
      headlineAccent: "가능성을 확장합니다",
      subheadline: "새로운 관점과 제작 과정을 기록합니다.",
      description: "영상 제목, 링크, 썸네일을 관리자에서 변경할 수 있습니다.",
      ctaLabel: "전체 콘텐츠 보기",
      items: [item("item-media-1", "새로운 콘텐츠", "Video 01"), item("item-media-2", "두 번째 콘텐츠", "Video 02"), item("item-media-3", "세 번째 콘텐츠", "Video 03")],
    },
  },
  {
    id: "projectGrid",
    label: "Project Grid",
    description: "대표 작업을 이미지 중심 카드로 배열하는 포트폴리오 섹션",
    renderer: "projectGrid",
    itemLabel: "프로젝트",
    maxItems: 12,
    defaults: {
      eyebrow: "Selected work",
      headlinePrimary: "선택한 프로젝트와",
      headlineAccent: "만들어진 변화",
      subheadline: "전략에서 실행까지 이어진 결과를 소개합니다.",
      description: "실제 프로젝트 이미지와 설명으로 교체하세요.",
      ctaLabel: "모든 프로젝트 보기",
      items: [item("item-project-1", "Project 01", "Brand"), item("item-project-2", "Project 02", "Digital"), item("item-project-3", "Project 03", "Campaign")],
    },
  },
  {
    id: "classCards",
    label: "Class Cards",
    description: "교육, 서비스 또는 프로그램을 나란히 비교하는 카드 섹션",
    renderer: "classCards",
    itemLabel: "프로그램",
    maxItems: 6,
    defaults: {
      eyebrow: "Programs",
      headlinePrimary: "배움의 다음 장을",
      headlineAccent: "함께 설계합니다",
      subheadline: "온·오프라인 프로그램을 명확하게 안내합니다.",
      description: "프로그램별 설명과 이동 링크를 설정할 수 있습니다.",
      ctaLabel: "",
      items: [item("item-program-1", "Offline program", "In person"), item("item-program-2", "Online program", "On demand")],
    },
  },
  {
    id: "contactForm",
    label: "Contact",
    description: "프로젝트 문의를 안전하게 저장하는 실제 Contact 폼 섹션",
    renderer: "contactForm",
    itemLabel: "연락 채널",
    maxItems: 4,
    submissionEndpoint: "/api/contact",
    defaults: {
      eyebrow: "Contact",
      headlinePrimary: "새 프로젝트를",
      headlineAccent: "함께 시작해요",
      subheadline: "목표와 일정, 필요한 도움을 알려주세요.",
      description: "보내주신 내용은 안전하게 저장되며 확인 후 이메일로 답변드립니다.",
      ctaLabel: "프로젝트 문의하기",
      items: [item("item-email", "hello@aether.studio", "Email")],
    },
  },
  {
    id: "footerBand",
    label: "Footer Band",
    description: "마지막 메시지와 주요 이동 링크를 정리하는 마감 섹션",
    renderer: "footerBand",
    itemLabel: "링크",
    maxItems: 6,
    defaults: {
      eyebrow: "Aether One",
      headlinePrimary: "다음 장면을",
      headlineAccent: "함께 만듭니다",
      subheadline: "",
      description: "브랜드 정보와 필요한 링크를 간결하게 정리하세요.",
      ctaLabel: "문의하기",
      items: [item("item-home", "Home"), item("item-contact", "Contact"), item("item-vlog", "Vlog")],
    },
  },
] as const;

export function isSectionTemplateId(value: unknown): value is SectionTemplateId {
  return typeof value === "string" && SECTION_TEMPLATE_IDS.includes(value as SectionTemplateId);
}

export function getSectionTemplateDefinition(id: SectionTemplateId) {
  return SECTION_TEMPLATE_REGISTRY.find((template) => template.id === id)!;
}

