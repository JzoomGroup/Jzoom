import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { RequestTemplatesSnapshot } from "./request-template-types";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

export async function requireRequestTemplates(): Promise<RequestTemplatesSnapshot> {
  const cookieStore = await cookies();
  const response = await fetch(`${apiBaseUrl}/admin/request-templates`, {
    cache: "no-store",
    headers: { cookie: cookieStore.toString() },
  }).catch(() => null);

  if (!response) {
    throw new Error("The request templates API is unavailable.");
  }
  if (response.status === 401) {
    redirect("/login");
  }
  if (response.status === 403) {
    redirect("/403");
  }
  if (!response.ok) {
    throw new Error(`The request templates API returned ${response.status}.`);
  }
  return (await response.json()) as RequestTemplatesSnapshot;
}
