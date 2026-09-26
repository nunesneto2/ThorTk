import { NextResponse, type NextRequest } from "next/server";

function hasAuthCookie(request: NextRequest) {
  // Supabase SSR stores the browser session in this cookie (or numbered
  // chunks of it). The API routes still verify the JWT before returning data;
  // this lightweight gateway only keeps an unsigned visitor out of the panel.
  return request.cookies.getAll().some(({ name, value }) =>
    /^sb-[a-z0-9]+-auth-token(?:\.\d+)?$/i.test(name) && Boolean(value),
  );
}

export function proxy(request: NextRequest) {
  if (!hasAuthCookie(request)) {
    const redirectUrl = new URL("/auth", request.url);
    redirectUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Do not call auth.getClaims() here. On a brand-new session that makes the
  // first panel navigation wait for remote JWT/JWKS validation; API handlers
  // perform that validation before accessing any user data.
  return NextResponse.next({ request });
}

export const config = {
  matcher: ["/"],
};
