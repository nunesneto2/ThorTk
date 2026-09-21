import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function safePath(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export async function GET(request: NextRequest) {
  const url = new URL(safePath(request.nextUrl.searchParams.get("next")), request.url);
  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    url.pathname = "/auth";
    url.searchParams.set("error", "link");
    return NextResponse.redirect(url);
  }
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return NextResponse.redirect(url);
  } catch {
    url.pathname = "/auth";
    url.searchParams.set("error", "session");
    return NextResponse.redirect(url);
  }
}
