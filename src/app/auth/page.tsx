"use client";

import { ArrowLeft, ArrowRight, Compass, Loader2, Rocket, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const AUTH_TIMEOUT_MS = 10_000;
const cleanIdentity = (value: string) => value.replace(/\s+/g, " ").trim().slice(0, 48);

class AuthTimeoutError extends Error {
  constructor() {
    super("AUTH_TIMEOUT");
    this.name = "AuthTimeoutError";
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new AuthTimeoutError()), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export default function AuthPage() {
  const router = useRouter();
  const [identity, setIdentity] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [phase, setPhase] = useState<"idle" | "checking" | "creating" | "redirecting">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "loading") return;

    const operatorName = cleanIdentity(identity);
    if (operatorName.length < 2) {
      setStatus("error");
      setMessage("Informe uma identidade com pelo menos 2 caracteres.");
      return;
    }

    setStatus("loading");
    setPhase("checking");
    setMessage("");

    try {
      const supabase = createClient();

      // Reaproveita uma sessão já persistida sem criar outro usuário anônimo.
      const { data: existingSession } = await supabase.auth.getSession();
      if (existingSession.session) {
        setPhase("redirecting");
        router.replace("/");
        router.refresh();
        return;
      }

      setPhase("creating");
      const { data, error } = await withTimeout(
        supabase.auth.signInAnonymously({ options: { data: { operator_name: operatorName } } }),
        AUTH_TIMEOUT_MS,
      );

      if (error) throw error;
      if (!data.session) throw new Error("SESSION_NOT_CREATED");

      setPhase("redirecting");
      router.replace("/");
      router.refresh();
    } catch (error) {
      setPhase("idle");
      setStatus("error");

      if (error instanceof AuthTimeoutError) {
        setMessage("A criação da sessão demorou mais de 10 segundos. Tente novamente; se persistir, verifique o serviço de autenticação do Supabase.");
        return;
      }

      const errorMessage = error instanceof Error ? error.message.toLowerCase() : "";
      if (errorMessage.includes("anonymous") || errorMessage.includes("provider")) {
        setMessage("O acesso anônimo não está disponível no Supabase deste ambiente. Verifique Authentication → Providers → Anonymous Sign-Ins.");
        return;
      }

      setMessage("Não foi possível iniciar a sessão. Tente novamente.");
    }
  }

  const loadingLabel =
    phase === "checking"
      ? "Verificando sessão"
      : phase === "redirecting"
        ? "Abrindo painel"
        : "Criando sessão";

  return (
    <main className="auth-shell">
      <div className="auth-shell__scene" aria-hidden />
      <div className="auth-shell__veil" aria-hidden />
      <div className="auth-shell__layout">
        <section className="auth-hero">
          <div className="auth-hero__eyebrow"><Compass size={17} /> Bifrost command network</div>
          <p className="auth-hero__protocol">OPERAÇÃO TIKTOK FOR BUSINESS · LANÇADOR ABO</p>
          <h1 className="auth-hero__brand">THOR<span>TK</span></h1>
          <p className="auth-hero__copy">O centro de comando para estruturar, revisar e lançar campanhas com precisão.</p>
          <div className="auth-hero__sequence" aria-label="Fluxo operacional">
            <span><b>01</b> Conectar ativos</span>
            <i />
            <span><b>02</b> Definir estrutura</span>
            <i />
            <span><b>03</b> Publicar com controle</span>
          </div>
        </section>

        <section className="auth-command-card">
          <Link href="/" className="auth-command-card__back"><ArrowLeft size={16} /> Voltar ao painel</Link>
          <div className="auth-command-card__crest"><ShieldCheck size={23} /></div>
          <p className="auth-command-card__eyebrow">Acesso operacional</p>
          <h2>Identifique o operador</h2>
          <p className="auth-command-card__copy">Use uma identidade para reconhecer esta sessão nos rascunhos e logs do ThorTk.</p>
          <form onSubmit={submit} className="auth-command-card__form">
            <label className="sr-only" htmlFor="identity">Identidade do operador</label>
            <div className="auth-identity-field">
              <UserRound className="pointer-events-none" size={18} />
              <input id="identity" value={identity} onChange={(event) => setIdentity(event.target.value)} required autoFocus placeholder="EX.: CRIMSON_WAVE_99" />
            </div>
            <button type="submit" disabled={status === "loading"} className="auth-submit">
              {status === "loading" ? <Loader2 className="animate-spin" size={18} /> : <Rocket size={18} />}
              {status === "loading" ? loadingLabel : status === "error" ? "Tentar novamente" : "Entrar no comando"}
              <ArrowRight size={18} />
            </button>
            {status === "error" && <p className="auth-error">{message}</p>}
          </form>
          <div className="auth-session-status"><span /> Sessão individual · dados isolados</div>
          <p className="auth-command-card__note"><ShieldCheck size={16} /> A publicação continua exigindo confirmação explícita de orçamento e volume.</p>
        </section>
      </div>
    </main>
  );
}
