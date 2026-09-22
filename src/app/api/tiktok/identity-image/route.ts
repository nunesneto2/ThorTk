import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { loadOverview } from "@/lib/tiktok/assets";
import { decryptToken } from "@/lib/tiktok/oauth";

const TIKTOK_API = "https://business-api.tiktok.com/open_api/v1.3";

function responseError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    const idsValue = form.get("advertiser_ids");
    const advertiserIds = typeof idsValue === "string"
      ? [...new Set((JSON.parse(idsValue) as unknown[]).map((id) => String(id).trim()).filter(Boolean))]
      : [];

    if (!(file instanceof File) || !advertiserIds.length) {
      return responseError("Selecione uma imagem e ao menos uma conta de anúncio.");
    }
    if (!file.type.startsWith("image/")) return responseError("Envie uma imagem PNG, JPG ou WEBP.");
    if (file.size > 10 * 1024 * 1024) return responseError("A imagem deve ter no máximo 10 MB.");

    const session = await createClient();
    const { data: claims } = await session.auth.getClaims();
    const userId = claims?.claims.sub;
    if (!userId) return responseError("Sessão operacional não encontrada. Entre novamente.", 401);

    const admin = createAdminClient();
    const { data: connection, error: connectionError } = await admin
      .from("tiktok_connections")
      .select("access_token_ciphertext")
      .eq("user_id", userId)
      .maybeSingle();
    if (connectionError) throw connectionError;
    if (!connection) return responseError("Conecte o TikTok antes de enviar a imagem.", 409);

    const token = decryptToken(connection.access_token_ciphertext);
    const overview = await loadOverview(token);
    const authorized = new Set(overview.advertisers.map((item) => item.id));
    const forbidden = advertiserIds.find((id) => !authorized.has(id));
    if (forbidden) return responseError("A conta " + forbidden + " não pertence à autorização atual do TikTok.", 403);

    const bytes = await file.arrayBuffer();
    const signature = createHash("md5").update(Buffer.from(bytes)).digest("hex");
    const uploaded = await Promise.allSettled(advertiserIds.map(async (advertiserId) => {
      const upload = new FormData();
      upload.append("advertiser_id", advertiserId);
      upload.append("upload_type", "UPLOAD_BY_FILE");
      upload.append("image_signature", signature);
      upload.append("image_file", new Blob([bytes], { type: file.type }), file.name || "identity.png");
      const result = await fetch(TIKTOK_API + "/file/image/ad/upload/", {
        method: "POST",
        headers: { Accept: "application/json", "Access-Token": token },
        body: upload,
        cache: "no-store",
      });
      const payload = await result.json().catch(() => ({})) as { code?: number; message?: string; data?: Record<string, unknown> };
      if (!result.ok || payload.code !== 0) throw new Error(payload.message || "O TikTok não aceitou esta imagem.");
      const imageUri = String(payload.data?.image_uri ?? payload.data?.image_id ?? "").trim();
      if (!imageUri) throw new Error("O TikTok não retornou o identificador da imagem enviada.");
      return { advertiserId, imageUri };
    }));

    const failed = uploaded.flatMap((item, index) => item.status === "rejected" ? [{
      advertiserId: advertiserIds[index],
      error: item.reason instanceof Error ? item.reason.message : "Falha ao enviar a imagem.",
    }] : []);
    return NextResponse.json({ uploaded: uploaded.flatMap((item) => item.status === "fulfilled" ? [item.value] : []), failed });
  } catch (error) {
    console.error("[tiktok:identity-image] upload failed", error);
    return responseError(error instanceof Error ? error.message : "Não foi possível enviar a imagem ao TikTok.", 502);
  }
}
