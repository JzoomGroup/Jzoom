import type { Response } from "express";
import type { AuthRuntimeEnvironment } from "./auth.types.js";

export function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) {
    return {};
  }

  return Object.fromEntries(
    header.split(";").flatMap((part) => {
      const separator = part.indexOf("=");
      if (separator < 1) {
        return [];
      }

      const key = part.slice(0, separator).trim();
      const value = part.slice(separator + 1).trim();
      return [[key, decodeURIComponent(value)]];
    }),
  );
}

function cookieOptions(environment: AuthRuntimeEnvironment, httpOnly: boolean) {
  return {
    httpOnly,
    secure: environment.auth.cookieSecure,
    sameSite: "lax" as const,
    path: "/",
  };
}

export function setAuthCookies(
  response: Response,
  environment: AuthRuntimeEnvironment,
  sessionToken: string,
  csrfToken: string,
  expiresAt: Date,
): void {
  response.cookie(environment.auth.cookieName, sessionToken, {
    ...cookieOptions(environment, true),
    expires: expiresAt,
  });
  response.cookie(environment.auth.csrfCookieName, csrfToken, {
    ...cookieOptions(environment, false),
    expires: expiresAt,
  });
}

export function clearAuthCookies(response: Response, environment: AuthRuntimeEnvironment): void {
  response.clearCookie(environment.auth.cookieName, cookieOptions(environment, true));
  response.clearCookie(environment.auth.csrfCookieName, cookieOptions(environment, false));
}
