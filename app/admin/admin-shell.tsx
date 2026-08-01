"use client";

import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import type { AdminUser } from "../chatgpt-auth";
import type { HomeSectionContent, SiteContent } from "../site-content";
import { saveSiteContent, useSiteContent } from "../use-site-content";
import { ImageProcessor } from "./image-processor";
import { AssetUsagePanel } from "./asset-usage-panel";
import { ChangeHistoryPanel } from "./change-history-panel";
import { SectionBackgroundUploader } from "./section-background-uploader";
import type { SectionBlock } from "../../db/content-sections";

type AdminSection = "dashboard" | "pages" | "vlog" | "archive" | "trash" | "history" | "contact" | "assets";
type Status = "draft" | "published" | "deleted";
type OrderList = "pages" | "vlog" | "sections";
type VisibilityState = { menuVisible: boolean; searchIndexable: boolean };
type DeleteTarget = { entityType: "page" | "section" | "vlog"; entityId: string };
type DeletionRecord = DeleteTarget & {
  draftDeleted: boolean;
  publishedDeleted: boolean;
  operationId: string;
  requestedBy: string;
  pendingAt: string;
  publishedAt: string | null;
  deleteAfter: string | null;
  restoredAt: string | null;
  updatedAt: string;
};
type UndoState = { operationId: string; count: number; expiresAt: number };
type PublishPreviewItem = { id: string; title: string; detail: string };
type PublishPreviewGroup = { key: string; label: string; items: PublishPreviewItem[] };
type PublishPreviewData = { total: number; groups: PublishPreviewGroup[] };
type PageApiRecord = {
  id: string;
  draft: { title: string; slug: string; type: string; summary: string; body: string; status: "draft" | "published" };
};
type AdminSectionContent = Omit<HomeSectionContent, "id"> & { blocks: SectionBlock[] };
type SectionApiRecord = {
  id: string;
  pageId: string;
  draft: { title: string; content: AdminSectionContent; status: "draft" | "published" };
};
type VlogApiRecord = {
  id: string;
  draft: { title: string; slug: string; category: string; summary: string; body: string; status: "draft" | "published" };
};
type DragState = {
  list: OrderList;
  sourceId: string;
  targetId: string | null;
};

type AdminPageItem = {
  id: string;
  title: string;
  slug: string;
  type: string;
  status: Status;
  sections: AdminPageSection[];
  summary?: string;
  body?: string;
  visibility: VisibilityState;
};

type AdminPageSection = {
  id: string;
  title: string;
  visibility: VisibilityState;
  status?: "draft" | "published";
  content?: AdminSectionContent;
};

type AdminArticle = {
  id: string;
  title: string;
  slug: string;
  category: string;
  status: Status;
  summary: string;
  body: string;
  visibility: VisibilityState;
};

const PUBLIC_DEFAULT = { menuVisible: true, searchIndexable: true };
const DRAFT_VLOG_DEFAULT = { menuVisible: false, searchIndexable: false };

const INITIAL_PAGES: AdminPageItem[] = [
  { id: "home", title: "Home", slug: "/home", type: "홈페이지", status: "published", visibility: PUBLIC_DEFAULT, sections: [{ id: "home-section-01", title: "Section 01" }, { id: "home-section-02", title: "Section 02" }, { id: "home-section-03", title: "Section 03" }, { id: "home-section-04", title: "Section 04" }, { id: "home-section-05", title: "Section 05" }, { id: "home-section-06", title: "Section 06" }].map((section) => ({ ...section, visibility: PUBLIC_DEFAULT })) },
  { id: "contact", title: "Contact", slug: "/contact", type: "Contact", status: "published", visibility: PUBLIC_DEFAULT, sections: [{ id: "contact-intro", title: "Contact intro" }, { id: "contact-form", title: "Contact form" }].map((section) => ({ ...section, visibility: PUBLIC_DEFAULT })) },
  { id: "vlog", title: "Vlog", slug: "/vlog", type: "Vlog index", status: "published", visibility: PUBLIC_DEFAULT, sections: [{ id: "vlog-intro", title: "Vlog intro" }, { id: "vlog-article-list", title: "Article list" }].map((section) => ({ ...section, visibility: PUBLIC_DEFAULT })) },
];

const INITIAL_ARTICLES: AdminArticle[] = [
  { id: "brand-strategy", title: "좋은 브랜드는 무엇을 반복하는가", slug: "brand-strategy", category: "Brand Strategy", status: "draft", summary: "브랜드가 오래 기억되는 방식에 대한 기록입니다.", body: "", visibility: DRAFT_VLOG_DEFAULT },
  { id: "creative", title: "사람을 멈추게 하는 장면의 조건", slug: "creative", category: "Creative", status: "draft", summary: "관심을 행동으로 바꾸는 크리에이티브의 구조입니다.", body: "", visibility: DRAFT_VLOG_DEFAULT },
  { id: "culture", title: "문화에서 시작해 비즈니스로 이어지는 아이디어", slug: "culture", category: "Culture", status: "draft", summary: "문화적 긴장을 브랜드의 다음 장면으로 연결합니다.", body: "", visibility: DRAFT_VLOG_DEFAULT },
];

const NAV_ITEMS: Array<{ id: AdminSection; label: string; description: string }> = [
  { id: "dashboard", label: "대시보드", description: "콘텐츠 상태와 빠른 작업" },
  { id: "pages", label: "페이지", description: "페이지·섹션·메뉴 관리" },
  { id: "vlog", label: "Vlog", description: "게시글 작성과 Publish" },
  { id: "archive", label: "보관소", description: "숨긴 항목 복원" },
  { id: "trash", label: "삭제함", description: "30일 이내 복구" },
  { id: "history", label: "변경 이력", description: "최근 콘텐츠 수정 기록" },
  { id: "contact", label: "Contact", description: "페이지와 문의함" },
  { id: "assets", label: "이미지", description: "브라우저 이미지 변환" },
];

function reorderItemById<T extends { id: string }>(items: T[], sourceId: string, targetId: string) {
  const sourceIndex = items.findIndex((item) => item.id === sourceId);
  const targetIndex = items.findIndex((item) => item.id === targetId);
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return items;
  const next = [...items];
  const [movedItem] = next.splice(sourceIndex, 1);
  next.splice(targetIndex, 0, movedItem);
  return next;
}

function recordOrderChange(list: OrderList, sourceId: string, targetId: string, itemIds: string[]) {
  console.info("[admin-order]", {
    list,
    sourceId,
    targetId,
    result: itemIds,
  });
}
function targetKey(target: DeleteTarget) {
  return target.entityType + ":" + target.entityId;
}

function parseTargetKey(key: string): DeleteTarget {
  const separator = key.indexOf(":");
  return { entityType: key.slice(0, separator) as DeleteTarget["entityType"], entityId: key.slice(separator + 1) };
}


