import type { CurrentUser } from "./auth";

type PostLoginRoute =
  | "/change-password"
  | "/admin"
  | "/client"
  | "/management"
  | "/account-manager"
  | "/supervisor"
  | "/specialist"
  | "/profile";

export function protectedRouteRedirect(
  user: CurrentUser | null,
  adminOnly = false,
): "/login" | "/change-password" | "/403" | null {
  if (!user) {
    return "/login";
  }
  if (user.mustChangePassword) {
    return "/change-password";
  }

  return adminOnly && !user.roles.includes("ROLE-ADMIN") ? "/403" : null;
}

export function postLoginRoute(roles: string[]): PostLoginRoute {
  if (roles.includes("ROLE-ADMIN")) {
    return "/admin";
  }
  if (roles.includes("ROLE-CLIENT")) {
    return "/client";
  }
  if (roles.includes("ROLE-MGMT")) {
    return "/management";
  }
  if (roles.includes("ROLE-AM")) {
    return "/account-manager";
  }
  if (roles.includes("ROLE-SUPERVISOR")) {
    return "/supervisor";
  }
  if (roles.includes("ROLE-SPECIALIST")) {
    return "/specialist";
  }
  return "/profile";
}
