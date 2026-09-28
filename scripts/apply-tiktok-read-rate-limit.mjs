import fs from "node:fs";

const path = "src/lib/tiktok/assets.ts";
let source = fs.readFileSync(path, "utf8");

if (source.includes("TIKTOK_READ_MIN_INTERVAL_MS")) {
  console.log("TikTok read limiter already applied to", path);
  process.exit(0);
}

const before = `async function request<T extends Record<string, unknown> = Record<string, unknown>>(path: string, token: string, query: Record<string, string | number | undefined> = {}) {\n  const url = new URL(\`${API_BASE}\${path}\`);\n  Object.entries(query).forEach(([key, value]) => { if (value !== undefined) url.searchParams.set(key, String(value)); });\n  const response = await fetch(url, { headers: { Accept: \"application/json\", \"Access-Token\": token }, cache: \"no-store\" });\n  const payload = await response.json().catch(() => null) as TikTokEnvelope | null;\n  const code = Number(payload?.code ?? 0);\n  if (!response.ok || code !== 0) {\n    throw new TikTokApiError(\n      payload?.message || \"O TikTok não retornou os ativos solicitados.\",\n      payload?.request_id,\n    );\n  }\n  return (payload?.data ?? {}) as T;\n}\n`;

const after = `const TIKTOK_READ_MIN_INTERVAL_MS = 160; // ~6.25 reads/s, safely below the observed 10 QPS cap.\nconst TIKTOK_READ_MAX_RETRIES = 3;\nlet tiktokReadQueue = Promise.resolve();\nlet tiktokLastReadAt = 0;\n\nfunction sleep(ms: number) {\n  return new Promise<void>((resolve) => setTimeout(resolve, ms));\n}\n\nfunction isRateLimitMessage(message: string) {\n  return /too many requests|qps limit|rate.?limit|current qps/i.test(message);\n}\n\nasync function scheduleTikTokRead<T>(task: () => Promise<T>): Promise<T> {\n  let release!: () => void;\n  const previous = tiktokReadQueue;\n  tiktokReadQueue = new Promise<void>((resolve) => { release = resolve; });\n  await previous;\n  try {\n    const waitMs = Math.max(0, TIKTOK_READ_MIN_INTERVAL_MS - (Date.now() - tiktokLastReadAt));\n    if (waitMs) await sleep(waitMs);\n    tiktokLastReadAt = Date.now();\n    return await task();\n  } finally {\n    release();\n  }\n}\n\nasync function request<T extends Record<string, unknown> = Record<string, unknown>>(path: string, token: string, query: Record<string, string | number | undefined> = {}) {\n  const url = new URL(\`${API_BASE}\${path}\`);\n  Object.entries(query).forEach(([key, value]) => { if (value !== undefined) url.searchParams.set(key, String(value)); });\n\n  for (let attempt = 0; attempt <= TIKTOK_READ_MAX_RETRIES; attempt += 1) {\n    const result = await scheduleTikTokRead(async () => {\n      const response = await fetch(url, { headers: { Accept: \"application/json\", \"Access-Token\": token }, cache: \"no-store\" });\n      const payload = await response.json().catch(() => null) as TikTokEnvelope | null;\n      return { response, payload };\n    });\n\n    const code = Number(result.payload?.code ?? 0);\n    if (result.response.ok && code === 0) {\n      return (result.payload?.data ?? {}) as T;\n    }\n\n    const message = result.payload?.message || \"O TikTok não retornou os ativos solicitados.\";\n    const rateLimited = isRateLimitMessage(message) || result.response.status === 429;\n    if (!rateLimited || attempt === TIKTOK_READ_MAX_RETRIES) {\n      throw new TikTokApiError(message, result.payload?.request_id);\n    }\n\n    // Exponential backoff with jitter. Applies only to GET/read operations.\n    const backoffMs = Math.min(4_000, 700 * 2 ** attempt) + Math.floor(Math.random() * 250);\n    await sleep(backoffMs);\n  }\n\n  throw new TikTokApiError(\"O TikTok não retornou os ativos solicitados após novas tentativas.\");\n}\n`;

if (!source.includes(before)) {
  throw new Error("TikTok request() patch point not found; source changed.");
}

source = source.replace(before, after);
fs.writeFileSync(path, source);
console.log("Applied TikTok read limiter to", path);