export function AdminShell({ user }: { user: AdminUser }) {
  const [activeSection, setActiveSection] = useState<AdminSection>("dashboard");
  const [pages, setPages] = useState(INITIAL_PAGES);
  const [articles, setArticles] = useState(INITIAL_ARTICLES);
  const [selectedPageId, setSelectedPageId] = useState("home");
  const [selectedArticleId, setSelectedArticleId] = useState("brand-strategy");
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("변경 사항은 아직 임시저장되지 않았습니다.");
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [deletions, setDeletions] = useState<DeletionRecord[]>([]);
  const [selectedDeleteKeys, setSelectedDeleteKeys] = useState<Set<string>>(new Set());
  const [deleteDialogTargets, setDeleteDialogTargets] = useState<DeleteTarget[] | null>(null);
  const [undoState, setUndoState] = useState<UndoState | null>(null);
  const [createPageOpen, setCreatePageOpen] = useState(false);
  const [createVlogOpen, setCreateVlogOpen] = useState(false);
  const [createSectionPageId, setCreateSectionPageId] = useState<string | null>(null);
  const [publishPreview, setPublishPreview] = useState<PublishPreviewData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const pageSaveTimer = useRef<number | null>(null);
  const sectionSaveTimers = useRef(new Map<string, number>());
  const vlogSaveTimers = useRef(new Map<string, number>());
  const siteContent = useSiteContent();

  const draftDeletedKeys = useMemo(() => new Set(deletions.filter((record) => record.draftDeleted).map((record) => targetKey(record))), [deletions]);
  const filteredPages = useMemo(() => pages.filter((page) => page.visibility.menuVisible && page.status !== "deleted" && !draftDeletedKeys.has(targetKey({ entityType: "page", entityId: page.id })) && (page.title + " " + page.slug).toLowerCase().includes(query.toLowerCase())), [pages, query, draftDeletedKeys]);
  const filteredArticles = useMemo(() => articles.filter((article) => article.visibility.menuVisible && article.status !== "deleted" && !draftDeletedKeys.has(targetKey({ entityType: "vlog", entityId: article.id })) && (article.title + " " + article.slug + " " + article.category).toLowerCase().includes(query.toLowerCase())), [articles, query, draftDeletedKeys]);
  const selectedPage = filteredPages.find((page) => page.id === selectedPageId) ?? filteredPages[0] ?? pages[0];
  const selectedArticle = filteredArticles.find((article) => article.id === selectedArticleId) ?? filteredArticles[0] ?? articles[0];
  const selectedPageIndex = selectedPage ? filteredPages.findIndex((page) => page.id === selectedPage.id) : -1;
  const selectedArticleIndex = selectedArticle ? filteredArticles.findIndex((article) => article.id === selectedArticle.id) : -1;
  const dragDisabled = Boolean(query.trim());

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/admin/pages", { cache: "no-store" }).then(async (response) => {
        const data = await response.json() as { pages?: PageApiRecord[]; error?: string };
        if (!response.ok) throw new Error(data.error ?? "page-load-failed");
        return data.pages ?? [];
      }),
      fetch("/api/admin/visibility", { cache: "no-store" }).then(async (response) => {
        const data = await response.json() as { records?: Array<{ entityType: "page" | "section" | "vlog"; entityId: string; draft: VisibilityState }>; error?: string };
        if (!response.ok) throw new Error(data.error ?? "visibility-load-failed");
        return data.records ?? [];
      }),
      fetch("/api/admin/sections", { cache: "no-store" }).then(async (response) => {
        const data = await response.json() as { sections?: SectionApiRecord[]; error?: string };
        if (!response.ok) throw new Error(data.error ?? "section-load-failed");
        return data.sections ?? [];
      }),
    ]).then(([records, visibilityRecords, sectionRecords]) => {
      if (cancelled) return;
      const dynamicSections = (pageId: string): AdminPageSection[] => sectionRecords.filter((record) => record.pageId === pageId).map((record) => ({
        id: record.id,
        title: record.draft.title,
        content: record.draft.content,
        status: record.draft.status,
        visibility: visibilityRecords.find((item) => item.entityType === "section" && item.entityId === record.id)?.draft ?? PUBLIC_DEFAULT,
      }));
      const createdPages = records.map((record): AdminPageItem => ({
        id: record.id,
        title: record.draft.title,
        slug: record.draft.slug,
        type: record.draft.type,
        status: record.draft.status,
        sections: dynamicSections(record.id),
        summary: record.draft.summary,
        body: record.draft.body,
        visibility: visibilityRecords.find((item) => item.entityType === "page" && item.entityId === record.id)?.draft ?? PUBLIC_DEFAULT,
      }));
      setPages((current) => [
        ...current.filter((page) => !page.id.startsWith("page-")).map((page) => ({ ...page, sections: [...page.sections.filter((section) => !section.id.startsWith("section-")), ...dynamicSections(page.id)] })),
        ...createdPages,
      ]);
      console.info("[page:admin-hydrated]", { pageCount: createdPages.length, sectionCount: sectionRecords.length });
    }).catch((error) => {
      console.error("[page:admin-hydrate-failed]", { error });
      if (!cancelled) setNotice("생성한 페이지·섹션 목록을 불러오지 못했습니다. 새로고침 후 다시 확인하세요.");
    });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => () => {
    if (pageSaveTimer.current) window.clearTimeout(pageSaveTimer.current);
    for (const timer of sectionSaveTimers.current.values()) window.clearTimeout(timer);
    for (const timer of vlogSaveTimers.current.values()) window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/admin/vlogs", { cache: "no-store" }).then(async (response) => {
        const data = await response.json() as { vlogs?: VlogApiRecord[]; error?: string };
        if (!response.ok) throw new Error(data.error ?? "vlog-load-failed");
        return data.vlogs ?? [];
      }),
      fetch("/api/admin/visibility", { cache: "no-store" }).then(async (response) => {
        const data = await response.json() as { records?: Array<{ entityType: "page" | "section" | "vlog"; entityId: string; draft: VisibilityState }>; error?: string };
        if (!response.ok) throw new Error(data.error ?? "visibility-load-failed");
        return data.records ?? [];
      }),
    ]).then(([vlogRecords, visibilityRecords]) => {
      if (cancelled) return;
      const createdVlogs = vlogRecords.map((record): AdminArticle => ({
        id: record.id,
        title: record.draft.title,
        slug: record.draft.slug,
        category: record.draft.category,
        status: record.draft.status,
        summary: record.draft.summary,
        body: record.draft.body,
        visibility: visibilityRecords.find((item) => item.entityType === "vlog" && item.entityId === record.id)?.draft ?? PUBLIC_DEFAULT,
      }));
      setArticles((current) => [...current.filter((article) => !article.id.startsWith("vlog-")), ...createdVlogs]);
      console.info("[vlog:admin-hydrated]", { count: createdVlogs.length });
    }).catch((error) => {
      console.error("[vlog:admin-hydrate-failed]", { error });
      if (!cancelled) setNotice("생성한 Vlog 목록을 불러오지 못했습니다. 새로고침 후 다시 확인하세요.");
    });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/visibility", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json() as { records?: Array<{ entityType: "page" | "section" | "vlog"; entityId: string; draft: VisibilityState }>; error?: string };
        if (!response.ok) throw new Error(data.error ?? "visibility-load-failed");
        if (cancelled) return;
        const records = data.records ?? [];
        setPages((current) => current.map((page) => ({ ...page, visibility: records.find((record) => record.entityType === "page" && record.entityId === page.id)?.draft ?? page.visibility, sections: page.sections.map((section) => ({ ...section, visibility: records.find((record) => record.entityType === "section" && record.entityId === section.id)?.draft ?? section.visibility })) })));
        setArticles((current) => current.map((article) => ({ ...article, visibility: records.find((record) => record.entityType === "vlog" && record.entityId === article.id)?.draft ?? article.visibility })));
        console.info("[visibility:admin-hydrated]", { count: records.length });
      })
      .catch((error) => { console.error("[visibility:admin-hydrate-failed]", { error }); setNotice("가시성 설정을 불러오지 못했습니다. 새로고침 후 다시 확인하세요."); });
    return () => { cancelled = true; };
  }, []);

  async function loadDeletions() {
    const response = await fetch("/api/admin/deletions", { cache: "no-store" });
    const data = await response.json() as { records?: DeletionRecord[]; error?: string };
    if (!response.ok) throw new Error(data.error ?? "deletion-load-failed");
    setDeletions(data.records ?? []);
    console.info("[deletion:admin-hydrated]", { count: data.records?.length ?? 0 });
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/deletions", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json() as { records?: DeletionRecord[]; error?: string };
        if (!response.ok) throw new Error(data.error ?? "deletion-load-failed");
        if (!cancelled) setDeletions(data.records ?? []);
      })
      .catch((error) => {
        console.error("[deletion:admin-hydrate-failed]", { error });
        if (!cancelled) setNotice("삭제 상태를 불러오지 못했습니다. 새로고침 후 다시 확인하세요.");
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!undoState) return;
    const remaining = Math.max(0, undoState.expiresAt - Date.now());
    const timer = window.setTimeout(() => setUndoState(null), remaining);
    return () => window.clearTimeout(timer);
  }, [undoState]);

  async function saveVisibility(entityType: "page" | "section" | "vlog", entityId: string, visibility: VisibilityState) {
    console.info("[visibility:admin-save-request]", { entityType, entityId, ...visibility });
    const response = await fetch("/api/admin/visibility", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entityType, entityId, ...visibility }) });
    const data = await response.json() as { error?: string };
    if (!response.ok) throw new Error(data.error ?? "visibility-save-failed");
    setNotice("가시성 설정을 임시저장했습니다. Publish 전에는 공개 사이트에 반영되지 않습니다.");
  }

  function updatePageVisibility(next: VisibilityState) {
    const previous = selectedPage.visibility;
    setPages((current) => current.map((page) => page.id === selectedPage.id ? { ...page, visibility: next } : page));
    if (!next.menuVisible) { const replacement = pages.find((page) => page.id !== selectedPage.id && page.visibility.menuVisible && page.status !== "deleted"); if (replacement) setSelectedPageId(replacement.id); }
    void saveVisibility("page", selectedPage.id, next).catch((error) => { setPages((current) => current.map((page) => page.id === selectedPage.id ? { ...page, visibility: previous } : page)); console.error("[visibility:admin-save-reverted]", { entityType: "page", entityId: selectedPage.id, error }); setNotice("저장 실패로 이전 값으로 되돌렸습니다."); });
  }

  function updateSectionVisibility(sectionId: string, next: VisibilityState) {
    const previous = selectedPage.sections.find((section) => section.id === sectionId)?.visibility ?? PUBLIC_DEFAULT;
    setPages((current) => current.map((page) => page.id === selectedPage.id ? { ...page, sections: page.sections.map((section) => section.id === sectionId ? { ...section, visibility: next } : section) } : page));
    void saveVisibility("section", sectionId, next).catch((error) => { setPages((current) => current.map((page) => page.id === selectedPage.id ? { ...page, sections: page.sections.map((section) => section.id === sectionId ? { ...section, visibility: previous } : section) } : page)); console.error("[visibility:admin-save-reverted]", { entityType: "section", entityId: sectionId, error }); setNotice("저장 실패로 이전 값으로 되돌렸습니다."); });
  }

  function updateArticleVisibility(next: VisibilityState) {
    const previous = selectedArticle.visibility;
    setArticles((current) => current.map((article) => article.id === selectedArticle.id ? { ...article, visibility: next } : article));
    if (!next.menuVisible) { const replacement = articles.find((article) => article.id !== selectedArticle.id && article.visibility.menuVisible && article.status !== "deleted"); if (replacement) setSelectedArticleId(replacement.id); }
    void saveVisibility("vlog", selectedArticle.id, next).catch((error) => { setArticles((current) => current.map((article) => article.id === selectedArticle.id ? { ...article, visibility: previous } : article)); console.error("[visibility:admin-save-reverted]", { entityType: "vlog", entityId: selectedArticle.id, error }); setNotice("저장 실패로 이전 값으로 되돌렸습니다."); });
  }

  function restoreArchiveItem(entityType: "page" | "section" | "vlog", entityId: string) {
    const previous = entityType === "page"
      ? pages.find((page) => page.id === entityId)?.visibility
      : entityType === "section"
        ? pages.flatMap((page) => page.sections).find((section) => section.id === entityId)?.visibility
        : articles.find((article) => article.id === entityId)?.visibility;
    if (!previous) return;
    const next = { ...previous, menuVisible: true };

    function applyVisibility(visibility: VisibilityState) {
      if (entityType === "page") {
        setPages((current) => current.map((page) => page.id === entityId ? { ...page, visibility } : page));
      } else if (entityType === "section") {
        setPages((current) => current.map((page) => ({ ...page, sections: page.sections.map((section) => section.id === entityId ? { ...section, visibility } : section) })));
      } else {
        setArticles((current) => current.map((article) => article.id === entityId ? { ...article, visibility } : article));
      }
    }

    applyVisibility(next);
    void saveVisibility(entityType, entityId, next).then(() => {
      console.info("[archive:restore-complete]", { entityType, entityId });
      setNotice("항목을 원래 목록으로 복원했습니다. Publish 전에는 공개 사이트에 반영되지 않습니다.");
    }).catch((error) => {
      applyVisibility(previous);
      console.error("[archive:restore-failed]", { entityType, entityId, error });
      setNotice("복원하지 못해 보관소 상태로 되돌렸습니다.");
    });
    console.info("[archive:restore-request]", { entityType, entityId });
  }
  function movePage(pageId: string, direction: -1 | 1) {
    setPages((current) => {
      const visible = current.filter((item) => item.visibility.menuVisible && item.status !== "deleted");
      const currentIndex = visible.findIndex((item) => item.id === pageId);
      const targetId = visible[currentIndex + direction]?.id;
      const next = targetId ? reorderItemById(current, pageId, targetId) : current;
      if (next !== current && targetId) recordOrderChange("pages", pageId, targetId, next.map((item) => item.id));
      return next;
    });
    setNotice("페이지 순서를 변경했습니다. Publish 전까지 공개 사이트에는 반영되지 않습니다.");
  }

  function moveArticle(articleId: string, direction: -1 | 1) {
    setArticles((current) => {
      const visible = current.filter((item) => item.visibility.menuVisible && item.status !== "deleted");
      const currentIndex = visible.findIndex((item) => item.id === articleId);
      const targetId = visible[currentIndex + direction]?.id;
      const next = targetId ? reorderItemById(current, articleId, targetId) : current;
      if (next !== current && targetId) recordOrderChange("vlog", articleId, targetId, next.map((item) => item.id));
      return next;
    });
    setNotice("Vlog 순서를 변경했습니다. Publish 전까지 공개 사이트에는 반영되지 않습니다.");
  }

  function beginDrag(list: OrderList, sourceId: string, event: DragEvent<HTMLButtonElement>) {
    if (dragDisabled) {
      event.preventDefault();
      setNotice("검색어를 지우면 목록 순서를 변경할 수 있습니다.");
      return;
    }
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", `${list}:${sourceId}`);
    setDragState({ list, sourceId, targetId: null });
  }

  function dragOverItem(list: OrderList, targetId: string, event: DragEvent<HTMLButtonElement>) {
    if (!dragState || dragState.list !== list || dragState.sourceId === targetId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragState((current) => current && current.targetId !== targetId ? { ...current, targetId } : current);
  }

  function dropItem(list: OrderList, targetId: string, event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    if (!dragState || dragState.list !== list || dragState.sourceId === targetId) {
      setDragState(null);
      return;
    }

    const sourceId = dragState.sourceId;
    if (list === "pages") {
      setPages((current) => {
        const next = reorderItemById(current, sourceId, targetId);
        if (next !== current) recordOrderChange(list, sourceId, targetId, next.map((item) => item.id));
        return next;
      });
      setNotice("페이지 순서를 드래그로 변경했습니다. Publish 전까지 공개 사이트에는 반영되지 않습니다.");
    } else {
      setArticles((current) => {
        const next = reorderItemById(current, sourceId, targetId);
        if (next !== current) recordOrderChange(list, sourceId, targetId, next.map((item) => item.id));
        return next;
      });
      setNotice("Vlog 순서를 드래그로 변경했습니다. Publish 전까지 공개 사이트에는 반영되지 않습니다.");
    }
    setDragState(null);
  }

  function copyPage(page: AdminPageItem) {
    const copy = { ...page, id: `${page.id}-copy`, title: `${page.title} 복사본`, slug: `${page.slug}-copy`, status: "draft" as const };
    setPages((current) => [...current, copy]);
    setSelectedPageId(copy.id);
    setNotice("페이지 복사본을 만들었습니다.");
  }

  function toggleDeleteTarget(target: DeleteTarget, checked: boolean) {
    setSelectedDeleteKeys((current) => {
      const next = new Set(current);
      if (checked) next.add(targetKey(target)); else next.delete(targetKey(target));
      return next;
    });
  }

  function selectedTargetsFor(type: DeleteTarget["entityType"]) {
    return [...selectedDeleteKeys].filter((key) => key.startsWith(type + ":")).map(parseTargetKey);
  }

  async function confirmDelete(password: string) {
    const targets = deleteDialogTargets ?? [];
    console.info("[deletion:admin-authorize-request]", { targets });
    const authorizationResponse = await fetch("/api/admin/deletions/authorize", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, targets }),
    });
    const authorization = await authorizationResponse.json() as { token?: string; error?: string };
    if (!authorizationResponse.ok || !authorization.token) throw new Error(authorization.error ?? "삭제 권한을 발급하지 못했습니다.");
    const deleteResponse = await fetch("/api/admin/deletions", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: authorization.token, targets }),
    });
    const result = await deleteResponse.json() as { operationId?: string; error?: string };
    if (!deleteResponse.ok || !result.operationId) throw new Error(result.error ?? "삭제 대기 상태를 저장하지 못했습니다.");
    setDeleteDialogTargets(null);
    setSelectedDeleteKeys(new Set());
    setUndoState({ operationId: result.operationId, count: targets.length, expiresAt: Date.now() + 10_000 });
    await loadDeletions();
    setNotice(targets.length + "개 항목을 삭제 대기로 옮겼습니다. Publish 전까지 공개 사이트는 바뀌지 않습니다.");
    console.info("[deletion:admin-draft-complete]", { operationId: result.operationId, targets });
  }

  async function undoDeletion() {
    if (!undoState) return;
    const response = await fetch("/api/admin/deletions/undo", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ operationId: undoState.operationId }),
    });
    const data = await response.json() as { restoredCount?: number; error?: string };
    if (!response.ok) throw new Error(data.error ?? "되돌리지 못했습니다.");
    setUndoState(null);
    await loadDeletions();
    setNotice((data.restoredCount ?? 0) + "개 항목의 삭제 대기를 되돌렸습니다.");
  }

  async function restoreTrashItem(target: DeleteTarget) {
    const response = await fetch("/api/admin/deletions/restore", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ target }),
    });
    const data = await response.json() as { error?: string };
    if (!response.ok) throw new Error(data.error ?? "복원하지 못했습니다.");
    await loadDeletions();
    setNotice("항목을 초안으로 복원했습니다. Publish해야 공개 사이트에 다시 반영됩니다.");
  }
  async function createPageDraft(input: { title: string; slug: string; pageType: "blocks" | "article" }) {
    console.info("[page:admin-create-request]", input);
    const response = await fetch("/api/admin/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: input.title, slug: input.slug, type: input.pageType === "article" ? "Article page" : "Block page", summary: "", body: "" }),
    });
    const data = await response.json() as { page?: PageApiRecord; error?: string };
    if (!response.ok || !data.page) throw new Error(data.error === "page-slug-already-exists" ? "이미 사용 중인 공개 경로입니다." : "페이지를 만들지 못했습니다.");
    const page: AdminPageItem = { id: data.page.id, title: data.page.draft.title, slug: data.page.draft.slug, type: data.page.draft.type, status: data.page.draft.status, sections: [], summary: data.page.draft.summary, body: data.page.draft.body, visibility: PUBLIC_DEFAULT };
    setPages((current) => [...current, page]);
    setSelectedPageId(page.id);
    setCreatePageOpen(false);
    setNotice("새 페이지를 초안으로 저장했습니다. Publish 전에는 공개되지 않습니다.");
    console.info("[page:admin-create-complete]", { pageId: page.id, slug: page.slug });
  }

  async function createVlogDraft(input: { title: string; slug: string; category: string }) {
    console.info("[vlog:admin-create-request]", input);
    const response = await fetch("/api/admin/vlogs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...input, summary: "", body: "" }),
    });
    const data = await response.json() as { vlog?: VlogApiRecord; error?: string };
    if (!response.ok || !data.vlog) throw new Error(data.error === "vlog-slug-already-exists" ? "이미 사용 중인 Vlog 경로입니다." : data.error === "invalid-vlog-slug" ? "경로는 영문 소문자, 숫자, 하이픈으로 입력하세요." : "Vlog를 만들지 못했습니다.");
    const visibilityResponse = await fetch("/api/admin/visibility", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entityType: "vlog", entityId: data.vlog.id, menuVisible: true, searchIndexable: true }),
    });
    const visibilityData = await visibilityResponse.json() as { error?: string };
    if (!visibilityResponse.ok) throw new Error(visibilityData.error ?? "Vlog 공개 설정을 저장하지 못했습니다.");
    const article: AdminArticle = { id: data.vlog.id, title: data.vlog.draft.title, slug: data.vlog.draft.slug, category: data.vlog.draft.category, status: data.vlog.draft.status, summary: data.vlog.draft.summary, body: data.vlog.draft.body, visibility: PUBLIC_DEFAULT };
    setArticles((current) => [...current, article]);
    setSelectedArticleId(article.id);
    setCreateVlogOpen(false);
    setNotice("새 Vlog를 초안으로 저장했습니다. Publish 전에는 공개되지 않습니다.");
    console.info("[vlog:admin-create-complete]", { vlogId: article.id, slug: article.slug });
  }
  async function createSectionDraft(title: string) {
    if (!createSectionPageId) return;
    console.info("[section:admin-create-request]", { pageId: createSectionPageId, title });
    const response = await fetch("/api/admin/sections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageId: createSectionPageId, title }),
    });
    const data = await response.json() as { section?: SectionApiRecord; error?: string };
    if (!response.ok || !data.section) throw new Error("섹션을 만들지 못했습니다.");
    const section: AdminPageSection = { id: data.section.id, title: data.section.draft.title, content: data.section.draft.content, status: data.section.draft.status, visibility: PUBLIC_DEFAULT };
    setPages((current) => current.map((page) => page.id === data.section!.pageId ? { ...page, sections: [...page.sections, section] } : page));
    setCreateSectionPageId(null);
    setNotice("새 섹션을 초안으로 저장했습니다. Publish 전에는 공개되지 않습니다.");
    console.info("[section:admin-create-complete]", { pageId: data.section.pageId, sectionId: data.section.id });
  }

  function updateDynamicSection(sectionId: string, patch: Partial<AdminPageSection>) {
    const currentSection = selectedPage.sections.find((section) => section.id === sectionId);
    if (!currentSection?.content) return;
    const next = { ...currentSection, ...patch, status: "draft" as const };
    setPages((current) => current.map((page) => page.id === selectedPage.id ? { ...page, sections: page.sections.map((section) => section.id === sectionId ? next : section) } : page));
    const previousTimer = sectionSaveTimers.current.get(sectionId);
    if (previousTimer) window.clearTimeout(previousTimer);
    setNotice("섹션 변경 내용을 임시저장하고 있습니다…");
    const timer = window.setTimeout(() => {
      console.info("[section:admin-save-request]", { pageId: selectedPage.id, sectionId });
      void fetch("/api/admin/sections", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: sectionId, pageId: selectedPage.id, title: next.title, content: next.content }),
      }).then(async (response) => {
        const data = await response.json() as { error?: string };
        if (!response.ok) throw new Error(data.error ?? "section-save-failed");
        sectionSaveTimers.current.delete(sectionId);
        setNotice("섹션 변경 내용을 초안으로 저장했습니다.");
        console.info("[section:admin-save-complete]", { pageId: selectedPage.id, sectionId });
      }).catch((error) => {
        console.error("[section:admin-save-failed]", { pageId: selectedPage.id, sectionId, error });
        setNotice("섹션을 저장하지 못했습니다.");
      });
    }, 450);
    sectionSaveTimers.current.set(sectionId, timer);
  }
  function updateSelectedPage(patch: Partial<AdminPageItem>) {
    const next = { ...selectedPage, ...patch, status: "draft" as const };
    setPages((current) => current.map((page) => page.id === selectedPage.id ? next : page));
    if (!selectedPage.id.startsWith("page-")) {
      setNotice("변경 내용을 임시저장 대기 상태로 만들었습니다.");
      return;
    }
    if (pageSaveTimer.current) window.clearTimeout(pageSaveTimer.current);
    setNotice("페이지 변경 내용을 임시저장하고 있습니다…");
    pageSaveTimer.current = window.setTimeout(() => {
      console.info("[page:admin-save-request]", { pageId: next.id, slug: next.slug });
      void fetch("/api/admin/pages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: next.id, title: next.title, slug: next.slug, type: next.type, summary: next.summary ?? "", body: next.body ?? "" }),
      }).then(async (response) => {
        const data = await response.json() as { error?: string };
        if (!response.ok) throw new Error(data.error === "page-slug-already-exists" ? "이미 사용 중인 공개 경로입니다." : data.error ?? "page-save-failed");
        setNotice("페이지 변경 내용을 초안으로 저장했습니다.");
        console.info("[page:admin-save-complete]", { pageId: next.id, slug: next.slug });
      }).catch((error) => {
        console.error("[page:admin-save-failed]", { pageId: next.id, error });
        setNotice(error instanceof Error ? error.message : "페이지를 저장하지 못했습니다.");
      });
    }, 450);
  }

  function updateHomeContent(next: SiteContent, field: string) {
    saveSiteContent(next, `admin:${field}`);
    setNotice("홈페이지 문구가 저장되어 공개 홈페이지에 즉시 반영되었습니다.");
  }

  async function publishCurrentPage() {
    if (!selectedPage) throw new Error("공개할 페이지를 선택하세요.");
    const pageId = selectedPage.id;
    const dynamicSections = selectedPage.sections.filter((section) => section.id.startsWith("section-") && section.content);
    const sectionIds = selectedPage.sections.map((section) => section.id);
    const targets: DeleteTarget[] = [
      { entityType: "page", entityId: pageId },
      ...sectionIds.map((entityId): DeleteTarget => ({ entityType: "section", entityId })),
    ];
    console.info("[page:admin-scoped-publish-request]", { pageId, sectionIds, targetCount: targets.length });

    if (pageSaveTimer.current) {
      window.clearTimeout(pageSaveTimer.current);
      pageSaveTimer.current = null;
    }
    for (const section of dynamicSections) {
      const timer = sectionSaveTimers.current.get(section.id);
      if (timer) window.clearTimeout(timer);
      sectionSaveTimers.current.delete(section.id);
    }

    await Promise.all(dynamicSections.map(async (section) => {
      const response = await fetch("/api/admin/sections", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: section.id, pageId, title: section.title, content: section.content }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "section-save-before-publish-failed");
    }));

    let pageData: { publishedCount?: number; error?: string } = { publishedCount: 0 };
    if (pageId.startsWith("page-")) {
      const saveResponse = await fetch("/api/admin/pages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: pageId, title: selectedPage.title, slug: selectedPage.slug, type: selectedPage.type, summary: selectedPage.summary ?? "", body: selectedPage.body ?? "" }),
      });
      const saveData = await saveResponse.json() as { error?: string };
      if (!saveResponse.ok) throw new Error(saveData.error ?? "page-save-before-publish-failed");
      const pageResponse = await fetch("/api/admin/pages/publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pageId }) });
      pageData = await pageResponse.json() as { publishedCount?: number; error?: string };
      if (!pageResponse.ok) throw new Error(pageData.error ?? "page-publish-failed");
    }

    const sectionResponse = await fetch("/api/admin/sections/publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pageId }) });
    const sectionData = await sectionResponse.json() as { publishedCount?: number; error?: string };
    if (!sectionResponse.ok) throw new Error(sectionData.error ?? "section-publish-failed");

    const visibilityResponse = await fetch("/api/admin/visibility/publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targets }) });
    const visibilityData = await visibilityResponse.json() as { publishedCount?: number; error?: string };
    if (!visibilityResponse.ok) throw new Error(visibilityData.error ?? "visibility-publish-failed");

    const backgroundResponse = await fetch("/api/admin/section-backgrounds/publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sectionIds }) });
    const backgroundData = await backgroundResponse.json() as { publishedCount?: number; error?: string };
    if (!backgroundResponse.ok) throw new Error(backgroundData.error ?? "background-publish-failed");

    const deletionResponse = await fetch("/api/admin/deletions/publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targets }) });
    const deletionData = await deletionResponse.json() as { deletedCount?: number; restoredCount?: number; error?: string };
    if (!deletionResponse.ok) throw new Error(deletionData.error ?? "deletion-publish-failed");

    await loadDeletions();
    setPages((current) => current.map((page) => page.id === pageId ? {
      ...page,
      status: page.id.startsWith("page-") ? "published" : page.status,
      sections: page.sections.map((section) => section.id.startsWith("section-") ? { ...section, status: "published" } : section),
    } : page));
    const publishedCount = pageData.publishedCount ?? 0;
    const sectionCount = sectionData.publishedCount ?? 0;
    const visibilityCount = visibilityData.publishedCount ?? 0;
    const backgroundCount = backgroundData.publishedCount ?? 0;
    setNotice(`현재 페이지 “${selectedPage.title}”만 공개했습니다. 페이지 ${publishedCount}건, 섹션 ${sectionCount}건, 가시성 ${visibilityCount}건, 배경 이미지 ${backgroundCount}건.`);
    window.localStorage.setItem("section-background-published-at", String(Date.now()));
    window.dispatchEvent(new CustomEvent("section-background:published"));
    console.info("[page:admin-scoped-publish-complete]", { pageId, publishedCount, sectionCount, visibilityCount, backgroundCount, deletedCount: deletionData.deletedCount ?? 0, restoredCount: deletionData.restoredCount ?? 0 });
  }
  async function publishCurrentVlog() {
    if (!selectedArticle) throw new Error("공개할 Vlog를 선택하세요.");
    const vlogId = selectedArticle.id;
    const targets: DeleteTarget[] = [{ entityType: "vlog", entityId: vlogId }];
    console.info("[vlog:admin-scoped-publish-request]", { vlogId, slug: selectedArticle.slug });

    const timer = vlogSaveTimers.current.get(vlogId);
    if (timer) window.clearTimeout(timer);
    vlogSaveTimers.current.delete(vlogId);

    let vlogData: { publishedCount?: number; error?: string } = { publishedCount: 0 };
    if (vlogId.startsWith("vlog-")) {
      const saveResponse = await fetch("/api/admin/vlogs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: vlogId, title: selectedArticle.title, slug: selectedArticle.slug, category: selectedArticle.category, summary: selectedArticle.summary, body: selectedArticle.body }),
      });
      const saveData = await saveResponse.json() as { error?: string };
      if (!saveResponse.ok) throw new Error(saveData.error ?? "vlog-save-before-publish-failed");
      const vlogResponse = await fetch("/api/admin/vlogs/publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vlogId }) });
      vlogData = await vlogResponse.json() as { publishedCount?: number; error?: string };
      if (!vlogResponse.ok) throw new Error(vlogData.error ?? "vlog-publish-failed");
    }

    const visibilityResponse = await fetch("/api/admin/visibility/publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targets }) });
    const visibilityData = await visibilityResponse.json() as { publishedCount?: number; error?: string };
    if (!visibilityResponse.ok) throw new Error(visibilityData.error ?? "visibility-publish-failed");

    const deletionResponse = await fetch("/api/admin/deletions/publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targets }) });
    const deletionData = await deletionResponse.json() as { deletedCount?: number; restoredCount?: number; error?: string };
    if (!deletionResponse.ok) throw new Error(deletionData.error ?? "deletion-publish-failed");

    await loadDeletions();
    setArticles((current) => current.map((article) => article.id === vlogId && article.id.startsWith("vlog-") ? { ...article, status: "published" } : article));
    const publishedCount = vlogData.publishedCount ?? 0;
    const visibilityCount = visibilityData.publishedCount ?? 0;
    setNotice(`현재 Vlog “${selectedArticle.title}”만 공개했습니다. 글 ${publishedCount}건, 가시성 ${visibilityCount}건.`);
    console.info("[vlog:admin-scoped-publish-complete]", { vlogId, publishedCount, visibilityCount, deletedCount: deletionData.deletedCount ?? 0, restoredCount: deletionData.restoredCount ?? 0 });
  }

  async function openGlobalPublishPreview() {
    setPreviewLoading(true);
    setNotice("전체 Publish 대상을 확인하고 있습니다…");
    try {
      const response = await fetch("/api/admin/publish-preview", { cache: "no-store" });
      const data = await response.json() as PublishPreviewData & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "publish-preview-failed");
      setPublishPreview({ total: data.total ?? 0, groups: data.groups ?? [] });
      setNotice(`전체 Publish 대상 ${data.total ?? 0}건을 확인했습니다.`);
      console.info("[publish-preview:admin-complete]", { total: data.total ?? 0, groups: data.groups?.map((group) => ({ key: group.key, count: group.items.length })) ?? [] });
    } catch (error) {
      console.error("[publish-preview:admin-failed]", { error });
      setNotice(error instanceof Error ? error.message : "Publish 대상을 확인하지 못했습니다.");
    } finally {
      setPreviewLoading(false);
    }
  }
  async function publishBackgrounds() {
    setPublishing(true);
    setNotice("가시성과 배경 이미지 Publish를 진행하고 있습니다…");
    try {
      if (activeSection === "pages") {
        await publishCurrentPage();
        return;
      }
      if (activeSection === "vlog") {
        await publishCurrentVlog();
        return;
      }
      console.info("[section-background:admin-publish-request]");
      if (pageSaveTimer.current) {
        window.clearTimeout(pageSaveTimer.current);
        pageSaveTimer.current = null;
      }
      for (const timer of sectionSaveTimers.current.values()) window.clearTimeout(timer);
      sectionSaveTimers.current.clear();
      for (const timer of vlogSaveTimers.current.values()) window.clearTimeout(timer);
      vlogSaveTimers.current.clear();
      const draftVlogs = articles.filter((article) => article.id.startsWith("vlog-"));
      await Promise.all(draftVlogs.map(async (article) => {
        const saveResponse = await fetch("/api/admin/vlogs", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: article.id, title: article.title, slug: article.slug, category: article.category, summary: article.summary, body: article.body }),
        });
        const saveData = await saveResponse.json() as { error?: string };
        if (!saveResponse.ok) throw new Error(saveData.error ?? "vlog-save-before-publish-failed");
      }));
      const draftSections = pages.flatMap((page) => page.sections.filter((section) => section.id.startsWith("section-") && section.content).map((section) => ({ pageId: page.id, section })));
      await Promise.all(draftSections.map(async ({ pageId, section }) => {
        const saveResponse = await fetch("/api/admin/sections", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: section.id, pageId, title: section.title, content: section.content }),
        });
        const saveData = await saveResponse.json() as { error?: string };
        if (!saveResponse.ok) throw new Error(saveData.error ?? "section-save-before-publish-failed");
      }));
      if (selectedPage?.id.startsWith("page-")) {
        const pendingPageResponse = await fetch("/api/admin/pages", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: selectedPage.id, title: selectedPage.title, slug: selectedPage.slug, type: selectedPage.type, summary: selectedPage.summary ?? "", body: selectedPage.body ?? "" }),
        });
        const pendingPageData = await pendingPageResponse.json() as { error?: string };
        if (!pendingPageResponse.ok) throw new Error(pendingPageData.error ?? "page-save-before-publish-failed");
      }
      const pageResponse = await fetch("/api/admin/pages/publish", { method: "POST" });
      const pageData = await pageResponse.json() as { publishedCount?: number; error?: string };
      if (!pageResponse.ok) throw new Error(pageData.error ?? "page-publish-failed");
      const sectionResponse = await fetch("/api/admin/sections/publish", { method: "POST" });
      const sectionData = await sectionResponse.json() as { publishedCount?: number; error?: string };
      if (!sectionResponse.ok) throw new Error(sectionData.error ?? "section-publish-failed");
      const vlogResponse = await fetch("/api/admin/vlogs/publish", { method: "POST" });
      const vlogData = await vlogResponse.json() as { publishedCount?: number; error?: string };
      if (!vlogResponse.ok) throw new Error(vlogData.error ?? "vlog-publish-failed");
      const visibilityResponse = await fetch("/api/admin/visibility/publish", { method: "POST" });
      const visibilityData = await visibilityResponse.json() as { publishedCount?: number; error?: string };
      if (!visibilityResponse.ok) throw new Error(visibilityData.error ?? "visibility-publish-failed");
      const response = await fetch("/api/admin/section-backgrounds/publish", { method: "POST" });
      const data = await response.json() as { publishedCount?: number; error?: string };
      if (!response.ok) throw new Error(data.error ?? "publish-failed");
      const deletionResponse = await fetch("/api/admin/deletions/publish", { method: "POST" });
      const deletionData = await deletionResponse.json() as { deletedCount?: number; restoredCount?: number; error?: string };
      if (!deletionResponse.ok) throw new Error(deletionData.error ?? "deletion-publish-failed");
      const count = data.publishedCount ?? 0;
      const visibilityCount = visibilityData.publishedCount ?? 0;
      await loadDeletions();
      setPages((current) => current.map((page) => ({ ...page, status: page.id.startsWith("page-") ? "published" : page.status, sections: page.sections.map((section) => section.id.startsWith("section-") ? { ...section, status: "published" } : section) })));
      setArticles((current) => current.map((article) => article.id.startsWith("vlog-") ? { ...article, status: "published" } : article));
      setNotice("페이지 " + (pageData.publishedCount ?? 0) + "건, 섹션 " + (sectionData.publishedCount ?? 0) + "건, Vlog " + (vlogData.publishedCount ?? 0) + "건, 가시성 " + visibilityCount + "건, 배경 이미지 " + count + "건, 삭제 " + (deletionData.deletedCount ?? 0) + "건, 복원 " + (deletionData.restoredCount ?? 0) + "건을 공개했습니다.");
      window.localStorage.setItem("section-background-published-at", String(Date.now()));
      window.dispatchEvent(new CustomEvent("section-background:published"));
      console.info("[section-background:admin-publish-complete]", { count });
    } catch (error) {
      console.error("[section-background:admin-publish-failed]", { error });
      setNotice(error instanceof Error ? error.message : "Publish하지 못했습니다.");
    } finally {
      setPublishing(false);
    }
  }

  function updateSelectedArticle(patch: Partial<AdminArticle>) {
    const next = { ...selectedArticle, ...patch, status: "draft" as const };
    setArticles((current) => current.map((article) => article.id === selectedArticle.id ? next : article));
    if (!selectedArticle.id.startsWith("vlog-")) {
      setNotice("기본 Vlog 글 변경 내용을 임시저장 대기 상태로 만들었습니다.");
      return;
    }
    const previousTimer = vlogSaveTimers.current.get(selectedArticle.id);
    if (previousTimer) window.clearTimeout(previousTimer);
    setNotice("Vlog 변경 내용을 임시저장하고 있습니다…");
    const timer = window.setTimeout(() => {
      console.info("[vlog:admin-save-request]", { vlogId: next.id, slug: next.slug });
      void fetch("/api/admin/vlogs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: next.id, title: next.title, slug: next.slug, category: next.category, summary: next.summary, body: next.body }),
      }).then(async (response) => {
        const data = await response.json() as { error?: string };
        if (!response.ok) throw new Error(data.error === "vlog-slug-already-exists" ? "이미 사용 중인 Vlog 경로입니다." : data.error === "invalid-vlog-slug" ? "경로는 영문 소문자, 숫자, 하이픈으로 입력하세요." : data.error ?? "vlog-save-failed");
        vlogSaveTimers.current.delete(next.id);
        setNotice("Vlog 변경 내용을 초안으로 저장했습니다.");
        console.info("[vlog:admin-save-complete]", { vlogId: next.id, slug: next.slug });
      }).catch((error) => {
        console.error("[vlog:admin-save-failed]", { vlogId: next.id, error });
        setNotice(error instanceof Error ? error.message : "Vlog를 저장하지 못했습니다.");
      });
    }, 450);
    vlogSaveTimers.current.set(next.id, timer);
  }

  return (
    <main className="admin-app" data-page-id="admin">
      <aside className="admin-sidebar" aria-label="관리자 메뉴">
        <div className="admin-brand"><span>◐</span><strong>Aether CMS</strong><small>Private workspace</small></div>
        <nav className="admin-nav">
          {NAV_ITEMS.map((item) => <button key={item.id} className={activeSection === item.id ? "is-active" : ""} onClick={() => { setActiveSection(item.id); setQuery(""); }}><strong>{item.label}</strong><span>{item.description}</span></button>)}
        </nav>
        <div className="admin-user"><span>Signed in</span><strong>{user.displayName}</strong><small>{user.email}</small></div>
      </aside>

      <section className="admin-workspace">
        <header className="admin-topbar"><div><span className="admin-eyebrow">Content operations</span><h1>{NAV_ITEMS.find((item) => item.id === activeSection)?.label}</h1></div><div className="admin-top-actions"><span className="admin-save-status">{notice}</span>{activeSection !== "history" && activeSection !== "assets" && <button className="admin-button admin-button-primary" disabled={publishing || previewLoading} onClick={activeSection === "dashboard" ? openGlobalPublishPreview : publishBackgrounds}>{publishing ? "Publishing…" : previewLoading ? "확인 중…" : activeSection === "dashboard" ? "전체 Publish 미리보기" : activeSection === "pages" ? "현재 페이지 Publish" : activeSection === "vlog" ? "현재 Vlog Publish" : "Publish"}</button>}</div></header>

        {activeSection === "dashboard" && <Dashboard pages={pages} articles={articles} onNavigate={setActiveSection} />}
        {activeSection === "pages" && (
          <div className="admin-content-grid admin-content-grid-pages">
            <ListPanel title="페이지 목록" query={query} setQuery={setQuery} count={filteredPages.length} toolbar={<PageListToolbar deleteCount={selectedTargetsFor("page").length} onDelete={() => setDeleteDialogTargets(selectedTargetsFor("page"))} onCreate={() => setCreatePageOpen(true)} />}>
              {filteredPages.map((page) => <SortableListRow key={page.id} index={filteredPages.findIndex((item) => item.id === page.id)} title={page.title} meta={page.slug + " · " + page.type} status={page.status} selected={selectedPage.id === page.id} checked={selectedDeleteKeys.has(targetKey({ entityType: "page", entityId: page.id }))} onCheckedChange={(checked) => toggleDeleteTarget({ entityType: "page", entityId: page.id }, checked)} dragDisabled={dragDisabled} dragging={dragState?.list === "pages" && dragState.sourceId === page.id} dropTarget={dragState?.list === "pages" && dragState.targetId === page.id} onSelect={() => setSelectedPageId(page.id)} onDragStart={(event) => beginDrag("pages", page.id, event)} onDragOver={(event) => dragOverItem("pages", page.id, event)} onDrop={(event) => dropItem("pages", page.id, event)} onDragEnd={() => setDragState(null)} />)}
            </ListPanel>
            {filteredPages.length > 0 ? <PageEditor page={selectedPage} index={selectedPageIndex} total={filteredPages.length} siteContent={siteContent} onSiteContentChange={updateHomeContent} onChange={updateSelectedPage} onMove={movePage} onCopy={copyPage} onDelete={() => setDeleteDialogTargets([{ entityType: "page", entityId: selectedPage.id }])} visibility={selectedPage.visibility} onVisibilityChange={updatePageVisibility} onSectionVisibilityChange={updateSectionVisibility} selectedDeleteKeys={selectedDeleteKeys} draftDeletedKeys={draftDeletedKeys} onToggleDelete={toggleDeleteTarget} onDeleteSections={(targets) => setDeleteDialogTargets(targets)} onCreateSection={() => setCreateSectionPageId(selectedPage.id)} onDynamicSectionChange={updateDynamicSection} /> : <EmptyEditor />}
          </div>
        )}
        {activeSection === "vlog" && (
          <div className="admin-content-grid admin-content-grid-pages">
            <ListPanel title="Vlog 목록" query={query} setQuery={setQuery} count={filteredArticles.length} toolbar={<VlogListToolbar deleteCount={selectedTargetsFor("vlog").length} onDelete={() => setDeleteDialogTargets(selectedTargetsFor("vlog"))} onCreate={() => setCreateVlogOpen(true)} />}>
              {filteredArticles.map((article) => <SortableListRow key={article.id} index={filteredArticles.findIndex((item) => item.id === article.id)} title={article.title} meta={article.category + " · /vlog/" + article.slug} status={article.status} selected={selectedArticle.id === article.id} checked={selectedDeleteKeys.has(targetKey({ entityType: "vlog", entityId: article.id }))} onCheckedChange={(checked) => toggleDeleteTarget({ entityType: "vlog", entityId: article.id }, checked)} dragDisabled={dragDisabled} dragging={dragState?.list === "vlog" && dragState.sourceId === article.id} dropTarget={dragState?.list === "vlog" && dragState.targetId === article.id} onSelect={() => setSelectedArticleId(article.id)} onDragStart={(event) => beginDrag("vlog", article.id, event)} onDragOver={(event) => dragOverItem("vlog", article.id, event)} onDrop={(event) => dropItem("vlog", article.id, event)} onDragEnd={() => setDragState(null)} />)}
            </ListPanel>
            {filteredArticles.length > 0 ? <ArticleEditor article={selectedArticle} index={selectedArticleIndex} total={filteredArticles.length} onChange={updateSelectedArticle} onMove={moveArticle} visibility={selectedArticle.visibility} onVisibilityChange={updateArticleVisibility} onDelete={() => setDeleteDialogTargets([{ entityType: "vlog", entityId: selectedArticle.id }])} /> : <EmptyEditor />}
          </div>
        )}
        {activeSection === "archive" && <ArchivePanel pages={pages} articles={articles} draftDeletedKeys={draftDeletedKeys} onRestore={restoreArchiveItem} />}
        {activeSection === "trash" && <TrashPanel records={deletions} pages={pages} articles={articles} onRestore={(target) => void restoreTrashItem(target).catch((error) => setNotice(error instanceof Error ? error.message : "복원하지 못했습니다."))} />}
        {activeSection === "history" && <ChangeHistoryPanel />}
        {activeSection === "contact" && <ContactPanel />}
        {activeSection === "assets" && <div className="admin-assets-panel"><ImageProcessor authenticated={true} /><AssetUsagePanel /></div>}
      </section>
      {publishPreview && <PublishPreviewDialog preview={publishPreview} publishing={publishing} onCancel={() => setPublishPreview(null)} onConfirm={() => { setPublishPreview(null); void publishBackgrounds(); }} />}
      {deleteDialogTargets && <DeleteConfirmationDialog count={deleteDialogTargets.length} onCancel={() => setDeleteDialogTargets(null)} onConfirm={confirmDelete} />}
      {createPageOpen && <CreatePageDialog onCancel={() => setCreatePageOpen(false)} onConfirm={createPageDraft} />}
      {createVlogOpen && <CreateVlogDialog onCancel={() => setCreateVlogOpen(false)} onConfirm={createVlogDraft} />}
      {createSectionPageId && <CreateSectionDialog onCancel={() => setCreateSectionPageId(null)} onConfirm={createSectionDraft} />}
      {undoState && <UndoToast count={undoState.count} onUndo={() => void undoDeletion().catch((error) => setNotice(error instanceof Error ? error.message : "되돌리지 못했습니다."))} />}
    </main>
  );
}

