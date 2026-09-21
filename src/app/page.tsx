"use client";

import {
  ArrowRight,
  BadgeCheck,
  Check,
  ChevronDown,
  CircleDollarSign,
  CircleHelp,
  Loader2,
  LockKeyhole,
  PlugZap,
  Rocket,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Video,
} from "lucide-react";
import { useMemo, useState } from "react";

const STEPS = [
  ["01", "Conexão"], ["02", "Ativos"], ["03", "Catálogo"],
  ["04", "Criativo"], ["05", "Estrutura ABO"], ["06", "Revisão"],
] as const;
const CURRENCIES = ["BRL", "USD", "MXN", "CLP", "COP", "PEN", "ARS"];

function Money({ value, currency }: { value: number; currency: string }) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
}

export default function Home() {
  const [activeStep, setActiveStep] = useState(0);
  const [accountCurrency, setAccountCurrency] = useState("BRL");
  const [inputCurrency, setInputCurrency] = useState("MXN");
  const [amount, setAmount] = useState("20000");
  const [rate, setRate] = useState("0.298958");
  const [campaigns, setCampaigns] = useState("2");
  const [groups, setGroups] = useState("3");
  const [ads, setAds] = useState("1");
  const [campaignName, setCampaignName] = useState("");
  const [accountId, setAccountId] = useState("");
  const [catalogId, setCatalogId] = useState("");
  const [pixelId, setPixelId] = useState("");
  const [identityId, setIdentityId] = useState("");
  const [adText, setAdText] = useState("");
  const [language, setLanguage] = useState("es");
  const [country, setCountry] = useState("MX");
  const [notice, setNotice] = useState<string | null>(null);

  const conversion = useMemo(() => {
    const value = Number(amount.replace(",", ".")) || 0;
    const fx = inputCurrency === accountCurrency ? 1 : Number(rate.replace(",", ".")) || 0;
    return value * fx;
  }, [amount, rate, inputCurrency, accountCurrency]);
  const counts = useMemo(() => {
    const campaignCount = Math.max(1, Number(campaigns) || 1);
    const groupCount = Math.max(1, Number(groups) || 1);
    const adCount = Math.max(1, Number(ads) || 1);
    return { campaigns: campaignCount, groups: campaignCount * groupCount, ads: campaignCount * groupCount * adCount };
  }, [campaigns, groups, ads]);
  const ready = Boolean(accountId && catalogId && pixelId && identityId && adText && campaignName);
  const go = (step: number) => { setActiveStep(step); window.scrollTo({ top: 0, behavior: "smooth" }); };

  return (
    <main className="min-h-screen bg-[#080d13] text-slate-100 selection:bg-[#ffd90a] selection:text-black">
      <div className="noise" />
      <header className="sticky top-0 z-20 border-b border-white/[0.07] bg-[#080d13]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#ffd90a] text-[#080d13] shadow-[0_0_28px_rgba(255,217,10,0.22)]"><Rocket size={21} strokeWidth={2.4} /></div><div><p className="text-sm font-extrabold tracking-tight text-white">ThorTk</p><p className="text-xs text-slate-400">Operação TikTok independente</p></div></div>
          <div className="hidden items-center gap-2 text-xs text-slate-400 sm:flex"><span className="h-2 w-2 rounded-full bg-amber-400" />Integração ainda não conectada</div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-7 sm:px-6 lg:grid-cols-[235px_minmax(0,1fr)] lg:px-8 lg:py-10">
        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <p className="mb-3 px-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Fluxo de publicação</p>
          <nav className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">{STEPS.map(([number, label], index) => <button key={number} type="button" onClick={() => setActiveStep(index)} className={`group flex min-w-max items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${activeStep === index ? "bg-[#ffd90a] font-bold text-[#080d13] shadow-[0_8px_30px_rgba(255,217,10,0.13)]" : "text-slate-400 hover:bg-white/[0.05] hover:text-white"}`}><span className={`grid h-6 w-6 place-items-center rounded-md text-[10px] font-black ${activeStep === index ? "bg-black/10" : "border border-white/10 text-slate-500"}`}>{number}</span>{label}</button>)}</nav>
          <div className="mt-8 hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 lg:block"><ShieldCheck className="mb-3 text-[#ffd90a]" size={20} /><p className="text-sm font-bold text-white">Publicação protegida</p><p className="mt-1 text-xs leading-5 text-slate-400">Tokens ficam no servidor. O lançamento exige revisão do orçamento na moeda da conta.</p></div>
        </aside>
        <section className="min-w-0">
          <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#ffd90a]"><Sparkles size={13} /> Lançador ABO</p><h1 className="text-3xl font-black tracking-[-0.05em] text-white sm:text-4xl">Controle a criação. <span className="text-slate-500">Não o risco.</span></h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Crie campanhas de catálogo em sequência, salve cada retorno do TikTok e valide o gasto antes de publicar.</p></div><div className="flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-3 py-2 text-xs text-amber-200"><CircleHelp size={15} /> Sem dados de teste: conecte o TikTok para carregar ativos reais.</div></div>
          {activeStep === 0 && <Panel eyebrow="Etapa 01" title="Conecte o TikTok for Business" description="A autorização será feita pelo novo app TikTok, com callback e tokens separados do Catalog Pilot."><div className="grid gap-5 md:grid-cols-[1.1fr_0.9fr]"><div className="rounded-2xl border border-[#ffd90a]/25 bg-[#ffd90a]/[0.06] p-6"><PlugZap className="mb-5 text-[#ffd90a]" size={29} /><h2 className="text-xl font-extrabold text-white">Conexão por autorização</h2><p className="mt-2 max-w-md text-sm leading-6 text-slate-300">Depois de configurar o novo App ID e callback, você autoriza os anunciantes e o painel carrega somente as contas e ativos liberados.</p><a href="/api/tiktok/connect" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#ffd90a] px-4 py-3 text-sm font-extrabold text-[#080d13] transition hover:bg-[#ffe34d]">Conectar TikTok <ArrowRight size={17} /></a></div><div className="space-y-3 rounded-2xl border border-white/[0.08] bg-black/20 p-5"><StatusRow label="App TikTok exclusivo" state="A configurar" /><StatusRow label="OAuth e callback" state="A configurar" /><StatusRow label="Banco independente" state="A configurar" /><p className="border-t border-white/[0.08] pt-3 text-xs leading-5 text-slate-500">O botão só redireciona depois que as variáveis do novo app estiverem cadastradas no servidor.</p></div></div><NextButton onClick={() => go(1)} label="Configurar ativos" /></Panel>}
          {activeStep === 1 && <Panel eyebrow="Etapa 02" title="Conta, pixel e identidade" description="Na conexão final estes campos serão listas carregadas pela API. Até lá, informe IDs reais somente para validar a estrutura."><div className="grid gap-4 md:grid-cols-2"><Field label="ID da conta de anúncio" value={accountId} onChange={setAccountId} placeholder="Ex.: 7617723984382836737" /><SelectField label="Moeda da conta" value={accountCurrency} onChange={setAccountCurrency} options={CURRENCIES} /><Field label="ID do pixel" value={pixelId} onChange={setPixelId} placeholder="Será listado após a conexão" /><Field label="ID da identidade" value={identityId} onChange={setIdentityId} placeholder="Será listado após a conexão" /></div><InfoCard icon={<LockKeyhole size={17} />} text="No lançamento, a API valida se pixel, identidade, conta e catálogo pertencem à mesma autorização." /><NextButton onClick={() => go(2)} /></Panel>}
          {activeStep === 2 && <Panel eyebrow="Etapa 03" title="Catálogo e produtos" description="Um catálogo é selecionado por Business Center. O lançador usa o catálogo existente no TikTok; ele não altera XML, produtos ou feed."><div className="grid gap-4 md:grid-cols-2"><Field label="ID do catálogo TikTok" value={catalogId} onChange={setCatalogId} placeholder="Será listado após a conexão" /><SelectField label="Conjunto de produtos" value="all" onChange={() => undefined} options={["all — Todos os produtos"]} /></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><MiniCheck text="Catálogo disponível" /><MiniCheck text="Produtos elegíveis" /><MiniCheck text="País compatível" /></div><NextButton onClick={() => go(3)} /></Panel>}
          {activeStep === 3 && <Panel eyebrow="Etapa 04" title="Criativo de catálogo" description="O TikTok combina a mídia e informações dos produtos com o texto e o CTA definidos aqui."><div className="grid gap-4 md:grid-cols-[1fr_230px]"><label className="block text-sm font-semibold text-slate-200">Texto do anúncio<textarea value={adText} onChange={(event) => setAdText(event.target.value)} placeholder={'Ex.: Pulsa en "Más información"'} className="field mt-2 min-h-32 resize-y" /></label><div className="space-y-4"><SelectField label="CTA" value="LEARN_MORE" onChange={() => undefined} options={["LEARN_MORE — Saiba mais"]} /><div className="rounded-xl border border-white/[0.08] bg-black/20 p-4 text-xs leading-5 text-slate-400"><Video className="mb-2 text-[#ffd90a]" size={18} />Modo catálogo: o vídeo elegível será resolvido pelo TikTok a partir dos ativos do catálogo.</div></div></div><NextButton onClick={() => go(4)} /></Panel>}
          {activeStep === 4 && <Panel eyebrow="Etapa 05" title="Estrutura e orçamento ABO" description="Em ABO, o orçamento é aplicado em cada grupo. Esta tela calcula o impacto antes do envio para evitar multiplicação invisível."><div className="grid gap-4 md:grid-cols-3"><NumberField label="Campanhas" value={campaigns} onChange={setCampaigns} min={1} /><NumberField label="Grupos por campanha" value={groups} onChange={setGroups} min={1} /><NumberField label="Anúncios por grupo" value={ads} onChange={setAds} min={1} /></div><div className="my-6 grid gap-4 lg:grid-cols-[1fr_1fr]"><div className="rounded-2xl border border-white/[0.08] bg-black/20 p-5"><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Valor informado</p><div className="mt-4 grid grid-cols-[1fr_104px] gap-3"><input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" className="field text-xl font-bold" aria-label="Orçamento informado" /><SelectField label="Moeda" compact value={inputCurrency} onChange={setInputCurrency} options={CURRENCIES} /></div>{inputCurrency !== accountCurrency && <label className="mt-4 block text-xs font-semibold text-slate-400">Cotação registrada: 1 {inputCurrency} em {accountCurrency}<input value={rate} onChange={(event) => setRate(event.target.value)} inputMode="decimal" className="field mt-2" aria-label="Cotação" /></label>}</div><div className="rounded-2xl border border-[#ffd90a]/30 bg-gradient-to-br from-[#ffd90a]/[0.12] to-transparent p-5"><div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#ffe979]">Orçamento por grupo</p><CircleDollarSign size={18} className="text-[#ffd90a]" /></div><p className="mt-4 text-3xl font-black tracking-tight text-white"><Money value={conversion} currency={accountCurrency} /></p><p className="mt-2 text-sm text-slate-300">{inputCurrency === accountCurrency ? "Mesma moeda da conta." : `${amount || "0"} ${inputCurrency} × ${rate || "0"}`}</p><div className="mt-4 border-t border-white/10 pt-4 text-xs text-slate-300">Potencial diário em {counts.groups} grupos: <strong className="text-white"><Money value={conversion * counts.groups} currency={accountCurrency} /></strong></div></div></div><div className="grid gap-3 sm:grid-cols-3"><Metric label="Campanhas" value={counts.campaigns} /><Metric label="Grupos ABO" value={counts.groups} /><Metric label="Anúncios" value={counts.ads} /></div><div className="mt-6 grid gap-4 md:grid-cols-2"><SelectField label="País" value={country} onChange={setCountry} options={["MX — México", "BR — Brasil", "US — Estados Unidos"]} /><SelectField label="Idioma" value={language} onChange={setLanguage} options={["es — Espanhol", "pt — Português", "en — Inglês"]} /></div><NextButton onClick={() => go(5)} /></Panel>}
          {activeStep === 5 && <Panel eyebrow="Etapa 06" title="Revisar antes de publicar" description="A publicação real só é liberada após conexão TikTok, validação dos ativos e confirmação explícita do valor convertido."><div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]"><div className="rounded-2xl border border-white/[0.08] bg-black/20 p-5"><label className="block text-sm font-semibold text-slate-200">Nome-base da campanha<input value={campaignName} onChange={(event) => setCampaignName(event.target.value)} placeholder="Ex.: P268MXN-TEST" className="field mt-2" /></label><div className="mt-5 space-y-3 text-sm"><ReviewRow label="Conta" value={accountId || "Pendente"} complete={Boolean(accountId)} /><ReviewRow label="Catálogo" value={catalogId || "Pendente"} complete={Boolean(catalogId)} /><ReviewRow label="Ativos" value={pixelId && identityId ? "Pixel e identidade definidos" : "Pendente"} complete={Boolean(pixelId && identityId)} /><ReviewRow label="Criativo" value={adText ? "Texto e CTA configurados" : "Pendente"} complete={Boolean(adText)} /></div></div><div className="rounded-2xl border border-[#ffd90a]/25 bg-[#ffd90a]/[0.06] p-5"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#ffe979]">Resumo ABO</p><p className="mt-3 text-2xl font-black text-white">{counts.campaigns} campanhas · {counts.groups} grupos</p><p className="mt-2 text-sm leading-6 text-slate-300">Cada grupo receberá <strong><Money value={conversion} currency={accountCurrency} /></strong>. O teto potencial diário é <strong><Money value={conversion * counts.groups} currency={accountCurrency} /></strong>.</p><button type="button" disabled={!ready} onClick={() => setNotice("A conexão oficial ao TikTok precisa ser concluída antes do primeiro lançamento. Nenhuma campanha foi criada.")} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#ffd90a] px-4 py-3 text-sm font-extrabold text-[#080d13] transition enabled:hover:bg-[#ffe34d] disabled:cursor-not-allowed disabled:opacity-40"><Rocket size={17} />Validar e publicar</button></div></div>{notice && <div className="mt-5 flex items-start gap-3 rounded-xl border border-sky-400/20 bg-sky-400/[0.08] px-4 py-3 text-sm text-sky-100"><BadgeCheck className="mt-0.5 shrink-0" size={18} />{notice}</div>}</Panel>}
        </section>
      </div>
    </main>
  );
}

function Panel({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: React.ReactNode }) { return <div className="rounded-3xl border border-white/[0.09] bg-[#111824]/80 p-5 shadow-2xl shadow-black/20 sm:p-7"><p className="text-xs font-bold uppercase tracking-[0.15em] text-[#ffd90a]">{eyebrow}</p><h2 className="mt-2 text-2xl font-extrabold tracking-tight text-white">{title}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{description}</p><div className="mt-7">{children}</div></div>; }
function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) { return <label className="block text-sm font-semibold text-slate-200">{label}<input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="field mt-2" /></label>; }
function SelectField({ label, value, onChange, options, compact = false }: { label: string; value: string; onChange: (value: string) => void; options: string[]; compact?: boolean }) { return <label className={`block ${compact ? "text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400" : "text-sm font-semibold text-slate-200"}`}>{label}<span className="relative mt-2 block"><select value={value} onChange={(event) => onChange(event.target.value.split(" — ")[0])} className="field appearance-none pr-9"><option value={value}>{options.find((option) => option.startsWith(value)) ?? value}</option>{options.filter((option) => !option.startsWith(value)).map((option) => <option key={option} value={option.split(" — ")[0]}>{option}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} /></span></label>; }
function NumberField({ label, value, onChange, min }: { label: string; value: string; onChange: (value: string) => void; min: number }) { return <label className="block text-sm font-semibold text-slate-200">{label}<input type="number" min={min} value={value} onChange={(event) => onChange(event.target.value)} className="field mt-2 text-lg font-bold" /></label>; }
function StatusRow({ label, state }: { label: string; state: string }) { return <div className="flex items-center justify-between gap-4 text-sm"><span className="text-slate-300">{label}</span><span className="rounded-full bg-white/[0.07] px-2 py-1 text-[11px] text-slate-400">{state}</span></div>; }
function InfoCard({ icon, text }: { icon: React.ReactNode; text: string }) { return <div className="mt-5 flex items-start gap-3 rounded-xl border border-sky-400/20 bg-sky-400/[0.07] px-4 py-3 text-sm leading-6 text-sky-100">{icon}{text}</div>; }
function MiniCheck({ text }: { text: string }) { return <div className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-black/20 px-3 py-3 text-sm text-slate-400"><Check size={15} className="text-[#ffd90a]" />{text}</div>; }
function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-xl border border-white/[0.08] bg-black/20 p-4"><p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p><p className="mt-2 text-2xl font-black text-white">{value}</p></div>; }
function ReviewRow({ label, value, complete }: { label: string; value: string; complete: boolean }) { return <div className="flex items-start justify-between gap-4 border-b border-white/[0.07] pb-3 last:border-0 last:pb-0"><span className="text-slate-400">{label}</span><span className={`flex items-center gap-1.5 text-right text-xs font-semibold ${complete ? "text-emerald-300" : "text-amber-300"}`}>{complete ? <Check size={14} /> : <Loader2 size={14} />}{value}</span></div>; }
function NextButton({ onClick, label = "Próxima etapa" }: { onClick: () => void; label?: string }) { return <div className="mt-7 flex justify-end"><button type="button" onClick={onClick} className="inline-flex items-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.04] px-4 py-3 text-sm font-bold text-white transition hover:border-[#ffd90a]/60 hover:bg-[#ffd90a]/[0.08]"><SlidersHorizontal size={16} />{label}<ArrowRight size={16} /></button></div>; }
