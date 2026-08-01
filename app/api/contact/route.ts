import { NextResponse } from "next/server";
import { createContactSubmission, getContactDatabase } from "../../../db/contact-submissions";

export const dynamic = "force-dynamic";

function requestIsSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  return origin === new URL(request.url).origin;
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  console.info("[contact:request-received]", {
    contentType: contentType.split(";")[0],
    hasOrigin: Boolean(request.headers.get("origin")),
  });

  if (!requestIsSameOrigin(request)) {
    console.warn("[contact:request-rejected]", { reason: "origin" });
    return NextResponse.json({ error: "contact-origin-invalid" }, { status: 403 });
  }
  if (!contentType.toLowerCase().includes("application/json")) {
    console.warn("[contact:request-rejected]", { reason: "content-type" });
    return NextResponse.json({ error: "contact-content-type-invalid" }, { status: 415 });
  }

  try {
    const result = await createContactSubmission(await getContactDatabase(), await request.json());
    console.info("[contact:submission-accepted]", {
      discarded: result.discarded,
      submissionId: result.id,
    });
    return NextResponse.json({ accepted: true, id: result.id }, { status: 201 });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "contact-submit-failed";
    const status = reason === "contact-rate-limited" ? 429 : reason === "contact-storage-unavailable" ? 503 : 400;
    console.error("[contact:submission-failed]", { reason, status });
    return NextResponse.json({ error: reason }, { status });
  }
}