function Dashboard({ pages, articles, onNavigate }: { pages: AdminPageItem[]; articles: AdminArticle[]; onNavigate: (section: AdminSection) => void }) {
  return <div className="admin-dashboard"><div className="admin-dashboard-intro"><span className="admin-eyebrow">Workspace overview</span><h2>오늘 편집할 콘텐츠를<br /><em>빠르게 찾으세요.</em></h2><p>임시저장과 Publish를 분리해 실수로 공개되는 일을 막습니다.</p></div><div className="admin-stat-grid"><button onClick={() => onNavigate("pages")}><strong>{pages.filter((page) => page.status !== "deleted").length}</strong><span>페이지</span></button><button onClick={() => onNavigate("vlog")}><strong>{articles.length}</strong><span>Vlog 초안</span></button><button onClick={() => onNavigate("contact")}><strong>0</strong><span>새 문의</span></button></div><div className="admin-quick-actions"><button onClick={() => onNavigate("pages")}>페이지 편집 시작 <span>→</span></button><button onClick={() => onNavigate("vlog")}>Vlog 글 작성 <span>→</span></button><button onClick={() => onNavigate("contact")}>문의함 확인 <span>→</span></button></div></div>;
}

function ListPanel({ title, query, setQuery, count, toolbar, children }: { title: string; query: string; setQuery: (value: string) => void; count: number; toolbar?: React.ReactNode; children: React.ReactNode }) {
  return <section className="admin-list-panel"><div className="admin-panel-heading"><div><span className="admin-eyebrow">Library</span><h2>{title}</h2></div><strong>{count}</strong></div><input className="admin-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="제목·slug·카테고리 검색" aria-label={title + " 검색"} /><p className="admin-list-hint">{query.trim() ? "검색 중에는 순서 변경이 잠시 비활성화됩니다." : "체크박스로 일괄 선택하거나 드래그로 순서를 바꿀 수 있습니다."}</p>{toolbar}<div className="admin-list">{children}</div></section>;
}

