"use client";

import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  CircleCheck,
  CloudLightning,
  Database,
  ExternalLink,
  Gift,
  Globe2,
  ImageUp,
  KeyRound,
  Layers3,
  Loader2,
  Orbit,
  PlugZap,
  RefreshCw,
  Search,
  ShieldCheck,
  Timer,
  Trash2,
  Play,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

type Choice = {
  id: string;
  name: string;
  currency?: string;
  status?: string;
  type?: string;
  selected?: boolean;
};
type Overview = {
  connected: boolean;
  authorizedAt?: string;
  businessCenters: Choice[];
  advertisers: Choice[];
  warnings: string[];
};
type Detail = {
  advertiser: Choice | null;
  pixels: Choice[];
  identities: Choice[];
  warnings: string[];
};
type Notice = {
  tone: "success" | "warning" | "error";
  text: string;
  /** Connection feedback belongs only to the Connect step. */
  scope?: "connect";
};
type CatalogMode = "ALL" | "SETS";
type OperatingSystem = "ALL" | "ANDROID" | "IOS";
type AccountFilter = "ALL" | "ACTIVE" | "SUSPENDED" | "SELECTED";
type AssetProgress = {
  current: number;
  total: number;
  entries: { advertiserId: string; name: string; tone: "success" | "error" }[];
};
type CampaignAction = "pause" | "delete";
type ApiCampaign = {
  id: string;
  advertiserId: string;
  name: string;
  status?: string;
};

const currencies = [
  "BRL",
  "USD",
  "EUR",
  "GBP",
  "CLP",
  "MXN",
  "COP",
  "ARS",
  "PEN",
  "PYG",
  "UYU",
  "BOB",
  "JPY",
  "KRW",
  "IDR",
  "VND",
];
const steps = [
  "CONECTAR",
  "CONTAS",
  "CATÁLOGO",
  "CRIATIVOS",
  "ESTRUTURA",
  "PROXY",
  "LANÇAR",
] as const;
const navAssets = [
  "connect",
  "accounts",
  "catalog",
  "creative",
  "structure",
  "proxy",
  "launch",
] as const;
const stageCopy = [
  ["Forjando nova rota.", "Autorize o canal para montar sua operação."],
  ["Contas de anúncio", "Selecione as contas que deseja gerenciar."],
  ["Catálogo", "Selecione um catálogo por Business Center."],
  [
    "Adicionar criativos",
    "Configure vídeo, texto do anúncio, CTA e complementos interativos.",
  ],
  ["Estrutura ABO", "Defina volume, orçamento, público e nomenclatura."],
  ["Rota de saída", "Defina o caminho de rede da operação."],
  ["Lançar campanhas", "Defina o início no TikTok e inicie a publicação."],
] as const;

function money(value: number, currency: string) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}
function dateLabel(value?: string) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
    : "agora";
}
function advertiserUrl(id: string) {
  return (
    "https://ads.tiktok.com/i18n/perf/advertiser?aadvid=" +
    encodeURIComponent(id)
  );
}
function isOperationalAdvertiser(item: Choice) {
  return Boolean(
    item.status && /active|enable|normal|approved/i.test(item.status),
  );
}
function isSuspendedAdvertiser(item: Choice) {
  return Boolean(item.status) && !isOperationalAdvertiser(item);
}
function accountStatusLabel(item: Choice) {
  return item.status
    ? item.status.replace(/^STATUS_/i, "").replace(/_/g, " ")
    : "NÃO VERIFICADA";
}
function identityNameVariants(base: string, count: number, prefix = "") {
  const safe =
    [prefix.trim(), base.trim()]
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ") || "Identity ThorTk";
  const parts = safe.split(" ");
  const first = parts[0];
  const rest = parts.slice(1).join(" ") || "Profile";
  const variants = [
    safe,
    `${first}_${rest}`,
    `${first}${rest}7`,
    `${first} ${rest}`,
    `${first}_${rest.toLowerCase()}`,
    `${first}.${rest}5`,
    `${first}.${rest}6`,
    `${first}_${rest}_1`,
  ];
  return Array.from(
    { length: Math.max(count, 8) },
    (_, index) => variants[index] || `${first}_${rest}_${index + 1}`,
  );
}

