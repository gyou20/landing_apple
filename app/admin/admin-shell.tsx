"use client";

import { useMemo, useState, type DragEvent } from "react";
import type { AdminUser } from "../chatgpt-auth";
import { ImageProcessor } from "./image-processor";

type AdminSection = "dashboard" | "pages" | "vlog" | "contact" | "assets";
type Status = "draft" | "published" | "deleted";
type OrderList = "pages" | "vlog";
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
  sections: string[];
};

type AdminArticle = {
  id: string;
  title: string;
  category: string;
  status: Status;
  summary: string;
};

const INITIAL_PAGES: AdminPageItem[] = [
  { id: "home", title: "Home", slug: "/home", type: "홈페이지", status: "published", sections: ["Section 01", "Section 02", "Section 03", "Section 04", "Section 05", "Section 06"] },
  { id: "contact", title: "Contact", slug: "/contact", type: "Contact", status: "published", sections: ["Contact intro", "Contact form"] },
  { id: "vlog", title: "Vlog", slug: "/vlog", type: "Vlog index", status: "published", sections: ["Vlog intro", "Article list"] },
];

const INITIAL_ARTICLES: AdminArticle[] = [
  { id: "brand-strategy", title: "좋은 브랜드는 무엇을 반복하는가", category: "Brand Strategy", status: "draft", summary: "브랜드가 오래 기억되는 방식에 대한 기록입니다." },
  { id: "creative", title: "사람을 멈추게 하는 장면의 조건", category: "Creative", status: "draft", summary: "관심을 행동으로 바꾸는 크리에이티브의 구조입니다." },
  { id: "culture", title: "문화에서 시작해 비즈니스로 이어지는 아이디어", category: "Culture", status: "draft", summary: "문화적 긴장을 브랜드의 다음 장면으로 연결합니다." },
];

const NAV_ITEMS: Array<{ id: AdminSection; label: string; description: string }> = [
  { id: "dashboard", label: "대시보드", description: "콘텐츠 상태와 빠른 작업" },
  { id: "pages", label: "페이지", description: "페이지·섹션·메뉴 관리" },
  { id: "vlog", label: "Vlog", description: "게시글 작성과 Publish" },
  { id: "contact", label: "Contact", description: "페이지와 문의함" },
  { id: "assets", label: "이미지", description: "브라우저 이미지 변환" },
];

function moveItemById<T extends { id: string }>(items: T[], itemId: string, direction: -1 | 1) {
  const currentIndex = items.findIndex((item) => item.id === itemId);
  const nextIndex = currentIndex + direction;
  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= items.length) return items;
  const next = [...items];
  [next[currentIndex], next[nextIndex]] = [next[nextIndex], next[currentIndex]];
  return next;
}

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

