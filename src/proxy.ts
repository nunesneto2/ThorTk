import { NextRequest, NextResponse } from "next/server";

const primaryDomain = "tikscalepro.online";
const wwwDomain = "www.tikscalepro.online";

export function proxy(request: NextRequest) {
  const hostname = (request.headers.get("host") ?? "").split(":")[0].toLowerCase();

  if (hostname === wwwDomain) {
    return NextResponse.redirect(new URL(request.nextUrl.pathname + request.nextUrl.search, "https://" + primaryDomain), 308);
  }

  if (hostname !== primaryDomain) return NextResponse.next();

  const url = request.nextUrl.clone();
  if (url.pathname === "/") {
    url.pathname = "/institucional";
    return NextResponse.rewrite(url);
  }

  if (url.pathname === "/privacy") {
    url.pathname = "/privacidade";
    return NextResponse.rewrite(url);
  }

  if (url.pathname === "/terms") {
    url.pathname = "/termos";
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
