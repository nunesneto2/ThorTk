import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { deleteCampaigns, loadAdvertiserCampaigns, loadOverview, pauseCampaigns } from "@/lib/tiktok/assets";
import { decryptToken } from "@/lib/tiktok/oauth";

type CampaignAction = "pause" | "delete";
type CampaignRecord = {
  id: string;
  advertiserId: string;
  name: string;
  status?: string;
};

function responseError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function cleanIds(value: unknown) {
  return [...new Set(
    (Array.isArray(value) ? value : [])
      .map((id) => String(id).trim())
      .filter(Boolean),
  )];
}

async function currentConnection() {
  const session = await createClient();
  const { data: claims } = await session.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) return null;
  const admin = createAdminClient();
  const { data: connection, error } = await admin
    .from("tiktok_connections")
    .select("access_token_ciphertext")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return { connection };
}

async function campaignsForSelectedAdvertisers(accessToken: string, advertiserIds: string[]) {
  const overview = await loadOverview(accessToken);
  const authorized = new Set(overview.advertisers.map((advertiser) => advertiser.id));
  const forbidden = advertiserIds.find((id) => !authorized.has(id));
  if (forbidden) throw new Error("A conta " + forbidden + " não pertence à autorização atual do TikTok.");

  const campaigns: CampaignRecord[] = [];
  for (const advertiserId of advertiserIds) {
    const records = await loadAdvertiserCampaigns(accessToken, advertiserId);
    campaigns.push(...records.map((campaign) => ({
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      advertiserId,
    })));
  }
  return campaigns;
}

function chunks<T>(items: T[], size: number) {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, index * size + size),
  );
}

export async function GET(request: NextRequest) {
  try {
    const ids = cleanIds(request.nextUrl.searchParams.get("advertiser_ids")?.split(","));
    if (!ids.length) return NextResponse.json({ campaigns: [] });
    const current = await currentConnection();
    if (!current) return responseError("Sessão operacional não encontrada.", 401);
    if (!current.connection) return responseError("Conecte o TikTok antes de consultar campanhas.", 409);
    const token = decryptToken(current.connection.access_token_ciphertext);
    return NextResponse.json({ campaigns: await campaignsForSelectedAdvertisers(token, ids) });
  } catch (error) {
    console.error("[tiktok:campaigns] list failed", error);
    return responseError(error instanceof Error ? error.message : "Não foi possível carregar as campanhas das contas selecionadas.", 502);
  }
}

export async function POST(request: NextRequest) {
  try {
    const current = await currentConnection();
    if (!current) return responseError("Sessão operacional não encontrada.", 401);
    if (!current.connection) return responseError("Conecte o TikTok antes de gerenciar campanhas.", 409);
    const body = await request.json().catch(() => null) as { action?: CampaignAction; advertiser_ids?: string[] } | null;
    if (body?.action !== "pause" && body?.action !== "delete") {
      return responseError("Ação de campanha inválida.");
    }
    const advertiserIds = cleanIds(body.advertiser_ids);
    if (!advertiserIds.length) return responseError("Selecione ao menos uma conta de anúncio.");

    const token = decryptToken(current.connection.access_token_ciphertext);
    const campaigns = await campaignsForSelectedAdvertisers(token, advertiserIds);
    if (!campaigns.length) {
      return responseError("Não há campanhas nas contas selecionadas para esta operação.", 409);
    }
    const byAdvertiser = new Map<string, CampaignRecord[]>();
    campaigns.forEach((campaign) => {
      byAdvertiser.set(campaign.advertiserId, [...(byAdvertiser.get(campaign.advertiserId) ?? []), campaign]);
    });
    const completed: CampaignRecord[] = [];
    const failed: { advertiserId: string; campaignIds: string[]; message: string }[] = [];
    for (const [advertiserId, records] of byAdvertiser) {
      for (const batch of chunks(records, 20)) {
        try {
          if (body.action === "pause") {
            await pauseCampaigns(token, advertiserId, batch.map((campaign) => campaign.id));
          } else {
            await deleteCampaigns(token, advertiserId, batch.map((campaign) => campaign.id));
          }
          completed.push(...batch);
        } catch (error) {
          failed.push({
            advertiserId,
            campaignIds: batch.map((campaign) => campaign.id),
            message: error instanceof Error ? error.message : "O TikTok não confirmou a alteração.",
          });
        }
      }
    }
    return NextResponse.json({
      processed: completed.length,
      failed,
      campaigns: body.action === "delete"
        ? await campaignsForSelectedAdvertisers(token, advertiserIds)
        : campaigns.map((campaign) => ({ ...campaign, status: "DISABLE" })),
    });
  } catch (error) {
    console.error("[tiktok:campaigns] management failed", error);
    return responseError(error instanceof Error ? error.message : "Não foi possível alterar as campanhas selecionadas.", 502);
  }
}
