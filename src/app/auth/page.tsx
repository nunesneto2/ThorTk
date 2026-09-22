"use client";

import { ArrowLeft, ArrowRight, Compass, Loader2, Rocket, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const cleanIdentity = (value: string) => value.replace(/\s+/g, " ").trim().slice(0, 48);

export default function AuthPage() {
  const router = useRouter();
  const [identity, setIdentity] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const operatorName = cleanIdentity(identity);
    if (operatorName.length < 2) {
      setStatus("error");
      setMessage("Informe uma identidade com pelo menos 2 caracteres.");
      return;
    }
    setStatus("loading");
    setMessage("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInAnonymously({ options: { data: { operator_name: operatorName } } });
      if (error) throw error;
      router.push("/");
    } catch {
      setStatus("error");
      setMessage("Não foi possível iniciar a sessão. No Supabase, habilite Anonymous sign-ins em Authentication → Providers.");
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#202425] text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_52%,rgba(0,0,0,.28),transparent_34%),linear-gradient(115deg,rgba(255,217,10,.025),transparent_45%)]" />
      <div className="relative mx-auto grid min-h-screen max-w-[1440px] items-center gap-12 px-6 py-10 lg:grid-cols-[minmax(0,1fr)_538px] lg:px-20">
        <section className="max-w-2xl">
          <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.34em] text-white"><Compass size={21} className="text-[#ffd90a]" />Setor: ThorTk</div>
          <div className="mt-7 h-px w-28 bg-gradient-to-r from-[#ffd90a] to-transparent" />
          <p className="mt-5 text-[11px] font-semibold leading-6 text-slate-400">OPERAÇÃO: TIKTOK FOR BUSINESS<br />MODO: LANÇADOR ABO</p>
          <div className="mt-24 inline-flex items-center gap-2 rounded-full bg-[#17446e] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-[#2d89e7]"><span className="h-2 w-2 rounded-full bg-[#2d89e7]" />Acesso operacional</div>
          <h1 className="mt-4 text-6xl font-black uppercase tracking-[-0.065em] text-white sm:text-8xl">Thor<span className="text-[#247de3]">Tk.</span></h1>
          <p className="mt-8 max-w-xl text-xl leading-7 tracking-tight text-white sm:text-2xl">Estruture, revise e publique campanhas TikTok com visão clara de catálogo, ativos e orçamento.</p>
          <div className="mt-12 flex max-w-xl items-center gap-4 text-xs font-bold uppercase tracking-[0.08em] text-white sm:gap-8"><span className="text-4xl font-black">01</span><span>Conectar<br />ativos</span><i className="h-px flex-1 bg-white/20" /><span className="text-4xl font-black">02</span><span>Revisar<br />estrutura</span><i className="h-px flex-1 bg-white/20" /><span className="text-4xl font-black">03</span><span>Publicar<br />com controle</span></div>
        </section>
        <section className="rounded-[30px] border border-white/[0.11] bg-[#171b1d]/90 p-7 shadow-2xl shadow-black/30 sm:p-12">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-white"><ArrowLeft size={16} /> Voltar ao painel</Link>
          <p className="mt-10 text-sm font-bold uppercase tracking-[0.34em] text-[#ffd90a]">Centro de comando</p>
          <h2 className="mt-10 text-xl font-bold text-white">Identidade do operador</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">Informe como esta operação será identificada nos rascunhos e logs do ThorTk.</p>
          <form onSubmit={submit} className="mt-5">
            <label className="sr-only" htmlFor="identity">Identidade do operador</label>
            <div className="relative"><UserRound className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={17} /><input id="identity" value={identity} onChange={(event) => setIdentity(event.target.value)} required autoFocus placeholder="EX.: CRIMSON_WAVE_99" className="field pl-11 font-medium uppercase tracking-wide" /></div>
            <button type="submit" disabled={status === "loading"} className="mt-7 inline-flex w-full items-center justify-center gap-3 rounded-xl bg-[#247de3] px-4 py-4 text-sm font-extrabold uppercase tracking-[0.12em] text-white transition hover:bg-[#3990ee] disabled:cursor-wait disabled:opacity-60">{status === "loading" ? <Loader2 className="animate-spin" size={18} /> : <Rocket size={18} />}Entrar no painel <ArrowRight size={18} /></button>
            {status === "error" && <p className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/[0.08] px-3 py-2 text-xs leading-5 text-rose-200">{message}</p>}
          </form>
          <div className="my-9 flex items-center gap-4"><i className="h-px flex-1 bg-white/[0.08]" /><span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-600">Sessão individual</span><i className="h-px flex-1 bg-white/[0.08]" /></div>
          <div className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.05] bg-black/10 px-4 py-3 text-center text-[11px] uppercase tracking-wide text-slate-500"><span className="h-2 w-2 rounded-full bg-emerald-400" />Dados e rascunhos isolados nesta sessão</div>
          <div className="mt-7 flex items-start gap-2 border-t border-white/[0.08] pt-5 text-xs leading-5 text-slate-500"><ShieldCheck className="mt-0.5 shrink-0 text-slate-400" size={16} />A publicação continuará exigindo uma confirmação explícita do orçamento e do total de campanhas.</div>
        </section>
      </div>
    </main>
  );
}