function SortableListRow({ index, title, meta, status, selected, checked, onCheckedChange, dragDisabled, dragging, dropTarget, onSelect, onDragStart, onDragOver, onDrop, onDragEnd }: { index: number; title: string; meta: string; status: Status; selected: boolean; checked: boolean; onCheckedChange: (checked: boolean) => void; dragDisabled: boolean; dragging: boolean; dropTarget: boolean; onSelect: () => void; onDragStart: (event: DragEvent<HTMLButtonElement>) => void; onDragOver: (event: DragEvent<HTMLButtonElement>) => void; onDrop: (event: DragEvent<HTMLButtonElement>) => void; onDragEnd: () => void }) {
  const className = ["admin-list-row-wrap", selected && "is-selected", dragging && "is-dragging", dropTarget && "is-drop-target"].filter(Boolean).join(" ");
  return <div className={className}><label className="admin-list-select"><input type="checkbox" checked={checked} onChange={(event) => onCheckedChange(event.target.checked)} aria-label={title + " 삭제 선택"} /></label><button type="button" className="admin-list-row" draggable={!dragDisabled} aria-label={(index + 1) + ". " + title + ". " + (dragDisabled ? "검색 중 순서 변경 비활성화" : "드래그하여 순서 변경 가능")} onClick={onSelect} onDragStart={onDragStart} onDragOver={onDragOver} onDrop={onDrop} onDragEnd={onDragEnd}><span className="admin-list-order"><span className="admin-drag-handle" aria-hidden="true">⠿</span><span className="admin-list-number">{String(index + 1).padStart(2, "0")}</span></span><span><strong>{title}</strong><small>{meta}</small></span><StatusBadge status={status} /></button></div>;
}
function PageEditor({ page, index, total, siteContent, onSiteContentChange, onChange, onMove, onCopy, onDelete, visibility, onVisibilityChange, onSectionVisibilityChange, selectedDeleteKeys, draftDeletedKeys, onToggleDelete, onDeleteSections, onCreateSection, onDynamicSectionChange }: { page: AdminPageItem; index: number; total: number; siteContent: SiteContent; onSiteContentChange: (content: SiteContent, field: string) => void; onChange: (patch: Partial<AdminPageItem>) => void; onMove: (id: string, direction: -1 | 1) => void; onCopy: (page: AdminPageItem) => void; onDelete: () => void; visibility: VisibilityState; onVisibilityChange: (next: VisibilityState) => void; onSectionVisibilityChange: (id: string, next: VisibilityState) => void; selectedDeleteKeys: Set<string>; draftDeletedKeys: Set<string>; onToggleDelete: (target: DeleteTarget, checked: boolean) => void; onDeleteSections: (targets: DeleteTarget[]) => void; onCreateSection: () => void; onDynamicSectionChange: (sectionId: string, patch: Partial<AdminPageSection>) => void }) {
  const [sectionDrag, setSectionDrag] = useState<{ sourceId: string; targetId: string | null } | null>(null);
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>("home-section-01");

  function moveSection(sectionId: string, direction: -1 | 1) {
    const visibleSections = page.sections.filter((section) => section.visibility.menuVisible && !draftDeletedKeys.has(targetKey({ entityType: "section", entityId: section.id })));
    const currentIndex = visibleSections.findIndex((section) => section.id === sectionId);
    const targetId = visibleSections[currentIndex + direction]?.id;
    const next = targetId ? reorderItemById(page.sections, sectionId, targetId) : page.sections;
    if (next === page.sections || !targetId) return;
    recordOrderChange("sections", sectionId, targetId, next.map((section) => section.id));
    onChange({ sections: next });
  }

  function updateSectionTitle(sectionId: string, title: string) {
    if (sectionId.startsWith("section-")) {
      onDynamicSectionChange(sectionId, { title });
      return;
    }
    onChange({ sections: page.sections.map((section) => section.id === sectionId ? { ...section, title } : section) });
  }

  function updateBrandName(brandName: string) {
    onSiteContentChange({ ...siteContent, brandName }, "brandName");
  }

  function updateSectionContent(sectionId: string, patch: Partial<HomeSectionContent>) {
    const dynamicSection = page.sections.find((section) => section.id === sectionId && section.content);
    if (dynamicSection?.content) {
      const { id: _ignored, ...contentPatch } = patch;
      void _ignored;
      onDynamicSectionChange(sectionId, { content: { ...dynamicSection.content, ...contentPatch } });
      return;
    }
    const nextSections = siteContent.homeSections.map((section) => section.id === sectionId ? { ...section, ...patch } : section);
    onSiteContentChange({ ...siteContent, homeSections: nextSections }, `${sectionId}:${Object.keys(patch)[0]}`);
  }

  function beginSectionDrag(sectionId: string, event: DragEvent<HTMLSpanElement>) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", `sections:${page.id}:${sectionId}`);
    setSectionDrag({ sourceId: sectionId, targetId: null });
  }

  function dragOverSection(targetId: string, event: DragEvent<HTMLDivElement>) {
    if (!sectionDrag || sectionDrag.sourceId === targetId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setSectionDrag((current) => current && current.targetId !== targetId ? { ...current, targetId } : current);
  }

  function dropSection(targetId: string, event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (!sectionDrag || sectionDrag.sourceId === targetId) {
      setSectionDrag(null);
      return;
    }
    const next = reorderItemById(page.sections, sectionDrag.sourceId, targetId);
    if (next !== page.sections) {
      recordOrderChange("sections", sectionDrag.sourceId, targetId, next.map((section) => section.id));
      onChange({ sections: next });
    }
    setSectionDrag(null);
  }

  return (
    <section className="admin-editor-panel">
      <EditorHeading eyebrow="Page editor" title={page.title} status={page.status} />
      <div className="admin-form">
        <p className="admin-editor-sync-note">
          변경 내용은 왼쪽 목록과 초안에 저장되며, Publish 후 공개 사이트에 반영됩니다.
        </p>
        <label>
          페이지 제목
          <input value={page.title} onChange={(event) => onChange({ title: event.target.value })} />
        </label>
        <label>
          공개 경로
          <input value={page.slug} onChange={(event) => onChange({ slug: event.target.value })} />
        </label>
        <label>
          페이지 유형
          <select value={page.type} disabled={page.id.startsWith("page-")} onChange={(event) => onChange({ type: event.target.value })}>
            <option value="홈페이지">홈페이지</option>
            <option value="Contact">Contact</option>
            <option value="Vlog index">Vlog index</option>
            <option value="Custom page">블록 조합형 (기존)</option>
            <option value="Block page">블록 조합형</option>
            <option value="Article page">게시글형</option>
          </select>
        </label>
        <VisibilityControls value={visibility} onChange={onVisibilityChange} />
        {page.id === "home" && (
          <label>
            사이트 브랜드명
            <input
              value={siteContent.brandName}
              data-content-field="brandName"
              onChange={(event) => updateBrandName(event.target.value)}
            />
          </label>
        )}
      </div>

      {page.type === "Article page" ? (
        <div className="admin-form admin-article-page-fields">
          <label>요약<textarea rows={5} value={page.summary ?? ""} maxLength={500} onChange={(event) => onChange({ summary: event.target.value })} /></label>
          <label>본문<textarea rows={14} value={page.body ?? ""} maxLength={20000} onChange={(event) => onChange({ body: event.target.value })} placeholder="자유롭게 본문을 작성하세요." /></label>
        </div>
      ) : (      <div className="admin-section-list">
        <div className="admin-subheading">
          <div><strong>섹션 구조와 문구</strong><small>섹션을 펼쳐 메인·서브 문구를 편집할 수 있습니다.</small></div>
          <button type="button" className="admin-button" onClick={onCreateSection}>+ 새 섹션</button>
        </div>
        <BulkDeleteBar count={page.sections.filter((section) => selectedDeleteKeys.has(targetKey({ entityType: "section", entityId: section.id }))).length} onDelete={() => onDeleteSections(page.sections.filter((section) => selectedDeleteKeys.has(targetKey({ entityType: "section", entityId: section.id }))).map((section) => ({ entityType: "section", entityId: section.id })))} />
        {page.sections.filter((section) => section.visibility.menuVisible && !draftDeletedKeys.has(targetKey({ entityType: "section", entityId: section.id }))).map((section, sectionIndex) => {
          const copy = section.content ? { id: section.id, ...section.content } : siteContent.homeSections.find((item) => item.id === section.id);
          const blocks = section.content?.blocks ?? [];
          const expanded = expandedSectionId === section.id;
          return (
            <div
              className={[
                "admin-section-card",
                sectionDrag?.sourceId === section.id && "is-dragging",
                sectionDrag?.targetId === section.id && "is-drop-target",
              ].filter(Boolean).join(" ")}
              key={section.id}
              data-section-editor-id={section.id}
              onDragOver={(event) => dragOverSection(section.id, event)}
              onDrop={(event) => dropSection(section.id, event)}
            >
              <div className="admin-section-row">
                <input className="admin-section-select" type="checkbox" checked={selectedDeleteKeys.has(targetKey({ entityType: "section", entityId: section.id }))} onChange={(event) => onToggleDelete({ entityType: "section", entityId: section.id }, event.target.checked)} aria-label={section.title + " 삭제 선택"} />
                <span className="admin-section-order">
                  <span
                    className="admin-section-drag-handle"
                    draggable
                    aria-label={`${section.title} 드래그하여 순서 변경`}
                    onDragStart={(event) => beginSectionDrag(section.id, event)}
                    onDragEnd={() => setSectionDrag(null)}
                  >
                    ⠿
                  </span>
                  <span>{String(sectionIndex + 1).padStart(2, "0")}</span>
                </span>
                <input
                  className="admin-section-title-input"
                  value={section.title}
                  aria-label={`${sectionIndex + 1}번 섹션 이름`}
                  onChange={(event) => updateSectionTitle(section.id, event.target.value)}
                />
                <span className="admin-section-actions">
                  {copy && (
                    <button
                      type="button"
                      className="admin-section-toggle"
                      aria-expanded={expanded}
                      aria-label={`${section.title} 문구 ${expanded ? "닫기" : "편집"}`}
                      onClick={() => setExpandedSectionId(expanded ? null : section.id)}
                    >
                      {expanded ? "−" : "편집"}
                    </button>
                  )}
                  <button type="button" onClick={() => onSectionVisibilityChange(section.id, { ...section.visibility, menuVisible: false })}>숨기기</button>
                  <button type="button" disabled={sectionIndex <= 0} aria-label={`${section.title} 위로 이동`} onClick={() => moveSection(section.id, -1)}>↑</button>
                  <button type="button" disabled={sectionIndex >= page.sections.filter((item) => item.visibility.menuVisible && !draftDeletedKeys.has(targetKey({ entityType: "section", entityId: item.id }))).length - 1} aria-label={`${section.title} 아래로 이동`} onClick={() => moveSection(section.id, 1)}>↓</button>
                </span>
              </div>
              <VisibilityControls value={section.visibility} onChange={(next) => onSectionVisibilityChange(section.id, next)} />
              {copy && expanded && (
                <div className="admin-section-copy-form">
                  <label>
                    영문 라벨
                    <input value={copy.eyebrow} data-content-field="eyebrow" onChange={(event) => updateSectionContent(copy.id, { eyebrow: event.target.value })} />
                  </label>
                  <div className="admin-section-copy-grid">
                    <label>
                      메인 문구 1행
                      <input value={copy.headlinePrimary} data-content-field="headlinePrimary" onChange={(event) => updateSectionContent(copy.id, { headlinePrimary: event.target.value })} />
                    </label>
                    <label>
                      메인 문구 2행
                      <input value={copy.headlineAccent} data-content-field="headlineAccent" onChange={(event) => updateSectionContent(copy.id, { headlineAccent: event.target.value })} />
                    </label>
                  </div>
                  <label>
                    서브 문구
                    <textarea rows={2} value={copy.subheadline} data-content-field="subheadline" onChange={(event) => updateSectionContent(copy.id, { subheadline: event.target.value })} />
                  </label>
                  <label>
                    설명
                    <textarea rows={2} value={copy.description} data-content-field="description" onChange={(event) => updateSectionContent(copy.id, { description: event.target.value })} />
                  </label>
                  {(copy.id === "home-section-01" || Boolean(section.content)) && (
                    <label>
                      버튼 문구
                      <input value={copy.ctaLabel} data-content-field="ctaLabel" onChange={(event) => updateSectionContent(copy.id, { ctaLabel: event.target.value })} />
                    </label>
                  )}
                  <SectionBackgroundUploader sectionId={copy.id} />
                  {section.content && <LimitedSectionBlocks blocks={blocks} onChange={(next) => onDynamicSectionChange(section.id, { content: { ...section.content!, blocks: next } })} />}
                </div>
              )}
            </div>
          );
        })}
      </div>
      )}
      <div className="admin-editor-actions">
        <button disabled={index <= 0} onClick={() => onMove(page.id, -1)}>페이지 위로</button>
        <button disabled={index >= total - 1} onClick={() => onMove(page.id, 1)}>페이지 아래로</button>
        <button onClick={() => onCopy(page)}>복사</button>
        <button onClick={() => onVisibilityChange({ ...visibility, menuVisible: false })}>보관소로 숨기기</button>
        <button className="is-danger" onClick={onDelete}>Soft Delete</button>
      </div>
    </section>
  );
}

