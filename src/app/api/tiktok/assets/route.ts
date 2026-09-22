import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { loadAdvertiserAssets, loadCatalogs, loadOverview } from "@/lib/tiktok/assets";
import { decryptToken } from "@/lib/tiktok/oauth";

function badRequest(message: string, status = 400) { return NextResponse.json({ error: message }, { status }); }

export async function GET(request: NextRequest) {
  try {
    const session = await createClient();
    const { data: claims } = await session.auth.getClaims();
    const userId = claims?.claims.sub;
    if (!userId) return badRequest("Sessão operacional não encontrada. Entre novamente.", 401);

    const admin = createAdminClient();
    const { data: connection, error } = await admin.from("tiktok_connections").select("access_token_ciphertext, authorized_at").eq("user_id", userId).maybeSingle();
    if (error) throw error;
    if (!connection) return NextResponse.json({ connected: false, businessCenters: [], advertisers: [], warnings: [] });

    const token = decryptToken(connection.access_token_ciphertext);
    const scope = request.nextUrl.searchParams.get("scope") ?? "overview";
    if (scope === "overview") {
      const assets = await loadOverview(token);
      return NextResponse.json({ connected: true, authorizedAt: connection.authorized_at, ...assets });
    }
    if (scope === "catalogs") {
      const businessCenterId = request.nextUrl.searchParams.get("bc_id");
      if (!businessCenterId) return badRequest("Selecione um Business Center.");
      return NextResponse.json({ connected: true, catalogs: await loadCatalogs(token, businessCenterId), warnings: [] });
    }
    if (scope === "advertiser") {
      const advertiserId = request.nextUrl.searchParams.get("advertiser_id");
      if (!advertiserId) return badRequest("Selecione uma conta de anúncio.");
      return NextResponse.json({ connected: true, ...(await loadAdvertiserAssets(token, advertiserId)) });
    }
    return badRequest("Consulta de ativos inválida.");
  } catch (error) {
    console.error("[tiktok:assets] read failed", error);
    return badRequest(error instanceof Error ? error.message : "Não foi possível carregar os ativos do TikTok.", 502);
  }
}
