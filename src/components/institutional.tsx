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
          <span><b className="thor-title text-lg leading-none">ThorTk</b><small className="mt-1 block text-[10px] font-bold uppercase tracking-[.16em] text-slate-400">TikTok Operations</small></span>
        </Link>
        <nav className="hidden items-center gap-5 text-xs font-bold text-slate-400 sm:flex">
          <Link href="/institucional#produto" className="transition hover:text-white">Product</Link>
          <Link href="/privacidade" className={active === "privacy" ? "text-sky-200" : "transition hover:text-white"}>Privacy</Link>
          <Link href="/termos" className={active === "terms" ? "text-sky-200" : "transition hover:text-white"}>Terms</Link>
        </nav>
      </div>
    </header>
    {children}
    <footer className="relative border-t border-white/[.08]">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-9 text-sm text-slate-400 md:grid-cols-[1fr_auto] lg:px-8">
        <div><div className="flex items-center gap-2 text-slate-200"><Bolt size={15} className="text-sky-300" fill="currentColor" /><b>ThorTk</b></div><p className="mt-2 max-w-lg text-xs leading-5">Operational platform for configuring and managing catalog campaigns in TikTok Ads.</p></div>
        <div className="flex flex-col gap-2 text-xs md:items-end"><a href={"mailto:" + contactEmail} className="font-bold text-sky-200 transition hover:text-white">{contactEmail}</a><span>© {new Date().getFullYear()} ThorTk. All rights reserved.</span></div>
      </div>
    </footer>
  </main>;
}

