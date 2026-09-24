import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  createAd,
  createAdgroup,
  createCampaign,
  loadAdvertiserAssets,
  loadAdvertiserCampaigns,
  loadCatalogs,
  loadOverview,
  updateAdgroupStatus,
  updateAdStatus,
  updateCampaignStatus,
} from "@/lib/tiktok/assets";
import { decryptToken } from "@/lib/tiktok/oauth";

export const maxDuration = 60;

type LaunchLog = {
  level: "info" | "success" | "error";
  stage: "preflight" | "campaign" | "adgroup" | "ad" | "activation";
  status: "started" | "succeeded" | "failed";
  message: string;
  entityId?: string;
  timestamp: string;
};

type LaunchRequest = {
  advertiser_ids?: string[];
  business_center_id?: string;
  catalog_id?: string;
  campaign_name?: string;
  budget_per_adgroup?: number;
  campaigns?: number;
  adgroups_per_campaign?: number;
  ads_per_adgroup?: number;
  start_delay_minutes?: number;
  country?: string;
  language?: string;
  ages?: string[];
  operating_system?: "ALL" | "ANDROID" | "IOS";
  click_window?: string;
  view_window?: string;
  counting?: string;
  cta?: string;
  ad_text?: string;
  pixels_by_advertiser?: Record<string, string>;
  identities_by_advertiser?: Record<string, string>;
};

// TikTok accepts GeoNames location identifiers in campaign targeting. These
// are only used for the country choices exposed by the product UI; an unknown
// country is rejected rather than accidentally broadening the audience.
const COUNTRY_LOCATION_IDS: Record<string, string> = {
  AR: "3865483", AT: "2782113", BE: "2802361", BO: "3923057",
  BR: "3469034", CA: "6251999", CH: "2658434", CL: "3895114",
  CO: "3686110", CZ: "3077311", DE: "2921044", DK: "2623032",
  EC: "3658394", ES: "2510769", FI: "660013", FR: "3017382",
  GB: "2635167", GR: "390903", HU: "719819", IE: "2963597",
  IT: "3175395", MX: "3996063", NL: "2750405", NO: "3144096",
  PE: "3932488", PL: "798544", PT: "2264397", PY: "3437598",
  RO: "798549", SE: "2661886", US: "6252001", UY: "3439705",
};

const AGE_GROUPS: Record<string, string> = {
  "13–17": "AGE_13_17",
  "18–24": "AGE_18_24",
  "25–34": "AGE_25_34",
  "35–44": "AGE_35_44",
  "45–54": "AGE_45_54",
  "55+": "AGE_55_100",
};

function cleanIds(value: unknown) {
  return [...new Set((Array.isArray(value) ? value : [])
    .map((item) => String(item).trim())
    .filter(Boolean))];
}

