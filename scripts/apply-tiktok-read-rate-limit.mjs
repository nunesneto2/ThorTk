import fs from "node:fs";

const path = "src/lib/tiktok/assets.ts";
let source = fs.readFileSync(path, "utf8");

if (source.includes("TIKTOK_READ_MIN_INTERVAL_MS")) {
  console.log("TikTok read limiter already applied to", path);
  process.exit(0);
}

const startMarker = "async function request<T extends Record<string, unknown> = Record<string, unknown>>(path: string, token: string, query: Record<string, string | number | undefined> = {}) {";
const endMarker = "\nasync function requestPost<T extends Record<string, unknown> = Record<string, unknown>>";
const start = source.indexOf(startMarker);
const end = source.indexOf(endMarker, start);
if (start < 0 || end < 0) {
  throw new Error("TikTok request() patch point not found; source changed.");
}

const replacement = [
  "const TIKTOK_READ_MIN_INTERVAL_MS = 160; // ~6.25 reads/s, below the observed 10 QPS cap.",
  "const TIKTOK_READ_MAX_RETRIES = 3;",
  "let tiktokReadQueue = Promise.resolve();",
  "let tiktokLastReadAt = 0;",
  "",
  "function sleep(ms: number) {",
  "  return new Promise<void>((resolve) => setTimeout(resolve, ms));",
  "}",
  "",
  "function isRateLimitMessage(message: string) {",
  "  return /too many requests|qps limit|rate.?limit|current qps/i.test(message);",
  "}",
  "",
  "async function scheduleTikTokRead<T>(task: () => Promise<T>): Promise<T> {",
  "  let release!: () => void;",
  "  const previous = tiktokReadQueue;",
  "  tiktokReadQueue = new Promise<void>((resolve) => { release = resolve; });",
  "  await previous;",
  "  try {",
  "    const waitMs = Math.max(0, TIKTOK_READ_MIN_INTERVAL_MS - (Date.now() - tiktokLastReadAt));",
  "    if (waitMs) await sleep(waitMs);",
  "    tiktokLastReadAt = Date.now();",
  "    return await task();",
  "  } finally {",
  "    release();",
  "  }",
  "}",
  "",
  "async function request<T extends Record<string, unknown> = Record<string, unknown>>(path: string, token: string, query: Record<string, string | number | undefined> = {}) {",
  "  const url = new URL(`${API_BASE}${path}`);",
  "  Object.entries(query).forEach(([key, value]) => { if (value !== undefined) url.searchParams.set(key, String(value)); });",
  "",
  "  for (let attempt = 0; attempt <= TIKTOK_READ_MAX_RETRIES; attempt += 1) {",
  "    const result = await scheduleTikTokRead(async () => {",
  "      const response = await fetch(url, { headers: { Accept: \"application/json\", \"Access-Token\": token }, cache: \"no-store\" });",
  "      const payload = await response.json().catch(() => null) as TikTokEnvelope | null;",
  "      return { response, payload };",
  "    });",
  "",
  "    const code = Number(result.payload?.code ?? 0);",
  "    if (result.response.ok && code === 0) return (result.payload?.data ?? {}) as T;",
  "",
  "    const message = result.payload?.message || \"O TikTok não retornou os ativos solicitados.\";",
  "    const rateLimited = isRateLimitMessage(message) || result.response.status === 429;",
  "    if (!rateLimited || attempt === TIKTOK_READ_MAX_RETRIES) {",
  "      throw new TikTokApiError(message, result.payload?.request_id);",
  "    }",
  "",
  "    const backoffMs = Math.min(4_000, 700 * 2 ** attempt) + Math.floor(Math.random() * 250);",
  "    await sleep(backoffMs);",
  "  }",
  "",
  "  throw new TikTokApiError(\"O TikTok não retornou os ativos solicitados após novas tentativas.\");",
  "}",
].join("\n");

source = source.slice(0, start) + replacement + source.slice(end);
fs.writeFileSync(path, source);
console.log("Applied TikTok read limiter to", path);
