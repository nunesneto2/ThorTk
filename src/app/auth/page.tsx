"use client";

import { ArrowLeft, CheckCircle2, Loader2, Mail, Rocket, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/` } });
      if (error) throw error;
      setStatus("sent");
    } catch {
      setStatus("error");
      setMessage("Não foi possível enviar o acesso. Confirme se o Supabase do ThorTk está configurado.");
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#080d13] px-4 text-slate-100">
      <div className="noise" />
      <section className="relative z-10 w-full max-w-md rounded-3xl border border-white/[0.1] bg-[#111824]/90 p-6 shadow-2xl shadow-black/30 sm:p-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400 transition hover:text-white"><ArrowLeft size={16} /> Voltar ao painel</Link>
        <div className="mt-8 grid h-12 w-12 place-items-center rounded-2xl bg-[#ffd90a] text-[#080d13]"><Rocket size={23} /></div>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.15em] text-[#ffd90a]">ThorTk</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-white">Acesse o lançador</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">Enviaremos um link seguro para seu e-mail. Ele libera somente seus ativos, rascunhos e logs.</p>
        {status === "sent" ? (
          <div className="mt-7 rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.08] p-5 text-sm leading-6 text-emerald-100"><CheckCircle2 className="mb-3" size={22} />Link enviado para <strong>{email}</strong>. Abra o e-mail para continuar.</div>
        ) : (
          <form onSubmit={submit} className="mt-7 space-y-4">
            <label className="block text-sm font-semibold text-slate-200">E-mail<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="voce@empresa.com" className="field mt-2" /></label>
            <button type="submit" disabled={status === "loading"} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#ffd90a] px-4 py-3 text-sm font-extrabold text-[#080d13] transition hover:bg-[#ffe34d] disabled:cursor-wait disabled:opacity-60">{status === "loading" ? <Loader2 className="animate-spin" size={17} /> : <Mail size={17} />}Enviar link de acesso</button>
            {status === "error" && <p className="rounded-xl border border-rose-400/20 bg-rose-400/[0.08] px-3 py-2 text-xs leading-5 text-rose-200">{message}</p>}
          </form>
        )}
        <div className="mt-7 flex items-start gap-2 border-t border-white/[0.08] pt-5 text-xs leading-5 text-slate-500"><ShieldCheck className="mt-0.5 shrink-0 text-slate-400" size={16} />A conexão TikTok só pode ser feita por uma sessão autenticada. Os tokens ficam criptografados no servidor.</div>
      </section>
    </main>
  );
}