function LimitedSectionBlocks({ blocks, onChange }: { blocks: SectionBlock[]; onChange: (blocks: SectionBlock[]) => void }) {
  const counts = {
    text: blocks.filter((block) => block.type === "text").length,
    button: blocks.filter((block) => block.type === "button").length,
    image: blocks.filter((block) => block.type === "image").length,
  };

  function addBlock(type: SectionBlock["type"]) {
    const id = `block-${crypto.randomUUID()}`;
    const block: SectionBlock = type === "text"
      ? { id, type, text: "" }
      : type === "button"
        ? { id, type, label: "", href: "/contact" }
        : { id, type, src: "", alt: "" };
    onChange([...blocks, block]);
  }

  function updateBlock(id: string, patch: Partial<SectionBlock>) {
    onChange(blocks.map((block) => block.id === id ? { ...block, ...patch } as SectionBlock : block));
  }

  function moveBlock(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <section className="admin-limited-blocks" aria-label="제한형 콘텐츠 블록">
      <div className="admin-limited-blocks-heading">
        <div><strong>콘텐츠 블록</strong><small>텍스트 3개 · 버튼 2개 · 이미지 1개까지 추가할 수 있습니다.</small></div>
        <span>{blocks.length}/6</span>
      </div>
      <div className="admin-limited-block-add">
        <button type="button" disabled={counts.text >= 3} onClick={() => addBlock("text")}>+ 텍스트</button>
        <button type="button" disabled={counts.button >= 2} onClick={() => addBlock("button")}>+ 버튼</button>
        <button type="button" disabled={counts.image >= 1} onClick={() => addBlock("image")}>+ 이미지</button>
      </div>
      {blocks.length === 0 ? <p className="admin-limited-block-empty">추가된 블록이 없습니다.</p> : (
        <div className="admin-limited-block-list">
          {blocks.map((block, index) => (
            <article key={block.id} className="admin-limited-block" data-section-block-id={block.id} data-section-block-type={block.type}>
              <header><strong>{block.type === "text" ? "텍스트" : block.type === "button" ? "버튼" : "이미지"} 블록</strong><span><button type="button" disabled={index === 0} aria-label={`${index + 1}번 블록 위로 이동`} onClick={() => moveBlock(index, -1)}>↑</button><button type="button" disabled={index === blocks.length - 1} aria-label={`${index + 1}번 블록 아래로 이동`} onClick={() => moveBlock(index, 1)}>↓</button><button type="button" className="is-danger" aria-label={`${index + 1}번 블록 삭제`} onClick={() => onChange(blocks.filter((item) => item.id !== block.id))}>삭제</button></span></header>
              {block.type === "text" && <label>텍스트<textarea rows={4} maxLength={1200} value={block.text} onChange={(event) => updateBlock(block.id, { text: event.target.value })} /></label>}
              {block.type === "button" && <div className="admin-section-copy-grid"><label>버튼 문구<input maxLength={80} value={block.label} onChange={(event) => updateBlock(block.id, { label: event.target.value })} /></label><label>연결 주소<input maxLength={2048} value={block.href} placeholder="/contact 또는 https://" onChange={(event) => updateBlock(block.id, { href: event.target.value })} /></label></div>}
              {block.type === "image" && <div className="admin-section-copy-grid"><label>이미지 주소<input maxLength={2048} value={block.src} placeholder="/images/example.jpg 또는 https://" onChange={(event) => updateBlock(block.id, { src: event.target.value })} /></label><label>대체 문구<input maxLength={200} value={block.alt} onChange={(event) => updateBlock(block.id, { alt: event.target.value })} /></label></div>}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
function ArticleEditor({ article, index, total, onChange, onMove, visibility, onVisibilityChange, onDelete }: { article: AdminArticle; index: number; total: number; onChange: (patch: Partial<AdminArticle>) => void; onMove: (id: string, direction: -1 | 1) => void; visibility: VisibilityState; onVisibilityChange: (next: VisibilityState) => void; onDelete: () => void }) {
  const dynamic = article.id.startsWith("vlog-");
  return <section className="admin-editor-panel"><EditorHeading eyebrow="Vlog editor" title={article.title} status={article.status} /><div className="admin-form"><VisibilityControls value={visibility} onChange={onVisibilityChange} /><label>제목<textarea rows={3} value={article.title} onChange={(event) => onChange({ title: event.target.value })} /></label><label>공개 경로<input value={article.slug} disabled={!dynamic} onChange={(event) => onChange({ slug: event.target.value })} /><small className="admin-field-note">공개 주소: /vlog/{article.slug}</small></label><label>카테고리<input value={article.category} onChange={(event) => onChange({ category: event.target.value })} /></label><label>요약<textarea rows={5} value={article.summary} onChange={(event) => onChange({ summary: event.target.value })} /></label><label>본문<textarea rows={12} value={article.body} onChange={(event) => onChange({ body: event.target.value })} placeholder="본문을 입력하세요." /></label></div><div className="admin-editor-actions"><button disabled={index <= 0} onClick={() => onMove(article.id, -1)}>Vlog 위로</button><button disabled={index >= total - 1} onClick={() => onMove(article.id, 1)}>Vlog 아래로</button><button onClick={() => onChange({ status: "draft" })}>임시저장</button><button onClick={() => onVisibilityChange({ ...visibility, menuVisible: false })}>보관소로 숨기기</button><button className="is-danger" onClick={onDelete}>Soft Delete</button></div></section>;
}
function PageListToolbar({ deleteCount, onDelete, onCreate }: { deleteCount: number; onDelete: () => void; onCreate: () => void }) {
  return <div className="admin-page-toolbar"><button type="button" className="admin-button admin-button-primary" onClick={onCreate}>+ 새 페이지</button><BulkDeleteBar count={deleteCount} onDelete={onDelete} /></div>;
}

function VlogListToolbar({ deleteCount, onDelete, onCreate }: { deleteCount: number; onDelete: () => void; onCreate: () => void }) {
  return <div className="admin-page-toolbar"><button type="button" className="admin-button admin-button-primary" onClick={onCreate}>+ 새 Vlog</button><BulkDeleteBar count={deleteCount} onDelete={onDelete} /></div>;
}

function CreateVlogDialog({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: (input: { title: string; slug: string; category: string }) => Promise<void> }) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState("General");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try { await onConfirm({ title, slug, category }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Vlog를 만들지 못했습니다."); }
    finally { setSubmitting(false); }
  }

  return <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target && !submitting) onCancel(); }}><form className="admin-delete-dialog admin-create-dialog" role="dialog" aria-modal="true" aria-labelledby="create-vlog-title" onSubmit={submit}><span className="admin-eyebrow">Create Vlog draft</span><h2 id="create-vlog-title">새 Vlog 만들기</h2><p>초안으로 저장되며 Publish를 누르기 전에는 공개되지 않습니다.</p><label>제목<input autoFocus value={title} maxLength={160} onChange={(event) => setTitle(event.target.value)} placeholder="예: 브랜드가 기억되는 순간" /></label><label>공개 경로<input value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="예: memorable-brand" /><small>영문 소문자, 숫자, 하이픈만 사용할 수 있습니다.</small></label><label>카테고리<input value={category} maxLength={80} onChange={(event) => setCategory(event.target.value)} placeholder="예: Brand Strategy" /></label>{error && <p className="admin-dialog-error" role="alert">{error}</p>}<div><button type="button" onClick={onCancel} disabled={submitting}>취소</button><button type="submit" className="admin-button-primary" disabled={submitting || !title.trim() || !slug.trim() || !category.trim()}>{submitting ? "저장 중…" : "초안 만들기"}</button></div></form></div>;
}
function CreatePageDialog({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: (input: { title: string; slug: string; pageType: "blocks" | "article" }) => Promise<void> }) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [pageType, setPageType] = useState<"blocks" | "article">("blocks");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try { await onConfirm({ title, slug, pageType }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "페이지를 만들지 못했습니다."); }
    finally { setSubmitting(false); }
  }

  return <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target && !submitting) onCancel(); }}><form className="admin-delete-dialog admin-create-dialog" role="dialog" aria-modal="true" aria-labelledby="create-page-title" onSubmit={submit}><span className="admin-eyebrow">Create draft</span><h2 id="create-page-title">새 페이지 만들기</h2><p>페이지 유형을 선택해 초안으로 만듭니다. Publish 전에는 공개되지 않습니다.</p><label>페이지 유형<select value={pageType} onChange={(event) => setPageType(event.target.value as "blocks" | "article")}><option value="blocks">블록 조합형</option><option value="article">게시글형</option></select><small>{pageType === "blocks" ? "여러 섹션을 조합하는 기존 페이지입니다." : "제목·요약·자유 본문으로 구성하는 페이지입니다."}</small></label><label>페이지 제목<input autoFocus value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} placeholder="예: 회사 소개" /></label><label>공개 경로<input value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="예: about-us" /><small>영문 소문자, 숫자, 하이픈만 사용할 수 있습니다.</small></label>{error && <p className="admin-dialog-error" role="alert">{error}</p>}<div><button type="button" onClick={onCancel} disabled={submitting}>취소</button><button type="submit" className="admin-button-primary" disabled={submitting || !title.trim() || !slug.trim()}>{submitting ? "저장 중…" : "초안 만들기"}</button></div></form></div>;
}
function CreateSectionDialog({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: (title: string) => Promise<void> }) {
  const [title, setTitle] = useState("새 섹션");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try { await onConfirm(title); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "섹션을 만들지 못했습니다."); }
    finally { setSubmitting(false); }
  }

  return <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target && !submitting) onCancel(); }}><form className="admin-delete-dialog admin-create-dialog" role="dialog" aria-modal="true" aria-labelledby="create-section-title" onSubmit={submit}><span className="admin-eyebrow">Create section draft</span><h2 id="create-section-title">새 섹션 만들기</h2><p>기본 문구 필드가 포함된 섹션을 초안으로 만듭니다. Publish 전에는 공개되지 않습니다.</p><label>관리용 섹션 이름<input autoFocus value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} /></label>{error && <p className="admin-dialog-error" role="alert">{error}</p>}<div><button type="button" onClick={onCancel} disabled={submitting}>취소</button><button type="submit" className="admin-button-primary" disabled={submitting || !title.trim()}>{submitting ? "저장 중…" : "초안 만들기"}</button></div></form></div>;
}
function BulkDeleteBar({ count, onDelete }: { count: number; onDelete: () => void }) {
  return <div className="admin-bulk-bar" aria-live="polite"><span>{count > 0 ? count + "개 선택됨" : "삭제할 항목을 선택하세요."}</span><button type="button" className="is-danger" disabled={count === 0} onClick={onDelete}>선택 항목 삭제</button></div>;
}

