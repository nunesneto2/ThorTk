import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { Choice, createCustomIdentity, createPixel, loadAdvertiserAssets, loadCatalogs, loadOverview } from "@/lib/tiktok/assets";
import { decryptToken } from "@/lib/tiktok/oauth";

type StoredBusinessCenter = { bc_id: string; bc_name: string; is_selected: boolean };

function badRequest(message: string, status = 400) { return NextResponse.json({ error: message }, { status }); }

async function userConnection() {
  const session = await createClient();
  const { data: claims } = await session.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) return null;
  const admin = createAdminClient();
  const { data: connection, error } = await admin.from("tiktok_connections").select("access_token_ciphertext, authorized_at").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return { userId, admin, connection };
}

async function syncBusinessCenters(admin: ReturnType<typeof createAdminClient>, userId: string, centers: Choice[]) {
  if (!centers.length) return [] as StoredBusinessCenter[];
  const { data: existing, error: existingError } = await admin.from("tiktok_business_centers").select("bc_id, is_selected").eq("user_id", userId);
  if (existingError) throw existingError;
  const selected = new Map((existing ?? []).map((item) => [item.bc_id, item.is_selected]));
  const now = new Date().toISOString();
  const { error } = await admin.from("tiktok_business_centers").upsert(centers.map((center) => ({
    user_id: userId,
    bc_id: center.id,
    bc_name: center.name,
    is_selected: selected.get(center.id) ?? false,
    last_seen_at: now,
  })), { onConflict: "user_id,bc_id" });
  if (error) throw error;
  const { data, error: readError } = await admin.from("tiktok_business_centers").select("bc_id, bc_name, is_selected").eq("user_id", userId);
  if (readError) throw readError;
  return (data ?? []) as StoredBusinessCenter[];
}

function applyBusinessCenterSelection(centers: Choice[], stored: StoredBusinessCenter[]) {
  const selected = new Map(stored.map((item) => [item.bc_id, item.is_selected]));
  return centers.map((center) => ({ ...center, selected: selected.get(center.id) ?? false }));
}

export async function GET(request: NextRequest) {
  try {
    const current = await userConnection();
    if (!current) return badRequest("Sessão operacional não encontrada. Entre novamente.", 401);
    const { admin, connection, userId } = current;
    if (!connection) return NextResponse.json({ connected: false, businessCenters: [], advertisers: [], warnings: [] });

    const token = decryptToken(connection.access_token_ciphertext);
    const scope = request.nextUrl.searchParams.get("scope") ?? "overview";
    if (scope === "overview") {
      const assets = await loadOverview(token);
      const stored = await syncBusinessCenters(admin, userId, assets.businessCenters);
      return NextResponse.json({ connected: true, authorizedAt: connection.authorized_at, ...assets, businessCenters: applyBusinessCenterSelection(assets.businessCenters, stored) });
    }
    if (scope === "catalogs") {
      const businessCenterId = request.nextUrl.searchParams.get("bc_id");
      if (!businessCenterId) return badRequest("Selecione um Business Center.");
      const { data: selected, error } = await admin.from("tiktok_business_centers").select("bc_id").eq("user_id", userId).eq("bc_id", businessCenterId).eq("is_selected", true).maybeSingle();
      if (error) throw error;
      if (!selected) return badRequest("Conecte esta Business Center à operação antes de consultar seus catálogos.", 403);
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

export async function POST(request: NextRequest) {
  try {
    const current = await userConnection();
    if (!current) return badRequest("Sessão operacional não encontrada. Entre novamente.", 401);
    const body = await request.json().catch(() => null) as { bc_id?: string; selected?: boolean; action?: "create_identity" | "create_pixel"; advertiser_ids?: string[]; name?: string; image_uri?: string; image_uris?: Record<string, string> } | null;
    if (body?.action) {
      const advertiserIds = [...new Set((body.advertiser_ids ?? []).map((item) => String(item).trim()).filter(Boolean))];
      const name = body.name?.trim() ?? "";
      if (!advertiserIds.length || !name) return badRequest("Selecione ao menos uma conta e informe um nome.");
      if (body.action === "create_identity" && !body.image_uri?.trim() && !Object.keys(body.image_uris ?? {}).length) return badRequest("Envie uma imagem para criar a Identity.");
      const { connection } = current;
      if (!connection) return badRequest("Conecte o TikTok antes de criar ativos.", 409);
      const token = decryptToken(connection.access_token_ciphertext);
      const overview = await loadOverview(token);
      const authorized = new Set(overview.advertisers.map((item) => item.id));
      const forbidden = advertiserIds.find((id) => !authorized.has(id));
      if (forbidden) return badRequest("A conta " + forbidden + " não pertence à autorização atual do TikTok.", 403);
      const results = await Promise.allSettled(advertiserIds.map((advertiserId) => {
        if (body.action === "create_pixel") return createPixel(token, advertiserId, name);
        const imageUri = body.image_uris?.[advertiserId]?.trim() || body.image_uri?.trim();
        if (!imageUri) return Promise.reject(new Error("A imagem não foi enviada para esta conta."));
        return createCustomIdentity(token, advertiserId, name, imageUri);
      }));
      const failed = results.flatMap((result, index) => result.status === "rejected" ? [{ advertiserId: advertiserIds[index], error: result.reason instanceof Error ? result.reason.message : "Falha no TikTok." }] : []);
      const created = results.filter((result) => result.status === "fulfilled").length;
      return NextResponse.json({ created, failed });
    }
    const businessCenterId = body?.bc_id?.trim();
    if (!businessCenterId || typeof body?.selected !== "boolean") return badRequest("Business Center inválido.");
    const { admin, connection, userId } = current;
    if (!connection) return badRequest("Conecte o TikTok antes de gerenciar Business Centers.", 409);

    const token = decryptToken(connection.access_token_ciphertext);
    const assets = await loadOverview(token);
    const stored = await syncBusinessCenters(admin, userId, assets.businessCenters);
    const center = assets.businessCenters.find((item) => item.id === businessCenterId);
    if (!center) return badRequest("Esta Business Center não pertence à autorização atual do TikTok.", 403);
    const { error } = await admin.from("tiktok_business_centers").upsert({
      user_id: userId,
      bc_id: center.id,
      bc_name: center.name,
      is_selected: body.selected,
      last_seen_at: new Date().toISOString(),
    }, { onConflict: "user_id,bc_id" });
    if (error) throw error;
    const selected = new Map(stored.map((item) => [item.bc_id, item.is_selected]));
    selected.set(center.id, body.selected);
    return NextResponse.json({ businessCenters: assets.businessCenters.map((item) => ({ ...item, selected: selected.get(item.id) ?? false })) });
  } catch (error) {
    console.error("[tiktok:assets] business center update failed", error);
    return badRequest(error instanceof Error ? error.message : "Não foi possível atualizar a Business Center.", 502);
  }
}
