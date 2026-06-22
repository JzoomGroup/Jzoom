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

export function postLoginRoute(roles: string[]): "/client" | "/settings" | "/profile" {
  if (roles.includes("ROLE-ADMIN")) {
    return "/settings";
  }
  if (roles.includes("ROLE-CLIENT")) {
    return "/client";
  }
  return "/profile";
}