function positiveInt(value: unknown, fallback = 1) {
  const number = Math.floor(Number(value));
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function campaignStart(delayMinutes: number) {
  const date = new Date(Date.now() + Math.max(0, delayMinutes) * 60_000);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
}

function uniqueCampaignName(baseName: string, existingNames: Set<string>) {
  if (!existingNames.has(baseName)) {
    existingNames.add(baseName);
    return baseName;
  }

  for (let attempt = 0; attempt < 900; attempt += 1) {
    const candidate = `${baseName} ${randomInt(100, 1000)}`;
    if (!existingNames.has(candidate)) {
      existingNames.add(candidate);
      return candidate;
    }
  }
  throw new Error(`Não foi possível gerar um nome único para a campanha “${baseName}”.`);
}

function entityId(data: Record<string, unknown>, keys: string[]) {
  const seen = new Set<unknown>();
  const find = (value: unknown): string => {
    if (!value || typeof value !== "object" || seen.has(value)) return "";
    seen.add(value);
    const record = value as Record<string, unknown>;
    for (const key of keys) {
      const candidate = record[key];
      if (typeof candidate === "string" || typeof candidate === "number") return String(candidate);
    }
    for (const candidate of Object.values(record)) {
      const result = find(candidate);
      if (result) return result;
    }
    return "";
  };
  return find(data);
}

async function activeConnection() {
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
  return { connection, admin, userId };
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as LaunchRequest | null;
  const stream = new TransformStream<Uint8Array, Uint8Array>();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();

  void (async () => {
    const logs: LaunchLog[] = [];
    let currentStage: LaunchLog["stage"] = "preflight";
    const created = { campaigns: 0, adgroups: 0, ads: 0 };
    let completedOperations = 0;
    let totalOperations = 0;

    const emit = async (event: "log" | "progress" | "completed" | "failed", payload: unknown) => {
      await writer.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`));
    };
    const log = async (
      level: LaunchLog["level"],
      stage: LaunchLog["stage"],
      status: LaunchLog["status"],
      message: string,
      entityId?: string,
    ) => {
      currentStage = stage;
      const entry: LaunchLog = {
        level,
        stage,
        status,
        message,
        ...(entityId ? { entityId } : {}),
        timestamp: new Date().toISOString(),
      };
      logs.push(entry);
      await emit("log", entry);
      return entry;
    };
    const progress = async () => {
      completedOperations += 1;
      await emit("progress", {
        current: completedOperations,
        total: totalOperations,
        created,
      });
    };

    try {
    const advertiserIds = cleanIds(body?.advertiser_ids);
    const catalogId = body?.catalog_id?.trim() ?? "";
    const businessCenterId = body?.business_center_id?.trim() ?? "";
    const campaignName = body?.campaign_name?.trim() ?? "";
    const budget = Number(body?.budget_per_adgroup);
    const country = body?.country?.toUpperCase() ?? "";
    if (!advertiserIds.length || !catalogId || !businessCenterId || !campaignName) {
      throw new Error("Complete contas, Business Center, catálogo e nome antes de publicar.");
    }
    if (!Number.isFinite(budget) || budget <= 0) {
      throw new Error("Informe um orçamento diário por grupo maior que zero.");
    }
    const locationId = COUNTRY_LOCATION_IDS[country];
    if (!locationId) throw new Error("O país selecionado ainda não possui localização TikTok configurada.");

    await log("info", "preflight", "started", "Validando autorização, contas e configuração antes de publicar.");
    const current = await activeConnection();
    if (!current?.connection) throw new Error("Conecte o TikTok antes de iniciar a publicação.");
    const { connection, admin, userId } = current;
    const token = decryptToken(connection.access_token_ciphertext);
    const overview = await loadOverview(token);
    const allowed = new Set(overview.advertisers.map((item) => item.id));
    const blocked = advertiserIds.find((id) => !allowed.has(id));
    if (blocked) throw new Error(`A conta ${blocked} não pertence à autorização atual do TikTok.`);

    const campaignCount = positiveInt(body?.campaigns);
    const groupCount = positiveInt(body?.adgroups_per_campaign);
    const adCount = positiveInt(body?.ads_per_adgroup);
    const delay = Math.max(0, Math.floor(Number(body?.start_delay_minutes) || 0));
    const startTime = campaignStart(delay);
    const ages = (body?.ages ?? []).map((age) => AGE_GROUPS[age]).filter(Boolean);
    const operatingSystems = body?.operating_system === "ALL" || !body?.operating_system
      ? undefined
      : [body.operating_system];
    const language = body?.language && body.language !== "all" ? [body.language] : undefined;
    const pixels = body?.pixels_by_advertiser ?? {};
    const identities = body?.identities_by_advertiser ?? {};
    const existingCampaignNames = new Map<string, Set<string>>();

    const { data: businessCenter, error: businessCenterError } = await admin
      .from("tiktok_business_centers")
      .select("bc_id")
      .eq("user_id", userId)
      .eq("bc_id", businessCenterId)
      .eq("is_selected", true)
      .maybeSingle();
    if (businessCenterError) throw businessCenterError;
    if (!businessCenter) {
      throw new Error("Selecione e conecte o Business Center antes de publicar.");
    }

    const catalogs = await loadCatalogs(token, businessCenterId);
    if (!catalogs.some((catalog) => catalog.id === catalogId)) {
      throw new Error("O catálogo selecionado não está disponível neste Business Center.");
    }

    for (const advertiserId of advertiserIds) {
      const pixelId = pixels[advertiserId]?.trim();
      const identityId = identities[advertiserId]?.trim();
      if (!pixelId || !identityId) {
        throw new Error(`Pixel ou Identity ausente na conta ${advertiserId}. Nenhuma campanha foi ativada.`);
      }
      const assets = await loadAdvertiserAssets(token, advertiserId);
      if (!assets.pixels.some((pixel) => pixel.id === pixelId)) {
        throw new Error(`O pixel selecionado não está disponível na conta ${advertiserId}.`);
      }
      if (!assets.identities.some((identity) => identity.id === identityId)) {
        throw new Error(`A Identity selecionada não está disponível na conta ${advertiserId}.`);
      }
      const currentCampaigns = await loadAdvertiserCampaigns(token, advertiserId);
      existingCampaignNames.set(
        advertiserId,
        new Set(currentCampaigns.map((campaign) => campaign.name)),
      );
    }

    totalOperations = advertiserIds.length * campaignCount * (1 + groupCount + groupCount * adCount + 1);
    await log(
      "success",
      "preflight",
      "succeeded",
      `Validação concluída. BC, catálogo, pixels e Identities confirmados. ${totalOperations} ação(ões) serão executadas em sequência; início no TikTok: ${delay ? `+${delay} min` : "agora"}.`,
    );

    for (const advertiserId of advertiserIds) {
      const pixelId = pixels[advertiserId]!.trim();
      const identityId = identities[advertiserId]!.trim();

      for (let campaignIndex = 0; campaignIndex < campaignCount; campaignIndex += 1) {
        const suffix = campaignCount > 1 ? ` ${String(campaignIndex + 1).padStart(2, "0")}` : "";
        const requestedCampaignLabel = `${campaignName}${suffix}`;
        const campaignLabel = uniqueCampaignName(
          requestedCampaignLabel,
          existingCampaignNames.get(advertiserId) ?? new Set<string>(),
        );
        if (campaignLabel !== requestedCampaignLabel) {
          await log(
            "info",
            "campaign",
            "started",
            `O nome “${requestedCampaignLabel}” já existe; usando “${campaignLabel}”.`,
          );
        }
        await log("info", "campaign", "started", `Criando campanha “${campaignLabel}” na conta ${advertiserId}.`);
        const campaignResponse = await createCampaign(token, {
          advertiser_id: advertiserId,
          campaign_name: campaignLabel,
          objective_type: "PRODUCT_SALES",
          campaign_type: "REGULAR_CAMPAIGN",
          // ABO: the campaign has no own cap; every ad group below owns its
          // daily budget (BUDGET_MODE_DAY + budget).
          budget_mode: "BUDGET_MODE_INFINITE",
          campaign_product_source: "CATALOG",
          catalog_enabled: true,
          operation_status: "DISABLE",
        });
        const campaignId = entityId(campaignResponse, ["campaign_id", "id"]);
        if (!campaignId) throw new Error("O TikTok não retornou o ID da campanha criada.");
        created.campaigns += 1;
        await log("success", "campaign", "succeeded", `Campanha criada e mantida pausada.`, campaignId);
        await progress();

        const adgroupIds: string[] = [];
        const adIds: string[] = [];
        for (let groupIndex = 0; groupIndex < groupCount; groupIndex += 1) {
          const groupLabel = `${campaignLabel} · Grupo ${String(groupIndex + 1).padStart(2, "0")}`;
          await log("info", "adgroup", "started", `Criando grupo ${groupIndex + 1}/${groupCount} da campanha ${campaignId}.`);
          const groupResponse = await createAdgroup(token, {
            advertiser_id: advertiserId,
            campaign_id: campaignId,
            adgroup_name: groupLabel,
            // PRODUCT_SALES is the campaign objective. The ad group itself
            // must declare the website promotion surface for catalog traffic.
            promotion_type: "WEBSITE",
            product_source: "CATALOG",
            catalog_id: catalogId,
            catalog_authorized_bc_id: businessCenterId,
            identity_id: identityId,
            pixel_id: pixelId,
            billing_event: "OCPM",
            optimization_goal: "CONVERT",
            // The v1.3 API names the website purchase event ON_WEB_ORDER.
            optimization_event: "ON_WEB_ORDER",
            placements: ["PLACEMENT_TIKTOK"],
            budget,
            budget_mode: "BUDGET_MODE_DAY",
            pacing: "PACING_MODE_SMOOTH",
            schedule_start_time: startTime,
            schedule_type: "SCHEDULE_START_END",
            location_ids: [locationId],
            ...(language ? { languages: language } : {}),
            ...(ages.length ? { age_groups: ages } : {}),
            ...(operatingSystems ? { operating_systems: operatingSystems } : {}),
            operation_status: "DISABLE",
          });
          const adgroupId = entityId(groupResponse, ["adgroup_id", "id"]);
          if (!adgroupId) throw new Error(`O TikTok não retornou o ID do grupo da campanha ${campaignId}.`);
          adgroupIds.push(adgroupId);
          created.adgroups += 1;
          await log("success", "adgroup", "succeeded", `Grupo criado e mantido pausado.`, adgroupId);
          await progress();

          for (let adIndex = 0; adIndex < adCount; adIndex += 1) {
            await log("info", "ad", "started", `Criando anúncio ${adIndex + 1}/${adCount} do grupo ${adgroupId}.`);
            const adResponse = await createAd(token, {
              advertiser_id: advertiserId,
              adgroup_id: adgroupId,
              creatives: [{
                ad_name: `${campaignLabel} · Anúncio ${String(adIndex + 1).padStart(2, "0")}`,
                ad_text: body?.ad_text?.trim() || campaignName,
                call_to_action: body?.cta || "LEARN_MORE",
                catalog_id: catalogId,
                identity_id: identityId,
                identity_authorized_bc_id: businessCenterId,
                identity_type: "CUSTOMIZED_USER",
                dynamic_format: "DYNAMIC_PRODUCT_ADS",
                operation_status: "DISABLE",
              }],
            });
            const adId = entityId(adResponse, ["ad_id", "id"]);
            if (!adId) throw new Error(`O TikTok não retornou o ID do anúncio do grupo ${adgroupId}.`);
            adIds.push(adId);
            created.ads += 1;
            await log("success", "ad", "succeeded", `Anúncio de catálogo criado e mantido pausado.`, adId);
            await progress();
          }
        }

        // Activate only a complete campaign tree. A validation failure above
        // leaves the campaign paused and immediately stops the operation.
        await log("info", "activation", "started", `Ativando a estrutura completa da campanha ${campaignId}.`);
        if (adIds.length) await updateAdStatus(token, advertiserId, adIds, "ENABLE");
        if (adgroupIds.length) await updateAdgroupStatus(token, advertiserId, adgroupIds, "ENABLE");
        await updateCampaignStatus(token, advertiserId, [campaignId], "ENABLE");
        await log("success", "activation", "succeeded", `Estrutura completa ativada no TikTok.`, campaignId);
        await progress();
      }
    }

    await emit("completed", {
      status: "completed",
      created,
      start_time: startTime,
      logs,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "O TikTok não confirmou a publicação.";
    await log("error", currentStage, "failed", message);
    await emit("failed", { status: "failed", created, logs, error: message });
  } finally {
    await writer.close();
  }
  })();

  return new NextResponse(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
