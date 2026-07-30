import type { Metadata } from "next";
import { getAdminUser } from "../chatgpt-auth";
import { AdminLoginScreen } from "./login-screen";
import { AdminShell } from "./admin-shell";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminPage() {
  const user = await getAdminUser();
  if (!user) return <AdminLoginScreen />;
  return <AdminShell user={user} />;
}
