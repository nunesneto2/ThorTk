const API_BASE = "https://business-api.tiktok.com/open_api/v1.3";
const TIKTOK_ADVERTISER_BATCH_SIZE = 100;

type TikTokEnvelope = {
  code?: number | string;
  message?: string;
  request_id?: string;
  data?: Record<string, unknown>;
};

export type Choice = {
  id: string;
  name: string;
  /** TikTok's Events Manager code (for example, D8D5…). */
  pixelCode?: string;
  /** Events returned by /pixel/list for this exact pixel/account pair. */
  pixelEvents?: PixelEvent[];
  currency?: string;
  status?: string;
  type?: string;
  country?: string;
  businessCenterId?: string;
  adCreationEligible?: string;
  selected?: boolean;
};
export type PixelEvent = {
  name: string;
  eventType?: string;
  optimizationEvent?: string;
  eventCode?: string;
};
export type AssetOverview = { businessCenters: Choice[]; advertisers: Choice[]; warnings: string[] };
export type AdvertiserAssets = { advertiser: Choice | null; pixels: Choice[]; identities: Choice[]; warnings: string[] };
export type BusinessCenterFinance = {
  businessCenterId: string;
  todaySpend: number | null;
  balance: number | null;
  currency?: string;
  updatedAt: string;
  warnings: string[];
};

class TikTokApiError extends Error {
  constructor(message: string, requestId?: string) {
    super(requestId ? `${message} (request_id TikTok: ${requestId})` : message);
    this.name = "TikTokApiError";
  }
}

function readText(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function readNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function findValue(
  value: unknown,
  keys: string[],
  depth = 0,
): unknown {
  if (!value || depth > 5 || typeof value !== "object") return undefined;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findValue(item, keys, depth + 1);
      if (found !== undefined) return found;
    }
    return undefined;
  }
  const record = value as Record<string, unknown>;
  for (const key of keys) {
    if (record[key] !== undefined) return record[key];
  }
  for (const item of Object.values(record)) {
    const found = findValue(item, keys, depth + 1);
    if (found !== undefined) return found;
  }
  return undefined;
}

function pixelEvents(item: Record<string, unknown>): PixelEvent[] {
  if (!Array.isArray(item.events)) return [];
  return item.events.flatMap((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return [];
    const event = value as Record<string, unknown>;
    const name = readText(event.name) || readText(event.event_type) || readText(event.event_code);
    if (!name) return [];
    const eventType = readText(event.event_type);
    const optimizationEvent = readText(event.optimization_event);
    const eventCode = readText(event.event_code);
    return [{
      name,
      eventType: eventType || undefined,
      optimizationEvent: optimizationEvent || undefined,
      eventCode: eventCode || undefined,
    }];
  });
}

function dataItems(data: Record<string, unknown> | undefined): Record<string, unknown>[] {
  if (!data) return [] as Record<string, unknown>[];
  for (const key of ["list", "item_list", "data_list", "bc_list", "business_center_list", "business_centers", "bc_info_list", "advertiser_list", "catalog_list", "campaign_list", "pixel_list", "pixel_info_list", "pixel_infos", "pixels", "shared_pixel_list", "shared_pixels", "identity_list"]) {
    const value = data[key];
    if (Array.isArray(value)) return value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object");
    if (value && typeof value === "object") {
      const nested = dataItems(value as Record<string, unknown>);
      if (nested.length) return nested;
    }
  }
  return [] as Record<string, unknown>[];
}

function nestedRecordArrays(value: unknown, arrays: Record<string, unknown>[][] = [], depth = 0): Record<string, unknown>[][] {
  if (!value || depth > 5) return arrays;
  if (Array.isArray(value)) {
    const records = value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item));
    if (records.length) arrays.push(records);
    return arrays;
  }
  if (typeof value === "object") Object.values(value as Record<string, unknown>).forEach((item) => nestedRecordArrays(item, arrays, depth + 1));
  return arrays;
}

function itemsForKind(data: Record<string, unknown> | undefined, kind: "pixel"): Record<string, unknown>[] {
  const known = dataItems(data);
  if (normalize(known, kind).length || !data) return known;
  return nestedRecordArrays(data).find((items) => normalize(items, kind).length) ?? known;
}

function businessCentersFromAdvertisers(items: Record<string, unknown>[]): Choice[] {
  const centers = new Map<string, Choice>();
  for (const item of items) {
    const id = ["owner_bc_id", "bc_id", "business_center_id"].map((key) => readText(item[key])).find(Boolean);
    if (!id || centers.has(id)) continue;
    const name = ["owner_bc_name", "bc_name", "business_center_name"].map((key) => readText(item[key])).find(Boolean) || `Business Center ${id}`;
    centers.set(id, { id, name });
  }
  return [...centers.values()];
}

