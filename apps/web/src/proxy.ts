import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PATHS = ["/profile", "/settings", "/admin", "/pricing"];
const sessionCookieName = process.env.NEXT_PUBLIC_AUTH_COOKIE_NAME ?? "jzoom_session";

export function proxy(request: NextRequest) {
  if (
    PROTECTED_PATHS.some(
      (path) =>
        request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(`${path}/`),
    ) &&
    !request.cookies.get(sessionCookieName)
  ) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("returnTo", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/profile/:path*", "/settings/:path*", "/admin/:path*", "/pricing/:path*"],
};
