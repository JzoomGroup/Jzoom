import type { CurrentUser } from "./auth";

type PostLoginRoute =
  | "/change-password"
  | "/admin"
  | "/client"
  | "/management"
  | "/account-manager"
  | "/supervisor"
  | "/specialist"
  | "/projects"
  | "/profile";

const AUTH_ONLY_PATHS = new Set(["/login", "/change-password"]);

export function safeReturnTo(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return null;
  }

  try {
    const candidate = new URL(value, "https://portal.jzoom.invalid");
    if (candidate.origin !== "https://portal.jzoom.invalid") {
      return null;
    }
    if (AUTH_ONLY_PATHS.has(candidate.pathname)) {
      return null;
    }
    return `${candidate.pathname}${candidate.search}${candidate.hash}`;
  } catch {
    return null;
  }
}

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
  if (roles.includes("ROLE-PROJECT-SPECIALIST")) {
    return "/projects";
  }
  return "/profile";
}
