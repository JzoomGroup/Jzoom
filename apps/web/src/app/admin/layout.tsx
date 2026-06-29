import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentUser } from "../../lib/auth";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (!user.roles.includes("ROLE-ADMIN") && !user.roles.includes("ROLE-MGMT")) {
    redirect("/403");
  }

  return children;
}