export function InstitutionalHome() {
  return <InstitutionalShell>
    <section className="relative mx-auto max-w-6xl px-6 pb-20 pt-20 lg:px-8 lg:pb-28 lg:pt-28">
      <div className="grid items-center gap-14 lg:grid-cols-[1.15fr_.85fr]">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-sky-400/[.08] px-3 py-1.5 text-[11px] font-black uppercase tracking-[.13em] text-sky-200"><span className="size-1.5 rounded-full bg-sky-300 shadow-[0_0_10px_#7dd3fc]" />Technology for TikTok Ads</p>
          <h1 className="thor-title thor-title--storm mt-6 max-w-3xl text-4xl leading-[1.06] sm:text-5xl lg:text-6xl">Operational control for catalog campaigns.</h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300">ThorTk centralizes asset preparation, ABO structures and operational reviews for teams working with TikTok Ads. The platform connects authorized accounts and organizes the workflow before launch.</p>
          <div className="mt-8 flex flex-wrap gap-3"><Link href="/auth" className="inline-flex items-center gap-2 rounded-xl bg-sky-300 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-sky-200">Access platform <ArrowUpRight size={17} /></Link><Link href="/privacidade" className="inline-flex items-center gap-2 rounded-xl border border-white/[.13] bg-white/[.03] px-5 py-3 text-sm font-bold text-slate-100 transition hover:border-sky-300/40 hover:bg-sky-300/[.06]">How we protect data</Link></div>
        </div>
        <div className="relative mx-auto w-full max-w-md">
          <div aria-hidden className="absolute -inset-10 rounded-full bg-sky-400/10 blur-3xl" />
          <div className="relative overflow-hidden rounded-3xl border border-sky-200/[.16] bg-[linear-gradient(145deg,rgba(20,31,44,.96),rgba(9,13,18,.97))] p-6 shadow-[0_35px_90px_rgba(0,0,0,.42)]">
            <div className="flex items-center justify-between border-b border-white/[.08] pb-5"><span className="flex items-center gap-3 text-sm font-black"><span className="grid size-10 place-items-center rounded-xl border border-sky-300/25 bg-sky-300/[.09] text-sky-200"><Bolt size={20} fill="currentColor" /></span>Command center</span><span className="rounded-full bg-emerald-400/[.12] px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-300">Secure</span></div>
            <div className="mt-5 space-y-3">{[["Authorized accounts", "OAuth-based access"], ["Campaign assets", "Pixels, identities and catalogs"], ["Structure review", "Validation before launch"]].map(([title, description], index) => <div className="flex gap-3 rounded-xl border border-white/[.07] bg-black/15 p-4" key={title}><span className="mt-0.5 text-sky-300">{index === 0 ? <ShieldCheck size={18} /> : index === 1 ? <LockKeyhole size={18} /> : <CheckCircle2 size={18} />}</span><span><b className="block text-sm">{title}</b><small className="mt-1 block text-xs text-slate-400">{description}</small></span></div>)}</div>
          </div>
        </div>
      </div>
    </section>
    <section id="produto" className="relative border-y border-white/[.07] bg-white/[.018]">
      <div className="mx-auto max-w-6xl px-6 py-16 lg:px-8"><div className="max-w-2xl"><p className="text-xs font-black uppercase tracking-[.16em] text-[#d8b56b]">What the platform does</p><h2 className="thor-title mt-3 text-3xl text-white">An organized operation with explicit authorization.</h2></div><div className="mt-10 grid gap-4 md:grid-cols-3">{[["Account connection", "TikTok-authorized integration to access and manage the assets a user has authorized."], ["Campaign preparation", "Account, catalog, creative, structure, audience and budget configuration in one workflow."], ["Pre-launch review", "Operational checks help identify pending items before a campaign is prepared for launch."]].map(([title, text]) => <article className="rounded-2xl border border-white/[.08] bg-[#0d131a] p-6" key={title}><h3 className="text-base font-black text-slate-100">{title}</h3><p className="mt-3 text-sm leading-6 text-slate-400">{text}</p></article>)}</div></div>
    </section>
    <section className="relative mx-auto max-w-6xl px-6 py-16 lg:px-8"><div className="grid gap-6 rounded-3xl border border-[#d8b56b]/25 bg-[linear-gradient(120deg,rgba(48,38,15,.58),rgba(15,23,32,.85))] p-7 md:grid-cols-[1fr_auto] md:items-center md:p-10"><div><p className="text-xs font-black uppercase tracking-[.14em] text-[#e8ce8b]">Transparency and support</p><h2 className="thor-title mt-3 text-2xl text-white">Clear information for users and partners.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">Questions about privacy, use of the platform or data authorization can be sent directly to our support channel.</p></div><a href={"mailto:" + contactEmail} className="inline-flex items-center justify-center rounded-xl border border-[#e5ca7f]/50 bg-[#d8b56b] px-5 py-3 text-sm font-black text-[#171208] transition hover:bg-[#ecd18a]">{contactEmail}</a></div></section>
  </InstitutionalShell>;
}

export function LegalPage({ type }: { type: "privacy" | "terms" }) {
  const privacy = type === "privacy";
  const sections = privacy ? [
    ["1. Overview", "This Privacy Policy explains how ThorTk handles the personal and operational data required to provide its TikTok Ads campaign operations platform."],
    ["2. Data we process", "We may process registration and contact data, identifiers of authorized accounts, Business Centers, advertising accounts, catalogs, pixels, identities, campaign settings and technical usage records. TikTok authorization tokens are processed only to perform actions authorized by the user."],
    ["3. Purpose of processing", "We use this data to authenticate access, connect authorized accounts, retrieve available assets, configure operational workflows, maintain service security, prevent misuse and respond to support requests."],
    ["4. Data sharing", "ThorTk shares data only when required to operate user-requested integrations, including the TikTok API, or when legally required. We do not sell personal data or advertising account data."],
    ["5. Security and retention", "We apply reasonable technical and organizational safeguards to protect data from unauthorized access. Data is retained for as long as necessary for the purposes described, legal obligations or a valid deletion request, when applicable."],
    ["6. Your rights and contact", "You may request information, correction, deletion or clarification regarding data processing through the contact email below. Requests may require identity verification to protect the account."],
    ["7. Third-party services", "Use of data received through TikTok integrations is subject to the permissions granted by the user and to applicable TikTok policies. ThorTk does not control the privacy practices of third-party services."]
  ] : [
    ["1. Acceptance", "By accessing or using ThorTk, you agree to these Terms of Use and the Privacy Policy. If you do not agree, do not use the platform."],
    ["2. Service scope", "ThorTk is an operational platform for organizing assets and configuring catalog campaigns in TikTok Ads. The platform does not guarantee ad approval, media results, account availability or decisions made by TikTok."],
    ["3. Account and authorizations", "You are responsible for the information you provide, for keeping your credentials protected, and for authorizing only accounts and assets that you have the right to administer. Using the service to access or manage assets without authorization is prohibited."],
    ["4. Permitted use", "You must comply with applicable laws, TikTok Ads rules and third-party rights. ThorTk may not be used for fraud, improper data collection, evasion of advertising policies, unlawful activity or any use that compromises platform security."],
    ["5. Data and integrations", "Integrations operate according to the permissions you grant. You remain responsible for the data, creatives, settings and actions submitted from your account to third-party platforms."],
    ["6. Availability and changes", "We may improve, correct, suspend or discontinue features to preserve security, compliance or service quality. We seek to keep the platform available, but do not guarantee uninterrupted operation."],
    ["7. Contact", "Questions, requests or communications about these Terms should be sent through the contact channel below."]
  ];
  const title = privacy ? "Privacy Policy" : "Terms of Use";
  return <InstitutionalShell active={type}><section className="relative mx-auto max-w-3xl px-6 py-16 lg:py-22"><p className="text-xs font-black uppercase tracking-[.16em] text-sky-200">ThorTk · institutional document</p><h1 className="thor-title thor-title--storm mt-4 text-4xl leading-tight">{title}</h1><p className="mt-5 text-sm leading-6 text-slate-400">Last updated: September 23, 2026</p><div className="mt-10 divide-y divide-white/[.08] rounded-2xl border border-white/[.09] bg-[#0d131a]/90 px-6 sm:px-8">{sections.map(([heading, text]) => <section className="py-6" key={heading}><h2 className="text-base font-black text-slate-100">{heading}</h2><p className="mt-3 text-sm leading-7 text-slate-400">{text}</p></section>)}</div><div className="mt-7 rounded-xl border border-sky-300/20 bg-sky-300/[.06] p-5 text-sm text-slate-300">Contact channel: <a className="font-bold text-sky-200 hover:text-white" href={"mailto:" + contactEmail}>{contactEmail}</a></div></section></InstitutionalShell>;
}
