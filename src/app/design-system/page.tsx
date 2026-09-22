import { Check, CloudLightning, Search } from "lucide-react";

const tokens = [
  ["Canvas", "#0B0F13", "bg-[#0b0f13]"],
  ["Surface", "#141A23", "bg-[#141a23]"],
  ["Electric blue", "#7EC6FF", "bg-[#7ec6ff]"],
  ["Aged gold", "#D8B56B", "bg-[#d8b56b]"],
  ["Success", "#55D6A4", "bg-[#55d6a4]"],
  ["Danger", "#FB7185", "bg-[#fb7185]"],
] as const;

export default function DesignSystemPage() {
  return <main className="min-h-screen bg-[var(--thor-canvas)] px-5 py-10 text-[var(--thor-text)] md:px-10">
    <div className="mx-auto max-w-6xl">
      <p className="text-[11px] font-black uppercase tracking-[.2em] text-[var(--thor-gold)]">ThorTk / Design System</p>
      <h1 className="mt-3 text-4xl font-black tracking-[-.06em]">Command Deck</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--thor-muted)]">Base única para as telas do lançador: tokens, hierarquia, componentes e estados de interface.</p>

      <section className="mt-10">
        <h2 className="text-sm font-black uppercase tracking-[.12em] text-zinc-400">01 · Cores</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{tokens.map(([name, hex, background]) => <div key={name} className="rocket-card flex items-center gap-4 p-4"><span className={`h-10 w-10 rounded-full border border-white/15 ${background}`} /><div><p className="font-bold">{name}</p><p className="mt-1 font-mono text-xs text-zinc-500">{hex}</p></div></div>)}</div>
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="rocket-section"><h2 className="section-label">02 · Tipografia</h2><p className="mt-5 text-3xl font-black tracking-[-.055em]">Título de etapa</p><p className="mt-2 text-sm text-zinc-400">Texto de apoio para orientar a configuração, sem competir com a ação.</p><p className="mt-5 text-[11px] font-black uppercase tracking-[.14em] text-[var(--thor-gold)]">Rótulo operacional</p></div>
        <div className="rocket-section"><h2 className="section-label">03 · Controles</h2><div className="mt-5 flex flex-wrap gap-3"><button type="button" className="rocket-launch-button w-auto px-5"><CloudLightning size={17} />Ação principal</button><button type="button" className="rocket-dark-button">Ação secundária</button><button type="button" className="footer-abort px-2">Texto simples</button></div><label className="relative mt-5 block"><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={16} /><input className="rocket-input pl-10" placeholder="Campo de busca" /></label></div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rocket-card p-5"><h2 className="section-label">04 · Seleção</h2><div className="mt-4 flex items-center justify-between rounded-lg border border-sky-300/35 bg-sky-300/[.07] p-4"><span className="font-bold">Item ativo</span><Check className="text-sky-300" size={18} /></div></div>
        <div className="rocket-card p-5"><h2 className="section-label">05 · Feedback</h2><div className="mt-4 rounded-lg border border-emerald-400/25 bg-emerald-400/[.07] p-4 text-sm text-emerald-100"><span className="font-bold">Sucesso:</span> ativos consultados e configuração preservada.</div></div>
      </section>
    </div>
  </main>;
}
