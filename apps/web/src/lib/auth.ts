import { cookies } from "next/headers";

export interface CurrentUser {
  id: string;
  email: string;
  displayName: string;
  preferredLocale: string;
  userType: "INTERNAL" | "EXTERNAL";
  roles: string[];
  permissions: string[];
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const response = await authenticatedFetch("auth/me", cookieStore.toString());

  if (!response?.ok) {
    return null;
  }

  const body = (await response.json()) as { user: CurrentUser };
  return body.user;
}

export async function hasBackendAdminAccess(): Promise<boolean> {
  const cookieStore = await cookies();
  const response = await authenticatedFetch("auth/access/admin", cookieStore.toString());
  return response?.ok === true;
}

export async function hasBackendClientAccess(): Promise<boolean> {
  const cookieStore = await cookies();
  const response = await authenticatedFetch("client-portal/me", cookieStore.toString());
  return response?.ok === true;
}

function authenticatedFetch(path: string, cookieHeader: string) {
  return fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1"}/${path}`,
    {
      cache: "no-store",
      headers: {
        cookie: cookieHeader,
      },
    },
  ).catch(() => null);
}
