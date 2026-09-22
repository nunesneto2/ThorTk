const API_BASE = "https://business-api.tiktok.com/open_api/v1.3";

type TikTokEnvelope = {
  code?: number | string;
  message?: string;
  request_id?: string;
  data?: Record<string, unknown>;
};

export type Choice = { id: string; name: string; currency?: string; status?: string; type?: string; selected?: boolean };
export type AssetOverview = { businessCenters: Choice[]; advertisers: Choice[]; warnings: string[] };
export type AdvertiserAssets = { advertiser: Choice | null; pixels: Choice[]; identities: Choice[]; warnings: string[] };

class TikTokApiError extends Error {
  constructor(message: string) { super(message); this.name = "TikTokApiError"; }
}

function readText(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function dataItems(data: Record<string, unknown> | undefined): Record<string, unknown>[] {
  if (!data) return [] as Record<string, unknown>[];
  for (const key of ["list", "item_list", "bc_list", "business_center_list", "business_centers", "bc_info_list", "advertiser_list", "catalog_list", "pixel_list", "identity_list"]) {
    const value = data[key];
    if (Array.isArray(value)) return value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object");
    if (value && typeof value === "object") {
      const nested = dataItems(value as Record<string, unknown>);
      if (nested.length) return nested;
    }
  }
  return [] as Record<string, unknown>[];
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

function normalize(items: Record<string, unknown>[], kind: "bc" | "advertiser" | "catalog" | "pixel" | "identity"): Choice[] {
  const ids: Record<typeof kind, string[]> = {
    bc: ["bc_id", "business_center_id", "id"],
    advertiser: ["advertiser_id", "id"],
    catalog: ["catalog_id", "id"],
    pixel: ["pixel_id", "id", "code"],
    identity: ["identity_id", "id"],
  };
  const names: Record<typeof kind, string[]> = {
    bc: ["bc_name", "business_center_name", "name"],
    advertiser: ["advertiser_name", "name"],
    catalog: ["catalog_name", "name"],
    pixel: ["pixel_name", "name", "code"],
    identity: ["display_name", "identity_name", "name"],
  };
  return items.flatMap((item) => {
    const id = ids[kind].map((key) => readText(item[key])).find(Boolean);
    if (!id) return [];
    const name = names[kind].map((key) => readText(item[key])).find(Boolean) || id;
    const currency = ["currency", "advertiser_currency", "catalog_currency"].map((key) => readText(item[key])).find(Boolean);
    const status = ["status", "advertiser_status"].map((key) => readText(item[key])).find(Boolean);
    const type = kind === "identity" ? readText(item.identity_type) : undefined;
    return [{ id, name, currency: currency || undefined, status: status || undefined, type: type || undefined }];
  });
}

async function request<T extends Record<string, unknown> = Record<string, unknown>>(path: string, token: string, query: Record<string, string | number | undefined> = {}) {
  const url = new URL(`${API_BASE}${path}`);
  Object.entries(query).forEach(([key, value]) => { if (value !== undefined) url.searchParams.set(key, String(value)); });
  const response = await fetch(url, { headers: { Accept: "application/json", "Access-Token": token }, cache: "no-store" });
  const payload = await response.json().catch(() => null) as TikTokEnvelope | null;
  const code = Number(payload?.code ?? 0);
  if (!response.ok || code !== 0) throw new TikTokApiError(payload?.message || "O TikTok não retornou os ativos solicitados.");
  return (payload?.data ?? {}) as T;
}

async function requestPost<T extends Record<string, unknown> = Record<string, unknown>>(path: string, token: string, body: Record<string, unknown>) {
  const response = await fetch(`${API_BASE}${path}`, { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json", "Access-Token": token }, body: JSON.stringify(body), cache: "no-store" });
  const payload = await response.json().catch(() => null) as TikTokEnvelope | null;
  const code = Number(payload?.code ?? 0);
  if (!response.ok || code !== 0) throw new TikTokApiError(payload?.message || "O TikTok não concluiu a alteração solicitada.");
  return (payload?.data ?? {}) as T;
}

function result<T>(value: Promise<T>, label: string) {
  return value.then((data) => ({ data, warning: null as string | null })).catch((error: unknown) => ({ data: null, warning: `${label}: ${error instanceof Error ? error.message : "indisponível"}` }));
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
  const advertiserInfo = authorizedAdvertisers.length ? await result(request("/advertiser/info/", accessToken, {
    advertiser_ids: JSON.stringify(authorizedAdvertisers.map((item) => item.id)),
    fields: JSON.stringify(["advertiser_id", "name", "currency", "status"]),
  }), "Status das contas") : { data: null, warning: null as string | null };
  const recordsById = new Map(normalize(dataItems(advertiserInfo.data ?? undefined), "advertiser").map((item) => [item.id, item]));
  const advertiserChoices = authorizedAdvertisers.map((item) => {
    const current = recordsById.get(item.id);
    return current ? { ...item, name: current.name || item.name, currency: current.currency || item.currency, status: current.status } : item;
  });
  let businessCenters = normalize(dataItems(bc.data ?? undefined), "bc");
  let derivedWarning: string | null = null;

  // Some authorizations expose advertiser access but omit the BC collection.
  // In that case the account owner_bc_id is still enough to manage its BC.
  if (!businessCenters.length) {
    businessCenters = businessCentersFromAdvertisers(advertiserItems);
    if (!businessCenters.length && advertiserChoices.length) {
      const owners = await result(request("/advertiser/info/", accessToken, {
        advertiser_ids: JSON.stringify(advertiserChoices.map((item) => item.id)),
        fields: JSON.stringify(["advertiser_id", "name", "owner_bc_id"]),
      }), "Business Centers das contas");
      businessCenters = businessCentersFromAdvertisers(dataItems(owners.data ?? undefined));
      derivedWarning = owners.warning;
    }
  }

  return {
    businessCenters,
    advertisers: advertiserChoices,
    warnings: [bc.warning, advertisers.warning, advertiserInfo.warning, derivedWarning].filter((warning): warning is string => Boolean(warning)),
  };
}

export async function loadCatalogs(accessToken: string, businessCenterId: string) {
  const data = await request("/catalog/get/", accessToken, { bc_id: businessCenterId, page: 1, page_size: 50 });
  return normalize(dataItems(data), "catalog");
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
    result(request("/pixel/list/", accessToken, { advertiser_id: advertiserId, page: 1, page_size: 20 }), "Pixels"),
    result(request("/identity/get/", accessToken, { advertiser_id: advertiserId }), "Identidades"),
  ]);
  const advertiser = normalize(dataItems(info.data ?? undefined), "advertiser")[0] ?? null;
  return {
    advertiser,
    pixels: normalize(dataItems(pixels.data ?? undefined), "pixel"),
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