function normalize(items: Record<string, unknown>[], kind: "bc" | "advertiser" | "catalog" | "pixel" | "identity" | "campaign"): Choice[] {
  const ids: Record<typeof kind, string[]> = {
    bc: ["bc_id", "business_center_id", "id"],
    advertiser: ["advertiser_id", "id"],
    catalog: ["catalog_id", "id"],
    pixel: ["pixel_id", "pixel_code", "id", "code"],
    identity: ["identity_id", "id"],
    campaign: ["campaign_id", "id"],
  };
  const names: Record<typeof kind, string[]> = {
    bc: ["bc_name", "business_center_name", "name"],
    advertiser: ["advertiser_name", "name"],
    catalog: ["catalog_name", "name"],
    pixel: ["pixel_name", "name", "pixel_code", "code"],
    identity: ["display_name", "identity_name", "name"],
    campaign: ["campaign_name", "name"],
  };
  return items.flatMap((item) => {
    const id = ids[kind].map((key) => readText(item[key])).find(Boolean);
    if (!id) return [];
    const name = names[kind].map((key) => readText(item[key])).find(Boolean) || id;
    const catalogConfig = kind === "catalog" && item.catalog_conf && typeof item.catalog_conf === "object"
      ? item.catalog_conf as Record<string, unknown>
      : undefined;
    const businessCenter = item.bc_info && typeof item.bc_info === "object"
      ? item.bc_info as Record<string, unknown>
      : undefined;
    const currency = [
      "currency",
      "advertiser_currency",
      "catalog_currency",
    ].map((key) => readText(item[key])).find(Boolean)
      || readText(catalogConfig?.currency);
    const status = ["status", "advertiser_status", "operation_status"].map((key) => readText(item[key])).find(Boolean);
    const type = kind === "identity" ? readText(item.identity_type) : undefined;
    const pixelCode = kind === "pixel"
      ? ["pixel_code", "code"].map((key) => readText(item[key])).find(Boolean)
      : undefined;
    const events = kind === "pixel" ? pixelEvents(item) : undefined;
    const country = kind === "catalog"
      ? readText(catalogConfig?.region_code) || readText(catalogConfig?.country)
      : undefined;
    const businessCenterId = kind === "advertiser"
      ? ["owner_bc_id", "bc_id", "business_center_id"].map((key) => readText(item[key])).find(Boolean)
      : kind === "catalog"
        ? ["bc_id", "business_center_id"].map((key) => readText(item[key])).find(Boolean) || readText(businessCenter?.bc_id)
        : undefined;
    const adCreationEligible = kind === "catalog" ? readText(item.ad_creation_eligible) : undefined;
    return [{
      id,
      name,
      currency: currency || undefined,
      status: status || undefined,
      type: type || undefined,
      pixelCode: pixelCode || undefined,
      pixelEvents: events?.length ? events : undefined,
      country: country || undefined,
      businessCenterId: businessCenterId || undefined,
      adCreationEligible: adCreationEligible || undefined,
    }];
  });
}

async function request<T extends Record<string, unknown> = Record<string, unknown>>(path: string, token: string, query: Record<string, string | number | undefined> = {}) {
  const url = new URL(`${API_BASE}${path}`);
  Object.entries(query).forEach(([key, value]) => { if (value !== undefined) url.searchParams.set(key, String(value)); });
  const response = await fetch(url, { headers: { Accept: "application/json", "Access-Token": token }, cache: "no-store" });
  const payload = await response.json().catch(() => null) as TikTokEnvelope | null;
  const code = Number(payload?.code ?? 0);
  if (!response.ok || code !== 0) {
    throw new TikTokApiError(
      payload?.message || "O TikTok não retornou os ativos solicitados.",
      payload?.request_id,
    );
  }
  return (payload?.data ?? {}) as T;
}

