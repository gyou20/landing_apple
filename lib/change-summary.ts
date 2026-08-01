type RecordLike = Record<string, unknown>;

function changed(previous: RecordLike | null, next: RecordLike, key: string) {
  return previous ? JSON.stringify(previous[key] ?? "") !== JSON.stringify(next[key] ?? "") : false;
}

function summarize(previous: RecordLike | null, next: RecordLike, fields: Array<[string, string]>, created: string) {
  if (!previous) return created;
  const labels = fields.filter(([key]) => changed(previous, next, key)).map(([, label]) => label);
  return labels.length ? labels.slice(0, 3).join(" · ") : "내용 다시 저장";
}

export function summarizePageChange(previous: RecordLike | null, next: RecordLike) {
  return summarize(previous, next, [["title", "페이지 제목 수정"], ["slug", "공개 경로 수정"], ["type", "페이지 유형 수정"], ["summary", "요약 수정"], ["body", "본문 수정"]], "페이지 생성");
}

export function summarizeVlogChange(previous: RecordLike | null, next: RecordLike) {
  return summarize(previous, next, [["title", "Vlog 제목 수정"], ["slug", "공개 경로 수정"], ["category", "카테고리 수정"], ["summary", "요약 수정"], ["body", "본문 수정"]], "Vlog 생성");
}

export function summarizeSectionChange(previous: RecordLike | null, next: RecordLike) {
  if (!previous) return "섹션 생성";
  const previousContent = (previous.content && typeof previous.content === "object" ? previous.content : {}) as RecordLike;
  const nextContent = (next.content && typeof next.content === "object" ? next.content : {}) as RecordLike;
  const labels: string[] = [];
  if (changed(previous, next, "title")) labels.push("섹션 이름 수정");
  if (changed(previousContent, nextContent, "headlinePrimary") || changed(previousContent, nextContent, "headlineAccent")) labels.push("메인 문구 수정");
  if (changed(previousContent, nextContent, "subheadline")) labels.push("서브 문구 수정");
  if (changed(previousContent, nextContent, "description")) labels.push("설명 수정");
  if (changed(previousContent, nextContent, "ctaLabel")) labels.push("버튼 문구 수정");
  if (changed(previousContent, nextContent, "blocks")) labels.push("콘텐츠 블록 수정");
  return labels.length ? labels.slice(0, 3).join(" · ") : "내용 다시 저장";
}