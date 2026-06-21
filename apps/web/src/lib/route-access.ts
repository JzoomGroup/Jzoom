import type { CurrentUser } from "./auth";

export function protectedRouteRedirect(
  user: CurrentUser | null,
  adminOnly = false,
): "/login" | "/403" | null {
  if (!user) {
    return "/login";
  }

  return adminOnly && !user.roles.includes("ROLE-ADMIN") ? "/403" : null;
}

export function postLoginRoute(roles: string[]): "/settings" | "/profile" {
  return roles.includes("ROLE-ADMIN") ? "/settings" : "/profile";
}
