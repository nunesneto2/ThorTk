import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { loadBusinessCenterFinance } from "@/lib/tiktok/assets";
import { decryptToken } from "@/lib/tiktok/oauth";

function badRequest(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: NextRequest) {
  try {
    const businessCenterId = request.nextUrl.searchParams.get("bc_id")?.trim();
    if (!businessCenterId) return badRequest("Selecione uma Business Center.");

    const session = await createClient();
    const { data: claims } = await session.auth.getClaims();
    const userId = claims?.claims.sub;
    if (!userId) return badRequest("Sessão operacional não encontrada. Entre novamente.", 401);

    const admin = createAdminClient();
    const [{ data: connection, error: connectionError }, { data: center, error: centerError }] = await Promise.all([
      admin
        .from("tiktok_connections")
        .select("access_token_ciphertext")
        .eq("user_id", userId)
        .maybeSingle(),
      admin
        .from("tiktok_business_centers")
        .select("bc_id")
        .eq("user_id", userId)
        .eq("bc_id", businessCenterId)
        .eq("is_selected", true)
        .maybeSingle(),
    ]);
    if (connectionError) throw connectionError;
    if (centerError) throw centerError;
    if (!connection) return NextResponse.json({ connected: false });
    if (!center) return badRequest("Conecte esta Business Center à operação antes de consultar o financeiro.", 403);

    const finance = await loadBusinessCenterFinance(
      decryptToken(connection.access_token_ciphertext),
      businessCenterId,
    );
    return NextResponse.json({ connected: true, ...finance });
  } catch (error) {
    console.error("[tiktok:finance] read failed", error);
    return badRequest(
      error instanceof Error ? error.message : "Não foi possível carregar o financeiro da Business Center.",
      502,
    );
  }
}