async function requestPost<T extends Record<string, unknown> = Record<string, unknown>>(path: string, token: string, body: Record<string, unknown>) {
  const response = await fetch(`${API_BASE}${path}`, { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json", "Access-Token": token }, body: JSON.stringify(body), cache: "no-store" });
  const payload = await response.json().catch(() => null) as TikTokEnvelope | null;
  const code = Number(payload?.code ?? 0);
  if (!response.ok || code !== 0) {
    throw new TikTokApiError(
      payload?.message || "O TikTok não concluiu a alteração solicitada.",
      payload?.request_id,
    );
  }
  return (payload?.data ?? {}) as T;
}

function result<T>(value: Promise<T>, label: string) {
  return value.then((data) => ({ data, warning: null as string | null })).catch((error: unknown) => ({ data: null, warning: `${label}: ${error instanceof Error ? error.message : "indisponível"}` }));
}

function advertiserBatches(ids: string[]) {
  const batches: string[][] = [];
  for (let index = 0; index < ids.length; index += TIKTOK_ADVERTISER_BATCH_SIZE) {
    batches.push(ids.slice(index, index + TIKTOK_ADVERTISER_BATCH_SIZE));
  }
  return batches;
}

export async function loadOverview(accessToken: string): Promise<AssetOverview> {
  const appId = process.env.TIKTOK_APP_ID?.trim();
  const secret = process.env.TIKTOK_APP_SECRET?.trim();
  if (!appId || !secret) throw new TikTokApiError("As credenciais do App TikTok não estão configuradas no servidor.");
  const [bc, advertisers] = await Promise.all([
    // TikTok v1.3 accepts at most 50 Business Centers per page.
    // Do not restrict the result to a scene: the connected user can belong to
    // Business Centers through more than one access model.
    result(request("/bc/get/", accessToken, { page: 1, page_size: 50 }), "Business Centers"),
    result(request("/oauth2/advertiser/get/", accessToken, { app_id: appId, secret }), "Contas de anúncio"),
  ]);
  const advertiserItems = dataItems(advertisers.data ?? undefined);
  const authorizedAdvertisers = normalize(advertiserItems, "advertiser");
  // /oauth2/advertiser/get confirms access but does not reliably include the
  // operating status. Fetch the current advertiser records before exposing
  // filters: treating a missing status as active caused suspended accounts to
  // appear in "Podem subir".
  const advertiserInfo = await Promise.all(
    advertiserBatches(authorizedAdvertisers.map((item) => item.id)).map((advertiserIds) =>
      result(request("/advertiser/info/", accessToken, {
        advertiser_ids: JSON.stringify(advertiserIds),
        fields: JSON.stringify(["advertiser_id", "name", "currency", "status", "owner_bc_id"]),
      }), "Status das contas"),
    ),
  );
  const recordsById = new Map(
    advertiserInfo.flatMap(({ data }) =>
      normalize(dataItems(data ?? undefined), "advertiser"),
    ).map((item) => [item.id, item]),
  );
  const advertiserChoices = authorizedAdvertisers.map((item) => {
    const current = recordsById.get(item.id);
    return current
      ? {
        ...item,
        name: current.name || item.name,
        currency: current.currency || item.currency,
        status: current.status,
        businessCenterId: current.businessCenterId || item.businessCenterId,
      }
      : item;
  });
  let businessCenters = normalize(dataItems(bc.data ?? undefined), "bc");
  let derivedWarning: string | null = null;

  // Some authorizations expose advertiser access but omit the BC collection.
  // In that case the account owner_bc_id is still enough to manage its BC.
  if (!businessCenters.length) {
    businessCenters = businessCentersFromAdvertisers(advertiserItems);
    if (!businessCenters.length && advertiserChoices.length) {
      const owners = await Promise.all(
        advertiserBatches(advertiserChoices.map((item) => item.id)).map((advertiserIds) =>
          result(request("/advertiser/info/", accessToken, {
            advertiser_ids: JSON.stringify(advertiserIds),
            fields: JSON.stringify(["advertiser_id", "name", "owner_bc_id"]),
          }), "Business Centers das contas"),
        ),
      );
      businessCenters = businessCentersFromAdvertisers(
        owners.flatMap(({ data }) => dataItems(data ?? undefined)),
      );
      derivedWarning = owners.map(({ warning }) => warning).filter(Boolean).join(" · ") || null;
    }
  }

  return {
    businessCenters,
    advertisers: advertiserChoices,
    warnings: [
      bc.warning,
      advertisers.warning,
      ...advertiserInfo.map(({ warning }) => warning),
      derivedWarning,
    ].filter((warning): warning is string => Boolean(warning)),
  };
}

export async function loadBusinessCenterFinance(
  accessToken: string,
  businessCenterId: string,
): Promise<BusinessCenterFinance> {
  const overview = await loadOverview(accessToken);
  const advertisers = overview.advertisers.filter(
    (item) => item.businessCenterId === businessCenterId,
  );
  const today = new Date().toISOString().slice(0, 10);
  const [balanceResult, ...spendResults] = await Promise.allSettled([
    request("/bc/balance/get/", accessToken, { bc_id: businessCenterId }),
    ...advertisers.map((advertiser) =>
      request("/report/integrated/get/", accessToken, {
        advertiser_id: advertiser.id,
        report_type: "BASIC",
        data_level: "AUCTION_ADVERTISER",
        dimensions: JSON.stringify(["stat_time_day"]),
        metrics: JSON.stringify(["spend"]),
        start_date: today,
        end_date: today,
      }),
    ),
  ]);

  const warnings = [...overview.warnings];
  let balance: number | null = null;
  let currency: string | undefined;
  if (balanceResult.status === "fulfilled") {
    balance = readNumber(
      findValue(balanceResult.value, [
        "available_balance",
        "valid_balance",
        "valid_account_balance",
        "account_balance",
        "balance",
      ]),
    );
    currency = readText(
      findValue(balanceResult.value, ["currency", "account_currency"]),
    ) || undefined;
    if (balance === null) {
      warnings.push("O TikTok não retornou um saldo disponível para esta BC.");
    }
  } else {
    warnings.push(
      `Saldo da BC: ${balanceResult.reason instanceof Error ? balanceResult.reason.message : "indisponível"}`,
    );
  }

  const spendValues = spendResults.flatMap((result) => {
    if (result.status === "rejected") {
      warnings.push(
        `Gasto de hoje: ${result.reason instanceof Error ? result.reason.message : "indisponível"}`,
      );
      return [];
    }
    const spend = readNumber(findValue(result.value, ["spend"]));
    return spend === null ? [0] : [spend];
  });
  if (!advertisers.length) {
    warnings.push("Nenhuma conta de anúncio vinculada a esta BC foi retornada para calcular o gasto de hoje.");
  }
  const currencies = [...new Set(advertisers.map((item) => item.currency).filter(Boolean))];
  return {
    businessCenterId,
    todaySpend: spendResults.length === advertisers.length ? spendValues.reduce((total, value) => total + value, 0) : null,
    balance,
    currency: currency || (currencies.length === 1 ? currencies[0] : undefined),
    updatedAt: new Date().toISOString(),
    warnings,
  };
}

export async function loadCatalogs(accessToken: string, businessCenterId: string) {
  const data = await request("/catalog/get/", accessToken, { bc_id: businessCenterId, page: 1, page_size: 50 });
  return normalize(dataItems(data), "catalog");
}

export type CatalogOverview = { approved?: number; rejected?: number; processing?: number };

export async function loadCatalogOverview(accessToken: string, businessCenterId: string, catalogId: string): Promise<CatalogOverview> {
  const data = await request("/catalog/overview/", accessToken, { bc_id: businessCenterId, catalog_id: catalogId });
  const count = (key: "approved" | "rejected" | "processing") => {
    const value = Number(data[key]);
    return Number.isFinite(value) ? value : undefined;
  };
  return { approved: count("approved"), rejected: count("rejected"), processing: count("processing") };
}

export async function loadCatalogAvailableCountries(accessToken: string, businessCenterId: string) {
  const data = await request("/catalog/available_country/get/", accessToken, { bc_id: businessCenterId });
  const values = data.region_codes;
  return Array.isArray(values)
    ? values.map((value) => readText(value).toUpperCase()).filter((value) => /^[A-Z]{2}$/.test(value))
    : [];
}

export async function loadAdvertiserCampaigns(accessToken: string, advertiserId: string) {
  const pageSize = 100;
  const firstPage = await request("/campaign/get/", accessToken, {
    advertiser_id: advertiserId,
    page: 1,
    page_size: pageSize,
    fields: JSON.stringify(["campaign_id", "campaign_name", "operation_status"]),
  });
  const pageInfo = firstPage.page_info as Record<string, unknown> | undefined;
  const total = Number(pageInfo?.total_number ?? pageInfo?.total ?? 0);
  const pages = Math.min(50, Math.max(1, Math.ceil(total / pageSize)));
  const items = dataItems(firstPage);
  for (let page = 2; page <= pages; page += 1) {
    const data = await request("/campaign/get/", accessToken, {
      advertiser_id: advertiserId,
      page,
      page_size: pageSize,
      fields: JSON.stringify(["campaign_id", "campaign_name", "operation_status"]),
    });
    items.push(...dataItems(data));
  }
  return normalize(items, "campaign");
}

export async function loadAdvertiserAssets(accessToken: string, advertiserId: string): Promise<AdvertiserAssets> {
  const [info, pixels, identities] = await Promise.all([
    // advertiser/info is a batch endpoint in v1.3. The supported field is
    // "name" (not "advertiser_name") and advertiser_ids must be an array.
    result(request("/advertiser/info/", accessToken, {
      advertiser_ids: JSON.stringify([advertiserId]),
      fields: JSON.stringify(["advertiser_id", "name", "currency", "country", "status"]),
    }), "Dados da conta"),
    // TikTok limits this endpoint to 20 pixels per page.
    result(request("/pixel/list/", accessToken, { advertiser_id: advertiserId, page: 1, page_size: 20, order_by: "LATEST_CREATE" }), "Pixels"),
    result(request("/identity/get/", accessToken, { advertiser_id: advertiserId }), "Identidades"),
  ]);
  const advertiser = normalize(dataItems(info.data ?? undefined), "advertiser")[0] ?? null;
  const pixelItems = itemsForKind(pixels.data ?? undefined, "pixel");
  const normalizedPixels = normalize(pixelItems, "pixel");
  if (!pixels.warning) console.info("[tiktok:assets] pixel lookup", { advertiserId, responseKeys: Object.keys(pixels.data ?? {}), rawItems: pixelItems.length, normalizedItems: normalizedPixels.length });
  return {
    advertiser,
    pixels: normalizedPixels,
    identities: normalize(dataItems(identities.data ?? undefined), "identity"),
    warnings: [info.warning, pixels.warning, identities.warning].filter((warning): warning is string => Boolean(warning)),
  };
}

export async function createCustomIdentity(accessToken: string, advertiserId: string, displayName: string, imageUri: string) {
  return requestPost("/identity/create/", accessToken, { advertiser_id: advertiserId, display_name: displayName, image_uri: imageUri });
}

export async function createPixel(accessToken: string, advertiserId: string, pixelName: string) {
  return requestPost("/pixel/create/", accessToken, { advertiser_id: advertiserId, pixel_category: "ONLINE_STORE", pixel_name: pixelName, partner_name: "ThorTk" });
}

/**
 * This is the API equivalent of Catalog Manager's “Connect now”. It links an
 * existing website pixel to the selected catalog; it does not create or alter
 * any pixel event.
 */
export async function bindCatalogWebsitePixel(accessToken: string, input: {
  advertiserId: string;
  businessCenterId: string;
  catalogId: string;
  pixelCode: string;
}) {
  return requestPost("/catalog/eventsource/bind/", accessToken, {
    advertiser_id: input.advertiserId,
    bc_id: input.businessCenterId,
    catalog_id: input.catalogId,
    pixel_code: input.pixelCode,
  });
}

/**
 * Campaign creation is deliberately kept server-side.  The caller builds the
 * body from the user's chosen configuration and this module only forwards it
 * to TikTok with the encrypted OAuth token.
 */
export async function createCampaign(accessToken: string, body: Record<string, unknown>) {
  return requestPost("/campaign/create/", accessToken, body);
}

export async function createAdgroup(accessToken: string, body: Record<string, unknown>) {
  return requestPost("/adgroup/create/", accessToken, body);
}

export async function createAd(accessToken: string, body: Record<string, unknown>) {
  return requestPost("/ad/create/", accessToken, body);
}

export async function updateCampaignStatus(accessToken: string, advertiserId: string, campaignIds: string[], operationStatus: "ENABLE" | "DISABLE") {
  return requestPost("/campaign/status/update/", accessToken, {
    advertiser_id: advertiserId,
    campaign_ids: campaignIds,
    operation_status: operationStatus,
  });
}

export async function updateAdgroupStatus(accessToken: string, advertiserId: string, adgroupIds: string[], operationStatus: "ENABLE" | "DISABLE") {
  return requestPost("/adgroup/status/update/", accessToken, {
    advertiser_id: advertiserId,
    adgroup_ids: adgroupIds,
    operation_status: operationStatus,
  });
}

export async function updateAdStatus(accessToken: string, advertiserId: string, adIds: string[], operationStatus: "ENABLE" | "DISABLE") {
  return requestPost("/ad/status/update/", accessToken, {
    advertiser_id: advertiserId,
    ad_ids: adIds,
    operation_status: operationStatus,
  });
}

export async function pauseCampaigns(accessToken: string, advertiserId: string, campaignIds: string[]) {
  return requestPost("/campaign/status/update/", accessToken, {
    advertiser_id: advertiserId,
    campaign_ids: campaignIds,
    operation_status: "DISABLE",
  });
}

export async function deleteCampaigns(accessToken: string, advertiserId: string, campaignIds: string[]) {
  return requestPost("/campaign/delete/", accessToken, {
    advertiser_id: advertiserId,
    campaign_ids: campaignIds,
  });
}
