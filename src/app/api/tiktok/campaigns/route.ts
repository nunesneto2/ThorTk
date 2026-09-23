import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { activateCampaigns, deleteCampaigns } from "@/lib/tiktok/assets";
import { decryptToken } from "@/lib/tiktok/oauth";

type CampaignAction = "activate" | "delete";
type CampaignRecord = {
  id: string;
  advertiserId: string;
  launchJobId: string;
};
type CampaignLog = {
  launch_job_id: string;
  tiktok_entity_id: string | null;
  created_at: string;
  level: string;
  data: unknown;
  launch_jobs: { advertiser_id: string; user_id: string } | { advertiser_id: string; user_id: string }[] | null;
};

function responseError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function logAction(value: unknown) {
  return value && typeof value === "object" && "action" in value
    ? String((value as { action?: unknown }).action || "")
    : "";
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
  return { userId, admin, connection };
}

async function registeredCampaigns(current: NonNullable<Awaited<ReturnType<typeof currentConnection>>>) {
  const { data, error } = await current.admin
    .from("launch_logs")
    .select("launch_job_id,tiktok_entity_id,created_at,level,data,launch_jobs!inner(advertiser_id,user_id)")
    .eq("stage", "campaign")
    .not("tiktok_entity_id", "is", null)
    .eq("launch_jobs.user_id", current.userId)
    .order("created_at", { ascending: true });
  if (error) throw error;

  const campaigns = new Map<string, CampaignRecord>();
  for (const row of (data ?? []) as CampaignLog[]) {
    const job = Array.isArray(row.launch_jobs) ? row.launch_jobs[0] : row.launch_jobs;
    const id = row.tiktok_entity_id?.trim();
    if (!job?.advertiser_id || !id) continue;
    const key = `${job.advertiser_id}:${id}`;
    if (logAction(row.data) === "deleted") {
      campaigns.delete(key);
      continue;
    }
    if (row.level !== "success") continue;
    campaigns.set(key, { id, advertiserId: job.advertiser_id, launchJobId: row.launch_job_id });
  }
  return [...campaigns.values()];
}

function chunks<T>(items: T[], size: number) {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, index * size + size),
  );
}

export async function GET() {
  try {
    const current = await currentConnection();
    if (!current) return responseError("Sessão operacional não encontrada.", 401);
    return NextResponse.json({ campaigns: await registeredCampaigns(current) });
  } catch (error) {
    console.error("[tiktok:campaigns] registry read failed", error);
    return responseError(error instanceof Error ? error.message : "Não foi possível carregar as campanhas publicadas pela API.", 502);
  }
}

export async function POST(request: NextRequest) {
  try {
    const current = await currentConnection();
    if (!current) return responseError("Sessão operacional não encontrada.", 401);
    if (!current.connection) return responseError("Conecte o TikTok antes de gerenciar campanhas.", 409);
    const body = await request.json().catch(() => null) as { action?: CampaignAction } | null;
    if (body?.action !== "activate" && body?.action !== "delete") {
      return responseError("Ação de campanha inválida.");
    }
    const campaigns = await registeredCampaigns(current);
    if (!campaigns.length) {
      return responseError("Não há campanhas publicadas pela API do ThorTk para esta operação.", 409);
    }

    const token = decryptToken(current.connection.access_token_ciphertext);
    const byAdvertiser = new Map<string, CampaignRecord[]>();
    campaigns.forEach((campaign) => {
      byAdvertiser.set(campaign.advertiserId, [...(byAdvertiser.get(campaign.advertiserId) ?? []), campaign]);
    });
    const completed: CampaignRecord[] = [];
    const failed: { advertiserId: string; campaignIds: string[]; message: string }[] = [];
    for (const [advertiserId, records] of byAdvertiser) {
      for (const batch of chunks(records, 20)) {
        try {
          if (body.action === "activate") {
            await activateCampaigns(token, advertiserId, batch.map((campaign) => campaign.id));
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

    if (completed.length) {
      const action = body.action === "delete" ? "deleted" : "activated";
      const { error } = await current.admin.from("launch_logs").insert(completed.map((campaign) => ({
        launch_job_id: campaign.launchJobId,
        level: "success",
        stage: "campaign",
        message: action === "deleted" ? "Campanha excluída pelo controle ThorTk." : "Campanha ativada pelo controle ThorTk.",
        tiktok_entity_id: campaign.id,
        data: { action, managed_by: "thortk" },
      })));
      if (error) throw new Error("O TikTok confirmou a alteração, mas não foi possível registrar a auditoria local. Não repita a ação sem conferir o Ads Manager.");
    }

    return NextResponse.json({
      processed: completed.length,
      failed,
      campaigns: await registeredCampaigns(current),
    });
  } catch (error) {
    console.error("[tiktok:campaigns] management failed", error);
    return responseError(error instanceof Error ? error.message : "Não foi possível alterar as campanhas publicadas pela API.", 502);
  }
}
