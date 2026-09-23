import Link from "next/link";
import { ArrowUpRight, Bolt, CheckCircle2, LockKeyhole, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

const contactEmail = "boxzap@tikscalepro.online";

export function InstitutionalShell({ children, active }: { children: ReactNode; active?: "privacy" | "terms" }) {
  return <main className="min-h-screen overflow-hidden bg-[#080c10] text-[#f5f8fb]">
    <div aria-hidden className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_16%_0%,rgba(69,165,255,.15),transparent_29rem),radial-gradient(circle_at_88%_5%,rgba(215,179,91,.11),transparent_24rem)]" />
    <header className="relative border-b border-white/[.08]">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-5 px-6 py-5 lg:px-8">
        <Link href="/institucional" className="group flex items-center gap-3" aria-label="ThorTk — início">
          <span className="grid size-10 place-items-center rounded-xl border border-sky-300/30 bg-sky-400/10 text-sky-200 shadow-[0_0_28px_rgba(58,170,255,.15)]"><Bolt size={20} fill="currentColor" /></span>
          <span><b className="thor-title text-lg leading-none">ThorTk</b><small className="mt-1 block text-[10px] font-bold uppercase tracking-[.16em] text-slate-400">Operação TikTok</small></span>
        </Link>
        <nav className="hidden items-center gap-5 text-xs font-bold text-slate-400 sm:flex">
          <Link href="/institucional#produto" className="transition hover:text-white">Produto</Link>
          <Link href="/privacidade" className={active === "privacy" ? "text-sky-200" : "transition hover:text-white"}>Privacidade</Link>
          <Link href="/termos" className={active === "terms" ? "text-sky-200" : "transition hover:text-white"}>Termos</Link>
        </nav>
      </div>
    </header>
    {children}
    <footer className="relative border-t border-white/[.08]">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-9 text-sm text-slate-400 md:grid-cols-[1fr_auto] lg:px-8">
        <div><div className="flex items-center gap-2 text-slate-200"><Bolt size={15} className="text-sky-300" fill="currentColor" /><b>ThorTk</b></div><p className="mt-2 max-w-lg text-xs leading-5">Plataforma operacional para configuração e gestão de campanhas de catálogo no TikTok Ads.</p></div>
        <div className="flex flex-col gap-2 text-xs md:items-end"><a href={"mailto:" + contactEmail} className="font-bold text-sky-200 transition hover:text-white">{contactEmail}</a><span>© {new Date().getFullYear()} ThorTk. Todos os direitos reservados.</span></div>
      </div>
    </footer>
  </main>;
}