function EmptyEditor() {
  return <section className="admin-editor-panel"><div className="admin-empty-state"><span>○</span><strong>편집할 항목이 없습니다.</strong><p>삭제함에서 항목을 복원하거나 다른 목록을 선택하세요.</p></div></section>;
}

function PublishPreviewDialog({ preview, publishing, onCancel, onConfirm }: { preview: PublishPreviewData; publishing: boolean; onCancel: () => void; onConfirm: () => void }) {
  return <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target && !publishing) onCancel(); }}><section className="admin-delete-dialog admin-publish-preview" role="dialog" aria-modal="true" aria-labelledby="publish-preview-title"><span className="admin-eyebrow">Publish preview</span><h2 id="publish-preview-title">전체 Publish 대상 미리보기</h2><p>아래 {preview.total}건이 공개 사이트에 반영됩니다. 현재 페이지나 현재 Vlog만 공개하려면 각 편집 화면의 개별 Publish를 사용하세요.</p>{preview.groups.length === 0 ? <div className="admin-publish-preview-empty">공개할 변경 사항이 없습니다.</div> : <div className="admin-publish-preview-groups">{preview.groups.map((group) => <section key={group.key} className="admin-publish-preview-group" aria-label={group.label}><header><strong>{group.label}</strong><span>{group.items.length}건</span></header><ul>{group.items.map((item) => <li key={item.id} data-publish-target-id={item.id}><span>{item.title}</span><small>{item.detail}</small></li>)}</ul></section>)}</div>}<div><button type="button" onClick={onCancel} disabled={publishing}>취소</button><button type="button" className="admin-button-primary" onClick={onConfirm} disabled={publishing || preview.total === 0}>{publishing ? "Publishing…" : "전체 Publish 실행"}</button></div></section></div>;
}
function DeleteConfirmationDialog({ count, onCancel, onConfirm }: { count: number; onCancel: () => void; onConfirm: (password: string) => Promise<void> }) {
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try { await onConfirm(password); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "삭제를 진행하지 못했습니다."); }
    finally { setSubmitting(false); }
  }

  return <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target && !submitting) onCancel(); }}><form className="admin-delete-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title" onSubmit={submit}><span className="admin-eyebrow">Protected action</span><h2 id="delete-dialog-title">{count}개 항목을 삭제 대기로 옮길까요?</h2><p>관리자 작업 암호를 한 번 입력합니다. 공개 사이트는 Publish 전까지 바뀌지 않습니다.</p><label>관리자 작업 암호<input type="password" autoFocus autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>{error && <p className="admin-dialog-error" role="alert">{error}</p>}<div><button type="button" onClick={onCancel} disabled={submitting}>취소</button><button type="submit" className="is-danger" disabled={submitting || password.length === 0}>{submitting ? "확인 중…" : "삭제 대기로 이동"}</button></div></form></div>;
}

