import { NextResponse } from "next/server";
import { getAdminUser } from "../../../chatgpt-auth";
import {
  getContactDatabase,
  listContactSubmissions,
  updateContactSubmissionStatus,
  type ContactSubmissionRecord,
} from "../../../../db/contact-submissions";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
  try {
    const requestedLimit = Number(new URL(request.url).searchParams.get("limit") ?? 100);
    const submissions = await listContactSubmissions(await getContactDatabase(), requestedLimit);
    console.info("[contact:admin-list-loaded]", {
      user: user.email,
      count: submissions.length,
      unreadCount: submissions.filter((item) => item.status === "new").length,
    });
    return NextResponse.json({ submissions });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "contact-admin-load-failed";
    console.error("[contact:admin-list-failed]", { user: user.email, reason });
    return NextResponse.json({ error: reason }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
  try {
    const body = await request.json() as { id?: string; status?: ContactSubmissionRecord["status"] };
    const result = await updateContactSubmissionStatus(
      await getContactDatabase(),
      String(body.id ?? ""),
      String(body.status ?? "") as ContactSubmissionRecord["status"],
    );
    console.info("[contact:admin-status-complete]", { user: user.email, ...result });
    return NextResponse.json(result);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "contact-admin-update-failed";
    console.error("[contact:admin-status-failed]", { user: user.email, reason });
    return NextResponse.json({ error: reason }, { status: reason === "contact-submission-not-found" ? 404 : 400 });
  }
}

