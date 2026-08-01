"use client";

import { useState, type FormEvent } from "react";

type SubmitState = "idle" | "submitting" | "success" | "error";

export function ContactSubmissionForm({
  endpoint,
  submitLabel,
}: {
  endpoint: string;
  submitLabel: string;
}) {
  const [state, setState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "submitting") return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const payload = {
      name: data.get("name"),
      company: data.get("company"),
      email: data.get("email"),
      inquiryType: data.get("inquiryType"),
      budget: data.get("budget"),
      message: data.get("message"),
      website: data.get("website"),
    };
    setState("submitting");
    setMessage("문의 내용을 안전하게 전송하고 있습니다.");
    console.info("[contact-form:submit-start]", { endpoint, inquiryType: payload.inquiryType, budget: payload.budget });
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json() as { accepted?: boolean; error?: string };
      if (!response.ok || !result.accepted) throw new Error(result.error ?? "contact-submit-failed");
      form.reset();
      setState("success");
      setMessage("문의가 접수되었습니다. 확인 후 이메일로 답변드리겠습니다.");
      console.info("[contact-form:submit-success]", { endpoint, status: response.status });
    } catch (error) {
      const reason = error instanceof Error ? error.message : "contact-submit-failed";
      setState("error");
      setMessage(reason === "contact-rate-limited"
        ? "짧은 시간에 여러 문의가 접수되었습니다. 잠시 후 다시 시도해 주세요."
        : "전송하지 못했습니다. 입력 내용을 확인한 뒤 다시 시도해 주세요.");
      console.error("[contact-form:submit-failed]", { endpoint, reason });
    }
  }

  return (
    <form className="template-contact-form" onSubmit={submit}>
      <div className="template-contact-form-grid">
        <label>
          <span>이름</span>
          <input name="name" autoComplete="name" maxLength={120} required placeholder="홍길동" />
        </label>
        <label>
          <span>회사</span>
          <input name="company" autoComplete="organization" maxLength={160} placeholder="회사명 또는 팀명" />
        </label>
        <label>
          <span>회신 이메일</span>
          <input name="email" type="email" autoComplete="email" maxLength={254} required placeholder="you@example.com" />
        </label>
        <label>
          <span>문의 유형</span>
          <select name="inquiryType" defaultValue="brand" required>
            <option value="brand">브랜드 전략</option>
            <option value="campaign">캠페인·콘텐츠</option>
            <option value="digital">웹·디지털 경험</option>
            <option value="collaboration">교육·협업</option>
            <option value="other">기타</option>
          </select>
        </label>
        <label>
          <span>예산 범위</span>
          <select name="budget" defaultValue="undecided" required>
            <option value="undecided">아직 정하지 않음</option>
            <option value="under-5m">500만 원 미만</option>
            <option value="5m-10m">500만~1,000만 원</option>
            <option value="10m-30m">1,000만~3,000만 원</option>
            <option value="over-30m">3,000만 원 이상</option>
          </select>
        </label>
      </div>
      <label className="template-contact-message">
        <span>프로젝트 내용</span>
        <textarea name="message" minLength={20} maxLength={4000} rows={7} required placeholder="목표, 일정, 필요한 도움을 20자 이상 적어주세요." />
      </label>
      <label className="template-contact-honeypot" aria-hidden="true">
        <span>웹사이트</span>
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
      <div className="template-contact-submit-row">
        <button type="submit" disabled={state === "submitting"}>{state === "submitting" ? "전송 중…" : submitLabel}</button>
        <p role="status" aria-live="polite" data-state={state}>{message}</p>
      </div>
    </form>
  );
}

