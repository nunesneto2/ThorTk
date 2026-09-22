"use client";

import {
  ArrowLeft, ArrowRight, Boxes, Building2, ChevronDown, CircleAlert,
  CircleCheck, Coins, Database, Layers3, Loader2, Orbit, PlugZap,
  RefreshCw, Rocket, Search, ShieldCheck, Target, UserRound, Video,
  X, Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Choice = { id: string; name: string; currency?: string; status?: string; type?: string };
type Overview = { connected: boolean; authorizedAt?: string; businessCenters: Choice[]; advertisers: Choice[]; warnings: string[] };
type Detail = { advertiser: Choice | null; pixels: Choice[]; identities: Choice[]; warnings: string[] };
type Notice = { tone: "success" | "warning" | "error"; text: string };

const currencies = ["BRL", "USD", "MXN", "CLP", "COP", "PEN", "ARS"];
const phases = [
  ["Conectar", PlugZap], ["Contas", Building2], ["Catálogo", Database],
  ["Criativo", Video], ["Estrutura", Layers3], ["Lançar", Rocket],
] as const;
const copy = [
  ["Início da missão", "Ative o comando.", "Autorize o TikTok e deixe o ThorTk mapear os ativos liberados para sua sessão."],
  ["Núcleo de ativos", "Escolha sua frota.", "Business Center, conta, pixel e identidade são carregados diretamente da autorização."],
  ["Vitrine de produtos", "Defina o catálogo.", "O catálogo é escolhido dentro do Business Center, sem alterar XML, feed ou produtos."],
  ["Mensagem do trovão", "Configure o criativo.", "Texto e CTA que acompanham os produtos dinâmicos do catálogo."],
  ["Estrutura ABO", "Controle a energia.", "Veja o custo por grupo e o impacto total já convertido para a moeda real da conta."],
  ["Pré-flight", "Reveja a missão.", "Confirme todos os vínculos. A criação real sempre pedirá uma confirmação final."],
] as const;

function money(value: number, currency: string) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
}
function dateLabel(value?: string) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "agora";
}