function UndoToast({ count, onUndo }: { count: number; onUndo: () => void }) {
  return <div className="admin-undo-toast" role="status"><span>{count}개 항목을 삭제 대기로 옮겼습니다.</span><button type="button" onClick={onUndo}>되돌리기</button><small>10초</small></div>;
}

function TrashPanel({ records, pages, articles, onRestore }: { records: DeletionRecord[]; pages: AdminPageItem[]; articles: AdminArticle[]; onRestore: (target: DeleteTarget) => void }) {
  const [renderedAt] = useState(() => Date.now());
  function details(record: DeletionRecord) {
    if (record.entityType === "page") {
      const page = pages.find((item) => item.id === record.entityId);
      return { title: page?.title ?? record.entityId, meta: page?.slug ?? "페이지" };
    }
    if (record.entityType === "section") {
      for (const page of pages) {
        const section = page.sections.find((item) => item.id === record.entityId);
        if (section) return { title: section.title, meta: page.title + "의 섹션" };
      }
      return { title: record.entityId, meta: "섹션" };
    }
    const article = articles.find((item) => item.id === record.entityId);
    return { title: article?.title ?? record.entityId, meta: article?.category ?? "Vlog" };
  }

  return <section className="admin-archive-panel"><div className="admin-panel-heading"><div><span className="admin-eyebrow">Recoverable content</span><h2>삭제함</h2></div><strong>{records.length}</strong></div><p className="admin-archive-note">삭제는 Publish 후 공개 사이트에 반영되며, 그때부터 30일 동안 복구할 수 있습니다.</p>{records.length === 0 ? <div className="admin-empty-state"><span>○</span><strong>삭제된 항목이 없습니다.</strong><p>일반 목록에서만 항목을 선택해 삭제할 수 있습니다.</p></div> : <div className="admin-archive-list">{records.map((record) => { const item = details(record); const restorePending = !record.draftDeleted && record.publishedDeleted; const expired = Boolean(record.deleteAfter && Date.parse(record.deleteAfter) <= renderedAt); const status = restorePending ? "복원 Publish 대기" : expired ? "복구 기간 만료" : record.publishedDeleted ? "30일 보관" : "삭제 Publish 대기"; const remaining = record.deleteAfter ? Math.max(0, Math.ceil((Date.parse(record.deleteAfter) - renderedAt) / 86_400_000)) : null; return <article key={targetKey(record)} className="admin-archive-row" data-deletion-entity-type={record.entityType} data-deletion-entity-id={record.entityId}><div><strong>{item.title}</strong><small>{item.meta}{remaining !== null ? " · " + remaining + "일 남음" : ""}</small></div><span className="admin-status admin-status-deleted">{status}</span>{restorePending ? <small>Publish 필요</small> : expired ? <small>복구 불가</small> : <button type="button" onClick={() => onRestore(record)}>복원</button>}</article>; })}</div>}</section>;
}
function ArchivePanel({ pages, articles, draftDeletedKeys, onRestore }: { pages: AdminPageItem[]; articles: AdminArticle[]; draftDeletedKeys: Set<string>; onRestore: (type: "page" | "section" | "vlog", id: string) => void }) {
  const hiddenPages = pages.filter((page) => !page.visibility.menuVisible && page.status !== "deleted" && !draftDeletedKeys.has(targetKey({ entityType: "page", entityId: page.id })));
  const hiddenSections = pages.filter((page) => page.status !== "deleted").flatMap((page) => page.sections.filter((section) => !section.visibility.menuVisible && !draftDeletedKeys.has(targetKey({ entityType: "section", entityId: section.id }))).map((section) => ({ ...section, parentTitle: page.title })));
  const hiddenArticles = articles.filter((article) => !article.visibility.menuVisible && article.status !== "deleted" && !draftDeletedKeys.has(targetKey({ entityType: "vlog", entityId: article.id })));
  const total = hiddenPages.length + hiddenSections.length + hiddenArticles.length;

  return <section className="admin-archive-panel"><div className="admin-panel-heading"><div><span className="admin-eyebrow">Hidden content</span><h2>보관소</h2></div><strong>{total}</strong></div><p className="admin-archive-note">숨긴 항목은 삭제되지 않으며, 복원 후에도 Publish해야 공개 사이트에 반영됩니다.</p>{total === 0 ? <div className="admin-empty-state"><span>○</span><strong>숨긴 항목이 없습니다.</strong><p>페이지·섹션·Vlog 편집기에서 “보관소로 숨기기”를 사용할 수 있습니다.</p></div> : <div className="admin-archive-groups"><ArchiveGroup title="페이지" items={hiddenPages.map((page) => ({ id: page.id, title: page.title, meta: `${page.slug} · ${page.visibility.searchIndexable ? "검색 허용" : "검색 제외"}` }))} onRestore={(id) => onRestore("page", id)} /><ArchiveGroup title="섹션" items={hiddenSections.map((section) => ({ id: section.id, title: section.title, meta: `${section.parentTitle} · ${section.visibility.searchIndexable ? "검색 허용" : "검색 제외"}` }))} onRestore={(id) => onRestore("section", id)} /><ArchiveGroup title="Vlog" items={hiddenArticles.map((article) => ({ id: article.id, title: article.title, meta: `${article.category} · ${article.visibility.searchIndexable ? "검색 허용" : "검색 제외"}` }))} onRestore={(id) => onRestore("vlog", id)} /></div>}</section>;
}

