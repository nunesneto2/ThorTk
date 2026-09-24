import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  bindCatalogWebsitePixel,
  createAd,
  createAdgroup,
  createCampaign,
  loadAdvertiserAssets,
  loadAdvertiserCampaigns,
  loadCatalogAvailableCountries,
  loadCatalogs,
  loadCatalogOverview,
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
  schedule_start_time?: string;
  schedule_end_time?: string;
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

// Catalog currencies only have one supported country in the launch flow. This
// prevents TikTok's opaque parameter error when, for example, a BRL catalog is
// sent with US targeting.
const CATALOG_CURRENCY_COUNTRY: Record<string, string> = {
  ARS: "AR", BOB: "BO", BRL: "BR", CAD: "CA", CLP: "CL", COP: "CO",
  MXN: "MX", PEN: "PE", PYG: "PY", UYU: "UY",
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

function tiktokDateTime(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
}

function campaignSchedule(delayMinutes: number) {
  const start = new Date(Date.now() + Math.max(0, delayMinutes) * 60_000);
  // TikTok requires an end timestamp whenever SCHEDULE_START_END is used.
  // Keep the set active for one year; campaign, groups and ads are still
  // initially created paused and are only enabled after the full tree exists.
  const end = new Date(start.getTime() + 365 * 24 * 60 * 60_000);
  return { start: tiktokDateTime(start), end: tiktokDateTime(end) };
}

function validTikTokDateTime(value: unknown) {
  const dateTime = typeof value === "string" ? value.trim() : "";
  return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateTime) ? dateTime : "";
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
    // Browser-provided times mirror Rocket's launch flow; fallback remains
    // available for direct API callers that do not provide a schedule.
    const fallbackSchedule = campaignSchedule(delay);
    const schedule = {
      start: validTikTokDateTime(body?.schedule_start_time) || fallbackSchedule.start,
      end: validTikTokDateTime(body?.schedule_end_time) || fallbackSchedule.end,
    };
    const startTime = schedule.start;
    const ages = (body?.ages ?? []).map((age) => AGE_GROUPS[age]).filter(Boolean);
    const operatingSystems = body?.operating_system === "ALL" || !body?.operating_system
      ? ["ANDROID", "IOS"]
      : [body.operating_system];
    const language = body?.language && body.language !== "all" ? [body.language] : undefined;
    const pixels = body?.pixels_by_advertiser ?? {};
    const identities = body?.identities_by_advertiser ?? {};
    const existingCampaignNames = new Map<string, Set<string>>();
    const identityTypes = new Map<string, string>();
    // The asset-list ID identifies the pixel to adgroup/create; the event
    // source bind endpoint above is the only catalog endpoint that takes its
    // Events Manager pixel_code.
    const pixelIds = new Map<string, string>();
    const pixelOptimizationEvents = new Map<string, string>();

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
    const selectedCatalog = catalogs.find((catalog) => catalog.id === catalogId);
    if (!selectedCatalog) {
      throw new Error("O catálogo selecionado não está disponível neste Business Center.");
    }
    if (selectedCatalog.businessCenterId && selectedCatalog.businessCenterId !== businessCenterId) {
      throw new Error(`O catálogo “${selectedCatalog.name}” pertence a outro Business Center. Selecione o BC proprietário antes de publicar.`);
    }
    if (selectedCatalog.adCreationEligible && selectedCatalog.adCreationEligible !== "AVAILABLE") {
      throw new Error(`O catálogo “${selectedCatalog.name}” ainda não está elegível para criação de anúncios no TikTok (${selectedCatalog.adCreationEligible}).`);
    }
    const catalogCountry = (selectedCatalog.country && /^[A-Z]{2}$/i.test(selectedCatalog.country)
      ? selectedCatalog.country.toUpperCase()
      : undefined)
      ?? (selectedCatalog.currency ? CATALOG_CURRENCY_COUNTRY[selectedCatalog.currency.toUpperCase()] : undefined);
    if (catalogCountry && country !== catalogCountry) {
      throw new Error(`O catálogo “${selectedCatalog.name}” usa ${selectedCatalog.currency}. Selecione ${catalogCountry} em País (location) antes de publicar.`);
    }
    try {
      const allowedCountries = await loadCatalogAvailableCountries(token, businessCenterId);
      if (allowedCountries.length && !allowedCountries.includes(country)) {
        throw new Error(`O catálogo “${selectedCatalog.name}” não aceita entrega em ${country}. Países permitidos pelo TikTok: ${allowedCountries.join(", ")}.`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "não disponível";
      if (message.includes("não aceita entrega")) throw error;
      await log("info", "preflight", "started", `Não foi possível confirmar os países permitidos pelo catálogo agora: ${message}`);
    }
    try {
      const catalogOverview = await loadCatalogOverview(token, businessCenterId, catalogId);
      if (catalogOverview.approved === 0) {
        throw new Error(`O catálogo “${selectedCatalog.name}” não tem produtos aprovados pelo TikTok; não é possível criar um anúncio de catálogo.`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "não disponível";
      if (message.includes("não tem produtos aprovados")) throw error;
      await log("info", "preflight", "started", `Não foi possível confirmar a auditoria dos produtos do catálogo agora: ${message}`);
    }

    for (const advertiserId of advertiserIds) {
      const advertiser = overview.advertisers.find((item) => item.id === advertiserId);
      if (advertiser?.businessCenterId && advertiser.businessCenterId !== businessCenterId) {
        throw new Error(`A conta ${advertiserId} pertence ao Business Center ${advertiser.businessCenterId}, mas o catálogo selecionado pertence ao BC ${businessCenterId}. Selecione conta e catálogo do mesmo BC.`);
      }
      const pixelId = pixels[advertiserId]?.trim();
      const identityId = identities[advertiserId]?.trim();
      if (!pixelId || !identityId) {
        throw new Error(`Pixel ou Identity ausente na conta ${advertiserId}. Nenhuma campanha foi ativada.`);
      }
      const assets = await loadAdvertiserAssets(token, advertiserId);
      const selectedPixel = assets.pixels.find((pixel) => pixel.id === pixelId);
      if (!selectedPixel) {
        throw new Error(`O pixel selecionado não está disponível na conta ${advertiserId}.`);
      }
      if (!selectedPixel.pixelCode) {
        throw new Error(`O TikTok não retornou o código do pixel “${selectedPixel.name}”. Atualize os ativos da conta antes de publicar.`);
      }
      // The display label in Events Manager ("Purchase") is not the value
      // accepted by adgroup/create. TikTok returns the account-specific
      // creation enum alongside the pixel's measured events. Do not infer or
      // create an event: use the value that this exact account/pixel returns.
      const purchaseEvent = selectedPixel.pixelEvents?.find((event) => {
        const values = [event.name, event.eventType, event.eventCode]
          .filter((value): value is string => Boolean(value))
          .map((value) => value.replace(/[^a-z0-9]/gi, "").toUpperCase());
        return values.includes("PURCHASE");
      });
      if (!purchaseEvent?.optimizationEvent) {
        const reported = selectedPixel.pixelEvents?.length
          ? selectedPixel.pixelEvents.map((event) => `${event.name}${event.optimizationEvent ? ` → ${event.optimizationEvent}` : ""}`).join(", ")
          : "nenhum evento retornado";
        throw new Error(`O TikTok não expôs um Purchase otimável para o pixel “${selectedPixel.name}” nesta conta (${reported}). A publicação foi interrompida antes de criar campanha; não será criado ou alterado nenhum evento.`);
      }
      await log(
        "success",
        "preflight",
        "succeeded",
        `Pixel “${selectedPixel.name}”: ID ${selectedPixel.id}, código ${selectedPixel.pixelCode}; Purchase confirmado pelo TikTok como ${purchaseEvent.optimizationEvent}.`,
      );
      await log(
        "info",
        "preflight",
        "started",
        `Vinculando o pixel “${selectedPixel.name}” (${selectedPixel.pixelCode}) ao catálogo selecionado.`,
      );
      try {
        await bindCatalogWebsitePixel(token, {
          advertiserId,
          businessCenterId,
          catalogId,
          pixelCode: selectedPixel.pixelCode,
        });
        await log("success", "preflight", "succeeded", `Pixel “${selectedPixel.name}” conectado ao catálogo.`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (!/already|exist|bound|duplicat/i.test(message)) throw error;
        await log("success", "preflight", "succeeded", `Pixel “${selectedPixel.name}” já estava conectado ao catálogo.`);
      }
      pixelIds.set(advertiserId, selectedPixel.id);
      pixelOptimizationEvents.set(advertiserId, purchaseEvent.optimizationEvent);
      const selectedIdentity = assets.identities.find((identity) => identity.id === identityId);
      if (!selectedIdentity) {
        throw new Error(`A Identity selecionada não está disponível na conta ${advertiserId}.`);
      }
      if (selectedIdentity.type) identityTypes.set(advertiserId, selectedIdentity.type);
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
      const pixelId = pixelIds.get(advertiserId);
      if (!pixelId) throw new Error(`ID do pixel não encontrado para a conta ${advertiserId}.`);
      const optimizationEvent = pixelOptimizationEvents.get(advertiserId);
      if (!optimizationEvent) throw new Error(`Evento de otimização do pixel não encontrado para a conta ${advertiserId}.`);
      const identityId = identities[advertiserId]!.trim();
      const identityType = identityTypes.get(advertiserId);

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
          await log(
            "info",
            "adgroup",
            "started",
            `Criando grupo ${groupIndex + 1}/${groupCount} da campanha ${campaignId}: ${country}, início ${startTime} UTC, término ${schedule.end} UTC.`,
          );
          const adgroupPayload: Record<string, unknown> = {
            advertiser_id: advertiserId,
            campaign_id: campaignId,
            adgroup_name: groupLabel,
            // PRODUCT_SALES is the campaign objective. The ad group itself
            // must declare the website promotion surface for catalog traffic.
            promotion_type: "WEBSITE",
            // PRODUCT_SALES catalog delivery is a Video Shopping Ad. TikTok
            // requires both fields below even when no remarketing audience is
            // selected; omitting them produces only the generic parameter error.
            shopping_ads_type: "VIDEO",
            shopping_ads_retargeting_type: "OFF",
            product_source: "CATALOG",
            catalog_id: catalogId,
            catalog_authorized_bc_id: businessCenterId,
            identity_id: identityId,
            ...(identityType ? { identity_type: identityType } : {}),
            ...(identityType === "BC_AUTH_TT" ? { identity_authorized_bc_id: businessCenterId } : {}),
            // adgroup/create uses the numeric asset ID. The Events Manager
            // code is used only in catalog/eventsource/bind above.
            pixel_id: pixelId,
            billing_event: "OCPM",
            optimization_goal: "CONVERT",
            // Read from pixels[].events[].optimization_event in the TikTok
            // response for this selected pixel. The UI label "Purchase" is
            // not itself a safe API enum.
            optimization_event: optimizationEvent,
            placement_type: "PLACEMENT_TYPE_NORMAL",
            placements: ["PLACEMENT_TIKTOK"],
            budget,
            budget_mode: "BUDGET_MODE_DAY",
            pacing: "PACING_MODE_SMOOTH",
            schedule_start_time: startTime,
            schedule_end_time: schedule.end,
            schedule_type: "SCHEDULE_START_END",
            location_ids: [locationId],
            ...(language ? { languages: language } : {}),
            ...(ages.length ? { age_groups: ages } : {}),
            ...(operatingSystems ? { operating_systems: operatingSystems } : {}),
            gender: "GENDER_UNLIMITED",
            operation_status: "DISABLE",
          };

          const createWithPlacementFallback = async () => {
            try {
              return await createAdgroup(token, adgroupPayload);
            } catch (error) {
              const message = error instanceof Error ? error.message : "";
              if (!message.includes("Parameter error")) throw error;

              // Keep the catalog and customized identity bindings, which are
              // required by the Rocket/TikTok catalog flow. Isolate only the
              // optional placement mode on the retry, in the same campaign.
              await log(
                "info",
                "adgroup",
                "started",
                "TikTok recusou a primeira variação; mantendo catálogo, BC e Identity e repetindo sem o modo opcional de placement.",
              );
              const minimalCatalogPayload = { ...adgroupPayload };
              delete minimalCatalogPayload.placement_type;
              return createAdgroup(token, minimalCatalogPayload);
            }
          };

          const groupResponse = await createWithPlacementFallback();
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
                identity_type: identityType ?? "CUSTOMIZED_USER",
                ...(identityType === "BC_AUTH_TT" ? { identity_authorized_bc_id: businessCenterId } : {}),
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
