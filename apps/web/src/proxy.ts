import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PATHS = ["/profile", "/settings", "/admin"];

export function proxy(request: NextRequest) {
  if (
    PROTECTED_PATHS.some(
      (path) =>
        request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(`${path}/`),
    ) &&
    !request.cookies.get("jzoom_session")
  ) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("returnTo", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/profile/:path*", "/settings/:path*", "/admin/:path*"],
};
