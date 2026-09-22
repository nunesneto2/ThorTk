const API_BASE = "https://business-api.tiktok.com/open_api/v1.3";

type TikTokEnvelope = {
  code?: number | string;
  message?: string;
  request_id?: string;
  data?: Record<string, unknown>;
};

export type Choice = { id: string; name: string; currency?: string; status?: string; type?: string };
export type AssetOverview = { businessCenters: Choice[]; advertisers: Choice[]; warnings: string[] };
export type AdvertiserAssets = { advertiser: Choice | null; pixels: Choice[]; identities: Choice[]; warnings: string[] };

class TikTokApiError extends Error {
  constructor(message: string) { super(message); this.name = "TikTokApiError"; }
}

function readText(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function dataItems(data: Record<string, unknown> | undefined) {
  if (!data) return [] as Record<string, unknown>[];
  for (const key of ["list", "item_list", "advertiser_list", "catalog_list", "pixel_list", "identity_list"]) {
    const value = data[key];
    if (Array.isArray(value)) return value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object");
  }
  return [] as Record<string, unknown>[];
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

function result<T>(value: Promise<T>, label: string) {
  return value.then((data) => ({ data, warning: null as string | null })).catch((error: unknown) => ({ data: null, warning: `${label}: ${error instanceof Error ? error.message : "indisponível"}` }));
}

export async function loadOverview(accessToken: string): Promise<AssetOverview> {
  const appId = process.env.TIKTOK_APP_ID?.trim();
  const secret = process.env.TIKTOK_APP_SECRET?.trim();
  if (!appId || !secret) throw new TikTokApiError("As credenciais do App TikTok não estão configuradas no servidor.");
  const [bc, advertisers] = await Promise.all([
    result(request("/bc/get/", accessToken, { page: 1, page_size: 100, scene: "SINGLE_ACCOUNT" }), "Business Centers"),
    result(request("/oauth2/advertiser/get/", accessToken, { app_id: appId, secret }), "Contas de anúncio"),
  ]);
  return {
    businessCenters: normalize(dataItems(bc.data ?? undefined), "bc"),
    advertisers: normalize(dataItems(advertisers.data ?? undefined), "advertiser"),
    warnings: [bc.warning, advertisers.warning].filter((warning): warning is string => Boolean(warning)),
  };
}

export async function loadCatalogs(accessToken: string, businessCenterId: string) {
  const data = await request("/catalog/get/", accessToken, { bc_id: businessCenterId, page: 1, page_size: 100 });
  return normalize(dataItems(data), "catalog");
}

export async function loadAdvertiserAssets(accessToken: string, advertiserId: string): Promise<AdvertiserAssets> {
  const [info, pixels, identities] = await Promise.all([
    result(request("/advertiser/info/", accessToken, { advertiser_id: advertiserId, fields: '["advertiser_name","currency","country"]' }), "Dados da conta"),
    result(request("/pixel/list/", accessToken, { advertiser_id: advertiserId, page: 1, page_size: 100 }), "Pixels"),
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
