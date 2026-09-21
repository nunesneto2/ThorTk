import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { encryptToken, exchangeAuthorizationCode, verifyOAuthState } from "@/lib/tiktok/oauth";

function redirect(request: NextRequest, state: string) { const url = new URL("/", request.url); url.searchParams.set("tiktok", state); return NextResponse.redirect(url); }

export async function GET(request: NextRequest) {
  const authCode = request.nextUrl.searchParams.get("auth_code");
  const state = request.nextUrl.searchParams.get("state") ?? "";
  const verified = verifyOAuthState(state, request.cookies.get("abo_tiktok_oauth_nonce")?.value);
  if (!authCode || !verified || request.nextUrl.searchParams.get("error")) return redirect(request, "denied");
  try {
    const session = await createClient();
    const { data } = await session.auth.getClaims();
    if (data?.claims.sub !== verified.userId) return redirect(request, "session");
    const token = await exchangeAuthorizationCode(authCode);
    const admin = createAdminClient();
    const { error } = await admin.from("tiktok_connections").upsert({
      user_id: verified.userId,
      app_id: process.env.TIKTOK_APP_ID,
      access_token_ciphertext: encryptToken(token.accessToken),
      refresh_token_ciphertext: token.refreshToken ? encryptToken(token.refreshToken) : null,
      access_token_expires_at: token.accessTokenExpiresAt,
      refresh_token_expires_at: token.refreshTokenExpiresAt,
      authorized_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    if (error) throw error;
    const response = redirect(request, "connected");
    response.cookies.set("abo_tiktok_oauth_nonce", "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/api/tiktok", maxAge: 0 });
    return response;
  } catch (error) { console.error("[tiktok:callback] authorization failed", error); return redirect(request, "error"); }
}
