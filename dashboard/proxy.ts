import { NextRequest, NextResponse } from "next/server";



/**
 * OPTION 3: HYBRID (RECOMMENDED) ⭐
 * 
 * - Middleware: Fast check (cookie exists)
 * - Components: Secure check (validate token with useCheckAuth)
 * 
 * This gives you:
 * - Fast redirects for obvious cases
 * - Real security in components
 * - Best of both worlds!
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Fast check: Does cookie exist?
  const accessToken = request.cookies.get("access_token");
  const hasCookie = !!accessToken;

  const isAuthRoute = pathname.startsWith("/auth/login") || pathname.startsWith("/auth/signup");
  const isProtectedRoute = pathname.startsWith("/dashboard");

  // Fast redirect: If has cookie and trying to access auth pages
  if (hasCookie && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Fast redirect: If no cookie and trying to access protected pages
  if (!hasCookie && isProtectedRoute) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Let the request through
  // Components will validate the token properly using useCheckAuth
  return NextResponse.next();
}

// Configure which routes this middleware runs on
export const config = {
  matcher: [
    "/auth/login",
    "/auth/signup",
    "/dashboard/:path*",
  ],
};
