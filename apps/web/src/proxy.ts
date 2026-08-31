import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = new Set(["/403", "/change-password", "/login"]);
const sessionCookieName = process.env.NEXT_PUBLIC_AUTH_COOKIE_NAME ?? "jzoom_session";
const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

function loginRedirect(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("returnTo", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

export async function proxy(request: NextRequest) {
  if (PUBLIC_PATHS.has(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(sessionCookieName);
  if (!sessionCookie) {
    return loginRedirect(request);
  }

  const response = await fetch(`${apiBaseUrl}/auth/me`, {
    cache: "no-store",
    headers: { cookie: request.headers.get("cookie") ?? "" },
  }).catch(() => null);

  if (response?.status === 401) {
    return loginRedirect(request);
  }
  if (response?.ok) {
    const body = (await response.json()) as { user?: { mustChangePassword?: boolean } };
    if (body.user?.mustChangePassword) {
      return NextResponse.redirect(new URL("/change-password", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