export default function Home() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [overview, setOverview] = useState<Overview>({
    connected: false,
    businessCenters: [],
    advertisers: [],
    warnings: [],
  });
  const [details, setDetails] = useState<Detail>({
    advertiser: null,
    pixels: [],
    identities: [],
    warnings: [],
  });
  const [catalogs, setCatalogs] = useState<Choice[]>([]);
  const [bcId, setBcId] = useState("");
  const [advertiserId, setAdvertiserId] = useState("");
  const [catalogId, setCatalogId] = useState("");
  const [query, setQuery] = useState("");
  const [accountFilter, setAccountFilter] = useState<AccountFilter>("ALL");
  const [selectedAdvertiserIds, setSelectedAdvertiserIds] = useState<string[]>(
    [],
  );
  const [assetDetailsByAdvertiser, setAssetDetailsByAdvertiser] = useState<
    Record<string, Detail>
  >({});
  const [pixelByAdvertiser, setPixelByAdvertiser] = useState<
    Record<string, string>
  >({});
  const [identityByAdvertiser, setIdentityByAdvertiser] = useState<
    Record<string, string>
  >({});
  const [catalogMode, setCatalogMode] = useState<CatalogMode>("ALL");
  const [adText, setAdText] = useState("");
  const [pullCatalogText, setPullCatalogText] = useState(false);
  const [cta, setCta] = useState("LEARN_MORE");
  const [addon, setAddon] = useState("NONE");
  const [proxy, setProxy] = useState("DIRECT");
  const [proxyAddress, setProxyAddress] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [inputCurrency, setInputCurrency] = useState("USD");
  const [amount, setAmount] = useState("100");
  const [rate, setRate] = useState("0.30");
  const [campaigns, setCampaigns] = useState("1");
  const [groups, setGroups] = useState("1");
  const [ads, setAds] = useState("1");
  const [country, setCountry] = useState("US");
  const [language, setLanguage] = useState("en");
  const [aigc, setAigc] = useState(false);
  const [cpa, setCpa] = useState(false);
  const [clickWindow, setClickWindow] = useState("7-day click");
  const [viewWindow, setViewWindow] = useState("1-day view");
  const [counting, setCounting] = useState("Every");
  const [ages, setAges] = useState(["18–24", "25–34", "35–44", "45–54", "55+"]);
  const [operatingSystem, setOperatingSystem] =
    useState<OperatingSystem>("ALL");
  const [showRegions, setShowRegions] = useState(false);
  const [regions, setRegions] = useState<string[]>([]);
  const [loading, setLoading] = useState<
    "overview" | "assets" | "catalogs" | null
  >(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [showConsole, setShowConsole] = useState(false);
  const [launchDelay, setLaunchDelay] = useState(5);
  const [apiCampaigns, setApiCampaigns] = useState<ApiCampaign[]>([]);
  const [apiCampaignsLoading, setApiCampaignsLoading] = useState(false);
  const [campaignAction, setCampaignAction] = useState<CampaignAction | null>(null);
  const [campaignConfirmation, setCampaignConfirmation] = useState("");
  const [campaignActionLoading, setCampaignActionLoading] = useState(false);
  const [assetAction, setAssetAction] = useState<"identity" | "pixel" | null>(
    null,
  );
  const [assetName, setAssetName] = useState("");
  const [identityImageFile, setIdentityImageFile] = useState<File | null>(null);
  const [identityImagePreview, setIdentityImagePreview] = useState("");
  const [assetSubmitting, setAssetSubmitting] = useState(false);
  const [sameIdentityName, setSameIdentityName] = useState(false);
  const [identityPrefix, setIdentityPrefix] = useState("");
  const [identityLanguage, setIdentityLanguage] = useState("pt-BR");
  const [identityNames, setIdentityNames] = useState<string[]>([]);
  const [assetProgress, setAssetProgress] = useState<AssetProgress | null>(
    null,
  );
  const connectedBusinessCenters = overview.businessCenters.filter(
    (item) => item.selected,
  );
  const selectedBc =
    connectedBusinessCenters.find((item) => item.id === bcId) ?? null;
  const selectedAdvertiser =
    overview.advertisers.find((item) => item.id === advertiserId) ??
    details.advertiser;
  const selectedCatalog =
    catalogs.find((item) => item.id === catalogId) ?? null;
  const selectedLaunchAdvertisers = overview.advertisers.filter((item) =>
    selectedAdvertiserIds.includes(item.id),
  );
  const selectedAccountsHaveAssets =
    selectedLaunchAdvertisers.length > 0 &&
    selectedLaunchAdvertisers.every(
      (item) =>
        Boolean(pixelByAdvertiser[item.id]) &&
        Boolean(identityByAdvertiser[item.id]),
    );
  const selectedAccountsOperational =
    selectedLaunchAdvertisers.length > 0 &&
    selectedLaunchAdvertisers.every(isOperationalAdvertiser);
  const loadApiCampaigns = useCallback(async (ids: string[]) => {
    if (!ids.length) {
      setApiCampaigns([]);
      return;
    }
    setApiCampaignsLoading(true);
    try {
      const query = new URLSearchParams({ advertiser_ids: ids.join(",") });
      const response = await fetch(`/api/tiktok/campaigns?${query}`, { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as {
        campaigns?: ApiCampaign[];
        error?: string;
      } | null;
      if (!response.ok) {
        throw new Error(payload?.error || "Não foi possível consultar as campanhas das contas selecionadas.");
      }
      setApiCampaigns(payload?.campaigns ?? []);
    } catch (error) {
      setApiCampaigns([]);
      console.warn("[tiktok:campaigns] list unavailable", error);
    } finally {
      setApiCampaignsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (step !== 6 || !overview.connected) return;
    const timer = window.setTimeout(
      () => void loadApiCampaigns(selectedAdvertiserIds),
      0,
    );
    return () => window.clearTimeout(timer);
  }, [loadApiCampaigns, overview.connected, selectedAdvertiserIds, step]);

  const requestCampaignAction = useCallback((action: CampaignAction) => {
    setCampaignConfirmation("");
    setCampaignAction(action);
  }, []);

  const executeCampaignAction = useCallback(async () => {
    if (!campaignAction) return;
    const expected =
      campaignAction === "delete"
        ? "EXCLUIR TODAS AS CAMPANHAS"
        : "PAUSAR TODAS AS CAMPANHAS";
    if (campaignConfirmation.trim().toLocaleUpperCase("pt-BR") !== expected) return;
    setCampaignActionLoading(true);
    try {
      const response = await fetch("/api/tiktok/campaigns", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: campaignAction, advertiser_ids: selectedAdvertiserIds }),
      });
      const payload = (await response.json().catch(() => null)) as {
        campaigns?: ApiCampaign[];
        processed?: number;
        failed?: { message: string }[];
        error?: string;
      } | null;
      if (!response.ok) {
        throw new Error(payload?.error || "O TikTok não confirmou a alteração.");
      }
      setApiCampaigns(payload?.campaigns ?? []);
      const processed = payload?.processed ?? 0;
      const failed = payload?.failed?.length ?? 0;
      setNotice({
        tone: failed ? "warning" : "success",
        text: failed
          ? `${processed} campanha(s) processada(s); ${failed} não foram alteradas.`
          : campaignAction === "delete"
            ? `${processed} campanha(s) excluída(s) das contas selecionadas.`
            : `${processed} campanha(s) pausada(s) nas contas selecionadas.`,
      });
      setCampaignAction(null);
      setCampaignConfirmation("");
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "Não foi possível alterar as campanhas.",
      });
    } finally {
      setCampaignActionLoading(false);
    }
  }, [campaignAction, campaignConfirmation, selectedAdvertiserIds]);
  const accountCurrency =
    details.advertiser?.currency ?? selectedAdvertiser?.currency ?? "BRL";
  const counts = useMemo(() => {
    const campaignCount = Math.max(1, Number(campaigns) || 1);
    const groupCount = campaignCount * Math.max(1, Number(groups) || 1);
    return {
      campaigns: campaignCount,
      groups: groupCount,
      ads: groupCount * Math.max(1, Number(ads) || 1),
    };
  }, [ads, campaigns, groups]);
  const budget = useMemo(() => {
    const value = Number(amount.replace(",", ".")) || 0;
    const fx =
      inputCurrency === accountCurrency
        ? 1
        : Number(rate.replace(",", ".")) || 0;
    return value * fx;
  }, [accountCurrency, amount, inputCurrency, rate]);
  const ready = Boolean(
    bcId &&
      selectedLaunchAdvertisers.length &&
      selectedAccountsOperational &&
      catalogId &&
      selectedAccountsHaveAssets &&
      campaignName.trim() &&
      (proxy !== "DEDICATED" || proxyAddress.trim()),
  );
  const warnings = overview.warnings.concat(details.warnings);
  const filteredAdvertisers = overview.advertisers
    .filter((item) =>
      (item.name + " " + item.id + " " + (item.status || ""))
        .toLowerCase()
        .includes(query.toLowerCase()),
    )
    .filter(
      (item) =>
        accountFilter === "ALL" ||
        (accountFilter === "ACTIVE" && isOperationalAdvertiser(item)) ||
        (accountFilter === "SUSPENDED" && isSuspendedAdvertiser(item)) ||
        (accountFilter === "SELECTED" &&
          selectedAdvertiserIds.includes(item.id)),
    );
  const loadOverview = useCallback(async () => {
    setLoading("overview");
    try {
      const response = await fetch("/api/tiktok/assets?scope=overview", {
        cache: "no-store",
      });
      const payload = (await response.json()) as Overview & { error?: string };
      if (!response.ok)
        throw new Error(
          payload.error || "Não foi possível consultar o TikTok.",
        );
      setOverview(payload);
      setSelectedAdvertiserIds((current) =>
        current.filter((id) =>
          payload.advertisers.some((item) => item.id === id),
        ),
      );
      if (!payload.connected)
        setNotice({
          tone: "warning",
          text: "Conecte o TikTok para carregar ativos reais desta sessão.",
          scope: "connect",
        });
      else {
        const firstSelected =
          payload.businessCenters.find((item) => item.selected)?.id ?? "";
        setBcId((current) =>
          payload.businessCenters.some(
            (item) => item.id === current && item.selected,
          )
            ? current
            : firstSelected,
        );
        setCatalogId("");
        setAdvertiserId(
          (current) => current || payload.advertisers[0]?.id || "",
        );
        setNotice({
          tone: "success",
          text:
            payload.businessCenters.filter((item) => item.selected).length +
            " Business Center(s) conectado(s) de " +
            payload.businessCenters.length +
            " disponível(is); " +
            payload.advertisers.length +
            " conta(s) carregadas.",
          scope: "connect",
        });
      }
    } catch (error) {
      setNotice({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
              : "Falha ao carregar os ativos.",
        scope: "connect",
      });
    } finally {
      setLoading(null);
    }
  }, []);
  const toggleBusinessCenter = useCallback(
    async (id: string, selected: boolean) => {
      setLoading("overview");
      try {
        const response = await fetch("/api/tiktok/assets", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ bc_id: id, selected }),
        });
        const payload = (await response.json()) as {
          businessCenters?: Choice[];
          error?: string;
        };
        if (!response.ok || !payload.businessCenters)
          throw new Error(
            payload.error || "Não foi possível atualizar a Business Center.",
          );
        setOverview((current) => ({
          ...current,
          businessCenters: payload.businessCenters ?? current.businessCenters,
        }));
        const nextSelected = payload.businessCenters.filter(
          (item) => item.selected,
        );
        if (selected) {
          setBcId(id);
          setCatalogId("");
        } else if (bcId === id) {
          setBcId(nextSelected[0]?.id ?? "");
          setCatalogId("");
        }
        setNotice({
          tone: "success",
          text: selected
            ? "Business Center conectada à operação."
            : "Business Center removida da operação.",
        });
      } catch (error) {
        setNotice({
          tone: "error",
          text:
            error instanceof Error
              ? error.message
              : "Falha ao atualizar a Business Center.",
        });
        await loadOverview();
      } finally {
        setLoading(null);
      }
    },
    [bcId, loadOverview],
  );
  const loadAssets = useCallback(
    async (id: string) => {
      if (!id || !overview.connected) return;
      setLoading("assets");
      try {
        const response = await fetch(
          `/api/tiktok/assets?scope=advertiser&advertiser_id=${encodeURIComponent(id)}`,
          { cache: "no-store" },
        );
        const payload = (await response.json()) as Detail & { error?: string };
        if (!response.ok)
          throw new Error(
            payload.error || "Não foi possível carregar os ativos da conta.",
          );
        setAssetDetailsByAdvertiser((current) => ({
          ...current,
          [id]: payload,
        }));
        setPixelByAdvertiser((current) => ({
          ...current,
          [id]: current[id] || payload.pixels[0]?.id || "",
        }));
        setIdentityByAdvertiser((current) => ({
          ...current,
          [id]: current[id] || payload.identities[0]?.id || "",
        }));
        if (id === advertiserId) {
          setDetails(payload);
        }
      } catch (error) {
        const failure = {
          advertiser: null,
          pixels: [],
          identities: [],
          warnings: [
            error instanceof Error
              ? error.message
              : "Falha ao carregar os ativos.",
          ],
        };
        setAssetDetailsByAdvertiser((current) => ({
          ...current,
          [id]: failure,
        }));
        if (id === advertiserId) setDetails(failure);
      } finally {
        setLoading(null);
      }
    },
    [advertiserId, overview.connected],
  );
  const loadCatalogs = useCallback(
    async (id: string) => {
      if (!id || !overview.connected) return;
      setLoading("catalogs");
      try {
        const response = await fetch(
          `/api/tiktok/assets?scope=catalogs&bc_id=${encodeURIComponent(id)}`,
          { cache: "no-store" },
        );
        const payload = (await response.json()) as {
          catalogs?: Choice[];
          error?: string;
        };
        if (!response.ok)
          throw new Error(
            payload.error || "Não foi possível carregar os catálogos.",
          );
        const list = payload.catalogs ?? [];
        setCatalogs(list);
        setCatalogId((current) => current || list[0]?.id || "");
      } catch (error) {
        setCatalogs([]);
        setNotice({
          tone: "warning",
          text:
            error instanceof Error
              ? error.message
              : "O TikTok não retornou catálogos.",
        });
      } finally {
        setLoading(null);
      }
    },
    [overview.connected],
  );
  useEffect(() => {
    if (
      new URLSearchParams(window.location.search).get("tiktok") === "connected"
    )
      window.history.replaceState({}, "", window.location.pathname);
    const timer = window.setTimeout(() => void loadOverview(), 0);
    return () => window.clearTimeout(timer);
  }, [loadOverview]);
  useEffect(() => {
    if (!advertiserId) return;
    const timer = window.setTimeout(() => void loadAssets(advertiserId), 0);
    return () => window.clearTimeout(timer);
  }, [advertiserId, loadAssets]);
  useEffect(() => {
    const missing = selectedAdvertiserIds.filter(
      (id) => !assetDetailsByAdvertiser[id],
    );
    if (!missing.length) return;
    const timer = window.setTimeout(() => {
      void Promise.all(missing.map((id) => loadAssets(id)));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [assetDetailsByAdvertiser, loadAssets, selectedAdvertiserIds]);
  useEffect(() => {
    if (step !== 2 || !bcId) return;
    const timer = window.setTimeout(() => void loadCatalogs(bcId), 0);
    return () => window.clearTimeout(timer);
  }, [bcId, loadCatalogs, step]);
  useEffect(
    () => () => {
      if (identityImagePreview) URL.revokeObjectURL(identityImagePreview);
    },
    [identityImagePreview],
  );
  const go = (next: number) => {
    setStep(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const applyPreset = () => {
    setCampaigns("1");
    setGroups("3");
    setAds("1");
    setInputCurrency("USD");
    setAmount("100");
    setCountry("US");
    setLanguage("en");
    setCta("LEARN_MORE");
    setAddon("NONE");
    setAigc(false);
    setCpa(false);
    setAges(["18–24", "25–34", "35–44", "45–54", "55+"]);
    setOperatingSystem("ALL");
    setNotice({
      tone: "success",
      text: "Preset ABO padrão (Estados Unidos) aplicado à configuração atual.",
    });
  };
  const openAssetAction = (action: "identity" | "pixel") => {
    const base = action === "identity" ? "Identity ThorTk" : "Pixel ThorTk";
    setAssetName(base);
    setIdentityImageFile(null);
    setIdentityImagePreview("");
    setSameIdentityName(false);
    setIdentityPrefix("");
    setIdentityLanguage("pt-BR");
    setIdentityNames(identityNameVariants(base, selectedAdvertiserIds.length));
    setAssetProgress(null);
    setAssetAction(action);
  };
  const handleAssetSubmit = async () => {
    if (!assetAction || !selectedAdvertiserIds.length || !assetName.trim())
      return;
    if (assetAction === "identity" && !identityImageFile) {
      setNotice({
        tone: "warning",
        text: "Envie uma imagem para criar a Identity.",
      });
      return;
    }
    setAssetSubmitting(true);
    setAssetProgress({
      current: 0,
      total: selectedAdvertiserIds.length,
      entries: [],
    });
    const entries: AssetProgress["entries"] = [];
    let created = 0;
    for (const [index, advertiserId] of selectedAdvertiserIds.entries()) {
      const uniformName =
        assetAction === "identity"
          ? [identityPrefix.trim(), assetName.trim()].filter(Boolean).join(" ")
          : assetName.trim();
      const name =
        assetAction === "identity" && !sameIdentityName
          ? identityNames[index] || uniformName
          : uniformName;
      try {
        let imageUris: Record<string, string> | undefined;
        if (assetAction === "identity" && identityImageFile) {
          const form = new FormData();
          form.append("file", identityImageFile);
          form.append("advertiser_ids", JSON.stringify([advertiserId]));
          const upload = await fetch("/api/tiktok/identity-image", {
            method: "POST",
            body: form,
          });
          const uploaded = (await upload.json()) as {
            uploaded?: { imageUri: string }[];
            error?: string;
          };
          if (!upload.ok || !uploaded.uploaded?.[0])
            throw new Error(uploaded.error || "O TikTok não aceitou a imagem.");
          imageUris = { [advertiserId]: uploaded.uploaded[0].imageUri };
        }
        const response = await fetch("/api/tiktok/assets", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action:
              assetAction === "identity" ? "create_identity" : "create_pixel",
            advertiser_ids: [advertiserId],
            name,
            image_uris: imageUris,
          }),
        });
        const payload = (await response.json()) as {
          created?: number;
          failed?: { error: string }[];
          error?: string;
        };
        if (!response.ok || !payload.created)
          throw new Error(
            payload.failed?.[0]?.error ||
              payload.error ||
              "O TikTok não concluiu a criação.",
          );
        created += 1;
        entries.push({ advertiserId, name, tone: "success" });
      } catch (error) {
        entries.push({
          advertiserId,
          name: error instanceof Error ? error.message : "Falha no TikTok.",
          tone: "error",
        });
      }
      setAssetProgress({
        current: index + 1,
        total: selectedAdvertiserIds.length,
        entries: [...entries],
      });
    }
    await Promise.all(selectedAdvertiserIds.map((id) => loadAssets(id)));
    const failed = entries.filter((entry) => entry.tone === "error");
    setNotice({
      tone: failed.length ? "warning" : "success",
      text:
        created +
        " ativo(s) criado(s)" +
        (failed.length
          ? "; " + failed.length + " conta(s) retornaram erro."
          : "."),
    });
    setAssetSubmitting(false);
  };
  const disabled = step === 6 ? !ready : false;
  return (
    <main className="rocket-layout min-h-screen overflow-x-hidden bg-[#0b0f13] text-zinc-100 selection:bg-[#d8b56b] selection:text-black">
      <div aria-hidden className="thor-storm fixed inset-0" />
      <div
        aria-hidden
        className="thor-scanlines pointer-events-none fixed inset-0"
      />
      <RocketHeader
        connected={overview.connected}
        bcs={connectedBusinessCenters.length}
        loading={loading === "overview"}
        onRefresh={loadOverview}
        onPreset={applyPreset}
      />
      <div className="relative mx-auto flex min-h-[calc(100vh-60px)] max-w-[1720px] flex-col px-6 pb-5 pt-3 lg:px-10">
        <Journey step={step} onChange={go} />
        {notice && (notice.scope !== "connect" || step === 0) && (
          <NoticeBanner notice={notice} onClose={() => setNotice(null)} />
        )}
        {warnings.length > 0 && <Warnings items={warnings} />}
        <section className="flex-1 pt-2">
          <StageTitle
            title={stageCopy[step][0]}
            subtitle={stageCopy[step][1]}
          />
          {step === 0 && (
            <ConnectScreen
              connected={overview.connected}
              date={overview.authorizedAt}
              bcs={connectedBusinessCenters.length}
              advertisers={overview.advertisers.length}
              businessCenters={overview.businessCenters}
              loading={loading === "overview"}
              onConnect={() => router.push("/api/tiktok/connect")}
              onRefresh={loadOverview}
              onSelectBc={(id) => {
                setBcId(id);
                setCatalogId("");
              }}
              onToggleBusinessCenter={toggleBusinessCenter}
            />
          )}
          {step === 1 && (
            <AccountsScreen
              advertisers={filteredAdvertisers}
              allAdvertisers={overview.advertisers}
              query={query}
              setQuery={setQuery}
              filter={accountFilter}
              onFilter={setAccountFilter}
              selectedIds={selectedAdvertiserIds}
              advertiserId={advertiserId}
              assetsByAdvertiser={assetDetailsByAdvertiser}
              pixelsByAdvertiser={pixelByAdvertiser}
              identitiesByAdvertiser={identityByAdvertiser}
              loading={loading === "assets"}
              onToggleAccount={(id) =>
                setSelectedAdvertiserIds((current) =>
                  current.includes(id)
                    ? current.filter((item) => item !== id)
                    : [...current, id],
                )
              }
              onToggleAll={(ids) =>
                setSelectedAdvertiserIds((current) =>
                  ids.every((id) => current.includes(id))
                    ? current.filter((id) => !ids.includes(id))
                    : Array.from(new Set([...current, ...ids])),
                )
              }
              onActivateAccount={(id) => {
                setAdvertiserId(id);
                setSelectedAdvertiserIds((current) =>
                  current.includes(id) ? current : [...current, id],
                );
              }}
              onClear={() => {
                setSelectedAdvertiserIds([]);
                setAdvertiserId("");
              }}
              onPixel={(id, value) => {
                setPixelByAdvertiser((current) => ({
                  ...current,
                  [id]: value,
                }));
              }}
              onIdentity={(id, value) => {
                setIdentityByAdvertiser((current) => ({
                  ...current,
                  [id]: value,
                }));
              }}
              onCreateIdentity={() => openAssetAction("identity")}
              onBindPixel={() => openAssetAction("pixel")}
            />
          )}
          {step === 2 && (
            <CatalogScreen
              catalogs={catalogs}
              selectedId={catalogId}
              mode={catalogMode}
              loading={loading === "catalogs"}
              onRefresh={() => void loadCatalogs(bcId)}
              onSelect={setCatalogId}
              onMode={setCatalogMode}
            />
          )}
          {step === 3 && (
            <CreativeScreen
              value={adText}
              pullCatalogText={pullCatalogText}
              cta={cta}
              addon={addon}
              onChange={setAdText}
              onPullCatalogText={setPullCatalogText}
              onCta={setCta}
              onAddon={setAddon}
            />
          )}
          {step === 4 && (
            <StructureScreen
              campaigns={campaigns}
              groups={groups}
              ads={ads}
              setCampaigns={setCampaigns}
              setGroups={setGroups}
              setAds={setAds}
              inputCurrency={inputCurrency}
              setInputCurrency={setInputCurrency}
              amount={amount}
              setAmount={setAmount}
              rate={rate}
              setRate={setRate}
              accountCurrency={accountCurrency}
              budget={budget}
              counts={counts}
              country={country}
              setCountry={setCountry}
              language={language}
              setLanguage={setLanguage}
              campaignName={campaignName}
              setCampaignName={setCampaignName}
              aigc={aigc}
              onAigc={setAigc}
              cpa={cpa}
              onCpa={setCpa}
              clickWindow={clickWindow}
              onClickWindow={setClickWindow}
              viewWindow={viewWindow}
              onViewWindow={setViewWindow}
              counting={counting}
              onCounting={setCounting}
              ages={ages}
              onAges={setAges}
              operatingSystem={operatingSystem}
              onOperatingSystem={setOperatingSystem}
              showRegions={showRegions}
              onShowRegions={() => setShowRegions((value) => !value)}
              regions={regions}
              onRegions={setRegions}
            />
          )}
          {step === 5 && (
            <ProxyScreen
              proxy={proxy}
              address={proxyAddress}
              onChange={setProxy}
              onAddress={setProxyAddress}
            />
          )}
          {step === 6 && (
            <LaunchScreen
              ready={ready}
              name={campaignName}
              bc={selectedBc}
              catalog={selectedCatalog}
              counts={counts}
              budget={budget}
              currency={accountCurrency}
              connected={overview.connected}
              selectedAccounts={selectedLaunchAdvertisers}
              assetsReady={selectedAccountsHaveAssets}
              catalogCreativeReady={Boolean(catalogId)}
              proxyReady={proxy !== "DEDICATED" || Boolean(proxyAddress.trim())}
              delay={launchDelay}
              onDelay={setLaunchDelay}
              apiCampaignCount={apiCampaigns.length}
              apiCampaignsLoading={apiCampaignsLoading}
              onManageCampaigns={requestCampaignAction}
              onLaunch={() => setShowConsole(true)}
            />
          )}
        </section>
        <FooterNav
          step={step}
          onBack={() => go(Math.max(0, step - 1))}
          onNext={() => (step === 6 ? setShowConsole(true) : go(step + 1))}
          disabled={disabled}
        />
      </div>
      {assetAction && (
        <AssetCreationModal
          kind={assetAction}
          name={assetName}
          prefix={identityPrefix}
          language={identityLanguage}
          imageFile={identityImageFile}
          imagePreview={identityImagePreview}
          selectedCount={selectedAdvertiserIds.length}
          accountIds={selectedAdvertiserIds}
          submitting={assetSubmitting}
          sameName={sameIdentityName}
          names={identityNames}
          progress={assetProgress}
          onName={(value) => {
            setAssetName(value);
            setIdentityNames(
              identityNameVariants(
                value,
                selectedAdvertiserIds.length,
                identityPrefix,
              ),
            );
          }}
          onPrefix={(value) => {
            setIdentityPrefix(value);
            setIdentityNames(
              identityNameVariants(
                assetName,
                selectedAdvertiserIds.length,
                value,
              ),
            );
          }}
          onLanguage={setIdentityLanguage}
          onSameName={setSameIdentityName}
          onRegenerateNames={() =>
            setIdentityNames(
              identityNameVariants(
                assetName,
                selectedAdvertiserIds.length,
                identityPrefix,
              ).sort(() => Math.random() - 0.5),
            )
          }
          onImageFile={(file) => {
            setIdentityImageFile(file);
            setIdentityImagePreview(file ? URL.createObjectURL(file) : "");
          }}
          onClose={() => setAssetAction(null)}
          onSubmit={() =>
            assetProgress !== null &&
            assetProgress.current === assetProgress.total
              ? setAssetAction(null)
              : void handleAssetSubmit()
          }
        />
      )}
      {showConsole && (
        <LaunchConsole
          counts={counts}
          budget={budget}
          currency={accountCurrency}
          ready={ready}
          delay={launchDelay}
          accounts={selectedLaunchAdvertisers}
          catalog={selectedCatalog}
          pixelsByAdvertiser={pixelByAdvertiser}
          identitiesByAdvertiser={identityByAdvertiser}
          onClose={() => setShowConsole(false)}
        />
      )}
      {campaignAction && (
        <CampaignActionModal
          action={campaignAction}
          campaignCount={apiCampaigns.length}
          confirmation={campaignConfirmation}
          submitting={campaignActionLoading}
          onConfirmation={setCampaignConfirmation}
          onClose={() => {
            if (campaignActionLoading) return;
            setCampaignAction(null);
            setCampaignConfirmation(String());
          }}
          onConfirm={() => void executeCampaignAction()}
        />
      )}
    </main>
  );
}

function RocketHeader({
  connected,
  bcs,
  loading,
  onRefresh,
  onPreset,
}: {
  connected: boolean;
  bcs: number;
  loading: boolean;
  onRefresh: () => void;
  onPreset: () => void;
}) {
  return (
    <header className="relative z-20 h-[60px] border-b border-white/[.055] bg-[#070a0c]/90">
      <div className="mx-auto flex h-full max-w-[1720px] items-center justify-between px-6 lg:px-10">
        <div>
          <p className="thor-title text-[22px] leading-5 text-white">
            Thor<span className="text-[#d8b56b]">Tk</span>
          </p>
          <p className="mt-1 text-[9px] font-black uppercase tracking-[.2em] text-[#8ca6c7]">
            Criar campanhas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <HeaderChip tone="blue" text={`BCs ${bcs}`} />
          <HeaderChip tone="red" text="GASTO HOJE 0,00" />
          <HeaderChip tone="green" text="SALDO --" />
          <button
            type="button"
            onClick={onPreset}
            className="header-chip hidden md:flex"
            title="Aplicar preset ABO México"
          >
            <KeyRound size={13} />
            PRESETS
          </button>
          <button
            type="button"
            onClick={onRefresh}
            className="header-chip text-[#d8b56b]"
            title="Atualizar ativos"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            {connected ? "CANAL ATIVO" : "CONECTAR"}
          </button>
        </div>
      </div>
    </header>
  );
}
function HeaderChip({
  tone,
  text,
}: {
  tone: "blue" | "red" | "green";
  text: string;
}) {
  const color =
    tone === "blue"
      ? "border-sky-400/30 text-sky-300"
      : tone === "red"
        ? "border-red-400/25 text-red-300"
        : "border-emerald-400/25 text-emerald-300";
  return <span className={`header-chip hidden sm:flex ${color}`}>{text}</span>;
}
function Journey({
  step,
  onChange,
}: {
  step: number;
  onChange: (step: number) => void;
}) {
  return (
    <nav
      aria-label="Etapas do lançamento"
      className="relative -mx-2 overflow-x-auto pb-3 pt-4 [scrollbar-width:none]"
    >
      <div className="relative flex min-w-[980px] items-start justify-between px-4">
        <div
          aria-hidden
          className="absolute left-[7%] right-[7%] top-8 border-t border-dashed border-[#4c5459]/55"
        />
        {steps.map((label, index) => {
          const active = index === step;
          return (
            <button
              key={label}
              type="button"
              onClick={() => onChange(index)}
              className="relative z-10 flex w-[118px] flex-col items-center gap-2.5"
            >
              <span
                className={`journey-icon ${active ? "journey-active" : ""}`}
              >
                <Image
                  src={`/thor-icon-${navAssets[index]}.png`}
                  alt=""
                  width={56}
                  height={56}
                  priority={index < 2}
                />
              </span>
              <span
                className={`text-[10px] font-black tracking-[.07em] ${active ? "text-[#86c7ff]" : "text-zinc-500"}`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
function StageTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="pt-1">
      <h1 className="thor-title thor-title--storm text-[26px] leading-tight">
        {title}
      </h1>
      <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>
    </div>
  );
}
function NoticeBanner({
  notice,
  onClose,
}: {
  notice: Notice;
  onClose: () => void;
}) {
  const style =
    notice.tone === "success"
      ? "border-emerald-400/25 bg-emerald-400/[.07] text-emerald-100"
      : notice.tone === "error"
        ? "border-red-400/25 bg-red-400/[.08] text-red-100"
        : "border-amber-400/25 bg-amber-400/[.08] text-amber-100";
  return (
    <aside
      className={`connection-status-card mt-4 flex items-start justify-between gap-4 rounded-xl border p-4 text-xs ${style}`}
      aria-live="polite"
    >
      <span className="flex min-w-0 items-start gap-3">
        <span className="connection-status-card__icon">
          {notice.tone === "success" ? (
            <CircleCheck size={17} />
          ) : (
            <CircleAlert size={17} />
          )}
        </span>
        <span className="min-w-0">
          <b className="block text-sm">
            {notice.tone === "success" ? "Canal TikTok sincronizado" : "Status da conexão"}
          </b>
          <small className="mt-1 block leading-5 opacity-80">{notice.text}</small>
        </span>
      </span>
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar status da conexão"
        className="rounded-md p-1 opacity-70 transition hover:bg-white/[.08] hover:opacity-100"
      >
        <X size={16} />
      </button>
    </aside>
  );
}
function Warnings({ items }: { items: string[] }) {
  return (
    <div className="mt-3 rounded-lg border border-amber-400/20 bg-[#211d0b]/65 px-4 py-3 text-xs text-amber-100">
      <p className="font-black uppercase tracking-[.12em]">
        Retorno parcial do TikTok
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-4">
        {items.map((item, index) => (
          <li key={`${item}-${index}`}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function ConnectScreen({
  connected,
  date,
  bcs,
  advertisers,
  businessCenters,
  loading,
  onConnect,
  onRefresh,
  onSelectBc,
  onToggleBusinessCenter,
}: {
  connected: boolean;
  date?: string;
  bcs: number;
  advertisers: number;
  businessCenters: Choice[];
  loading: boolean;
  onConnect: () => void;
  onRefresh: () => void;
  onSelectBc: (id: string) => void;
  onToggleBusinessCenter: (id: string, selected: boolean) => void;
}) {
  return (
    <div className="mx-auto max-w-[720px] pt-5 text-center">
      <div className="thor-crest">
        <Image
          src="/thor-connect-central.png"
          alt="Símbolo de conexão do Thor"
          width={88}
          height={88}
          priority
        />
      </div>
      <h2 className="thor-title thor-title--storm mt-4 text-[30px] leading-tight">
        {connected ? "Força Pronta" : "Canal Inativo"}
      </h2>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-zinc-400">
        {connected
          ? `${bcs} Business Center(s) conectada(s) de ${businessCenters.length} disponível(is) · ${advertisers} conta(s) carregadas.`
          : "Autorize o TikTok para carregar seus ativos reais e preparar a estrutura ABO."}
      </p>
      <div className="mt-7 space-y-3 text-left">
        <div className="rocket-card border-[#d8b56b]/35 bg-[#17150e]/80 p-5">
          <div className="flex items-center gap-4">
            <span className="grid h-12 w-12 place-items-center overflow-hidden rounded-full bg-[#121519] shadow-[0_0_20px_rgba(216,181,107,.2)]">
              <Image
                src="/thor-command.png"
                alt="Comando de Thor"
                width={48}
                height={48}
              />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-black">Comando de Thor</p>
                <span className="rounded bg-[#403516] px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-[#e3c985]">
                  modo ABO
                </span>
              </div>
              <p className="mt-1 text-xs leading-5 text-zinc-400">
                Conecte somente as Business Centers que farão parte desta
                operação.
              </p>
            </div>
          </div>
        </div>
        {connected ? (
          <>
            <div className="rocket-card border-emerald-400/35 bg-emerald-400/[.07] px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_13px_#34d399]" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-zinc-100">
                    Canal TikTok autorizado
                  </p>
                  <p className="mt-1 text-[11px] text-zinc-500">
                    Última autorização: {dateLabel(date)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onRefresh}
                  disabled={loading}
                  aria-label="Atualizar Business Centers"
                  className="text-sky-300 hover:text-sky-200"
                >
                  <RefreshCw
                    size={17}
                    className={loading ? "animate-spin" : ""}
                  />
                </button>
              </div>
            </div>
            <div className="rocket-card p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-label text-[#e3c985]">
                    Gerenciar Business Centers
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Conecte ou remova BCs desta operação. A remoção só vale no
                    ThorTk e não altera a permissão no TikTok.
                  </p>
                </div>
                <span className="rounded bg-[#142231] px-2 py-1 text-[10px] font-black text-sky-200">
                  {bcs}/{businessCenters.length}
                </span>
              </div>
              {businessCenters.length > 0 ? (
                <div className="mt-4 grid gap-2">
                  {businessCenters.map((center) => (
                    <div
                      key={center.id}
                      className={`flex items-center gap-3 rounded-lg border p-3 transition ${center.selected ? "border-[#d8b56b] bg-[#2b250e]" : "border-white/[.09] bg-[#0d1013]"}`}
                    >
                      <button
                        type="button"
                        disabled={!center.selected}
                        onClick={() => onSelectBc(center.id)}
                        className="min-w-0 flex-1 text-left disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        <b className="block truncate text-sm text-zinc-100">
                          {center.name}
                        </b>
                        <small className="mt-1 block truncate text-[10px] text-zinc-500">
                          BC ID: {center.id}
                        </small>
                      </button>
                      <span
                        className={`rounded px-2 py-1 text-[9px] font-black uppercase ${center.selected ? "bg-[#403516] text-[#e3c985]" : "bg-white/[.06] text-zinc-400"}`}
                      >
                        {center.selected ? "Conectada" : "Disponível"}
                      </span>
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() =>
                          onToggleBusinessCenter(center.id, !center.selected)
                        }
                        className={`rounded-md border px-3 py-2 text-[10px] font-black transition ${center.selected ? "border-red-400/35 text-red-300 hover:bg-red-400/[.08]" : "border-sky-300/35 text-sky-200 hover:bg-sky-300/[.08]"}`}
                      >
                        {center.selected ? "Remover" : "Conectar"}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-lg border border-amber-300/20 bg-amber-300/[.05] px-4 py-3 text-xs leading-5 text-amber-100">
                  Nenhuma Business Center foi retornada. O ThorTk também
                  consulta a BC proprietária de cada conta de anúncio; atualize
                  para tentar novamente.
                </div>
              )}
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={onConnect}
            className="rocket-outline-action"
          >
            <PlugZap size={17} />
            Conectar TikTok Business
          </button>
        )}
        <div className="rocket-outline-action cursor-default text-sky-300">
          <ShieldCheck size={17} />
          Tokens protegidos no servidor
        </div>
      </div>
    </div>
  );
}

function AccountsScreen({
  advertisers,
  allAdvertisers,
  query,
  setQuery,
  filter,
  onFilter,
  selectedIds,
  advertiserId,
  assetsByAdvertiser,
  pixelsByAdvertiser,
  identitiesByAdvertiser,
  loading,
  onToggleAccount,
  onToggleAll,
  onActivateAccount,
  onClear,
  onPixel,
  onIdentity,
  onCreateIdentity,
  onBindPixel,
}: {
  advertisers: Choice[];
  allAdvertisers: Choice[];
  query: string;
  setQuery: (v: string) => void;
  filter: AccountFilter;
  onFilter: (v: AccountFilter) => void;
  selectedIds: string[];
  advertiserId: string;
  assetsByAdvertiser: Record<string, Detail>;
  pixelsByAdvertiser: Record<string, string>;
  identitiesByAdvertiser: Record<string, string>;
  loading: boolean;
  onToggleAccount: (id: string) => void;
  onToggleAll: (ids: string[]) => void;
  onActivateAccount: (id: string) => void;
  onClear: () => void;
  onPixel: (id: string, value: string) => void;
  onIdentity: (id: string, value: string) => void;
  onCreateIdentity: () => void;
  onBindPixel: () => void;
}) {
  const visibleIds = advertisers.map((item) => item.id);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
  const selectedAdvertisers = allAdvertisers.filter((item) =>
    selectedIds.includes(item.id),
  );
  const filters: { key: AccountFilter; label: string; count: number }[] = [
    { key: "ALL", label: "Todas", count: allAdvertisers.length },
    {
      key: "ACTIVE",
      label: "Podem subir",
      count: allAdvertisers.filter(isOperationalAdvertiser).length,
    },
    {
      key: "SUSPENDED",
      label: "Suspensas",
      count: allAdvertisers.filter(isSuspendedAdvertiser).length,
    },
    { key: "SELECTED", label: "Selecionadas", count: selectedIds.length },
  ];
  return (
    <div className="mx-auto max-w-[1180px] pt-4">
      <div className="flex flex-col gap-2 xl:flex-row">
        <label className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
            size={18}
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nome, ID externo ou status..."
            className="rocket-input pl-11"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {filters.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => onFilter(item.key)}
              aria-pressed={filter === item.key}
              className={
                "rounded-md border px-3 py-2 text-[11px] font-black transition " +
                (filter === item.key
                  ? "border-[#d8b56b]/70 bg-[#30270f] text-[#f3d99d]"
                  : "border-white/[.09] bg-[#12171d] text-zinc-400 hover:border-white/20 hover:text-zinc-100")
              }
            >
              {item.label}{" "}
              <span className="ml-1 opacity-65">({item.count})</span>
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3 overflow-hidden rounded-lg border border-white/[.075] bg-[#121719]/95">
        <div className="overflow-x-auto">
          <div className="min-w-[780px]">
            <div className="grid grid-cols-[42px_minmax(310px,1fr)_minmax(195px,.52fr)_145px] items-center gap-4 bg-[#1d222b] px-4 py-3 text-[11px] font-black text-zinc-400">
              <input
                type="checkbox"
                aria-label="Selecionar todas as contas visíveis"
                checked={allVisibleSelected}
                onChange={() => onToggleAll(visibleIds)}
                className="h-4 w-4 accent-[#d8b56b]"
              />
              <span>Nome da conta</span>
              <span>ID externo</span>
              <span>Status</span>
            </div>
            <div className="max-h-[292px] overflow-y-auto">
              {advertisers.length ? (
                advertisers.map((item) => {
                  const selected = selectedIds.includes(item.id);
                  const active = isOperationalAdvertiser(item);
                  const suspended = isSuspendedAdvertiser(item);
                  return (
                    <div
                      key={item.id}
                      className={
                        "grid grid-cols-[42px_minmax(310px,1fr)_minmax(195px,.52fr)_145px] items-center gap-4 border-t border-white/[.06] px-4 py-3 text-xs transition " +
                        (item.id === advertiserId
                          ? "bg-[#1b2b38]/65"
                          : "hover:bg-white/[.03]")
                      }
                    >
                      <input
                        type="checkbox"
                        aria-label={"Selecionar " + item.name}
                        checked={selected}
                        onChange={() => onToggleAccount(item.id)}
                        className="h-4 w-4 accent-[#d8b56b]"
                      />
                      <button
                        type="button"
                        onClick={() => onActivateAccount(item.id)}
                        className="min-w-0 text-left"
                      >
                        <span className="block truncate font-bold text-zinc-100">
                          {item.name}
                        </span>
                        <small className="mt-1 block text-[10px] text-zinc-500">
                          Configurar ativos desta conta
                        </small>
                      </button>
                      <a
                        href={advertiserUrl(item.id)}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(event) => event.stopPropagation()}
                        className="flex w-fit items-center gap-1.5 truncate font-bold text-sky-300 hover:text-sky-100 hover:underline"
                      >
                        {item.id}
                        <ExternalLink size={13} />
                      </a>
                      <span>
                        <b
                          className={
                            "rounded border px-2 py-1 text-[10px] " +
                            (active
                              ? "border-emerald-400/20 bg-emerald-400/[.1] text-emerald-300"
                              : suspended
                                ? "border-red-400/20 bg-red-400/[.1] text-red-300"
                                : "border-amber-400/20 bg-amber-400/[.1] text-amber-200")
                          }
                        >
                          ● {active ? "Ativa" : accountStatusLabel(item)}
                        </b>
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="p-10 text-center text-sm text-zinc-500">
                  Nenhuma conta foi retornada com esse filtro.
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#1d222b] px-4 py-3 text-xs">
          <b className="text-[#d8b56b]">
            {selectedIds.length}{" "}
            {selectedIds.length === 1
              ? "CONTA SELECIONADA"
              : "CONTAS SELECIONADAS"}
          </b>
          <div className="flex items-center gap-4">
            <button
              type="button"
              disabled={!selectedIds.length}
              onClick={() =>
                window.open(
                  advertiserUrl(selectedIds[0]),
                  "_blank",
                  "noopener,noreferrer",
                )
              }
              className="inline-flex items-center gap-1.5 font-bold text-sky-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ExternalLink size={14} />
              Abrir no TikTok
            </button>
            <button
              type="button"
              disabled={!selectedIds.length}
              onClick={onClear}
              className="font-bold text-zinc-200 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Cancelar seleção
            </button>
          </div>
        </div>
      </div>
      <section className="rocket-card mt-4 overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-white/[.07] bg-[#151b23] px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="section-label text-[#e3c985]">
              Identity & Pixel por conta
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Os ativos são consultados no TikTok para cada conta marcada.
              Escolha somente ativos autorizados.
            </p>
          </div>
          <span className="rounded bg-[#142231] px-2.5 py-1 text-[10px] font-black text-sky-200">
            {selectedAdvertisers.length} EM GESTÃO
          </span>
        </div>
        {selectedAdvertisers.length ? (
          <div className="overflow-x-auto">
            <div className="min-w-[850px]">
              <div className="grid grid-cols-[minmax(230px,.8fr)_minmax(270px,1fr)_minmax(270px,1fr)] gap-4 border-b border-white/[.06] px-4 py-3 text-[10px] font-black uppercase tracking-[.1em] text-zinc-500">
                <span>Conta</span>
                <span className="flex items-center gap-2">
                  <Image
                    src="/thor-identity.png"
                    alt=""
                    width={22}
                    height={22}
                    className="rounded-full"
                  />
                  Identity
                </span>
                <span className="flex items-center gap-2">
                  <Image
                    src="/thor-pixel.png"
                    alt=""
                    width={22}
                    height={22}
                    className="rounded-full"
                  />
                  Pixel
                </span>
              </div>
              {selectedAdvertisers.map((item) => {
                const detail = assetsByAdvertiser[item.id];
                return (
                  <div
                    key={item.id}
                    className="grid grid-cols-[minmax(230px,.8fr)_minmax(270px,1fr)_minmax(270px,1fr)] items-center gap-4 border-b border-white/[.06] px-4 py-3"
                  >
                    <button
                      type="button"
                      onClick={() => onActivateAccount(item.id)}
                      className="min-w-0 text-left"
                    >
                      <b className="block truncate text-sm text-zinc-100">
                        {item.name}
                      </b>
                      <span className="mt-1 flex items-center gap-1 text-[10px] text-sky-300">
                        {item.id}
                        <ExternalLink size={11} />
                      </span>
                    </button>
                    <AssetSelect
                      label="Identity"
                      values={detail?.identities ?? []}
                      selected={identitiesByAdvertiser[item.id] || ""}
                      loading={loading && !detail}
                      onChange={(value) => onIdentity(item.id, value)}
                      empty="Nenhuma identity retornada."
                      compact
                    />
                    <AssetSelect
                      label="Pixel"
                      values={detail?.pixels ?? []}
                      selected={pixelsByAdvertiser[item.id] || ""}
                      loading={loading && !detail}
                      onChange={(value) => onPixel(item.id, value)}
                      empty="Nenhum pixel retornado."
                      compact
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <div className="flex -space-x-2">
              <Image
                src="/thor-identity.png"
                alt=""
                width={45}
                height={45}
                className="rounded-full border-2 border-[#101419]"
              />
              <Image
                src="/thor-pixel.png"
                alt=""
                width={45}
                height={45}
                className="rounded-full border-2 border-[#101419]"
              />
            </div>
            <p className="text-sm font-bold text-zinc-300">
              Selecione uma ou mais contas para configurar Identity e Pixel.
            </p>
            <p className="max-w-md text-xs leading-5 text-zinc-500">
              A seleção em massa mantém os ativos organizados por conta e nunca
              altera permissões no TikTok.
            </p>
          </div>
        )}
        <div className="grid gap-3 border-t border-white/[.07] bg-[#10151b] p-4 md:grid-cols-2">
          <button
            type="button"
            disabled={!selectedAdvertisers.length}
            onClick={onCreateIdentity}
            className="flex items-center gap-3 rounded-lg border border-[#d8b56b]/35 bg-[#241f10] p-3 text-left transition hover:border-[#d8b56b] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Image
              src="/thor-identity.png"
              alt=""
              width={42}
              height={42}
              className="rounded-full"
            />
            <span>
              <b className="block text-sm text-zinc-100">Criar Identity</b>
              <small className="mt-1 block text-xs text-zinc-400">
                Defina uma identidade customizada para as contas selecionadas.
              </small>
            </span>
            <ArrowRight size={17} className="ml-auto text-[#e3c985]" />
          </button>
          <button
            type="button"
            disabled={!selectedAdvertisers.length}
            onClick={onBindPixel}
            className="flex items-center gap-3 rounded-lg border border-sky-300/30 bg-[#101d29] p-3 text-left transition hover:border-sky-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Image
              src="/thor-pixel.png"
              alt=""
              width={42}
              height={42}
              className="rounded-full"
            />
            <span>
              <b className="block text-sm text-zinc-100">Vincular Pixel</b>
              <small className="mt-1 block text-xs text-zinc-400">
                Associe um pixel autorizado às contas selecionadas.
              </small>
            </span>
            <ArrowRight size={17} className="ml-auto text-sky-300" />
          </button>
        </div>
      </section>
    </div>
  );
}
function AssetSelect({
  label,
  values,
  selected,
  loading,
  onChange,
  empty,
  compact = false,
}: {
  label: string;
  values: Choice[];
  selected: string;
  loading: boolean;
  onChange: (v: string) => void;
  empty: string;
  compact?: boolean;
}) {
  return (
    <label
      className={
        "block text-[10px] font-black uppercase tracking-[.1em] text-zinc-500 " +
        (compact ? "text-[0px]" : "")
      }
    >
      {label}
      {loading ? (
        <span className="mt-2 flex items-center gap-2 text-xs normal-case text-zinc-400">
          <Loader2 className="animate-spin" size={14} />
          Consultando TikTok…
        </span>
      ) : values.length ? (
        <span className="relative mt-2 block">
          <select
            value={selected}
            onChange={(event) => onChange(event.target.value)}
            className="rocket-input appearance-none text-sm font-bold"
          >
            <option value="">Selecione</option>
            {values.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {item.id}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500"
            size={15}
          />
        </span>
      ) : (
        <span className="mt-2 block normal-case text-xs font-medium text-zinc-500">
          {empty}
        </span>
      )}
    </label>
  );
}

function AssetCreationModal({
  kind,
  name,
  prefix,
  language,
  imageFile,
  imagePreview,
  selectedCount,
  accountIds,
  submitting,
  sameName,
  names,
  progress,
  onName,
  onPrefix,
  onLanguage,
  onSameName,
  onRegenerateNames,
  onImageFile,
  onClose,
  onSubmit,
}: {
  kind: "identity" | "pixel";
  name: string;
  prefix: string;
  language: string;
  imageFile: File | null;
  imagePreview: string;
  selectedCount: number;
  accountIds: string[];
  submitting: boolean;
  sameName: boolean;
  names: string[];
  progress: AssetProgress | null;
  onName: (value: string) => void;
  onPrefix: (value: string) => void;
  onLanguage: (value: string) => void;
  onSameName: (value: boolean) => void;
  onRegenerateNames: () => void;
  onImageFile: (file: File | null) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const identity = kind === "identity";
  const completed = Boolean(progress && progress.current === progress.total);
  const languages = [
    { value: "pt-BR", label: "🇧🇷 Português (Brasil)" },
    { value: "es-MX", label: "🇲🇽 Español (México)" },
    { value: "en-US", label: "🇺🇸 English (United States)" },
    { value: "es-ES", label: "🇪🇸 Español (España)" },
  ];
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={identity ? "Criar Identity" : "Criar Pixel"}
      className="modal-layer fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/80 px-4 py-5 backdrop-blur-sm"
    >
      <section className="my-auto w-full max-w-[600px] overflow-hidden rounded-xl border border-white/[.12] bg-[#1a202b] shadow-[0_28px_90px_rgba(0,0,0,.7)]">
        <header className="flex items-center gap-3 border-b border-white/[.09] px-6 py-4">
          <Image
            src={identity ? "/thor-identity.png" : "/thor-pixel.png"}
            alt=""
            width={34}
            height={34}
            className="rounded-full ring-1 ring-sky-300/30"
          />
          <div>
            <h2 className="text-[20px] font-black tracking-[-.03em] text-zinc-100">
              {identity ? "Criar Identity" : "Vincular Pixel"}
            </h2>
            <p className="mt-0.5 text-xs text-zinc-400">
              {identity
                ? "Configure sua identidade digital nas contas selecionadas."
                : "Associe um pixel autorizado às contas selecionadas."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Fechar"
            className="ml-auto grid h-8 w-8 place-items-center rounded-md text-zinc-400 transition hover:bg-white/[.08] hover:text-white disabled:opacity-40"
          >
            <X size={17} />
          </button>
        </header>
        <div className="space-y-5 px-6 py-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
              Contas alvo{" "}
              <span className="text-[#f1cd3a]">
                {selectedCount} selecionada(s)
              </span>
            </p>
            <div className="mt-2 grid max-h-24 gap-1.5 overflow-y-auto rounded-lg bg-[#11161f] p-2 sm:grid-cols-2">
              {accountIds.map((id) => (
                <span
                  key={id}
                  className="truncate rounded-md bg-[#0c1118] px-2.5 py-1.5 text-[10px] font-semibold text-zinc-300"
                >
                  <i className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-[#ffd31a]" />
                  {id}
                </span>
              ))}
            </div>
          </div>
          {identity ? (
            <>
              <div className="flex items-center gap-4 rounded-xl border border-white/[.1] bg-[#151b24] p-4">
                <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-sky-300/25 bg-[#0c131c]">
                  {imagePreview ? (
                    <Image
                      src={imagePreview}
                      unoptimized
                      alt="Prévia da imagem da Identity"
                      width={64}
                      height={64}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ImageUp size={25} className="text-sky-300" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-extrabold text-zinc-100">
                    Visual da Identity
                  </p>
                  <p className="mt-1 text-xs leading-5 text-zinc-400">
                    Upload de foto. Recorte automático para 512×512.
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <label
                      htmlFor="identity-image"
                      className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-[#e5c65b] px-3 py-1.5 text-xs font-bold text-[#f4d45b] transition hover:bg-[#e5c65b]/10"
                    >
                      <ImageUp size={14} />
                      {imageFile ? "Trocar imagem" : "Enviar nova"}
                    </label>
                    <input
                      id="identity-image"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="sr-only"
                      onChange={(event) =>
                        onImageFile(event.target.files?.[0] ?? null)
                      }
                    />
                    {imageFile && (
                      <span className="max-w-[190px] truncate text-xs font-bold text-emerald-300">
                        {imageFile.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[#cda835]/55 bg-[#261f11]/65 px-4 py-3">
                <input
                  type="checkbox"
                  checked={sameName}
                  onChange={(event) => onSameName(event.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[#ffd31a]"
                />
                <span>
                  <b className="block text-sm text-zinc-100">
                    Usar o mesmo nome de perfil em todas as contas
                  </b>
                  <small className="mt-0.5 block text-[10px] leading-4 text-zinc-400">
                    Desliga a randomização — todas as identities usam exatamente
                    o Nome Base.
                  </small>
                </span>
              </label>
              <div className="grid gap-3 sm:grid-cols-[1.15fr_.8fr_1fr]">
                <label className="block text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                  Nome base
                  <input
                    autoFocus
                    value={name}
                    onChange={(event) => onName(event.target.value)}
                    placeholder="Ex.: Maria Silva"
                    className="rocket-input mt-1.5 h-10 text-sm font-semibold"
                  />
                </label>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                  Prefixo{" "}
                  <span className="normal-case text-zinc-600">(opcional)</span>
                  <input
                    value={prefix}
                    onChange={(event) => onPrefix(event.target.value)}
                    placeholder="Ex.: Beauty"
                    className="rocket-input mt-1.5 h-10 text-sm font-semibold"
                  />
                </label>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                  Idioma dos nomes
                  <select
                    value={language}
                    onChange={(event) => onLanguage(event.target.value)}
                    className="rocket-input mt-1.5 h-10 appearance-none text-xs font-semibold"
                  >
                    {languages.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {!sameName && (
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                      Preview de nomes (8 amostras)
                    </p>
                    <button
                      type="button"
                      onClick={onRegenerateNames}
                      className="text-[10px] font-semibold text-sky-300 hover:text-sky-200"
                    >
                      Recarregar
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {names.slice(0, 8).map((item, index) => (
                      <span
                        key={item + index}
                        className="rounded bg-[#0d1219] px-2 py-1.5 text-[10px] font-semibold text-zinc-300"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center gap-4 rounded-xl border border-white/[.1] bg-[#151b24] p-4">
                <Image
                  src="/thor-pixel.png"
                  alt=""
                  width={54}
                  height={54}
                  className="rounded-full ring-1 ring-sky-300/30"
                />
                <div>
                  <p className="text-sm font-extrabold text-zinc-100">
                    Pixel de conversão
                  </p>
                  <p className="mt-1 text-xs leading-5 text-zinc-400">
                    O pixel será criado individualmente em cada conta
                    autorizada.
                  </p>
                </div>
              </div>
              <label className="block text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                Nome do Pixel
                <input
                  autoFocus
                  value={name}
                  onChange={(event) => onName(event.target.value)}
                  placeholder="Ex.: Pixel loja MX"
                  className="rocket-input mt-1.5 h-10 text-sm font-semibold"
                />
              </label>
            </>
          )}
          {progress && (
            <div className="rounded-lg border border-sky-300/20 bg-sky-400/[.08] p-3">
              <p className="flex items-center gap-2 text-xs font-bold text-sky-200">
                {submitting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <CircleCheck size={14} className="text-emerald-300" />
                )}
                {submitting
                  ? `Criando ${progress.current}/${progress.total} · 1 por vez`
                  : "Processo concluído"}
              </p>
              <div className="mt-2 max-h-28 space-y-1 overflow-y-auto rounded bg-[#0c1117] p-2 font-mono text-[10px]">
                {progress.entries.map((entry, index) => (
                  <p
                    key={entry.advertiserId + index}
                    className={
                      entry.tone === "success"
                        ? "text-emerald-300"
                        : "text-rose-300"
                    }
                  >
                    {entry.tone === "success" ? "✓" : "×"} {entry.advertiserId}{" "}
                    — {entry.name}
                    {entry.tone === "success" ? " criada" : ""}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
        <footer className="flex items-center justify-end gap-3 border-t border-white/[.08] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-md bg-[#2a313d] px-5 py-2.5 text-sm font-semibold text-zinc-200 transition hover:bg-[#343d4a] disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={
              submitting ||
              (!completed && (!name.trim() || (identity && !imageFile)))
            }
            className="rounded-md bg-[#ffd31a] px-5 py-2.5 text-sm font-extrabold text-[#17140b] transition hover:bg-[#ffdd45] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting && (
              <Loader2 size={15} className="mr-2 inline animate-spin" />
            )}
            {completed
              ? "Fechar"
              : identity
                ? "Criar em Todas as Contas"
                : "Criar e Vincular Pixel"}
          </button>
        </footer>
      </section>
    </div>
  );
}

function CatalogScreen({
  catalogs,
  selectedId,
  mode,
  loading,
  onRefresh,
  onSelect,
  onMode,
}: {
  catalogs: Choice[];
  selectedId: string;
  mode: CatalogMode;
  loading: boolean;
  onRefresh: () => void;
  onSelect: (id: string) => void;
  onMode: (mode: CatalogMode) => void;
}) {
  return (
    <div className="mx-auto max-w-[760px] pt-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="section-label">Catálogos disponíveis</p>
          <p className="mt-1 text-xs text-zinc-500">
            Escolha o catálogo que será usado na operação.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="rocket-dark-button min-h-9 px-3 text-[11px]"
        >
          <RefreshCw className={loading ? "animate-spin" : ""} size={14} />
          Atualizar
        </button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {loading ? (
          <div className="col-span-full py-10 text-center text-sm text-zinc-500">
            <Loader2
              className="mx-auto mb-3 animate-spin text-[#d8b56b]"
              size={20}
            />
            Carregando catálogos…
          </div>
        ) : catalogs.length ? (
          catalogs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              aria-pressed={item.id === selectedId}
              className={`catalog-card catalog-card--compact text-left ${item.id === selectedId ? "catalog-selected" : ""}`}
            >
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/[.06] text-[#d8b56b]">
                <Database size={17} />
              </span>
              <span className="min-w-0 flex-1">
                <b className="block truncate text-sm">{item.name}</b>
                <small className="mt-1 block truncate text-[10px] text-zinc-500">
                  ID: {item.id} · {item.currency || "Moeda da conta"}
                </small>
              </span>
              {item.id === selectedId && (
                <CircleCheck size={17} className="text-sky-300" />
              )}
            </button>
          ))
        ) : (
          <div className="col-span-full rounded-xl border border-dashed border-white/[.12] px-5 py-8 text-center text-sm text-zinc-500">
            Nenhum catálogo disponível para a operação atual.
          </div>
        )}
      </div>
      <section className="mt-4 rounded-xl border border-white/[.08] bg-[#11161c]/80 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="section-label">Alcance do catálogo</p>
            <p className="mt-1 text-[10px] text-zinc-500">
              Defina quais produtos entram na campanha.
            </p>
          </div>
          <span className="rounded bg-white/[.05] px-2 py-1 text-[10px] font-bold text-zinc-400">
            {catalogs.length} catálogo(s)
          </span>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <SelectMode
            icon={<Layers3 size={18} />}
            title="Selecionar Sets"
            text="Grupos específicos."
            active={mode === "SETS"}
            onClick={() => onMode("SETS")}
          />
          <SelectMode
            icon={<Database size={18} />}
            title="Todos os Produtos"
            text="Todo o catálogo."
            active={mode === "ALL"}
            onClick={() => onMode("ALL")}
          />
        </div>
      </section>
      {mode === "SETS" && (
        <div className="mt-3 rounded-lg border border-sky-300/20 bg-sky-300/[.05] px-4 py-3 text-xs text-sky-100">
          A seleção de Product Sets será habilitada quando a API retornar os
          sets deste catálogo.
        </div>
      )}
    </div>
  );
}
function SelectMode({
  icon,
  title,
  text,
  active = false,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex min-h-[82px] items-center gap-3 rounded-lg border px-4 py-3 text-left transition ${active ? "border-[#d8b56b] bg-[#251f0d]" : "border-white/[.07] bg-[#101417] hover:border-white/[.2]"}`}
    >
      <span className={active ? "text-[#e3c985]" : "text-zinc-400"}>
        {icon}
      </span>
      <span>
        <b className="block text-sm">{title}</b>
        <small className="mt-1 block text-[10px] text-zinc-500">{text}</small>
      </span>
      {active && <CircleCheck className="ml-auto text-[#e3c985]" size={16} />}
    </button>
  );
}

type AsgardField = "campaign" | "group" | "ads" | "budget";
function AsgardController({
  activeField,
  campaignValue,
  groupValue,
  adsValue,
  budgetValue,
  pulseKey,
  onComplete,
}: {
  activeField: AsgardField | null;
  campaignValue: number;
  groupValue: number;
  adsValue: number;
  budgetValue: number;
  pulseKey: number;
  onComplete?: () => void;
}) {
  const controllerRef = useRef<HTMLDivElement>(null);
  const animationFrame = useRef<number | null>(null);
  const target = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });
  const completeRef = useRef(false);
  const isComplete =
    campaignValue > 0 && groupValue > 0 && adsValue > 0 && budgetValue > 0;
  const runes: { field: AsgardField; source: string; label: string }[] = [
    { field: "campaign", source: "/rune-campaign.webp", label: "" },
    { field: "group", source: "/rune-group.webp", label: "" },
    { field: "ads", source: "/rune-ads.webp", label: "" },
    { field: "budget", source: "/rune-budget.webp", label: "" },
  ];
  useEffect(() => {
    const animate = () => {
      const root = controllerRef.current;
      if (root) {
        current.current.x += (target.current.x - current.current.x) * 0.12;
        current.current.y += (target.current.y - current.current.y) * 0.12;
        root.style.setProperty("--core-x", `${current.current.x.toFixed(2)}px`);
        root.style.setProperty("--core-y", `${current.current.y.toFixed(2)}px`);
      }
      animationFrame.current = requestAnimationFrame(animate);
    };
    animationFrame.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrame.current !== null)
        cancelAnimationFrame(animationFrame.current);
    };
  }, []);
  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const resetTracking = () => {
      target.current = { x: 0, y: 0 };
    };
    const handlePointerMove = (event: PointerEvent) => {
      if (!controllerRef.current) return;
      const rect = controllerRef.current.getBoundingClientRect();
      const normalizedX =
        (event.clientX - (rect.left + rect.width / 2)) /
        (window.innerWidth / 2);
      const normalizedY =
        (event.clientY - (rect.top + rect.height / 2)) /
        (window.innerHeight / 2);
      target.current.x = Math.max(-8, Math.min(8, normalizedX * 8));
      target.current.y = Math.max(-6, Math.min(6, normalizedY * 6));
    };
    window.addEventListener("pointermove", handlePointerMove, {
      passive: true,
    });
    window.addEventListener("blur", resetTracking);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("blur", resetTracking);
    };
  }, []);
  useEffect(() => {
    if (isComplete && !completeRef.current) onComplete?.();
    completeRef.current = isComplete;
  }, [isComplete, onComplete]);
  return (
    <div
      ref={controllerRef}
      aria-hidden="true"
      className={`asgard-controller ${pulseKey ? `asgard-controller--pulse-${pulseKey % 2}` : ""} ${activeField ? `asgard-controller--${activeField}` : ""} ${isComplete ? "asgard-controller--complete" : ""}`}
    >
      <Image
        src="/asgard-controller-base.webp"
        alt=""
        fill
        sizes="(max-width: 760px) 220px, (max-width: 1180px) 340px, 410px"
        className="asgard-base"
      />
      <Image
        src="/asgard-controller-glow.webp"
        alt=""
        width={535}
        height={490}
        className="asgard-glow"
      />
      <Image
        src="/asgard-controller-core.webp"
        alt=""
        width={366}
        height={365}
        className="asgard-core"
      />
      {runes.map((rune) => (
        <Image
          key={rune.field}
          src={rune.source}
          alt={rune.label}
          width={244}
          height={245}
          className={`asgard-rune asgard-rune--${rune.field}`}
        />
      ))}
    </div>
  );
}

function CreativeScreen({
  value,
  pullCatalogText,
  cta,
  addon,
  onChange,
  onPullCatalogText,
  onCta,
  onAddon,
}: {
  value: string;
  pullCatalogText: boolean;
  cta: string;
  addon: string;
  onChange: (v: string) => void;
  onPullCatalogText: (value: boolean) => void;
  onCta: (v: string) => void;
  onAddon: (v: string) => void;
}) {
  const calls = [
    ["SHOP_NOW", "Compre Agora"],
    ["LEARN_MORE", "Saiba Mais"],
    ["SIGN_UP", "Cadastre-se"],
    ["CONTACT_US", "Contato"],
    ["DOWNLOAD", "Download"],
    ["WATCH_NOW", "Ver Agora"],
    ["RESERVE_NOW", "Reservar"],
    ["APPLY_NOW", "Aplicar"],
  ];
  const addOns = [
    ["NONE", "Nenhum", X],
    ["DISPLAY", "Display card", Layers3],
    ["COUNTDOWN", "Countdown", Timer],
    ["GIFT", "Gift code", Gift],
  ] as const;
  return (
    <div className="mx-auto max-w-[760px] pt-4">
      <div className="rocket-section">
        <div className="flex items-center justify-between">
          <p className="section-label">Texto do anúncio</p>
          <button
            type="button"
            onClick={() => onPullCatalogText(!pullCatalogText)}
            aria-pressed={pullCatalogText}
            className="flex items-center gap-2 text-xs text-zinc-400"
          >
            Puxar do catálogo{" "}
            <span
              className={`relative h-5 w-9 rounded-full p-0.5 transition ${pullCatalogText ? "bg-sky-400" : "bg-zinc-600"}`}
            >
              <span
                className={`block h-4 w-4 rounded-full bg-white transition ${pullCatalogText ? "translate-x-4" : ""}`}
              />
            </span>
          </button>
        </div>
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={pullCatalogText}
          placeholder={
            pullCatalogText
              ? "O texto será obtido dinamicamente do catálogo."
              : "Digite aqui o texto do anúncio"
          }
          className="rocket-input mt-3 min-h-[84px] resize-y disabled:cursor-not-allowed disabled:opacity-55"
        />
      </div>
      <div className="rocket-section mt-3">
        <p className="section-label">Call to action</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {calls.map(([key, label]) => (
            <button
              type="button"
              key={key}
              onClick={() => onCta(key)}
              className={`cta-chip ${cta === key ? "cta-selected" : ""}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="rocket-section mt-3">
        <p className="section-label">Complemento interativo</p>
        <div className="mt-3 grid grid-cols-4 gap-3">
          {addOns.map(([key, label, Icon]) => (
            <button
              type="button"
              key={key}
              onClick={() => onAddon(key)}
              className={`addon-card ${addon === key ? "addon-selected" : ""}`}
            >
              <Icon size={27} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function StructureScreen({
  campaigns,
  groups,
  ads,
  setCampaigns,
  setGroups,
  setAds,
  inputCurrency,
  setInputCurrency,
  amount,
  setAmount,
  accountCurrency,
  budget,
  country,
  setCountry,
  language,
  setLanguage,
  campaignName,
  setCampaignName,
  aigc,
  onAigc,
  cpa,
  onCpa,
  clickWindow,
  onClickWindow,
  viewWindow,
  onViewWindow,
  counting,
  onCounting,
  ages,
  onAges,
  operatingSystem,
  onOperatingSystem,
  showRegions,
  onShowRegions,
  regions,
  onRegions,
}: {
  campaigns: string;
  groups: string;
  ads: string;
  setCampaigns: (v: string) => void;
  setGroups: (v: string) => void;
  setAds: (v: string) => void;
  inputCurrency: string;
  setInputCurrency: (v: string) => void;
  amount: string;
  setAmount: (v: string) => void;
  rate: string;
  setRate: (v: string) => void;
  accountCurrency: string;
  budget: number;
  counts: { campaigns: number; groups: number; ads: number };
  country: string;
  setCountry: (v: string) => void;
  language: string;
  setLanguage: (v: string) => void;
  campaignName: string;
  setCampaignName: (v: string) => void;
  aigc: boolean;
  onAigc: (value: boolean) => void;
  cpa: boolean;
  onCpa: (value: boolean) => void;
  clickWindow: string;
  onClickWindow: (value: string) => void;
  viewWindow: string;
  onViewWindow: (value: string) => void;
  counting: string;
  onCounting: (value: string) => void;
  ages: string[];
  onAges: (value: string[]) => void;
  operatingSystem: OperatingSystem;
  onOperatingSystem: (value: OperatingSystem) => void;
  showRegions: boolean;
  onShowRegions: () => void;
  regions: string[];
  onRegions: (value: string[]) => void;
}) {
  const [acceleratedSpend, setAcceleratedSpend] = useState(false);
  const [activeAsgardField, setActiveAsgardField] =
    useState<AsgardField | null>(null);
  const [asgardPulse, setAsgardPulse] = useState(0);
  const [randomizationOpen, setRandomizationOpen] = useState(false);
  const [randomizeStructure, setRandomizeStructure] = useState(false);
  const [randomizeBudget, setRandomizeBudget] = useState(false);
  const [randomizeBid, setRandomizeBid] = useState(true);
  const [oneProductSetPerAccount, setOneProductSetPerAccount] = useState(false);
  const [gender, setGender] = useState<"ALL" | "MALE" | "FEMALE">("ALL");
  const [useProductSetName, setUseProductSetName] = useState(false);
  const allAges = ["13–17", "18–24", "25–34", "35–44", "45–54", "55+"];
  const currencySymbol =
    (
      {
        BRL: "R$",
        USD: "US$",
        EUR: "€",
        GBP: "£",
        CLP: "CLP$",
        MXN: "MX$",
        COP: "COP$",
        ARS: "AR$",
        PEN: "S/",
        PYG: "₲",
        UYU: "$U",
        BOB: "Bs",
        JPY: "¥",
        KRW: "₩",
        IDR: "Rp",
        VND: "₫",
      } as Record<string, string>
    )[inputCurrency] ?? inputCurrency;
  const countryOptions = [
    { value: "BR", label: "Brasil", code: "BR", flag: "br", group: "Américas" },
    {
      value: "US",
      label: "Estados Unidos",
      code: "US",
      flag: "us",
      group: "Américas",
    },
    { value: "CA", label: "Canadá", code: "CA", flag: "ca", group: "Américas" },
    { value: "MX", label: "México", code: "MX", flag: "mx", group: "Américas" },
    {
      value: "AR",
      label: "Argentina",
      code: "AR",
      flag: "ar",
      group: "Américas",
    },
    {
      value: "CO",
      label: "Colômbia",
      code: "CO",
      flag: "co",
      group: "Américas",
    },
    { value: "CL", label: "Chile", code: "CL", flag: "cl", group: "Américas" },
    { value: "PE", label: "Peru", code: "PE", flag: "pe", group: "Américas" },
    {
      value: "EC",
      label: "Equador",
      code: "EC",
      flag: "ec",
      group: "Américas",
    },
    {
      value: "UY",
      label: "Uruguai",
      code: "UY",
      flag: "uy",
      group: "Américas",
    },
    {
      value: "PY",
      label: "Paraguai",
      code: "PY",
      flag: "py",
      group: "Américas",
    },
    {
      value: "BO",
      label: "Bolívia",
      code: "BO",
      flag: "bo",
      group: "Américas",
    },
    {
      value: "GB",
      label: "Reino Unido",
      code: "GB",
      flag: "gb",
      group: "Europa",
    },
    { value: "DE", label: "Alemanha", code: "DE", flag: "de", group: "Europa" },
    { value: "FR", label: "França", code: "FR", flag: "fr", group: "Europa" },
    { value: "IT", label: "Itália", code: "IT", flag: "it", group: "Europa" },
    { value: "ES", label: "Espanha", code: "ES", flag: "es", group: "Europa" },
    { value: "PT", label: "Portugal", code: "PT", flag: "pt", group: "Europa" },
    { value: "NL", label: "Holanda", code: "NL", flag: "nl", group: "Europa" },
    { value: "BE", label: "Bélgica", code: "BE", flag: "be", group: "Europa" },
    { value: "AT", label: "Áustria", code: "AT", flag: "at", group: "Europa" },
    { value: "CH", label: "Suíça", code: "CH", flag: "ch", group: "Europa" },
    { value: "PL", label: "Polônia", code: "PL", flag: "pl", group: "Europa" },
    { value: "SE", label: "Suécia", code: "SE", flag: "se", group: "Europa" },
    { value: "NO", label: "Noruega", code: "NO", flag: "no", group: "Europa" },
    {
      value: "DK",
      label: "Dinamarca",
      code: "DK",
      flag: "dk",
      group: "Europa",
    },
    {
      value: "FI",
      label: "Finlândia",
      code: "FI",
      flag: "fi",
      group: "Europa",
    },
    { value: "IE", label: "Irlanda", code: "IE", flag: "ie", group: "Europa" },
    { value: "GR", label: "Grécia", code: "GR", flag: "gr", group: "Europa" },
    {
      value: "CZ",
      label: "República Tcheca",
      code: "CZ",
      flag: "cz",
      group: "Europa",
    },
    { value: "RO", label: "Romênia", code: "RO", flag: "ro", group: "Europa" },
    { value: "HU", label: "Hungria", code: "HU", flag: "hu", group: "Europa" },
  ];
  const languageOptions = [
    { value: "all", label: "Todos os idiomas", code: "🌐", group: "Idiomas" },
    {
      value: "pt",
      label: "Português",
      code: "BR",
      flag: "br",
      group: "Idiomas",
    },
    { value: "en", label: "Inglês", code: "US", flag: "us", group: "Idiomas" },
    {
      value: "es",
      label: "Espanhol",
      code: "ES",
      flag: "es",
      group: "Idiomas",
    },
    { value: "fr", label: "Francês", code: "FR", flag: "fr", group: "Idiomas" },
    { value: "de", label: "Alemão", code: "DE", flag: "de", group: "Idiomas" },
    {
      value: "it",
      label: "Italiano",
      code: "IT",
      flag: "it",
      group: "Idiomas",
    },
    { value: "ja", label: "Japonês", code: "JP", flag: "jp", group: "Idiomas" },
    { value: "ko", label: "Coreano", code: "KR", flag: "kr", group: "Idiomas" },
    {
      value: "zh-Hans",
      label: "Chinês (Simplificado)",
      code: "CN",
      flag: "cn",
      group: "Idiomas",
    },
    {
      value: "zh-Hant",
      label: "Chinês (Tradicional)",
      code: "TW",
      flag: "tw",
      group: "Idiomas",
    },
    { value: "ar", label: "Árabe", code: "SA", flag: "sa", group: "Idiomas" },
    { value: "hi", label: "Hindi", code: "IN", flag: "in", group: "Idiomas" },
    { value: "ta", label: "Tamil", code: "IN", flag: "in", group: "Idiomas" },
    { value: "te", label: "Telugu", code: "IN", flag: "in", group: "Idiomas" },
    {
      value: "id",
      label: "Indonésio",
      code: "ID",
      flag: "id",
      group: "Idiomas",
    },
    {
      value: "th",
      label: "Tailandês",
      code: "TH",
      flag: "th",
      group: "Idiomas",
    },
    {
      value: "vi",
      label: "Vietnamita",
      code: "VN",
      flag: "vn",
      group: "Idiomas",
    },
    { value: "ms", label: "Malaio", code: "MY", flag: "my", group: "Idiomas" },
    {
      value: "fil",
      label: "Filipino",
      code: "PH",
      flag: "ph",
      group: "Idiomas",
    },
  ];
  const regionOptions: Record<string, string[]> = {
    MX: ["CDMX", "Jalisco", "Nuevo León", "Estado de México"],
    BR: ["São Paulo", "Rio de Janeiro", "Minas Gerais", "Paraná"],
    US: ["California", "Florida", "Texas", "New York"],
    CL: ["Santiago", "Valparaíso", "Biobío", "Maule"],
  };
  const countryName =
    countryOptions.find((item) => item.value === country)?.label ?? country;
  const randomizationItems = [
    [
      "Randomizar estrutura",
      "Campanhas/grupos/anúncios variam +/-1 do valor.",
      randomizeStructure,
      setRandomizeStructure,
    ],
    [
      "Randomizar orçamento",
      "Cada campanha/grupo recebe valor aleatório entre min e max.",
      randomizeBudget,
      setRandomizeBudget,
    ],
    [
      "Randomizar bid",
      "Varia o CPA +/- 5% por ad group.",
      randomizeBid,
      setRandomizeBid,
    ],
    [
      "1 PS por conta",
      "Distribui um product set diferente por conta.",
      oneProductSetPerAccount,
      setOneProductSetPerAccount,
    ],
  ] as const;
  const toggleAge = (age: string) =>
    onAges(
      ages.includes(age) ? ages.filter((item) => item !== age) : [...ages, age],
    );
  const toggleRegion = (region: string) =>
    onRegions(
      regions.includes(region)
        ? regions.filter((item) => item !== region)
        : [...regions, region],
    );
  const sequence = (campaignName.trim() || "OFERTA") + " 01";
  const signalAsgard = (field: AsgardField | null, pulse = false) => {
    setActiveAsgardField(field);
    if (pulse) setAsgardPulse((value) => value + 1);
  };
  return (
    <div className="mx-auto max-w-[820px] pt-4">
      <div className="asgard-controller-section">
        <AsgardController
          activeField={activeAsgardField}
          campaignValue={Number(campaigns) || 0}
          groupValue={Number(groups) || 0}
          adsValue={Number(ads) || 0}
          budgetValue={Number(amount.replace(",", ".")) || 0}
          pulseKey={asgardPulse}
        />
      </div>
      <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-[.08em] text-zinc-500">
        <span>Moeda dos valores</span>
        <select
          value={inputCurrency}
          onFocus={() => signalAsgard(null)}
          onClick={() => signalAsgard(null, true)}
          onChange={(event) => {
            setInputCurrency(event.target.value);
            signalAsgard(null, true);
          }}
          className="rounded-md border border-white/[.1] bg-[#1d222d] px-2.5 py-1.5 text-xs font-black text-zinc-100 outline-none"
        >
          {currencies.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <span className="normal-case font-medium tracking-normal text-zinc-600">
          Orçamento e lance usam esta moeda · {money(budget, accountCurrency)}{" "}
          por grupo
        </span>
      </div>
      <div className="structure-grid">
        <MetricInput
          label="Campanhas"
          field="campaign"
          value={campaigns}
          onChange={setCampaigns}
          onActivate={signalAsgard}
          onDeactivate={() => signalAsgard(null)}
        />
        <MetricInput
          label="Grupos"
          field="group"
          value={groups}
          onChange={setGroups}
          onActivate={signalAsgard}
          onDeactivate={() => signalAsgard(null)}
        />
        <MetricInput
          label="Anúncios"
          field="ads"
          value={ads}
          onChange={setAds}
          onActivate={signalAsgard}
          onDeactivate={() => signalAsgard(null)}
        />
        <MetricInput
          label={"Orçamento (" + inputCurrency + ")"}
          field="budget"
          value={amount}
          onChange={setAmount}
          onActivate={signalAsgard}
          onDeactivate={() => signalAsgard(null)}
          prefix={currencySymbol}
          amount
        />
      </div>
      <section className="rocket-section mt-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="section-label">Conteúdo gerado por IA (AIGC)</p>
            <p className="mt-2 text-[10px] text-zinc-500">
              Ative somente se o criativo realmente usa IA — rótulo errado é
              penalizado pelo TikTok.
            </p>
          </div>
          <Toggle value={aigc} onChange={onAigc} />
        </div>
      </section>
      <section className="rocket-section mt-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="section-label">Lance (CPA)</p>
            <p className="mt-2 text-[10px] text-zinc-500">
              Base no custo por aquisição desejado.
            </p>
          </div>
          <Toggle value={cpa} onChange={onCpa} />
        </div>
        <div className="mt-5 border-t border-white/[.06] pt-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="section-label text-zinc-500">Gasto acelerado</p>
              <p className="mt-2 text-[10px] text-zinc-600">
                {cpa
                  ? "Acelera a entrega conforme disponibilidade do TikTok."
                  : "Indisponível: exige LANCE (CPA) ligado."}
              </p>
            </div>
            <button
              type="button"
              disabled={!cpa}
              onClick={() => setAcceleratedSpend((value) => !value)}
              className="flex overflow-hidden rounded-md border border-white/[.08] bg-[#0d1013] text-xs font-black disabled:opacity-35"
            >
              <span
                className={
                  acceleratedSpend
                    ? "px-5 py-3 text-zinc-500"
                    : "bg-zinc-700 px-5 py-3 text-zinc-100"
                }
              >
                Off
              </span>
              <span
                className={
                  acceleratedSpend
                    ? "bg-sky-400 px-5 py-3 text-slate-950"
                    : "px-5 py-3 text-zinc-500"
                }
              >
                On
              </span>
            </button>
          </div>
        </div>
      </section>
      <section className="rocket-section mt-3 overflow-hidden p-0">
        <button
          type="button"
          onClick={() => setRandomizationOpen((value) => !value)}
          aria-expanded={randomizationOpen}
          className="flex w-full items-center justify-between px-5 py-4 text-left"
        >
          <span>
            <b className="text-sm">Randomização</b>
            <small className="ml-3 text-[10px] text-zinc-500">
              Anti-padrão TikTok
            </small>
          </span>
          <ChevronDown
            size={18}
            className={
              randomizationOpen
                ? "rotate-180 text-zinc-300 transition"
                : "text-zinc-400 transition"
            }
          />
        </button>
        {randomizationOpen && (
          <div className="border-t border-white/[.06] px-5">
            {randomizationItems.map(
              ([label, description, value, onChange], index) => (
                <div
                  key={label}
                  className={
                    "flex items-center justify-between gap-5 py-4 " +
                    (index < randomizationItems.length - 1
                      ? "border-b border-white/[.06]"
                      : "")
                  }
                >
                  <div>
                    <b className="text-xs text-zinc-100">{label}</b>
                    <p className="mt-1 text-[10px] text-zinc-500">
                      {description}
                    </p>
                  </div>
                  <Toggle value={value} onChange={onChange} />
                </div>
              ),
            )}
          </div>
        )}
      </section>
      <section className="rocket-section mt-3">
        <p className="section-label">Janela de atribuição</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <DarkSelect
            label="Click"
            value={clickWindow}
            values={[
              "1-day click",
              "7-day click",
              "14-day click",
              "28-day click",
            ]}
            onChange={onClickWindow}
          />
          <DarkSelect
            label="View"
            value={viewWindow}
            values={["Off", "1-day view", "7-day view"]}
            onChange={onViewWindow}
          />
          <DarkSelect
            label="Contagem"
            value={counting}
            values={["Every", "First"]}
            onChange={onCounting}
          />
        </div>
      </section>
      <div className="mt-3 grid gap-3 md:grid-cols-[1.25fr_.75fr]">
        <section className="rocket-section">
          <div className="flex items-center justify-between">
            <p className="section-label">Faixas etárias</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onAges(allAges)}
                className="small-yellow"
              >
                Todas
              </button>
              <button
                type="button"
                onClick={() => onAges([])}
                className="rounded border border-white/[.09] px-2 text-[10px] font-black text-zinc-400"
              >
                Nenhuma
              </button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {allAges.map((item) => (
              <button
                type="button"
                key={item}
                onClick={() => toggleAge(item)}
                aria-pressed={ages.includes(item)}
                className={
                  "age-chip " + (ages.includes(item) ? "age-selected" : "")
                }
              >
                {item}
              </button>
            ))}
          </div>
          <p className="mt-3 text-[10px] text-zinc-500">
            {ages.length} faixa(s) selecionada(s)
          </p>
        </section>
        <section className="rocket-section">
          <p className="section-label">Sistema operacional</p>
          <div className="mt-4 grid gap-2">
            {[
              ["ANDROID", "Android"],
              ["IOS", "iOS"],
              ["ALL", "Android + iOS"],
            ].map(([value, label]) => (
              <button
                type="button"
                key={value}
                onClick={() => onOperatingSystem(value as OperatingSystem)}
                aria-pressed={operatingSystem === value}
                className={
                  "os-card " + (operatingSystem === value ? "os-selected" : "")
                }
              >
                {label}
              </button>
            ))}
          </div>
        </section>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <FlaggedSelect
          label="País (location)"
          value={country}
          options={countryOptions}
          onChange={(value) => {
            setCountry(value);
            onRegions([]);
          }}
          hint={
            "Location ID: " +
            (country === "BR" ? "346904" : country === "MX" ? "3996063" : "—")
          }
        />
        <FlaggedSelect
          label="Idioma"
          value={language}
          options={languageOptions}
          onChange={setLanguage}
          hint={"Código: " + language}
        />
      </div>
      <section className="rocket-section mt-3">
        <div className="flex items-center justify-between gap-4">
          <p className="section-label">Estados / regiões (opcional)</p>
          <span className="text-[10px] text-zinc-500">
            {regions.length
              ? regions.length + " selecionada(s)"
              : "País inteiro"}
          </span>
        </div>
        <div className="mt-4">
          <button
            type="button"
            onClick={onShowRegions}
            className="rocket-dark-button"
          >
            {showRegions
              ? "Ocultar estados"
              : "Carregar estados de " + countryName}
          </button>
        </div>
        {showRegions && (
          <div className="mt-4 flex flex-wrap gap-2">
            {(regionOptions[country] ?? []).map((region) => (
              <button
                type="button"
                key={region}
                onClick={() => toggleRegion(region)}
                aria-pressed={regions.includes(region)}
                className={
                  "age-chip " + (regions.includes(region) ? "age-selected" : "")
                }
              >
                {region}
              </button>
            ))}
          </div>
        )}
        <p className="mt-3 text-[10px] text-zinc-500">
          Vazio = país inteiro. Estados selecionados substituem o país no
          targeting.
        </p>
      </section>
      <section className="rocket-section mt-3">
        <p className="section-label">Sexo (gênero)</p>
        <div className="mt-4 flex gap-2">
          {[
            ["ALL", "Todos"],
            ["MALE", "Masculino"],
            ["FEMALE", "Feminino"],
          ].map(([value, label]) => (
            <button
              type="button"
              key={value}
              onClick={() => setGender(value as "ALL" | "MALE" | "FEMALE")}
              className={
                "rounded-md px-5 py-3 text-sm font-black " +
                (gender === value
                  ? "bg-sky-400 text-slate-950"
                  : "bg-[#0d1114] text-zinc-300")
              }
            >
              {label}
            </button>
          ))}
        </div>
      </section>
      <section className="rocket-section mt-3">
        <div className="flex items-center gap-3">
          <p className="section-label">Campaign Naming</p>
          <span className="rounded bg-[#3a3319] px-2 py-1 text-[9px] text-[#e3c985]">
            nomenclatura
          </span>
        </div>
        <div className="mt-5 grid gap-5 md:grid-cols-[1.45fr_.7fr]">
          <div>
            <div className="flex items-center justify-between gap-3 border-b border-white/[.06] pb-4">
              <div>
                <b className="text-sm">Usar Nome do Product Set</b>
                <p className="mt-1 text-[10px] text-zinc-500">
                  Quando ligado, usa o nome do product set como nome da
                  campanha.
                </p>
              </div>
              <Toggle
                value={useProductSetName}
                onChange={setUseProductSetName}
              />
            </div>
            <label className="mt-4 block text-[10px] font-black uppercase tracking-wide text-zinc-500">
              Nome da campanha
              <input
                value={campaignName}
                disabled={useProductSetName}
                onChange={(event) => setCampaignName(event.target.value)}
                placeholder="Ex.: Glow Skin"
                className="rocket-input mt-2 font-black text-white disabled:opacity-45"
              />
            </label>
            <div className="mt-3">
              <p className="text-[10px] font-black uppercase tracking-wide text-zinc-500">
                Sequência
              </p>
              <span className="mt-2 inline-flex rounded-md bg-[#0d1114] px-3 py-2 text-sm font-black text-[#ffd31a]">
                {sequence}
              </span>
            </div>
          </div>
          <div className="flex min-h-[180px] flex-col justify-center rounded-xl bg-[#0d1114] p-5 text-center">
            <p className="text-[10px] font-black uppercase tracking-[.1em] text-zinc-500">
              Prévia do nome
            </p>
            <p className="mt-4 rounded-lg border border-[#806a2b] bg-[#29230e] px-4 py-3 text-lg font-black text-[#ffd31a]">
              {sequence}.
            </p>
            <p className="mt-3 text-[10px] leading-4 text-zinc-500">
              Nome base + sequência numérica
              <br />
              Ex.: “Glow Skin 01”, “Glow Skin 02”.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
function MetricInput({
  label,
  field,
  value,
  onChange,
  onActivate,
  onDeactivate,
  prefix,
  amount = false,
}: {
  label: string;
  field: AsgardField;
  value: string;
  onChange: (v: string) => void;
  onActivate: (field: AsgardField, pulse?: boolean) => void;
  onDeactivate: () => void;
  prefix?: string;
  amount?: boolean;
}) {
  const adjust = (delta: number) => {
    const next = Math.max(
      amount ? 0 : 1,
      (Number(value.replace(",", ".")) || 0) + delta,
    );
    onChange(String(next));
    onActivate(field, true);
  };
  const digitCount =
    value.replace(/[^0-9]/g, "").length + (prefix?.length ?? 0);
  const valueSize = amount
    ? digitCount > 13
      ? "metric-value--long"
      : digitCount > 9
        ? "metric-value--medium"
        : ""
    : "";
  return (
    <label
      onMouseEnter={() => onActivate(field)}
      onMouseLeave={onDeactivate}
      className={
        "structure-metric" + (amount ? " structure-metric--amount" : "")
      }
    >
      <span>{label}</span>
      <span className="metric-input-shell">
        {prefix && <b className="metric-prefix">{prefix}</b>}
        <input
          className={valueSize}
          type="number"
          min={amount ? 0 : 1}
          step={amount ? "0.01" : "1"}
          value={value}
          onFocus={() => onActivate(field)}
          onClick={() => onActivate(field, true)}
          onChange={(event) => {
            onChange(event.target.value);
            onActivate(field, true);
          }}
          inputMode={amount ? "decimal" : "numeric"}
          aria-label={label}
        />
        <span className="metric-stepper">
          <button
            type="button"
            aria-label={"Aumentar " + label}
            onFocus={() => onActivate(field)}
            onClick={() => adjust(amount ? 1 : 1)}
          >
            <ChevronUp size={15} />
          </button>
          <button
            type="button"
            aria-label={"Diminuir " + label}
            onFocus={() => onActivate(field)}
            onClick={() => adjust(amount ? -1 : -1)}
          >
            <ChevronDown size={15} />
          </button>
        </span>
      </span>
    </label>
  );
}
function DarkSelect({
  label,
  value,
  values,
  onChange,
}: {
  label: string;
  value: string;
  values: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="rocket-section block">
      <span className="section-label">{label}</span>
      <span className="relative mt-4 block">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="rocket-input appearance-none font-black"
        >
          {values.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500"
          size={16}
        />
      </span>
    </label>
  );
}
function FlagIcon({ option }: { option: { code: string; flag?: string } }) {
  if (!option.flag)
    return (
      <span className="grid size-5 place-items-center text-sky-200">
        <Globe2 size={15} />
      </span>
    );
  return (
    <span
      aria-label={option.code}
      className="flag-icon"
      role="img"
      style={{
        backgroundImage: `url(https://flagcdn.com/w40/${option.flag}.png)`,
      }}
    />
  );
}
function FlaggedSelect({
  label,
  value,
  options,
  hint,
  onChange,
}: {
  label: string;
  value: string;
  options: {
    value: string;
    label: string;
    code: string;
    flag?: string;
    group?: string;
  }[];
  hint: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected =
    options.find((option) => option.value === value) ?? options[0];
  const groups = Array.from(
    new Set(options.map((option) => option.group ?? "Opções")),
  );
  return (
    <div className="rocket-section relative z-10 block">
      <span className="section-label">{label}</span>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="rocket-input mt-4 flex w-full items-center gap-3 text-left font-black"
      >
        <FlagIcon option={selected} />
        <span className="min-w-0 flex-1 truncate">
          {selected.code} {selected.label}
        </span>
        <ChevronDown
          className={
            open
              ? "rotate-180 text-zinc-300 transition"
              : "text-zinc-500 transition"
          }
          size={16}
        />
      </button>
      {open && (
        <div
          role="listbox"
          aria-label={label}
          className="absolute left-0 right-0 top-[calc(100%-1.2rem)] z-30 max-h-72 overflow-y-auto rounded-lg border border-sky-200/20 bg-[#10151b] p-2 shadow-[0_22px_50px_rgba(0,0,0,.52)]"
        >
          {groups.map((group) => (
            <div key={group}>
              <p className="px-2 pb-1 pt-2 text-[10px] font-black uppercase tracking-[.09em] text-zinc-500">
                {group}
              </p>
              {options
                .filter((option) => (option.group ?? "Opções") === group)
                .map((option) => (
                  <button
                    role="option"
                    aria-selected={option.value === value}
                    type="button"
                    key={option.value}
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    className={
                      "flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-xs font-bold transition " +
                      (option.value === value
                        ? "bg-sky-400 text-slate-950"
                        : "text-zinc-200 hover:bg-white/[.07]")
                    }
                  >
                    <FlagIcon option={option} />
                    <span>
                      {option.code} {option.label}
                    </span>
                  </button>
                ))}
            </div>
          ))}
        </div>
      )}
      <small className="mt-2 block text-[10px] text-zinc-500">{hint}</small>
    </div>
  );
}
function Toggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      aria-pressed={value}
      className="flex overflow-hidden rounded-md border border-white/[.08] bg-[#0d1013] text-xs font-black"
    >
      <span
        className={`px-5 py-3 ${!value ? "bg-zinc-700 text-zinc-200" : "text-zinc-500"}`}
      >
        Off
      </span>
      <span
        className={`px-5 py-3 ${value ? "bg-sky-400 text-slate-950" : "text-zinc-500"}`}
      >
        On
      </span>
    </button>
  );
}

function ProxyScreen({
  proxy,
  address,
  onChange,
  onAddress,
}: {
  proxy: string;
  address: string;
  onChange: (value: string) => void;
  onAddress: (value: string) => void;
}) {
  return (
    <div className="mx-auto max-w-[760px] pt-4">
      <div className="rocket-card p-5">
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-xl bg-[#142231] text-sky-300">
            <Orbit size={27} />
          </span>
          <div>
            <p className="text-xl font-black">Canal de saída</p>
            <p className="mt-1 text-sm text-zinc-400">
              A rota selecionada acompanha a configuração do lançamento.
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-3">
          <button
            type="button"
            onClick={() => onChange("DIRECT")}
            aria-pressed={proxy === "DIRECT"}
            className={`proxy-card ${proxy === "DIRECT" ? "proxy-selected" : ""}`}
          >
            <span>
              <b>Rota direta</b>
              <small>Usar a conexão padrão da operação.</small>
            </span>
            {proxy === "DIRECT" && <CircleCheck />}
          </button>
          <button
            type="button"
            onClick={() => onChange("DEDICATED")}
            aria-pressed={proxy === "DEDICATED"}
            className={`proxy-card ${proxy === "DEDICATED" ? "proxy-selected" : ""}`}
          >
            <span>
              <b>Proxy dedicado</b>
              <small>Definir uma rota específica antes do lançamento.</small>
            </span>
            {proxy === "DEDICATED" && <CircleCheck />}
          </button>
        </div>
        {proxy === "DEDICATED" && (
          <label className="mt-5 block text-xs font-bold text-zinc-400">
            URL do proxy
            <input
              value={address}
              onChange={(event) => onAddress(event.target.value)}
              placeholder="http://host:porta ou socks5://host:porta"
              className="rocket-input mt-2"
            />
          </label>
        )}
      </div>
    </div>
  );
}
function LaunchScreen({
  ready,
  name,
  bc,
  catalog,
  counts,
  budget,
  currency,
  connected,
  selectedAccounts,
  assetsReady,
  catalogCreativeReady,
  proxyReady,
  delay,
  onDelay,
  apiCampaignCount,
  apiCampaignsLoading,
  onManageCampaigns,
  onLaunch,
}: {
  ready: boolean;
  name: string;
  bc: Choice | null;
  catalog: Choice | null;
  counts: { campaigns: number; groups: number; ads: number };
  budget: number;
  currency: string;
  connected: boolean;
  selectedAccounts: Choice[];
  assetsReady: boolean;
  catalogCreativeReady: boolean;
  proxyReady: boolean;
  delay: number;
  onDelay: (minutes: number) => void;
  apiCampaignCount: number;
  apiCampaignsLoading: boolean;
  onManageCampaigns: (action: CampaignAction) => void;
  onLaunch: () => void;
}) {
  const accountCount = selectedAccounts.length;
  const activeAccounts = selectedAccounts.filter(isOperationalAdvertiser).length;
  const totals = {
    campaigns: counts.campaigns * accountCount,
    groups: counts.groups * accountCount,
    ads: counts.ads * accountCount,
  };
  const checks = [
    {
      label: "Canal TikTok conectado",
      detail: connected ? "Autorização ativa para esta sessão." : "Autorize o canal antes de publicar.",
      complete: connected,
    },
    {
      label: "Contas selecionadas",
      detail: accountCount
        ? `${activeAccounts}/${accountCount} conta(s) operacional(is).`
        : "Selecione ao menos uma conta operacional.",
      complete: accountCount > 0 && activeAccounts === accountCount,
    },
    {
      label: "Catálogo definido",
      detail: catalog?.name ?? "Escolha o catálogo da Business Center.",
      complete: Boolean(bc && catalog),
    },
    {
      label: "Identity e Pixel por conta",
      detail: assetsReady
        ? "Todos os ativos selecionados são autorizados."
        : "Associe uma Identity e um Pixel a cada conta.",
      complete: assetsReady,
    },
    {
      label: "Criativo dinâmico de catálogo",
      detail: catalogCreativeReady
        ? "Produtos e variações serão usados a partir do catálogo definido."
        : "Defina o catálogo que fornecerá os produtos do anúncio.",
      complete: catalogCreativeReady,
    },
    {
      label: "Orçamento e nomenclatura",
      detail:
        budget > 0 && name.trim()
          ? `${money(budget, currency)} por grupo · ${name.trim()}`
          : "Informe orçamento e nome da campanha.",
      complete: budget > 0 && Boolean(name.trim()),
    },
    {
      label: "Rota de saída",
      detail: proxyReady
        ? "Configuração de rede validada."
        : "Informe o endereço da proxy dedicada.",
      complete: proxyReady,
    },
  ];
  const scheduleOptions = [
    [0, "Agora"],
    [1, "+1 min"],
    [5, "+5 min"],
    [10, "+10 min"],
    [15, "+15 min"],
    [30, "+30 min"],
    [60, "+1 hora"],
  ] as const;
  const scheduleLabel =
    scheduleOptions.find(([minutes]) => minutes === delay)?.[1] ?? "Agora";
  return (
    <div className="mx-auto max-w-[1180px] pt-4">
      <div className="mb-4">
        <p className="section-label">Publicação de campanhas</p>
        <h2 className="thor-title mt-2 text-3xl leading-none sm:text-4xl">
          Launch
        </h2>
        <p className="mt-2 text-sm font-semibold text-zinc-300">
          Confira os ativos e defina quando as campanhas devem iniciar no TikTok. {" "}
          <span className="text-sky-300">O envio começa assim que você clicar em iniciar publicação.</span>
        </p>
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            {checks.map((check) => (
              <div
                key={check.label}
                className={`launch-check ${check.complete ? "launch-check--ready" : "launch-check--pending"}`}
              >
                <span className="launch-check-icon">
                  {check.complete ? <CircleCheck size={18} /> : <CircleAlert size={18} />}
                </span>
                <span className="min-w-0">
                  <b>{check.label}</b>
                  <small>{check.detail}</small>
                </span>
              </div>
            ))}
          </div>
          <section className="rocket-section launch-schedule p-5 sm:p-6">
            <p className="section-label">Quando iniciar?</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {scheduleOptions.map(([minutes, label]) => (
                <button
                  key={minutes}
                  type="button"
                  onClick={() => onDelay(minutes)}
                  aria-pressed={delay === minutes}
                  className={`launch-schedule-option ${delay === minutes ? "launch-schedule-option--active" : ""}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-5 flex items-center gap-2 text-xs font-bold text-[#e7c677]">
              <Timer size={15} />
              {delay === 0
                ? "As campanhas serão enviadas agora e iniciarão imediatamente no TikTok."
                : `As campanhas serão enviadas agora e ficarão programadas no TikTok para iniciar daqui a ${delay} minuto(s).`}
            </p>
          </section>
        </div>
        <aside className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {[
              [accountCount, "Contas ativas"],
              [totals.campaigns, "Campanhas"],
              [totals.groups, "Grupos"],
              [totals.ads, "Anúncios"],
            ].map(([value, label]) => (
              <div key={label} className="launch-stat">
                <b>{value}</b>
                <span>{label}</span>
              </div>
            ))}
          </div>
          <div className="launch-budget">
            <span>Limite diário estimado</span>
            <b>{money(budget * totals.groups, currency)}</b>
            <small>{money(budget, currency)} por grupo</small>
          </div>
          <button
            type="button"
            disabled={!apiCampaignCount || apiCampaignsLoading}
            onClick={() => onManageCampaigns("pause")}
            title={
              apiCampaignCount
                ? `Pausa ${apiCampaignCount} campanha(s) encontrada(s) nas contas selecionadas.`
                : "Selecione contas com campanhas para liberar esta ação."
            }
            className="launch-manage-action launch-manage-action--pause"
          >
            <Timer size={15} />
            Pausar campanhas selecionadas
          </button>
          <button
            type="button"
            disabled={!apiCampaignCount || apiCampaignsLoading}
            onClick={() => onManageCampaigns("delete")}
            title={
              apiCampaignCount
                ? `Exclui ${apiCampaignCount} campanha(s) encontrada(s) nas contas selecionadas.`
                : "Selecione contas com campanhas para liberar esta ação."
            }
            className="launch-manage-action launch-manage-action--delete"
          >
            <Trash2 size={15} />
            Excluir campanhas selecionadas
          </button>
          <p className="launch-managed-note">
            {apiCampaignsLoading
              ? "Conferindo campanhas das contas selecionadas…"
             : apiCampaignCount
                ? `${apiCampaignCount} campanha(s) encontrada(s) nas contas selecionadas.`
                : "As ações afetam todas as campanhas das contas selecionadas."}
          </p>
        </aside>
      </div>
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
        <span className="mr-auto text-xs font-semibold text-zinc-500">
          Janela selecionada: <b className="text-zinc-300">{scheduleLabel}</b>
        </span>
        <button
          type="button"
          disabled={!ready}
          onClick={onLaunch}
          className="rocket-launch-button w-full sm:w-auto sm:min-w-[272px] disabled:opacity-40"
        >
          <CloudLightning size={19} />
          Iniciar publicação
        </button>
      </div>
      {!ready && (
        <p className="mt-3 text-right text-xs text-amber-200">
          Complete os itens pendentes para liberar a publicação.
        </p>
      )}
    </div>
  );
}

function CampaignActionModal({
  action,
  campaignCount,
  confirmation,
  submitting,
  onConfirmation,
  onClose,
  onConfirm,
}: {
  action: CampaignAction;
  campaignCount: number;
  confirmation: string;
  submitting: boolean;
  onConfirmation: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const isDelete = action === "delete";
  const phrase = isDelete ? "EXCLUIR TODAS AS CAMPANHAS" : "PAUSAR TODAS AS CAMPANHAS";
  const confirmed = confirmation.trim().toLocaleUpperCase("pt-BR") === phrase;
  const title = isDelete
    ? "Excluir campanhas selecionadas"
    : "Pausar campanhas selecionadas";
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-sm" role="presentation">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="campaign-action-title"
        className={`campaign-action-modal ${isDelete ? "campaign-action-modal--delete" : ""}`}
      >
        <button
          type="button"
          aria-label="Fechar confirmação"
          className="campaign-action-dismiss"
          disabled={submitting}
          onClick={onClose}
        >
          <X size={19} />
        </button>
        <div className={`campaign-action-symbol ${isDelete ? "campaign-action-symbol--delete" : ""}`}>
          {isDelete ? <Trash2 size={28} /> : <ShieldCheck size={29} />}
        </div>
        <p className="section-label text-center">Confirmação de operação</p>
        <h2 id="campaign-action-title" className="thor-title mt-2 text-center text-2xl">
          {title}
        </h2>
        <p className={`mt-3 text-center text-sm font-black ${isDelete ? "text-red-300" : "text-sky-300"}`}>
          {isDelete ? "Esta ação é irreversível." : "A entrega das campanhas será interrompida até nova ativação."}
        </p>
        <p className="campaign-action-copy">
          A ação será aplicada a <b>{campaignCount}</b> campanha(s) encontrada(s) nas contas selecionadas.
          Inclui campanhas criadas pelo ThorTk, pelo Ads Manager ou por outra integração.
        </p>
        <form
          className="mt-6"
          onSubmit={(event) => {
            event.preventDefault();
            if (confirmed && !submitting) onConfirm();
          }}
        >
          <label htmlFor="campaign-action-confirmation" className="campaign-action-label">
            Para confirmar, digite: <b>{phrase}</b>
          </label>
          <input
            id="campaign-action-confirmation"
            value={confirmation}
            onChange={(event) => onConfirmation(event.target.value)}
            autoComplete="off"
            autoFocus
            placeholder="Digite a confirmação"
            className="campaign-action-input"
          />
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button type="button" className="campaign-action-cancel" disabled={submitting} onClick={onClose}>
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!confirmed || submitting}
              className={`campaign-action-confirm ${isDelete ? "campaign-action-confirm--delete" : ""}`}
            >
              {submitting ? <Loader2 size={17} className="animate-spin" /> : isDelete ? <Trash2 size={16} /> : <Play size={16} fill="currentColor" />}
              {submitting ? "Processando" : isDelete ? "Excluir tudo" : "Pausar campanhas"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function FooterNav({
  step,
  onBack,
  onNext,
  disabled,
}: {
  step: number;
  onBack: () => void;
  onNext: () => void;
  disabled: boolean;
}) {
  return (
    <footer className="mt-7 flex items-center justify-between">
      <button type="button" onClick={onBack} className="footer-abort">
        <ArrowLeft size={16} />
        {step === 0 ? "Abortar missão" : "Anterior"}
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={disabled}
        className="footer-next disabled:cursor-not-allowed disabled:opacity-40"
      >
        {step === 6 ? "Iniciar publicação" : "Próxima fase"}
        <ArrowRight size={17} />
      </button>
    </footer>
  );
}
function LaunchConsole({
  counts,
  budget,
  currency,
  ready,
  delay,
  accounts,
  catalog,
  pixelsByAdvertiser,
  identitiesByAdvertiser,
  onClose,
}: {
  counts: { campaigns: number; groups: number; ads: number };
  budget: number;
  currency: string;
  ready: boolean;
  delay: number;
  accounts: Choice[];
  catalog: Choice | null;
  pixelsByAdvertiser: Record<string, string>;
  identitiesByAdvertiser: Record<string, string>;
  onClose: () => void;
}) {
  type LogTone = "queue" | "info" | "warning" | "error";
  type LogEntry = { id: string; tone: LogTone; message: string };
  const [filter, setFilter] = useState<"all" | LogTone>("all");
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const createdAt = useMemo(
    () => new Date().toLocaleTimeString("pt-BR", { hour12: false }),
    [],
  );
  const perAccountOperations = counts.campaigns + counts.groups + counts.ads;
  const logs = useMemo<LogEntry[]>(() => {
    const entries: LogEntry[] = [
      {
        id: "currency",
        tone: "info",
        message: `Valores em ${currency}: ${money(budget, currency)} por grupo, sem conversão adicional.`,
      },
      {
        id: "catalog",
        tone: catalog ? "info" : "error",
        message: catalog
          ? `Catálogo: ${catalog.name} · criativo dinâmico de catálogo selecionado.`
          : "Catálogo pendente. A publicação não pode iniciar.",
      },
    ];
    for (const account of accounts) {
      const pixel = pixelsByAdvertiser[account.id];
      const identity = identitiesByAdvertiser[account.id];
      entries.push(
        {
          id: `account-${account.id}`,
          tone: "queue",
          message: `Conta ${account.name} (${account.id}) selecionada para publicação serial.`,
        },
        {
          id: `campaign-${account.id}`,
          tone: "queue",
          message: `${counts.campaigns} campanha(s) serão enviadas, uma por vez, com ${money(budget, currency)} por grupo.`,
        },
        {
          id: `assets-${account.id}`,
          tone: pixel && identity ? "info" : "error",
          message:
            pixel && identity
              ? `Ativos confirmados · Pixel ${pixel} · Identity ${identity}.`
              : "Pixel ou Identity pendente nesta conta.",
        },
        {
          id: `structure-${account.id}`,
          tone: "queue",
          message: `Após cada campanha, criar ${counts.groups} grupo(s) e ${counts.ads} anúncio(s) por grupo antes da próxima campanha.`,
        },
      );
    }
    entries.push({
      id: "sequence",
      tone: "warning",
      message:
        delay === 0
          ? "Início no TikTok: agora. A ordem de criação permanece serial por conta."
          : `Início no TikTok: daqui a ${delay} min. O envio começa agora e a ordem de criação permanece serial.`,
    });
    if (!ready) {
      entries.push({
        id: "blocked",
        tone: "error",
        message: "Publicação bloqueada: complete os itens pendentes antes de iniciar.",
      });
    }
    return entries;
  }, [accounts, budget, catalog, counts.ads, counts.campaigns, counts.groups, currency, delay, identitiesByAdvertiser, pixelsByAdvertiser, ready]);
  const visibleLogs = logs.filter((entry) => {
    const matchesFilter = filter === "all" || entry.tone === filter;
    return matchesFilter && entry.message.toLowerCase().includes(query.trim().toLowerCase());
  });
  const countFor = (tone: LogTone) => logs.filter((entry) => entry.tone === tone).length;
  const copyLogs = async () => {
    await navigator.clipboard?.writeText(
      logs.map((entry) => `[${createdAt}] ${entry.message}`).join("\n"),
    );
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };
  const exportLogs = () => {
    const file = new Blob(
      [logs.map((entry) => `[${createdAt}] ${entry.message}`).join("\n")],
      { type: "text/plain;charset=utf-8" },
    );
    const url = URL.createObjectURL(file);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "thortk-execucao-de-publicacao.txt";
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const tabs: { key: "all" | LogTone; label: string; count: number }[] = [
    { key: "all", label: "Todos", count: logs.length },
    { key: "error", label: "Erros", count: countFor("error") },
    { key: "warning", label: "Avisos", count: countFor("warning") },
    { key: "queue", label: "Na fila", count: countFor("queue") },
  ];
  return (
    <div className="modal-layer fixed inset-0 z-50 grid place-items-center bg-black/80 p-4 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-label="Execução de publicação" className="console-modal console-modal--queue">
        <div className="flex items-center justify-between gap-4 border-b border-white/[.08] px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="console-orb" />
            <div>
              <h2 className="text-lg font-black">Execução de publicação</h2>
              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[.1em] text-zinc-500">
                Publicação serial por conta
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <span className="rounded bg-[#413716] px-2 py-1 text-[10px] font-black text-[#f4da73]">
              {countFor("warning")} aviso
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar execução de publicação"
              className="rounded p-1 text-zinc-400 transition hover:bg-white/[.06] hover:text-white"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[.06] pb-3 text-xs">
            <div className="flex flex-wrap gap-1.5 text-zinc-400">
              {tabs.map((tab) => (
                <button
                  type="button"
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={`console-tab ${filter === tab.key ? "console-tab--active" : ""}`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 font-bold text-sky-300">
              <button type="button" onClick={() => void copyLogs()}>{copied ? "Copiado" : "Copiar"}</button>
              <button type="button" onClick={exportLogs}>Exportar</button>
            </div>
          </div>
          <label className="relative mt-4 block">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600"
              size={14}
            />
            <input
              className="rocket-input h-9 pl-9 text-xs"
              placeholder="Buscar nos logs..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <div className="console-log mt-3 h-[238px] space-y-2 overflow-y-auto pr-1 font-mono text-[11px] leading-5">
            {visibleLogs.map((entry) => (
              <p
                key={entry.id}
                className={
                  entry.tone === "error"
                      ? "text-red-300"
                      : entry.tone === "warning"
                        ? "text-[#f3ce62]"
                        : entry.tone === "queue"
                          ? "text-sky-300"
                          : "text-zinc-300"
                }
              >
                <span className="mr-3 opacity-60">
                  [{createdAt}]
                </span>
                <b className="mr-2">{entry.tone === "queue" ? "⌛" : entry.tone === "warning" ? "!" : entry.tone === "error" ? "×" : "·"}</b>
                {entry.message}
              </p>
            ))}
            {!visibleLogs.length && <p className="py-10 text-center text-zinc-500">Nenhum log encontrado.</p>}
          </div>
          <div className="mt-4 border-t border-white/[.08] pt-4">
            <p className="text-sm font-black">
              Resumo: <span className="text-sky-300">{accounts.length * perAccountOperations} operações planejadas</span> · {" "}
              <span className={ready ? "text-[#f3ce62]" : "text-red-300"}>
                {ready ? "Envio serial pronto para iniciar" : "publicação bloqueada"}
              </span>
            </p>
            <p className="mt-2 text-[10px] leading-4 text-zinc-500">
              A publicação nunca deve abrir tarefas em paralelo: campanha → grupos → anúncios, depois a próxima campanha e a próxima conta.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {accounts.map((account) => (
                <a
                  key={account.id}
                  href={advertiserUrl(account.id)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-w-0 items-center justify-between rounded-md border border-sky-300/20 bg-[#162334] px-3 py-2 text-xs font-bold text-sky-300 hover:border-sky-300/50"
                >
                  <span className="truncate">{account.name}</span>
                  <ExternalLink size={14} />
                </a>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-center border-t border-white/[.08] px-5 py-4">
          <button type="button" onClick={onClose} className="console-close">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