export function AdminShell({ user }: { user: AdminUser }) {
  const [activeSection, setActiveSection] = useState<AdminSection>("dashboard");
  const [pages, setPages] = useState(INITIAL_PAGES);
  const [articles, setArticles] = useState(INITIAL_ARTICLES);
  const [selectedPageId, setSelectedPageId] = useState("home");
  const [selectedArticleId, setSelectedArticleId] = useState("brand-strategy");
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("변경 사항은 아직 임시저장되지 않았습니다.");
  const [dragState, setDragState] = useState<DragState | null>(null);

  const selectedPage = pages.find((page) => page.id === selectedPageId) ?? pages[0];
  const selectedArticle = articles.find((article) => article.id === selectedArticleId) ?? articles[0];
  const filteredPages = useMemo(() => pages.filter((page) => `${page.title} ${page.slug}`.toLowerCase().includes(query.toLowerCase())), [pages, query]);
  const filteredArticles = useMemo(() => articles.filter((article) => `${article.title} ${article.category}`.toLowerCase().includes(query.toLowerCase())), [articles, query]);
  const selectedPageIndex = pages.findIndex((page) => page.id === selectedPage.id);
  const selectedArticleIndex = articles.findIndex((article) => article.id === selectedArticle.id);
  const dragDisabled = Boolean(query.trim());

  function movePage(pageId: string, direction: -1 | 1) {
    setPages((current) => {
      const currentIndex = current.findIndex((item) => item.id === pageId);
      const targetId = current[currentIndex + direction]?.id;
      const next = moveItemById(current, pageId, direction);
      if (next !== current && targetId) recordOrderChange("pages", pageId, targetId, next.map((item) => item.id));
      return next;
    });
    setNotice("페이지 순서를 변경했습니다. Publish 전까지 공개 사이트에는 반영되지 않습니다.");
  }

  function moveArticle(articleId: string, direction: -1 | 1) {
    setArticles((current) => {
      const currentIndex = current.findIndex((item) => item.id === articleId);
      const targetId = current[currentIndex + direction]?.id;
      const next = moveItemById(current, articleId, direction);
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

  function deletePage(pageId: string) {
    setPages((current) => current.map((page) => page.id === pageId ? { ...page, status: "deleted" } : page));
    setNotice("페이지를 Soft Delete 상태로 바꿨습니다. 실제 삭제는 Publish 이후에도 즉시 실행되지 않습니다.");
  }

  function updateSelectedPage(patch: Partial<AdminPageItem>) {
    setPages((current) => current.map((page) => page.id === selectedPage.id ? { ...page, ...patch, status: "draft" } : page));
    setNotice("변경 내용을 임시저장 대기 상태로 만들었습니다.");
  }

  function updateSelectedArticle(patch: Partial<AdminArticle>) {
    setArticles((current) => current.map((article) => article.id === selectedArticle.id ? { ...article, ...patch, status: "draft" } : article));
    setNotice("Vlog 글 변경 내용을 임시저장 대기 상태로 만들었습니다.");
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
        <header className="admin-topbar"><div><span className="admin-eyebrow">Content operations</span><h1>{NAV_ITEMS.find((item) => item.id === activeSection)?.label}</h1></div><div className="admin-top-actions"><span className="admin-save-status">{notice}</span><button className="admin-button admin-button-primary" onClick={() => setNotice("Publish 검증을 시작할 준비가 되었습니다. API 연결 후 실제 공개됩니다.")}>Publish</button></div></header>

        {activeSection === "dashboard" && <Dashboard pages={pages} articles={articles} onNavigate={setActiveSection} />}
        {activeSection === "pages" && <div className="admin-content-grid"><ListPanel title="페이지 목록" query={query} setQuery={setQuery} count={filteredPages.length}>{filteredPages.map((page) => <SortableListRow key={page.id} index={pages.findIndex((item) => item.id === page.id)} title={page.title} meta={`${page.slug} · ${page.type}`} status={page.status} selected={selectedPage.id === page.id} dragDisabled={dragDisabled} dragging={dragState?.list === "pages" && dragState.sourceId === page.id} dropTarget={dragState?.list === "pages" && dragState.targetId === page.id} onSelect={() => setSelectedPageId(page.id)} onDragStart={(event) => beginDrag("pages", page.id, event)} onDragOver={(event) => dragOverItem("pages", page.id, event)} onDrop={(event) => dropItem("pages", page.id, event)} onDragEnd={() => setDragState(null)} />)}</ListPanel><PageEditor page={selectedPage} index={selectedPageIndex} total={pages.length} onChange={updateSelectedPage} onMove={movePage} onCopy={copyPage} onDelete={deletePage} /></div>}
        {activeSection === "vlog" && <div className="admin-content-grid"><ListPanel title="Vlog 목록" query={query} setQuery={setQuery} count={filteredArticles.length}>{filteredArticles.map((article) => <SortableListRow key={article.id} index={articles.findIndex((item) => item.id === article.id)} title={article.title} meta={article.category} status={article.status} selected={selectedArticle.id === article.id} dragDisabled={dragDisabled} dragging={dragState?.list === "vlog" && dragState.sourceId === article.id} dropTarget={dragState?.list === "vlog" && dragState.targetId === article.id} onSelect={() => setSelectedArticleId(article.id)} onDragStart={(event) => beginDrag("vlog", article.id, event)} onDragOver={(event) => dragOverItem("vlog", article.id, event)} onDrop={(event) => dropItem("vlog", article.id, event)} onDragEnd={() => setDragState(null)} />)}</ListPanel><ArticleEditor article={selectedArticle} index={selectedArticleIndex} total={articles.length} onChange={updateSelectedArticle} onMove={moveArticle} /></div>}
        {activeSection === "contact" && <ContactPanel />}
        {activeSection === "assets" && <div className="admin-assets-panel"><ImageProcessor authenticated={true} /></div>}
      </section>
    </main>
  );
}

function Dashboard({ pages, articles, onNavigate }: { pages: AdminPageItem[]; articles: AdminArticle[]; onNavigate: (section: AdminSection) => void }) {
  return <div className="admin-dashboard"><div className="admin-dashboard-intro"><span className="admin-eyebrow">Workspace overview</span><h2>오늘 편집할 콘텐츠를<br /><em>빠르게 찾으세요.</em></h2><p>임시저장과 Publish를 분리해 실수로 공개되는 일을 막습니다.</p></div><div className="admin-stat-grid"><button onClick={() => onNavigate("pages")}><strong>{pages.filter((page) => page.status !== "deleted").length}</strong><span>페이지</span></button><button onClick={() => onNavigate("vlog")}><strong>{articles.length}</strong><span>Vlog 초안</span></button><button onClick={() => onNavigate("contact")}><strong>0</strong><span>새 문의</span></button></div><div className="admin-quick-actions"><button onClick={() => onNavigate("pages")}>페이지 편집 시작 <span>→</span></button><button onClick={() => onNavigate("vlog")}>Vlog 글 작성 <span>→</span></button><button onClick={() => onNavigate("contact")}>문의함 확인 <span>→</span></button></div></div>;
}

function ListPanel({ title, query, setQuery, count, children }: { title: string; query: string; setQuery: (value: string) => void; count: number; children: React.ReactNode }) {
  return <section className="admin-list-panel"><div className="admin-panel-heading"><div><span className="admin-eyebrow">Library</span><h2>{title}</h2></div><strong>{count}</strong></div><input className="admin-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="제목·slug·카테고리 검색" aria-label={`${title} 검색`} /><p className="admin-list-hint">{query.trim() ? "검색 중에는 순서 변경이 잠시 비활성화됩니다." : "항목을 드래그하거나 편집기의 위·아래 버튼으로 순서를 바꿀 수 있습니다."}</p><div className="admin-list">{children}</div></section>;
}

function SortableListRow({ index, title, meta, status, selected, dragDisabled, dragging, dropTarget, onSelect, onDragStart, onDragOver, onDrop, onDragEnd }: { index: number; title: string; meta: string; status: Status; selected: boolean; dragDisabled: boolean; dragging: boolean; dropTarget: boolean; onSelect: () => void; onDragStart: (event: DragEvent<HTMLButtonElement>) => void; onDragOver: (event: DragEvent<HTMLButtonElement>) => void; onDrop: (event: DragEvent<HTMLButtonElement>) => void; onDragEnd: () => void }) {
  const className = ["admin-list-row", selected && "is-selected", dragDisabled && "is-drag-disabled", dragging && "is-dragging", dropTarget && "is-drop-target"].filter(Boolean).join(" ");
  return <button type="button" className={className} draggable={!dragDisabled} aria-label={`${index + 1}. ${title}. ${dragDisabled ? "검색 중 순서 변경 비활성화" : "드래그하여 순서 변경 가능"}`} onClick={onSelect} onDragStart={onDragStart} onDragOver={onDragOver} onDrop={onDrop} onDragEnd={onDragEnd}><span className="admin-list-order"><span className="admin-drag-handle" aria-hidden="true">⠿</span><span className="admin-list-number">{String(index + 1).padStart(2, "0")}</span></span><span><strong>{title}</strong><small>{meta}</small></span><StatusBadge status={status} /></button>;
}

function PageEditor({ page, index, total, onChange, onMove, onCopy, onDelete }: { page: AdminPageItem; index: number; total: number; onChange: (patch: Partial<AdminPageItem>) => void; onMove: (id: string, direction: -1 | 1) => void; onCopy: (page: AdminPageItem) => void; onDelete: (id: string) => void }) {
  return <section className="admin-editor-panel"><EditorHeading eyebrow="Page editor" title={page.title} status={page.status} /><div className="admin-form"><label>페이지 제목<input value={page.title} onChange={(event) => onChange({ title: event.target.value })} /></label><label>공개 경로<input value={page.slug} onChange={(event) => onChange({ slug: event.target.value })} /></label><label>페이지 유형<select value={page.type} onChange={(event) => onChange({ type: event.target.value })}><option>홈페이지</option><option>Contact</option><option>Vlog index</option><option>Custom page</option></select></label></div><div className="admin-section-list"><div className="admin-subheading"><strong>섹션 구조</strong><small>기본 편집 단계에서는 순서와 상태만 관리합니다.</small></div>{page.sections.map((section, sectionIndex) => <div className="admin-section-row" key={section}><span>{String(sectionIndex + 1).padStart(2, "0")}</span><strong>{section}</strong><small>코드 블록</small></div>)}</div><div className="admin-editor-actions"><button disabled={index <= 0} onClick={() => onMove(page.id, -1)}>페이지 위로</button><button disabled={index >= total - 1} onClick={() => onMove(page.id, 1)}>페이지 아래로</button><button onClick={() => onCopy(page)}>복사</button><button className="is-danger" onClick={() => onDelete(page.id)}>Soft Delete</button></div></section>;
}

function ArticleEditor({ article, index, total, onChange, onMove }: { article: AdminArticle; index: number; total: number; onChange: (patch: Partial<AdminArticle>) => void; onMove: (id: string, direction: -1 | 1) => void }) {
  return <section className="admin-editor-panel"><EditorHeading eyebrow="Vlog editor" title={article.title} status={article.status} /><div className="admin-form"><label>제목<textarea rows={3} value={article.title} onChange={(event) => onChange({ title: event.target.value })} /></label><label>카테고리<input value={article.category} onChange={(event) => onChange({ category: event.target.value })} /></label><label>요약<textarea rows={5} value={article.summary} onChange={(event) => onChange({ summary: event.target.value })} /></label><label>본문 블록<small className="admin-field-note">Rich content 블록은 다음 단계에서 연결합니다. 현재는 초안 메타데이터를 안전하게 편집합니다.</small><textarea rows={8} placeholder="본문을 입력하세요." /></label></div><div className="admin-editor-actions"><button disabled={index <= 0} onClick={() => onMove(article.id, -1)}>Vlog 위로</button><button disabled={index >= total - 1} onClick={() => onMove(article.id, 1)}>Vlog 아래로</button><button onClick={() => onChange({ status: "draft" })}>임시저장</button><button onClick={() => onChange({ status: "published" })}>Publish 준비</button><button className="is-danger" onClick={() => onChange({ status: "deleted" })}>Soft Delete</button></div></section>;
}

function ContactPanel() {
  return <div className="admin-contact-layout"><section className="admin-editor-panel"><EditorHeading eyebrow="Contact page" title="Contact content" status="published" /><div className="admin-form"><label>페이지 제목<input defaultValue="Contact" /></label><label>소개 문구<textarea rows={5} defaultValue="새로운 프로젝트와 다음 성장의 순간을 이야기합니다." /></label><label>문의 폼 안내<textarea rows={5} defaultValue="필요한 내용을 남겨주시면 확인 후 연락드리겠습니다." /></label></div><button className="admin-button admin-button-primary">임시저장</button></section><section className="admin-inbox"><div className="admin-panel-heading"><div><span className="admin-eyebrow">Inbox</span><h2>문의함</h2></div><strong>0</strong></div><div className="admin-empty-state"><span>○</span><strong>새 문의가 없습니다.</strong><p>Contact 폼으로 접수된 문의가 이곳에 표시됩니다.</p></div></section></div>;
}

function EditorHeading({ eyebrow, title, status }: { eyebrow: string; title: string; status: Status }) {
  return <div className="admin-editor-heading"><div><span className="admin-eyebrow">{eyebrow}</span><h2>{title}</h2></div><StatusBadge status={status} /></div>;
}

function StatusBadge({ status }: { status: Status }) {
  const labels: Record<Status, string> = { draft: "초안", published: "게시됨", deleted: "삭제 대기" };
  return <span className={`admin-status admin-status-${status}`}>{labels[status]}</span>;
}
