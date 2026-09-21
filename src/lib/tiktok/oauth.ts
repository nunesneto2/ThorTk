import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const AUTHORIZE_URL = "https://business-api.tiktok.com/portal/auth";
const TOKEN_URL = "https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/";
const STATE_TTL_MS = 10 * 60 * 1000;

type OAuthState = { userId: string; nonce: string; expiresAt: number };

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} não está configurada.`);
  return value;
}
function signingSecret() { return requiredEnv("TIKTOK_OAUTH_STATE_SECRET"); }
function encryptionKey() {
  const key = Buffer.from(requiredEnv("TIKTOK_TOKEN_ENCRYPTION_KEY"), "base64");
  if (key.length !== 32) throw new Error("TIKTOK_TOKEN_ENCRYPTION_KEY deve ter 32 bytes em Base64.");
  return key;
}
function signature(payload: string) { return createHmac("sha256", signingSecret()).update(payload).digest("base64url"); }

export function isTikTokConfigured() {
  return Boolean(process.env.TIKTOK_APP_ID && process.env.TIKTOK_APP_SECRET && process.env.TIKTOK_REDIRECT_URI && process.env.TIKTOK_OAUTH_STATE_SECRET && process.env.TIKTOK_TOKEN_ENCRYPTION_KEY);
}
export function createOAuthState(userId: string) {
  const nonce = randomBytes(24).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ userId, nonce, expiresAt: Date.now() + STATE_TTL_MS })).toString("base64url");
  return { state: `${payload}.${signature(payload)}`, nonce };
}
export function verifyOAuthState(state: string, cookieNonce: string | undefined): OAuthState | null {
  const [payload, received] = state.split(".");
  if (!payload || !received || !cookieNonce) return null;
  const expected = signature(payload);
  const a = Buffer.from(received); const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as OAuthState;
    const nonceA = Buffer.from(decoded.nonce); const nonceB = Buffer.from(cookieNonce);
    if (!decoded.userId || !decoded.nonce || !Number.isSafeInteger(decoded.expiresAt) || decoded.expiresAt < Date.now() || nonceA.length !== nonceB.length || !timingSafeEqual(nonceA, nonceB)) return null;
    return decoded;
  } catch { return null; }
}
export function authorizationUrl(state: string) {
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("app_id", requiredEnv("TIKTOK_APP_ID"));
  url.searchParams.set("redirect_uri", requiredEnv("TIKTOK_REDIRECT_URI"));
  url.searchParams.set("state", state);
  return url;
}
export function encryptToken(value: string) {
  const iv = randomBytes(12); const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`;
}
export function decryptToken(serialized: string) {
  const [iv, tag, payload] = serialized.split(".");
  if (!iv || !tag || !payload) throw new Error("Token TikTok inválido.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(payload, "base64url")), decipher.final()]).toString("utf8");
}
function toDate(value: unknown) { const seconds = Number(value); return Number.isFinite(seconds) && seconds > 0 ? new Date(Date.now() + seconds * 1000).toISOString() : null; }
export async function exchangeAuthorizationCode(authCode: string) {
  const response = await fetch(TOKEN_URL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ app_id: requiredEnv("TIKTOK_APP_ID"), secret: requiredEnv("TIKTOK_APP_SECRET"), auth_code: authCode }), cache: "no-store" });
  const payload = await response.json().catch(() => null) as { code?: number; data?: Record<string, unknown> } | null;
  const data = payload?.data;
  const accessToken = typeof data?.access_token === "string" ? data.access_token : null;
  if (!response.ok || payload?.code || !accessToken) throw new Error("O TikTok não confirmou a autorização.");
  return { accessToken, refreshToken: typeof data?.refresh_token === "string" ? data.refresh_token : null, accessTokenExpiresAt: toDate(data?.expires_in), refreshTokenExpiresAt: toDate(data?.refresh_token_expires_in) };
}
