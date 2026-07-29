import type { Metadata } from "next";
import { getChatGPTUser } from "../chatgpt-auth";
import { ImageProcessor } from "./image-processor";

export const metadata: Metadata = { title: "Admin image processing" };

export default async function AdminPage() {
  const user = await getChatGPTUser();
  return (
    <main className="route-page route-page-admin" data-page-id="admin">
      <ImageProcessor authenticated={Boolean(user)} />
    </main>
  );
}