function ArchiveGroup({ title, items, onRestore }: { title: string; items: Array<{ id: string; title: string; meta: string }>; onRestore: (id: string) => void }) {
  if (items.length === 0) return null;
  return <section className="admin-archive-group"><div className="admin-subheading"><strong>{title}</strong><small>{items.length}개 숨김</small></div><div className="admin-archive-list">{items.map((item) => <article key={item.id} className="admin-archive-row" data-archive-id={item.id}><div><strong>{item.title}</strong><small>{item.meta}</small></div><span className="admin-status admin-status-hidden">숨김</span><button type="button" onClick={() => onRestore(item.id)}>복원</button></article>)}</div></section>;
}
function VisibilityControls({ value, onChange }: { value: VisibilityState; onChange: (next: VisibilityState) => void }) {
  return <fieldset className="admin-visibility-controls"><legend>공개 가시성</legend><label><input type="checkbox" checked={value.menuVisible} onChange={(event) => onChange({ ...value, menuVisible: event.target.checked })} /> 메뉴·목록에 표시</label><label><input type="checkbox" checked={value.searchIndexable} onChange={(event) => onChange({ ...value, searchIndexable: event.target.checked })} /> 검색엔진 색인 허용</label><small>두 설정은 서로 독립적이며 Publish 후 공개 반영됩니다.</small></fieldset>;
}
function ContactPanel() {
  return <div className="admin-contact-layout"><section className="admin-inbox"><div className="admin-panel-heading"><div><span className="admin-eyebrow">Inbox</span><h2>문의함</h2></div><strong>0</strong></div><div className="admin-empty-state"><span>○</span><strong>새 문의가 없습니다.</strong><p>Contact 폼으로 접수된 문의가 이곳에 표시됩니다.</p></div></section><section className="admin-editor-panel"><EditorHeading eyebrow="Contact page" title="Contact content" status="published" /><div className="admin-form"><label>페이지 제목<input defaultValue="Contact" /></label><label>소개 문구<textarea rows={5} defaultValue="새로운 프로젝트와 다음 성장의 순간을 이야기합니다." /></label><label>문의 폼 안내<textarea rows={5} defaultValue="필요한 내용을 남겨주시면 확인 후 연락드리겠습니다." /></label></div><button className="admin-button admin-button-primary">임시저장</button></section></div>;
}

function EditorHeading({ eyebrow, title, status }: { eyebrow: string; title: string; status: Status }) {
  return <div className="admin-editor-heading"><div><span className="admin-eyebrow">{eyebrow}</span><h2>{title}</h2></div><StatusBadge status={status} /></div>;
}

function StatusBadge({ status }: { status: Status }) {
  const labels: Record<Status, string> = { draft: "초안", published: "게시됨", deleted: "삭제 대기" };
  return <span className={`admin-status admin-status-${status}`}>{labels[status]}</span>;
}