export default function Home() {
  const router = useRouter();
  const [phase, setPhase] = useState(0);
  const [overview, setOverview] = useState<Overview>({ connected: false, businessCenters: [], advertisers: [], warnings: [] });
  const [details, setDetails] = useState<Detail>({ advertiser: null, pixels: [], identities: [], warnings: [] });
  const [catalogs, setCatalogs] = useState<Choice[]>([]);
  const [bcId, setBcId] = useState(""); const [advertiserId, setAdvertiserId] = useState("");
  const [catalogId, setCatalogId] = useState(""); const [pixelId, setPixelId] = useState(""); const [identityId, setIdentityId] = useState("");
  const [query, setQuery] = useState(""); const [adText, setAdText] = useState(""); const [cta, setCta] = useState("LEARN_MORE");
  const [campaignName, setCampaignName] = useState(""); const [inputCurrency, setInputCurrency] = useState("MXN");
  const [amount, setAmount] = useState("20000"); const [rate, setRate] = useState("0.30");
  const [campaigns, setCampaigns] = useState("1"); const [groups, setGroups] = useState("1"); const [ads, setAds] = useState("1");
  const [country, setCountry] = useState("MX"); const [language, setLanguage] = useState("es");
  const [loading, setLoading] = useState<"overview" | "assets" | "catalogs" | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null); const [showPreflight, setShowPreflight] = useState(false);

  const selectedBc = overview.businessCenters.find((item) => item.id === bcId) ?? null;
  const selectedAdvertiser = overview.advertisers.find((item) => item.id === advertiserId) ?? details.advertiser;
  const selectedCatalog = catalogs.find((item) => item.id === catalogId) ?? null;
  const selectedPixel = details.pixels.find((item) => item.id === pixelId) ?? null;
  const selectedIdentity = details.identities.find((item) => item.id === identityId) ?? null;
  const accountCurrency = details.advertiser?.currency ?? selectedAdvertiser?.currency ?? "BRL";
  const counts = useMemo(() => {
    const campaignCount = Math.max(1, Number(campaigns) || 1); const groupCount = campaignCount * Math.max(1, Number(groups) || 1);
    return { campaigns: campaignCount, groups: groupCount, ads: groupCount * Math.max(1, Number(ads) || 1) };
  }, [ads, campaigns, groups]);
  const budget = useMemo(() => {
    const value = Number(amount.replace(",", ".")) || 0; const fx = inputCurrency === accountCurrency ? 1 : Number(rate.replace(",", ".")) || 0;
    return value * fx;
  }, [accountCurrency, amount, inputCurrency, rate]);
  const ready = Boolean(bcId && advertiserId && catalogId && pixelId && identityId && adText.trim() && campaignName.trim());

  const loadOverview = useCallback(async () => {
    setLoading("overview");
    try {
      const response = await fetch("/api/tiktok/assets?scope=overview", { cache: "no-store" });
      const payload = await response.json() as Overview & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Não foi possível consultar o TikTok.");
      setOverview(payload);
      if (!payload.connected) {
        setNotice({ tone: "warning", text: "Nenhuma autorização foi encontrada nesta sessão. Conecte o TikTok para carregar ativos reais." });
      } else {
        setBcId((current) => current || payload.businessCenters[0]?.id || "");
        setAdvertiserId((current) => current || payload.advertisers[0]?.id || "");
        setNotice({ tone: "success", text: String(payload.businessCenters.length) + " Business Center(s) e " + String(payload.advertisers.length) + " conta(s) sincronizados." });
      }
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Falha ao carregar os ativos." });
    } finally { setLoading(null); }
  }, []);
  const loadAssets = useCallback(async (id: string) => {
    if (!id || !overview.connected) return; setLoading("assets");
    try {
      const response = await fetch("/api/tiktok/assets?scope=advertiser&advertiser_id=" + encodeURIComponent(id), { cache: "no-store" });
      const payload = await response.json() as Detail & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Não foi possível carregar os ativos da conta.");
      setDetails(payload); setPixelId((current) => current || payload.pixels[0]?.id || ""); setIdentityId((current) => current || payload.identities[0]?.id || "");
    } catch (error) {
      setDetails({ advertiser: null, pixels: [], identities: [], warnings: [error instanceof Error ? error.message : "Falha ao carregar os ativos."] });
    } finally { setLoading(null); }
  }, [overview.connected]);
  const loadCatalogs = useCallback(async (id: string) => {
    if (!id || !overview.connected) return; setLoading("catalogs");
    try {
      const response = await fetch("/api/tiktok/assets?scope=catalogs&bc_id=" + encodeURIComponent(id), { cache: "no-store" });
      const payload = await response.json() as { catalogs?: Choice[]; error?: string };
      if (!response.ok) throw new Error(payload.error || "Não foi possível carregar os catálogos.");
      const list = payload.catalogs ?? []; setCatalogs(list); setCatalogId((current) => current || list[0]?.id || "");
    } catch (error) {
      setCatalogs([]); setNotice({ tone: "warning", text: error instanceof Error ? error.message : "O TikTok não retornou catálogos." });
    } finally { setLoading(null); }
  }, [overview.connected]);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("tiktok") === "connected") window.history.replaceState({}, "", window.location.pathname);
    const timer = window.setTimeout(() => void loadOverview(), 0); return () => window.clearTimeout(timer);
  }, [loadOverview]);
  useEffect(() => { if (!advertiserId) return; const timer = window.setTimeout(() => void loadAssets(advertiserId), 0); return () => window.clearTimeout(timer); }, [advertiserId, loadAssets]);
  useEffect(() => { if (!bcId) return; const timer = window.setTimeout(() => void loadCatalogs(bcId), 0); return () => window.clearTimeout(timer); }, [bcId, loadCatalogs]);

  const move = (next: number) => {
    if (next > 0 && !overview.connected) { setNotice({ tone: "warning", text: "Conecte o TikTok antes de avançar." }); return; }
    if (next > 1 && !advertiserId) { setNotice({ tone: "warning", text: "Selecione uma conta antes de continuar." }); return; }
    if (next > 2 && !catalogId) { setNotice({ tone: "warning", text: "Selecione um catálogo antes de continuar." }); return; }
    setPhase(next); window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const filteredAdvertisers = overview.advertisers.filter((item) => (item.name + " " + item.id).toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  const nextLabels = ["Mapear ativos", "Selecionar catálogo", "Configurar criativo", "Definir estrutura", "Revisar missão"];
  const warnings = overview.warnings.concat(details.warnings);

  return <main className="min-h-screen overflow-x-hidden bg-[#070b0d] text-slate-100 selection:bg-[#f9cf26] selection:text-black">
    <div aria-hidden className="pointer-events-none fixed inset-0 bg-cover bg-center opacity-[.22] mix-blend-screen" style={{ backgroundImage: "url('/thunder-command-bg.webp')" }} />
    <div aria-hidden className="thor-scanlines pointer-events-none fixed inset-0" />
    <TopBar connected={overview.connected} bcs={overview.businessCenters.length} advertisers={overview.advertisers.length} loading={loading === "overview"} onRefresh={loadOverview} />
    <div className="relative mx-auto max-w-[1700px] px-4 pb-9 pt-5 sm:px-7 lg:px-10">
      <MissionRail phase={phase} onChange={move} />
      <StageHeader phase={phase} connected={overview.connected} bcs={overview.businessCenters.length} advertisers={overview.advertisers.length} />
      {notice && <NoticeBanner notice={notice} onClose={() => setNotice(null)} />}
      {warnings.length > 0 && <Warnings items={warnings} />}
      <section className="thor-panel mt-6">
        {phase === 0 && <ConnectStage connected={overview.connected} date={overview.authorizedAt} bcs={overview.businessCenters.length} advertisers={overview.advertisers.length} loading={loading === "overview"} onConnect={() => router.push("/api/tiktok/connect")} onRefresh={loadOverview} />}
        {phase === 1 && <AssetsStage businessCenters={overview.businessCenters} advertisers={filteredAdvertisers} query={query} setQuery={setQuery} bcId={bcId} advertiserId={advertiserId} details={details} pixelId={pixelId} identityId={identityId} loading={loading === "assets"} onBc={(id) => { setBcId(id); setCatalogId(""); }} onAdvertiser={(id) => { setAdvertiserId(id); setPixelId(""); setIdentityId(""); }} onPixel={setPixelId} onIdentity={setIdentityId} />}
        {phase === 2 && <CatalogStage bc={selectedBc} catalogs={catalogs} selectedId={catalogId} loading={loading === "catalogs"} onRefresh={() => void loadCatalogs(bcId)} onSelect={setCatalogId} />}
        {phase === 3 && <CreativeStage value={adText} cta={cta} onChange={setAdText} onCta={setCta} />}
        {phase === 4 && <StructureStage campaigns={campaigns} groups={groups} ads={ads} setCampaigns={setCampaigns} setGroups={setGroups} setAds={setAds} inputCurrency={inputCurrency} setInputCurrency={setInputCurrency} amount={amount} setAmount={setAmount} rate={rate} setRate={setRate} accountCurrency={accountCurrency} budget={budget} counts={counts} country={country} setCountry={setCountry} language={language} setLanguage={setLanguage} />}
        {phase === 5 && <ReviewStage ready={ready} name={campaignName} setName={setCampaignName} bc={selectedBc} advertiser={selectedAdvertiser} catalog={selectedCatalog} pixel={selectedPixel} identity={selectedIdentity} counts={counts} budget={budget} currency={accountCurrency} />}
        <OperationMap bc={selectedBc} advertiser={selectedAdvertiser} catalog={selectedCatalog} pixel={selectedPixel} identity={selectedIdentity} />
      </section>
      <footer className="mt-6 flex flex-col-reverse gap-3 border-t border-white/[.09] pt-5 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" onClick={() => move(Math.max(0, phase - 1))} disabled={phase === 0} className="inline-flex items-center justify-center gap-2 px-4 py-3 text-xs font-black uppercase tracking-[.13em] text-slate-400 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-30"><ArrowLeft size={16} />Voltar</button>
        {phase < 5 ? <button type="button" onClick={() => move(phase + 1)} disabled={(phase === 0 && !overview.connected) || (phase === 1 && !advertiserId) || (phase === 2 && !catalogId) || (phase === 3 && !adText.trim())} className="thor-button justify-center disabled:cursor-not-allowed disabled:opacity-40">{nextLabels[phase]}<ArrowRight size={16} /></button> : <button type="button" onClick={() => setShowPreflight(true)} disabled={!ready} className="thor-button justify-center disabled:cursor-not-allowed disabled:opacity-40"><Rocket size={16} />Preparar lançamento</button>}
      </footer>
    </div>
    {showPreflight && <PreflightModal name={campaignName} counts={counts} budget={budget} currency={accountCurrency} onClose={() => setShowPreflight(false)} onConfirm={() => { setShowPreflight(false); setNotice({ tone: "success", text: "Pré-flight concluído. Nenhuma campanha foi criada; a publicação real será a próxima etapa da integração." }); }} />}
  </main>;
}

function TopBar({ connected, bcs, advertisers, loading, onRefresh }: { connected: boolean; bcs: number; advertisers: number; loading: boolean; onRefresh: () => void }) {
  return <header className="relative border-b border-white/[.08] bg-[#070b0d]/90 backdrop-blur-xl"><div className="mx-auto flex max-w-[1700px] items-center justify-between gap-4 px-4 py-4 sm:px-7 lg:px-10">
    <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl border border-[#f9cf26]/70 bg-[#f9cf26] text-[#10110c] shadow-[0_0_32px_rgba(249,207,38,.23)]"><Zap size={22} strokeWidth={2.8} /></span><div><p className="text-lg font-black tracking-tight text-white">Thor<span className="text-[#f9cf26]">Tk</span></p><p className="text-[10px] font-bold uppercase tracking-[.18em] text-slate-500">Centro de comando · ABO</p></div></div>
    <div className="flex items-center gap-2 sm:gap-3"><TopStat label="BCs" value={bcs} tone="sky" /><TopStat label="Contas" value={advertisers} tone="green" /><div className={"hidden items-center gap-2 text-xs font-bold md:flex " + (connected ? "text-emerald-300" : "text-amber-200")}><span className={"h-2 w-2 rounded-full " + (connected ? "bg-emerald-400 shadow-[0_0_12px_rgba(74,222,128,.8)]" : "bg-amber-400")} />{connected ? "Canal autorizado" : "Canal pendente"}</div><button type="button" title="Atualizar ativos" onClick={onRefresh} disabled={loading} className="grid h-10 w-10 place-items-center rounded-lg border border-white/[.12] bg-white/[.04] text-slate-300 transition hover:border-[#f9cf26]/65 hover:text-[#f9cf26] disabled:opacity-50"><RefreshCw size={16} className={loading ? "animate-spin" : ""} /></button></div>
  </div></header>;
}
function TopStat({ label, value, tone }: { label: string; value: number; tone: "sky" | "green" }) {
  const style = tone === "sky" ? "border-sky-400/20 bg-sky-400/[.07] text-sky-300" : "border-emerald-400/20 bg-emerald-400/[.07] text-emerald-300";
  return <div className={"hidden rounded-lg border px-3 py-2 sm:block " + style}><p className="text-[9px] font-bold uppercase tracking-[.13em] opacity-70">{label}</p><p className="mt-0.5 text-xs font-black">{value}</p></div>;
}
function MissionRail({ phase, onChange }: { phase: number; onChange: (step: number) => void }) {
  return <nav aria-label="Etapas da missão" className="overflow-x-auto pb-2 [scrollbar-width:none]"><div className="relative flex min-w-[760px] items-start justify-between px-3 pt-4"><div aria-hidden className="absolute left-[7%] right-[7%] top-10 border-t border-dashed border-slate-600/55" />{phases.map(([label, Icon], index) => { const active = index === phase; const done = index < phase; return <button key={label} type="button" onClick={() => onChange(index)} className="relative z-10 flex w-[104px] flex-col items-center gap-2 text-center"><span className={"grid h-12 w-12 place-items-center rounded-xl border transition " + (active ? "border-[#f9cf26] bg-[#0d1416] text-[#f9cf26] shadow-[0_0_26px_rgba(249,207,38,.25)]" : done ? "border-emerald-400/35 bg-emerald-400/[.08] text-emerald-300" : "border-white/[.12] bg-[#0c1113] text-slate-500 hover:border-white/[.25] hover:text-slate-200")}>{done ? <CircleCheck size={19} /> : <Icon size={19} />}</span><span className={"text-[10px] font-black uppercase tracking-[.13em] " + (active ? "text-[#f9cf26]" : done ? "text-emerald-300" : "text-slate-500")}>{label}</span></button>; })}</div></nav>;
}
function StageHeader({ phase, connected, bcs, advertisers }: { phase: number; connected: boolean; bcs: number; advertisers: number }) {
  const item = copy[phase];
  return <div className="mt-4 flex flex-col gap-5 border-b border-white/[.07] pb-6 lg:flex-row lg:items-end lg:justify-between"><div><p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[.2em] text-[#f9cf26]"><Zap size={13} />{item[0]}</p><h1 className="mt-3 text-3xl font-black tracking-[-.055em] text-white sm:text-5xl">{item[1]}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">{item[2]}</p></div><div className="grid grid-cols-3 overflow-hidden rounded-xl border border-white/[.1] bg-[#0a0f11]/80"><MiniKpi label="Status" value={connected ? "Ativo" : "Pendente"} good={connected} /><MiniKpi label="BCs" value={bcs} /><MiniKpi label="Contas" value={advertisers} /></div></div>;
}
function MiniKpi({ label, value, good = false }: { label: string; value: string | number; good?: boolean }) {
  return <div className="min-w-[92px] border-r border-white/[.08] px-4 py-3 last:border-r-0"><p className="text-[9px] font-bold uppercase tracking-[.14em] text-slate-500">{label}</p><p className={"mt-1 text-sm font-black " + (good ? "text-emerald-300" : "text-white")}>{value}</p></div>;
}
function NoticeBanner({ notice, onClose }: { notice: Notice; onClose: () => void }) {
  const color = notice.tone === "success" ? "border-emerald-400/25 bg-emerald-400/[.08] text-emerald-200" : notice.tone === "error" ? "border-red-400/25 bg-red-400/[.08] text-red-100" : "border-amber-400/25 bg-amber-400/[.08] text-amber-100";
  return <div className={"mt-5 flex items-start justify-between gap-4 rounded-xl border px-4 py-3 text-sm " + color}><span className="flex items-start gap-2 leading-6">{notice.tone === "success" ? <CircleCheck className="mt-1 shrink-0" size={16} /> : <CircleAlert className="mt-1 shrink-0" size={16} />}{notice.text}</span><button type="button" onClick={onClose} className="mt-1 opacity-70 transition hover:opacity-100" aria-label="Fechar aviso"><X size={16} /></button></div>;
}
function Warnings({ items }: { items: string[] }) {
  return <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/[.055] px-4 py-3 text-xs leading-5 text-amber-100"><p className="font-black uppercase tracking-[.11em]">Retorno parcial do TikTok</p><ul className="mt-1 list-disc space-y-0.5 pl-4">{items.map((item, index) => <li key={item + String(index)}>{item}</li>)}</ul></div>;
}
function ConnectStage({ connected, date, bcs, advertisers, loading, onConnect, onRefresh }: { connected: boolean; date?: string; bcs: number; advertisers: number; loading: boolean; onConnect: () => void; onRefresh: () => void }) {
  return <div className="mx-auto max-w-3xl py-5 text-center sm:py-10"><div className={"thor-orb mx-auto grid h-24 w-24 place-items-center rounded-[28px] border " + (connected ? "border-emerald-300/65 text-emerald-300" : "border-[#f9cf26]/65 text-[#f9cf26]")}>{connected ? <ShieldCheck size={44} /> : <Zap size={44} />}</div><p className="mt-7 text-[11px] font-black uppercase tracking-[.2em] text-[#f9cf26]">{connected ? "Canal de comando disponível" : "Canal de comando fechado"}</p><h2 className="mt-3 text-3xl font-black tracking-[-.05em] text-white sm:text-4xl">{connected ? "Tempestade sincronizada." : "Desperte o canal TikTok."}</h2><p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-400">{connected ? "Autorizado em " + dateLabel(date) + ". Os ativos vêm da sua conta TikTok, sem expor o token no navegador." : "A autorização acontece no App TikTok. Depois do retorno, o ThorTk mapeia BCs, contas, catálogos, pixels e identidades."}</p>{connected ? <div className="mx-auto mt-8 grid max-w-xl grid-cols-2 gap-3"><SignalCard label="Business Centers" value={bcs} icon={<Building2 size={20} />} /><SignalCard label="Contas autorizadas" value={advertisers} icon={<Target size={20} />} /></div> : <div className="mx-auto mt-8 max-w-xl rounded-2xl border border-white/[.1] bg-[#0a1012]/90 p-5 text-left"><p className="text-sm font-extrabold text-white">O que será carregado</p><div className="mt-4 grid gap-3 text-sm text-slate-400 sm:grid-cols-3"><CheckItem text="Business Centers" /><CheckItem text="Contas de anúncio" /><CheckItem text="Pixels e identidades" /></div></div>}<div className="mt-8 flex flex-wrap justify-center gap-3">{connected ? <button type="button" onClick={onRefresh} disabled={loading} className="thor-button disabled:opacity-50"><RefreshCw size={16} className={loading ? "animate-spin" : ""} />Atualizar ativos</button> : <button type="button" onClick={onConnect} className="thor-button"><PlugZap size={17} />Autorizar TikTok</button>}</div></div>;
}
function AssetsStage({ businessCenters, advertisers, query, setQuery, bcId, advertiserId, details, pixelId, identityId, loading, onBc, onAdvertiser, onPixel, onIdentity }: { businessCenters: Choice[]; advertisers: Choice[]; query: string; setQuery: (v: string) => void; bcId: string; advertiserId: string; details: Detail; pixelId: string; identityId: string; loading: boolean; onBc: (v: string) => void; onAdvertiser: (v: string) => void; onPixel: (v: string) => void; onIdentity: (v: string) => void }) {
  return <div className="space-y-6"><div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]"><AssetCluster icon={<Orbit size={20} />} eyebrow="BUSINESS CENTER" title="Centro de comando" description="Apenas BCs retornados pela autorização."><div className="mt-5 grid gap-3">{businessCenters.length ? businessCenters.map((item) => <ChoiceCard key={item.id} item={item} selected={item.id === bcId} icon={<Building2 size={18} />} onClick={() => onBc(item.id)} />) : <EmptyState text="Nenhum Business Center retornado pela API." />}</div></AssetCluster><AssetCluster icon={<Target size={20} />} eyebrow="CONTAS DE ANÚNCIO" title="Conta de batalha" description="Busque pelo nome ou ID. A moeda real será carregada ao selecionar."><label className="relative mt-5 block"><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar conta ou ID" className="thor-field pl-10" /></label><div className="mt-3 grid max-h-[255px] gap-2 overflow-y-auto pr-1">{advertisers.length ? advertisers.map((item) => <ChoiceCard key={item.id} item={item} selected={item.id === advertiserId} icon={<Target size={18} />} onClick={() => onAdvertiser(item.id)} />) : <EmptyState text="Nenhuma conta corresponde à busca." />}</div></AssetCluster></div><div className="grid gap-5 lg:grid-cols-2"><SelectAsset icon={<Orbit size={20} />} label="Pixel de conversão" description="Eventos que a conta pode utilizar." values={details.pixels} selectedId={pixelId} loading={loading} empty="Selecione uma conta para carregar os pixels." onChange={onPixel} /><SelectAsset icon={<UserRound size={20} />} label="Identidade do anúncio" description="Perfil autorizado para publicar." values={details.identities} selectedId={identityId} loading={loading} empty="Selecione uma conta para carregar as identidades." onChange={onIdentity} /></div></div>;
}
function CatalogStage({ bc, catalogs, selectedId, loading, onRefresh, onSelect }: { bc: Choice | null; catalogs: Choice[]; selectedId: string; loading: boolean; onRefresh: () => void; onSelect: (v: string) => void }) {
  return <div><div className="flex flex-col justify-between gap-4 border-b border-white/[.08] pb-5 sm:flex-row sm:items-center"><div><p className="text-[11px] font-black uppercase tracking-[.16em] text-[#f9cf26]">Catálogo do Business Center</p><h2 className="mt-2 text-2xl font-black text-white">{bc?.name ?? "Selecione um Business Center"}</h2><p className="mt-1 text-sm text-slate-400">O ThorTk usa um catálogo existente; nunca duplica, altera ou reconecta feeds.</p></div><button type="button" onClick={onRefresh} disabled={loading} className="thor-button-muted disabled:opacity-50"><RefreshCw size={16} className={loading ? "animate-spin" : ""} />Atualizar</button></div>{loading ? <LoadingBlock label="Consultando catálogos no TikTok…" /> : <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{catalogs.length ? catalogs.map((item) => <button key={item.id} type="button" onClick={() => onSelect(item.id)} className={"rounded-2xl border p-5 text-left transition " + (item.id === selectedId ? "border-[#f9cf26] bg-[#f9cf26]/[.09] shadow-[0_0_28px_rgba(249,207,38,.07)]" : "border-white/[.1] bg-black/20 hover:border-white/[.26]")}><div className="flex items-start justify-between"><span className={"grid h-10 w-10 place-items-center rounded-xl " + (item.id === selectedId ? "bg-[#f9cf26] text-[#0b0f10]" : "bg-white/[.07] text-slate-300")}><Boxes size={20} /></span>{item.id === selectedId && <CircleCheck className="text-[#f9cf26]" size={18} />}</div><p className="mt-5 truncate font-black text-white">{item.name}</p><p className="mt-1 truncate text-xs text-slate-500">{item.id}</p><span className="mt-4 inline-flex rounded-md border border-white/[.08] bg-white/[.04] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">{item.currency || "Moeda via conta"}</span></button>) : <EmptyState text="Nenhum catálogo retornado para este Business Center." />}</div>}</div>;
}
function CreativeStage({ value, cta, onChange, onCta }: { value: string; cta: string; onChange: (v: string) => void; onCta: (v: string) => void }) {
  const calls = [["LEARN_MORE", "Saiba mais"], ["SHOP_NOW", "Comprar agora"], ["SIGN_UP", "Cadastre-se"], ["CONTACT_US", "Contato"]];
  return <div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]"><div><p className="text-[11px] font-black uppercase tracking-[.16em] text-[#f9cf26]">TEXTO DO ANÚNCIO</p><h2 className="mt-2 text-2xl font-black text-white">Direcione a mensagem.</h2><p className="mt-2 text-sm leading-6 text-slate-400">O TikTok combina esse texto com a mídia e os produtos elegíveis do catálogo.</p><label className="mt-5 block"><span className="sr-only">Texto do anúncio</span><textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={'Ex.: Pulsa en "Más información"'} className="thor-field min-h-40 resize-y" /></label><p className="mt-2 text-right text-xs text-slate-500">{value.length}/500 caracteres</p></div><div className="rounded-2xl border border-white/[.1] bg-black/20 p-5"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[#f9cf26]/15 text-[#f9cf26]"><Video size={21} /></span><p className="mt-5 text-[11px] font-black uppercase tracking-[.13em] text-slate-400">Call to action</p><div className="mt-4 grid grid-cols-2 gap-2">{calls.map(([valueItem, label]) => <button key={valueItem} type="button" onClick={() => onCta(valueItem)} className={"rounded-lg border px-3 py-3 text-xs font-black transition " + (cta === valueItem ? "border-[#f9cf26] bg-[#f9cf26] text-[#10110c]" : "border-white/[.1] bg-white/[.035] text-slate-300 hover:border-white/[.25]")}>{label}</button>)}</div><div className="mt-6 rounded-xl border border-sky-400/15 bg-sky-400/[.055] p-4 text-xs leading-5 text-sky-100">Modo catálogo ativo: o vídeo elegível será resolvido pelo TikTok nos ativos do catálogo.</div></div></div>;
}
function StructureStage({ campaigns, groups, ads, setCampaigns, setGroups, setAds, inputCurrency, setInputCurrency, amount, setAmount, rate, setRate, accountCurrency, budget, counts, country, setCountry, language, setLanguage }: { campaigns: string; groups: string; ads: string; setCampaigns: (v: string) => void; setGroups: (v: string) => void; setAds: (v: string) => void; inputCurrency: string; setInputCurrency: (v: string) => void; amount: string; setAmount: (v: string) => void; rate: string; setRate: (v: string) => void; accountCurrency: string; budget: number; counts: { campaigns: number; groups: number; ads: number }; country: string; setCountry: (v: string) => void; language: string; setLanguage: (v: string) => void }) {
  return <div className="space-y-6"><div className="grid gap-4 md:grid-cols-3"><NumberField label="Campanhas" value={campaigns} onChange={setCampaigns} /><NumberField label="Grupos por campanha" value={groups} onChange={setGroups} /><NumberField label="Anúncios por grupo" value={ads} onChange={setAds} /></div><div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]"><div className="rounded-2xl border border-white/[.1] bg-black/20 p-5"><p className="text-[11px] font-black uppercase tracking-[.16em] text-slate-500">ORÇAMENTO POR GRUPO</p><div className="mt-5 grid gap-3 sm:grid-cols-[1fr_130px]"><label><span className="sr-only">Valor</span><input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" className="thor-field text-2xl font-black" /></label><SelectField label="Moeda" value={inputCurrency} values={currencies} onChange={setInputCurrency} /></div>{inputCurrency !== accountCurrency && <label className="mt-4 block text-xs font-bold text-slate-400">Cotação manual · 1 {inputCurrency} em {accountCurrency}<input value={rate} onChange={(event) => setRate(event.target.value)} inputMode="decimal" className="thor-field mt-2" /></label>}</div><div className="rounded-2xl border border-[#f9cf26]/35 bg-[linear-gradient(135deg,rgba(249,207,38,.16),rgba(249,207,38,.025))] p-5"><div className="flex items-center justify-between"><p className="text-[11px] font-black uppercase tracking-[.16em] text-[#fce58d]">Carga da missão</p><Coins className="text-[#f9cf26]" size={20} /></div><p className="mt-5 text-4xl font-black tracking-[-.05em] text-white">{money(budget, accountCurrency)}</p><p className="mt-1 text-sm text-slate-300">por grupo · moeda da conta</p><div className="mt-6 grid grid-cols-3 gap-2 border-t border-white/[.12] pt-4"><Kpi label="Campanhas" value={counts.campaigns} /><Kpi label="Grupos" value={counts.groups} /><Kpi label="Teto diário" value={money(budget * counts.groups, accountCurrency)} /></div></div></div><div className="grid gap-4 md:grid-cols-2"><SelectField label="País de entrega" value={country} values={["MX", "BR", "US", "CL"]} onChange={setCountry} /><SelectField label="Idioma do anúncio" value={language} values={["es", "pt", "en"]} onChange={setLanguage} /></div></div>;
}
function ReviewStage({ ready, name, setName, bc, advertiser, catalog, pixel, identity, counts, budget, currency }: { ready: boolean; name: string; setName: (v: string) => void; bc: Choice | null; advertiser: Choice | null; catalog: Choice | null; pixel: Choice | null; identity: Choice | null; counts: { campaigns: number; groups: number; ads: number }; budget: number; currency: string }) {
  const rows = [["Business Center", bc], ["Conta", advertiser], ["Catálogo", catalog], ["Pixel", pixel], ["Identidade", identity]] as const;
  return <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]"><div className="rounded-2xl border border-white/[.1] bg-black/20 p-5"><p className="text-[11px] font-black uppercase tracking-[.16em] text-[#f9cf26]">NOMENCLATURA</p><label className="mt-4 block text-sm font-black text-white">Nome-base da campanha<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: P268MXN-TEST" className="thor-field mt-3" /></label><div className="mt-6 divide-y divide-white/[.08]">{rows.map(([label, item]) => <div key={label} className="flex items-center justify-between gap-4 py-3"><span className="text-sm text-slate-500">{label}</span><span className={"flex min-w-0 items-center gap-2 text-right text-xs font-bold " + (item ? "text-emerald-300" : "text-amber-200")}>{item ? <CircleCheck size={15} /> : <CircleAlert size={15} />}<span className="truncate">{item?.name ?? "Pendente"}</span></span></div>)}</div></div><div className={"rounded-2xl border p-6 " + (ready ? "border-[#f9cf26]/45 bg-[#f9cf26]/[.07]" : "border-white/[.1] bg-black/20")}><p className="text-[11px] font-black uppercase tracking-[.16em] text-[#f9cf26]">RESUMO DA FROTA</p><h2 className="mt-4 text-3xl font-black tracking-[-.05em] text-white">{counts.campaigns} campanha{counts.campaigns > 1 ? "s" : ""}</h2><p className="mt-3 text-sm leading-6 text-slate-300">{counts.groups} grupos ABO · {counts.ads} anúncios. Cada grupo recebe <strong>{money(budget, currency)}</strong>; teto diário estimado de <strong>{money(budget * counts.groups, currency)}</strong>.</p><div className="mt-6 rounded-xl border border-white/[.1] bg-black/20 p-4"><p className="text-xs font-black text-white">Status do pré-flight</p><div className="mt-3 space-y-2"><CheckItem text="Ativos selecionados" done={Boolean(bc && advertiser && catalog && pixel && identity)} /><CheckItem text="Criativo configurado" done={Boolean(ready)} /><CheckItem text="Orçamento calculado" done={budget > 0} /></div></div></div></div>;
}
function OperationMap({ bc, advertiser, catalog, pixel, identity }: { bc: Choice | null; advertiser: Choice | null; catalog: Choice | null; pixel: Choice | null; identity: Choice | null }) {
  const rows = [["BC", bc], ["Conta", advertiser], ["Catálogo", catalog], ["Pixel", pixel], ["Identidade", identity]] as const;
  return <div className="mt-7 border-t border-white/[.08] pt-5"><p className="text-[10px] font-black uppercase tracking-[.17em] text-slate-500">Mapa operacional</p><div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">{rows.map(([label, item]) => <div key={label} className="rounded-lg border border-white/[.08] bg-black/20 px-3 py-3"><div className="flex items-center gap-2"><span className={"h-2 w-2 rounded-full " + (item ? "bg-emerald-400" : "bg-slate-700")} /><p className="text-[10px] font-black uppercase tracking-wide text-slate-500">{label}</p></div><p className="mt-2 truncate text-xs font-bold text-slate-200">{item?.name ?? "A selecionar"}</p></div>)}</div></div>;
}
function AssetCluster({ icon, eyebrow, title, description, children }: { icon: React.ReactNode; eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  return <div className="rounded-2xl border border-white/[.1] bg-black/20 p-5"><div className="flex items-start gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#f9cf26]/12 text-[#f9cf26]">{icon}</span><div><p className="text-[10px] font-black uppercase tracking-[.15em] text-slate-500">{eyebrow}</p><h2 className="mt-1 text-lg font-black text-white">{title}</h2><p className="mt-1 text-xs leading-5 text-slate-400">{description}</p></div></div>{children}</div>;
}
function ChoiceCard({ item, selected, icon, onClick }: { item: Choice; selected: boolean; icon: React.ReactNode; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={"flex w-full items-center gap-3 rounded-xl border p-3 text-left transition " + (selected ? "border-[#f9cf26] bg-[#f9cf26]/[.1]" : "border-white/[.08] bg-white/[.025] hover:border-white/[.23]")}><span className={"grid h-9 w-9 shrink-0 place-items-center rounded-lg " + (selected ? "bg-[#f9cf26] text-[#10110c]" : "bg-white/[.07] text-slate-400")}>{icon}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-black text-white">{item.name}</span><span className="mt-0.5 block truncate text-[11px] text-slate-500">{item.id}</span></span>{selected && <CircleCheck className="shrink-0 text-[#f9cf26]" size={17} />}</button>;
}
function SelectAsset({ icon, label, description, values, selectedId, loading, empty, onChange }: { icon: React.ReactNode; label: string; description: string; values: Choice[]; selectedId: string; loading: boolean; empty: string; onChange: (v: string) => void }) {
  return <div className="rounded-2xl border border-white/[.1] bg-black/20 p-5"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white/[.06] text-[#f9cf26]">{icon}</span><div><p className="font-black text-white">{label}</p><p className="mt-1 text-xs text-slate-500">{description}</p></div></div><div className="mt-5">{loading ? <LoadingBlock label="Consultando TikTok…" compact /> : values.length ? <select value={selectedId} onChange={(event) => onChange(event.target.value)} className="thor-field"><option value="">Selecione</option>{values.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.id}{item.type ? " · " + item.type : ""}</option>)}</select> : <EmptyState text={empty} />}</div></div>;
}
function NumberField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <label className="rounded-2xl border border-white/[.1] bg-black/20 p-5"><span className="text-[11px] font-black uppercase tracking-[.15em] text-slate-500">{label}</span><input type="number" min="1" value={value} onChange={(event) => onChange(event.target.value)} className="thor-field mt-4 text-3xl font-black" /></label>;
}
function SelectField({ label, value, values, onChange }: { label: string; value: string; values: string[]; onChange: (v: string) => void }) {
  return <label className={label ? "block text-[11px] font-black uppercase tracking-[.14em] text-slate-500" : "block"}>{label}<span className="relative mt-2 block"><select value={value} onChange={(event) => onChange(event.target.value)} className="thor-field appearance-none pr-10 text-sm font-bold text-white">{values.map((item) => <option key={item} value={item}>{item}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} /></span></label>;
}
function SignalCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return <div className="rounded-xl border border-emerald-400/25 bg-emerald-400/[.06] p-4 text-left"><div className="flex items-center justify-between text-emerald-300"><p className="text-[10px] font-black uppercase tracking-[.13em]">{label}</p>{icon}</div><p className="mt-3 text-3xl font-black text-white">{value}</p></div>;
}
function CheckItem({ text, done = false }: { text: string; done?: boolean }) {
  return <div className={"flex items-center gap-2 text-xs font-semibold " + (done ? "text-emerald-300" : "text-slate-400")}>{done ? <CircleCheck size={15} /> : <span className="h-3.5 w-3.5 rounded-full border border-white/[.2]" />}{text}</div>;
}
function EmptyState({ text }: { text: string }) { return <div className="rounded-xl border border-dashed border-white/[.15] bg-white/[.02] px-4 py-6 text-center text-xs leading-5 text-slate-500">{text}</div>; }
function LoadingBlock({ label, compact = false }: { label: string; compact?: boolean }) { return <div className={"flex items-center justify-center gap-2 rounded-xl border border-dashed border-white/[.15] text-xs text-slate-400 " + (compact ? "min-h-12" : "mt-6 min-h-40")}><Loader2 className="animate-spin text-[#f9cf26]" size={17} />{label}</div>; }
function Kpi({ label, value }: { label: string; value: string | number }) { return <div><p className="text-[9px] font-black uppercase tracking-[.12em] text-slate-500">{label}</p><p className="mt-1 truncate text-sm font-black text-white">{value}</p></div>; }
function PreflightModal({ name, counts, budget, currency, onClose, onConfirm }: { name: string; counts: { campaigns: number; groups: number; ads: number }; budget: number; currency: string; onClose: () => void; onConfirm: () => void }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-sm"><div role="dialog" aria-modal="true" aria-label="Pré-flight" className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/[.14] bg-[#12181e] shadow-[0_26px_90px_rgba(0,0,0,.55)]"><div className="flex items-center justify-between border-b border-white/[.08] px-6 py-5"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#f9cf26] text-[#10110c]"><Zap size={20} /></span><div><p className="font-black text-white">Pré-flight da missão</p><p className="text-xs text-slate-500">Nada será criado sem a etapa final da API.</p></div></div><button type="button" onClick={onClose} className="text-slate-400 transition hover:text-white" aria-label="Fechar"><X size={20} /></button></div><div className="p-6"><div className="rounded-xl border border-[#f9cf26]/30 bg-[#f9cf26]/[.07] p-5"><p className="text-[10px] font-black uppercase tracking-[.15em] text-[#fce58d]">Resumo pronto para publicação</p><p className="mt-3 text-2xl font-black text-white">{name}</p><p className="mt-2 text-sm leading-6 text-slate-300">{counts.campaigns} campanha(s), {counts.groups} grupo(s) e {counts.ads} anúncio(s). Teto diário: <strong>{money(budget * counts.groups, currency)}</strong>.</p></div><div className="mt-5 space-y-3 font-mono text-xs leading-5"><Log tone="success" text="Vínculos de catálogo, conta, pixel e identidade conferidos." /><Log tone="success" text={"Orçamento convertido para " + currency + ": " + money(budget, currency) + " por grupo."} /><Log tone="warning" text="A publicação real ainda não foi chamada; esta confirmação não gera gasto." /></div></div><div className="flex flex-col-reverse gap-3 border-t border-white/[.08] px-6 py-5 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} className="thor-button-muted justify-center">Voltar e editar</button><button type="button" onClick={onConfirm} className="thor-button justify-center"><ShieldCheck size={16} />Confirmar pré-flight</button></div></div></div>;
}
function Log({ tone, text }: { tone: "success" | "warning"; text: string }) { return <p className={tone === "success" ? "text-emerald-300" : "text-amber-200"}><span className="mr-2 opacity-60">{tone === "success" ? "✓" : "!"}</span>{text}</p>; }
