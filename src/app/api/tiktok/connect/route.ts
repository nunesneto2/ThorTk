import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authorizationUrl, createOAuthState, isTikTokConfigured } from "@/lib/tiktok/oauth";

function redirect(request: NextRequest, state: string) { const url = new URL("/", request.url); url.searchParams.set("tiktok", state); return NextResponse.redirect(url); }

export async function GET(request: NextRequest) {
  if (!isTikTokConfigured()) return redirect(request, "config");
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    const userId = data?.claims.sub;
    if (!userId) return NextResponse.redirect(new URL("/auth", request.url));
    const { state, nonce } = createOAuthState(userId);
    const response = NextResponse.redirect(authorizationUrl(state));
    response.cookies.set("abo_tiktok_oauth_nonce", nonce, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/api/tiktok", maxAge: 600 });
    return response;
  } catch { return redirect(request, "config"); }
}
