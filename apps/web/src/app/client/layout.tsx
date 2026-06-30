import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentUser, hasBackendClientAccess } from "../../lib/auth";

export default async function ClientLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (user.mustChangePassword) {
    redirect("/change-password");
  }
  if (!user.roles.includes("ROLE-CLIENT")) {
    redirect("/403");
  }
  if (!(await hasBackendClientAccess())) {
    redirect("/403");
  }

  return children;
}
