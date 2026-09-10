import { headers } from "next/headers";
import AdminApp from "./AdminApp";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const requestHeaders = await headers();
  const userEmail = requestHeaders.get("x-perfect-prairie-user-email") ?? "Local preview";
  return <AdminApp userEmail={userEmail} />;
}