export function InstitutionalHome() {
  return <InstitutionalShell>
    <section className="relative mx-auto max-w-6xl px-6 pb-20 pt-20 lg:px-8 lg:pb-28 lg:pt-28">
      <div className="grid items-center gap-14 lg:grid-cols-[1.15fr_.85fr]">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-sky-400/[.08] px-3 py-1.5 text-[11px] font-black uppercase tracking-[.13em] text-sky-200"><span className="size-1.5 rounded-full bg-sky-300 shadow-[0_0_10px_#7dd3fc]" />Tecnologia para TikTok Ads</p>
          <h1 className="thor-title thor-title--storm mt-6 max-w-3xl text-4xl leading-[1.06] sm:text-5xl lg:text-6xl">Controle operacional para campanhas de catálogo.</h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300">O ThorTk centraliza a preparação de ativos, estruturas ABO e revisões operacionais para equipes que trabalham com TikTok Ads. A plataforma conecta contas autorizadas e organiza o fluxo antes do lançamento.</p>
          <div className="mt-8 flex flex-wrap gap-3"><Link href="/auth" className="inline-flex items-center gap-2 rounded-xl bg-sky-300 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-sky-200">Acessar plataforma <ArrowUpRight size={17} /></Link><Link href="/privacidade" className="inline-flex items-center gap-2 rounded-xl border border-white/[.13] bg-white/[.03] px-5 py-3 text-sm font-bold text-slate-100 transition hover:border-sky-300/40 hover:bg-sky-300/[.06]">Como protegemos dados</Link></div>
        </div>
        <div className="relative mx-auto w-full max-w-md">
          <div aria-hidden className="absolute -inset-10 rounded-full bg-sky-400/10 blur-3xl" />
          <div className="relative overflow-hidden rounded-3xl border border-sky-200/[.16] bg-[linear-gradient(145deg,rgba(20,31,44,.96),rgba(9,13,18,.97))] p-6 shadow-[0_35px_90px_rgba(0,0,0,.42)]">
            <div className="flex items-center justify-between border-b border-white/[.08] pb-5"><span className="flex items-center gap-3 text-sm font-black"><span className="grid size-10 place-items-center rounded-xl border border-sky-300/25 bg-sky-300/[.09] text-sky-200"><Bolt size={20} fill="currentColor" /></span>Centro de comando</span><span className="rounded-full bg-emerald-400/[.12] px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-300">Seguro</span></div>
            <div className="mt-5 space-y-3">{[["Contas autorizadas", "Acesso por OAuth"], ["Ativos de campanha", "Pixels, identities e catálogos"], ["Revisão de estrutura", "Validação antes do lançamento"]].map(([title, description], index) => <div className="flex gap-3 rounded-xl border border-white/[.07] bg-black/15 p-4" key={title}><span className="mt-0.5 text-sky-300">{index === 0 ? <ShieldCheck size={18} /> : index === 1 ? <LockKeyhole size={18} /> : <CheckCircle2 size={18} />}</span><span><b className="block text-sm">{title}</b><small className="mt-1 block text-xs text-slate-400">{description}</small></span></div>)}</div>
          </div>
        </div>
      </div>
    </section>
    <section id="produto" className="relative border-y border-white/[.07] bg-white/[.018]">
      <div className="mx-auto max-w-6xl px-6 py-16 lg:px-8"><div className="max-w-2xl"><p className="text-xs font-black uppercase tracking-[.16em] text-[#d8b56b]">O que a plataforma faz</p><h2 className="thor-title mt-3 text-3xl text-white">Uma operação organizada, com autorização explícita.</h2></div><div className="mt-10 grid gap-4 md:grid-cols-3">{[["Conexão de contas", "Integração via autorização do TikTok para consultar e gerir os ativos que o usuário autorizou."], ["Preparação de campanha", "Configuração de contas, catálogos, criativos, estrutura, público e orçamento em um único fluxo."], ["Revisão antes do envio", "Checagens operacionais ajudam a identificar pendências antes de preparar um lançamento."]].map(([title, text]) => <article className="rounded-2xl border border-white/[.08] bg-[#0d131a] p-6" key={title}><h3 className="text-base font-black text-slate-100">{title}</h3><p className="mt-3 text-sm leading-6 text-slate-400">{text}</p></article>)}</div></div>
    </section>
    <section className="relative mx-auto max-w-6xl px-6 py-16 lg:px-8"><div className="grid gap-6 rounded-3xl border border-[#d8b56b]/25 bg-[linear-gradient(120deg,rgba(48,38,15,.58),rgba(15,23,32,.85))] p-7 md:grid-cols-[1fr_auto] md:items-center md:p-10"><div><p className="text-xs font-black uppercase tracking-[.14em] text-[#e8ce8b]">Transparência e suporte</p><h2 className="thor-title mt-3 text-2xl text-white">Informações claras para usuários e parceiros.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">Dúvidas sobre privacidade, uso da plataforma ou autorização de dados podem ser enviadas diretamente para nosso canal de suporte.</p></div><a href={"mailto:" + contactEmail} className="inline-flex items-center justify-center rounded-xl border border-[#e5ca7f]/50 bg-[#d8b56b] px-5 py-3 text-sm font-black text-[#171208] transition hover:bg-[#ecd18a]">{contactEmail}</a></div></section>
  </InstitutionalShell>;
}

export function LegalPage({ type }: { type: "privacy" | "terms" }) {
  const privacy = type === "privacy";
  const sections = privacy ? [
    ["1. Visão geral", "Esta Política de Privacidade explica como o ThorTk trata dados pessoais e dados operacionais necessários para oferecer sua plataforma de organização de campanhas no TikTok Ads."],
    ["2. Dados tratados", "Podemos tratar dados de cadastro e contato, identificadores de contas autorizadas, Business Centers, contas de anúncio, catálogos, pixels, identities, configurações de campanha e registros técnicos de uso. Tokens de autorização do TikTok são tratados somente para executar as ações autorizadas pelo usuário."],
    ["3. Finalidades", "Usamos esses dados para autenticar o acesso, conectar contas autorizadas, consultar ativos disponíveis, configurar fluxos operacionais, manter a segurança do serviço, prevenir uso indevido e responder a solicitações de suporte."],
    ["4. Compartilhamento", "O ThorTk compartilha dados apenas quando necessário para operar as integrações solicitadas pelo usuário, incluindo a API do TikTok, ou quando houver obrigação legal. Não vendemos dados pessoais nem dados de contas de anúncio."],
    ["5. Segurança e retenção", "Adotamos medidas técnicas e organizacionais razoáveis para proteger dados contra acesso não autorizado. Os dados são mantidos pelo período necessário para as finalidades descritas, para cumprimento de obrigações legais ou até que a exclusão seja solicitada, quando aplicável."],
    ["6. Seus direitos e contato", "Você pode solicitar informações, correção, exclusão ou esclarecimentos sobre o tratamento de dados pelo e-mail de contato abaixo. Solicitações poderão exigir validação de identidade para proteção da conta."],
    ["7. Serviços de terceiros", "O uso de dados recebidos por meio de integrações do TikTok está sujeito às permissões concedidas pelo usuário e às políticas aplicáveis do TikTok. O ThorTk não controla as práticas de privacidade desses serviços de terceiros."]
  ] : [
    ["1. Aceitação", "Ao acessar ou utilizar o ThorTk, você concorda com estes Termos de Uso e com a Política de Privacidade. Caso não concorde, não utilize a plataforma."],
    ["2. Escopo do serviço", "O ThorTk é uma plataforma operacional para organização de ativos e configuração de campanhas de catálogo no TikTok Ads. A plataforma não garante aprovação de anúncios, resultados de mídia, disponibilidade de contas ou decisões tomadas pelo TikTok."],
    ["3. Conta e autorizações", "Você é responsável pelas informações fornecidas, por manter suas credenciais protegidas e por autorizar somente contas e ativos sobre os quais possua direito de administração. É proibido utilizar o serviço para acessar ou gerir ativos sem autorização."],
    ["4. Uso permitido", "O usuário deve cumprir as leis aplicáveis, as regras do TikTok Ads e os direitos de terceiros. Não é permitido usar o ThorTk para fraudes, coleta indevida de dados, evasão de políticas de publicidade, atividade ilícita ou qualquer uso que comprometa a segurança da plataforma."],
    ["5. Dados e integrações", "As integrações são realizadas de acordo com as permissões que você concede. Você permanece responsável pelos dados, criativos, configurações e ações enviadas por sua conta para plataformas de terceiros."],
    ["6. Disponibilidade e alterações", "Podemos evoluir, corrigir, suspender ou descontinuar recursos para preservar segurança, conformidade ou qualidade do serviço. Buscamos manter a plataforma disponível, mas não garantimos operação ininterrupta."],
    ["7. Contato", "Dúvidas, solicitações ou comunicações sobre estes Termos devem ser enviadas pelo canal de contato informado abaixo."]
  ];
  const title = privacy ? "Política de Privacidade" : "Termos de Uso";
  return <InstitutionalShell active={type}><section className="relative mx-auto max-w-3xl px-6 py-16 lg:py-22"><p className="text-xs font-black uppercase tracking-[.16em] text-sky-200">ThorTk · documento institucional</p><h1 className="thor-title thor-title--storm mt-4 text-4xl leading-tight">{title}</h1><p className="mt-5 text-sm leading-6 text-slate-400">Última atualização: 23 de setembro de 2026</p><div className="mt-10 divide-y divide-white/[.08] rounded-2xl border border-white/[.09] bg-[#0d131a]/90 px-6 sm:px-8">{sections.map(([heading, text]) => <section className="py-6" key={heading}><h2 className="text-base font-black text-slate-100">{heading}</h2><p className="mt-3 text-sm leading-7 text-slate-400">{text}</p></section>)}</div><div className="mt-7 rounded-xl border border-sky-300/20 bg-sky-300/[.06] p-5 text-sm text-slate-300">Canal de contato: <a className="font-bold text-sky-200 hover:text-white" href={"mailto:" + contactEmail}>{contactEmail}</a></div></section></InstitutionalShell>;
}
