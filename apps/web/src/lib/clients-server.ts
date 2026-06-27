import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ClientsSnapshot } from "./clients-types";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

export async function requireClientsSnapshot(): Promise<ClientsSnapshot> {
  const cookieStore = await cookies();
  const response = await fetch(`${apiBaseUrl}/admin/clients`, {
    cache: "no-store",
    headers: {
      cookie: cookieStore.toString(),
    },
  }).catch(() => null);

  if (!response) {
    throw new Error("The clients API is unavailable.");
  }
  if (response.status === 401) {
    redirect("/login");
  }
  if (response.status === 403) {
    redirect("/403");
  }
  if (!response.ok) {
    throw new Error(`The clients API returned ${response.status}.`);
  }

  return (await response.json()) as ClientsSnapshot;
}
