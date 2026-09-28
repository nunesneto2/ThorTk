import fs from "node:fs";

const path = "src/app/page.tsx";
let source = fs.readFileSync(path, "utf8");

function replaceOnce(search, replacement, label) {
  if (!source.includes(search)) {
    throw new Error(`Patch point not found: ${label}`);
  }
  source = source.replace(search, replacement);
}

replaceOnce(
`  type?: string;\n  selected?: boolean;\n};`,
`  type?: string;\n  businessCenterId?: string;\n  selected?: boolean;\n};`,
"Choice.businessCenterId",
);

replaceOnce(
`  const [catalogs, setCatalogs] = useState<Choice[]>([]);\n  const [bcId, setBcId] = useState(\"\");\n  const [advertiserId, setAdvertiserId] = useState(\"\");\n  const [catalogId, setCatalogId] = useState(\"\");`,
`  const [catalogs, setCatalogs] = useState<Choice[]>([]);\n  const [catalogByBusinessCenter, setCatalogByBusinessCenter] = useState<Record<string, string>>({});\n  const [bcId, setBcId] = useState(\"\");\n  const [advertiserId, setAdvertiserId] = useState(\"\");`,
"catalog state",
);

replaceOnce(
`  const selectedCatalog =\n    catalogs.find((item) => item.id === catalogId) ?? null;\n  const selectedLaunchAdvertisers = overview.advertisers.filter((item) =>\n    selectedAdvertiserIds.includes(item.id),\n  );`,
`  const selectedLaunchAdvertisers = overview.advertisers.filter((item) =>\n    selectedAdvertiserIds.includes(item.id),\n  );\n  const selectedBusinessCenterIds = Array.from(\n    new Set(\n      selectedLaunchAdvertisers\n        .map((item) => item.businessCenterId)\n        .filter((id): id is string => Boolean(id)),\n    ),\n  );\n  const selectedAccountsMissingBusinessCenter = selectedLaunchAdvertisers.filter(\n    (item) => !item.businessCenterId,\n  );\n  const selectedCatalogs = selectedBusinessCenterIds\n    .map((businessCenterId) =>\n      catalogs.find(\n        (item) =>\n          item.businessCenterId === businessCenterId &&\n          item.id === catalogByBusinessCenter[businessCenterId],\n      ),\n    )\n    .filter((item): item is Choice => Boolean(item));\n  const catalogsReady =\n    selectedLaunchAdvertisers.length > 0 &&\n    selectedAccountsMissingBusinessCenter.length === 0 &&\n    selectedBusinessCenterIds.every((id) =>\n      Boolean(catalogByBusinessCenter[id]),\n    );`,
"selected catalog mapping",
);

replaceOnce(
`  const ready = Boolean(\n    bcId &&\n      selectedLaunchAdvertisers.length &&\n      selectedAccountsOperational &&\n      catalogId &&\n      selectedAccountsHaveAssets &&`,
`  const ready = Boolean(\n    selectedLaunchAdvertisers.length &&\n      selectedAccountsOperational &&\n      catalogsReady &&\n      selectedAccountsHaveAssets &&`,
"ready catalog validation",
);

replaceOnce(
`      const response = await fetch(\"/api/tiktok/launch\", {\n        method: \"POST\",\n        headers: { \"content-type\": \"application/json\" },\n        signal: controller.signal,\n        body: JSON.stringify({\n          advertiser_ids: selectedAdvertiserIds,\n          business_center_id: bcId,\n          catalog_id: catalogId,`,
`      const advertisersByBusinessCenter = new Map<string, string[]>();\n      for (const advertiser of selectedLaunchAdvertisers) {\n        const businessCenterId = advertiser.businessCenterId;\n        if (!businessCenterId) {\n          throw new Error(\`A conta \${advertiser.id} não retornou o Business Center proprietário. Atualize os ativos antes de publicar.\`);\n        }\n        const current = advertisersByBusinessCenter.get(businessCenterId) ?? [];\n        current.push(advertiser.id);\n        advertisersByBusinessCenter.set(businessCenterId, current);\n      }\n\n      const campaignCount = Math.max(1, Number(campaigns) || 1);\n      const groupCount = Math.max(1, Number(groups) || 1);\n      const adCount = Math.max(1, Number(ads) || 1);\n      const operationsPerAccount = campaignCount * (1 + groupCount + groupCount * adCount + 1);\n      const totalOperations = selectedAdvertiserIds.length * operationsPerAccount;\n      let completedOffset = 0;\n      let createdTotals = { campaigns: 0, adgroups: 0, ads: 0 };\n\n      const launchBusinessCenter = async (businessCenterId: string, advertiserIds: string[]) => {\n        const catalogId = catalogByBusinessCenter[businessCenterId];\n        if (!catalogId) {\n          throw new Error(\`Selecione um catálogo para a Business Center \${businessCenterId}.\`);\n        }\n        const response = await fetch(\"/api/tiktok/launch\", {\n        method: \"POST\",\n        headers: { \"content-type\": \"application/json\" },\n        signal: controller.signal,\n        body: JSON.stringify({\n          advertiser_ids: advertiserIds,\n          business_center_id: businessCenterId,\n          catalog_id: catalogId,`,
"launch request per BC",
);

replaceOnce(
`          campaigns: Math.max(1, Number(campaigns) || 1),\n          adgroups_per_campaign: Math.max(1, Number(groups) || 1),\n          ads_per_adgroup: Math.max(1, Number(ads) || 1),`,
`          campaigns: campaignCount,\n          adgroups_per_campaign: groupCount,\n          ads_per_adgroup: adCount,`,
"launch counts",
);

replaceOnce(
`      const reader = response.body.getReader();\n      const decoder = new TextDecoder();\n      let buffer = \"\";\n      let terminal = false;\n      const applyEvent = (event: string, raw: string) => {`,
`      const reader = response.body.getReader();\n      const decoder = new TextDecoder();\n      let buffer = \"\";\n      let terminal = false;\n      let requestError = \"\";\n      const applyEvent = (event: string, raw: string) => {`,
"launch stream request state",
);

replaceOnce(
`        if (event === \"progress\") {\n          liveExecution = {\n            ...liveExecution,\n            created: payload.created,\n            progress: { current: payload.current ?? 0, total: payload.total ?? 0 },\n          };`,
`        if (event === \"progress\") {\n          const requestCreated = payload.created ?? { campaigns: 0, adgroups: 0, ads: 0 };\n          liveExecution = {\n            ...liveExecution,\n            created: {\n              campaigns: createdTotals.campaigns + requestCreated.campaigns,\n              adgroups: createdTotals.adgroups + requestCreated.adgroups,\n              ads: createdTotals.ads + requestCreated.ads,\n            },\n            progress: {\n              current: completedOffset + (payload.current ?? 0),\n              total: totalOperations,\n            },\n          };`,
"aggregate progress",
);

replaceOnce(
`        if (event === \"completed\") {\n          terminal = true;\n          liveExecution = {\n            ...liveExecution,\n            status: \"completed\",\n            created: payload.created,\n            start_time: payload.start_time,\n          };\n          setLaunchExecution(liveExecution);\n          setNotice({\n            tone: \"success\",\n            text: \`\${payload.created?.campaigns ?? 0} campanha(s), \${payload.created?.adgroups ?? 0} grupo(s) e \${payload.created?.ads ?? 0} anúncio(s) confirmados pelo TikTok.\`,\n          });\n          return;\n        }\n        if (event === \"failed\") {\n          terminal = true;\n          liveExecution = {\n            ...liveExecution,\n            status: \"failed\",\n            created: payload.created,\n            error: payload.error || \"O TikTok não confirmou a publicação.\",\n          };\n          setLaunchExecution(liveExecution);\n          setNotice({ tone: \"error\", text: liveExecution.error ?? \"O TikTok não confirmou a publicação.\" });\n        }`,
`        if (event === \"completed\") {\n          terminal = true;\n          const requestCreated = payload.created ?? { campaigns: 0, adgroups: 0, ads: 0 };\n          createdTotals = {\n            campaigns: createdTotals.campaigns + requestCreated.campaigns,\n            adgroups: createdTotals.adgroups + requestCreated.adgroups,\n            ads: createdTotals.ads + requestCreated.ads,\n          };\n          completedOffset += advertiserIds.length * operationsPerAccount;\n          liveExecution = {\n            ...liveExecution,\n            status: \"running\",\n            created: createdTotals,\n            progress: { current: completedOffset, total: totalOperations },\n            start_time: payload.start_time ?? liveExecution.start_time,\n          };\n          setLaunchExecution(liveExecution);\n          return;\n        }\n        if (event === \"failed\") {\n          terminal = true;\n          requestError = payload.error || \"O TikTok não confirmou a publicação.\";\n        }`,
"aggregate completion",
);

replaceOnce(
`      if (!terminal) throw new Error(\"A conexão terminou antes do TikTok confirmar o resultado da publicação.\");\n      if (liveExecution.status === \"completed\") await loadApiCampaigns(selectedAdvertiserIds);`,
`      if (!terminal) throw new Error(\"A conexão terminou antes do TikTok confirmar o resultado da publicação.\");\n      if (requestError) throw new Error(requestError);\n      };\n\n      for (const [businessCenterId, advertiserIds] of advertisersByBusinessCenter) {\n        assertLaunchActive: {\n          if (controller.signal.aborted) break assertLaunchActive;\n          await launchBusinessCenter(businessCenterId, advertiserIds);\n        }\n      }\n      if (controller.signal.aborted) throw new DOMException(\"Aborted\", \"AbortError\");\n      liveExecution = {\n        ...liveExecution,\n        status: \"completed\",\n        created: createdTotals,\n        progress: { current: totalOperations, total: totalOperations },\n      };\n      setLaunchExecution(liveExecution);\n      setNotice({\n        tone: \"success\",\n        text: \`\${createdTotals.campaigns} campanha(s), \${createdTotals.adgroups} grupo(s) e \${createdTotals.ads} anúncio(s) confirmados pelo TikTok em \${advertisersByBusinessCenter.size} Business Center(s).\`,\n      });\n      await loadApiCampaigns(selectedAdvertiserIds);`,
"finish multi BC launch",
);

replaceOnce(
`  }, [adText, ads, ages, allowComments, allowVideoDownloads, bcId, budget, campaignName, campaigns, catalogId, clickWindow, counting, country, cpa, cpaBidAmount, cta, groups, identityByAdvertiser, language, launchDelay, launchSubmitting, loadApiCampaigns, operatingSystem, pixelByAdvertiser, ready, selectedAdvertiserIds, viewWindow]);`,
`  }, [adText, ads, ages, allowComments, allowVideoDownloads, budget, campaignName, campaigns, catalogByBusinessCenter, clickWindow, counting, country, cpa, cpaBidAmount, cta, groups, identityByAdvertiser, language, launchDelay, launchSubmitting, loadApiCampaigns, operatingSystem, pixelByAdvertiser, ready, selectedAdvertiserIds, selectedLaunchAdvertisers, viewWindow]);`,
"launch dependencies",
);

replaceOnce(
`        setCatalogId(\"\");\n        setAdvertiserId(`,
`        setCatalogByBusinessCenter((current) => {\n          const selectedIds = new Set(\n            payload.businessCenters.filter((item) => item.selected).map((item) => item.id),\n          );\n          return Object.fromEntries(\n            Object.entries(current).filter(([id]) => selectedIds.has(id)),\n          );\n        });\n        setAdvertiserId(`,
"overview catalog map prune",
);

replaceOnce(
`        if (selected) {\n          setBcId(id);\n          setCatalogId(\"\");\n        } else if (bcId === id) {\n          setBcId(nextSelected[0]?.id ?? \"\");\n          setCatalogId(\"\");\n        }`,
`        if (selected) {\n          setBcId(id);\n        } else {\n          setCatalogByBusinessCenter((current) => {\n            const next = { ...current };\n            delete next[id];\n            return next;\n          });\n          if (bcId === id) setBcId(nextSelected[0]?.id ?? \"\");\n        }`,
"toggle BC catalog map",
);

replaceOnce(
`  const loadCatalogs = useCallback(\n    async (id: string) => {\n      if (!id || !overview.connected) return;\n      setLoading(\"catalogs\");\n      try {\n        const response = await fetch(\n          \`/api/tiktok/assets?scope=catalogs&bc_id=\${encodeURIComponent(id)}\`,\n          { cache: \"no-store\" },\n        );\n        const payload = (await response.json()) as {\n          catalogs?: Choice[];\n          error?: string;\n        };\n        if (!response.ok)\n          throw new Error(\n            payload.error || \"Não foi possível carregar os catálogos.\",\n          );\n        const list = payload.catalogs ?? [];\n        setCatalogs(list);\n        setCatalogId((current) => current || list[0]?.id || \"\");\n      } catch (error) {\n        setCatalogs([]);\n        setNotice({\n          tone: \"warning\",\n          text:\n            error instanceof Error\n              ? error.message\n              : \"O TikTok não retornou catálogos.\",\n        });\n      } finally {\n        setLoading(null);\n      }\n    },\n    [overview.connected],\n  );`,
`  const loadCatalogs = useCallback(async () => {\n    if (!overview.connected) return;\n    const centers = overview.businessCenters.filter((item) => item.selected);\n    if (!centers.length) {\n      setCatalogs([]);\n      setCatalogByBusinessCenter({});\n      return;\n    }\n    setLoading(\"catalogs\");\n    try {\n      const results = await Promise.all(\n        centers.map(async (center) => {\n          try {\n            const response = await fetch(\n              \`/api/tiktok/assets?scope=catalogs&bc_id=\${encodeURIComponent(center.id)}\`,\n              { cache: \"no-store\" },\n            );\n            const payload = (await response.json()) as {\n              catalogs?: Choice[];\n              error?: string;\n            };\n            if (!response.ok) throw new Error(payload.error || \"Falha ao carregar catálogos.\");\n            return {\n              center,\n              catalogs: (payload.catalogs ?? []).map((catalog) => ({\n                ...catalog,\n                businessCenterId: catalog.businessCenterId || center.id,\n              })),\n              error: \"\",\n            };\n          } catch (error) {\n            return {\n              center,\n              catalogs: [] as Choice[],\n              error: error instanceof Error ? error.message : \"Falha ao carregar catálogos.\",\n            };\n          }\n        }),\n      );\n      const list = results.flatMap((result) => result.catalogs);\n      setCatalogs(list);\n      setCatalogByBusinessCenter((current) => {\n        const next: Record<string, string> = {};\n        for (const center of centers) {\n          const options = list.filter((item) => item.businessCenterId === center.id);\n          const currentId = current[center.id];\n          next[center.id] = options.some((item) => item.id === currentId)\n            ? currentId\n            : options[0]?.id || \"\";\n        }\n        return next;\n      });\n      const failures = results.filter((result) => result.error);\n      if (failures.length) {\n        setNotice({\n          tone: \"warning\",\n          text: \`\${failures.length} Business Center(s) não retornaram catálogos. As demais foram carregadas normalmente.\`,\n        });\n      }\n    } finally {\n      setLoading(null);\n    }\n  }, [overview.businessCenters, overview.connected]);`,
"load catalogs for all BCs",
);

replaceOnce(
`  useEffect(() => {\n    if (step !== 2 || !bcId) return;\n    const timer = window.setTimeout(() => void loadCatalogs(bcId), 0);\n    return () => window.clearTimeout(timer);\n  }, [bcId, loadCatalogs, step]);`,
`  useEffect(() => {\n    if (step !== 2 || !overview.connected) return;\n    const timer = window.setTimeout(() => void loadCatalogs(), 0);\n    return () => window.clearTimeout(timer);\n  }, [loadCatalogs, overview.connected, step]);`,
"catalog load effect",
);

replaceOnce(
`              onSelectBc={(id) => {\n                setBcId(id);\n                setCatalogId(\"\");\n              }}`,
`              onSelectBc={setBcId}`,
"connect BC selection",
);

replaceOnce(
`          {step === 2 && (\n            <CatalogScreen\n              catalogs={catalogs}\n              selectedId={catalogId}\n              mode={catalogMode}\n              loading={loading === \"catalogs\"}\n              onRefresh={() => void loadCatalogs(bcId)}\n              onSelect={setCatalogId}\n              onMode={setCatalogMode}\n            />\n          )}`,
`          {step === 2 && (\n            <CatalogScreen\n              businessCenters={connectedBusinessCenters}\n              catalogs={catalogs}\n              selectedByBusinessCenter={catalogByBusinessCenter}\n              requiredBusinessCenterIds={selectedBusinessCenterIds}\n              mode={catalogMode}\n              loading={loading === \"catalogs\"}\n              onRefresh={() => void loadCatalogs()}\n              onSelect={(businessCenterId, catalogId) =>\n                setCatalogByBusinessCenter((current) => ({\n                  ...current,\n                  [businessCenterId]: catalogId,\n                }))\n              }\n              onMode={setCatalogMode}\n            />\n          )}`,
"CatalogScreen call",
);

replaceOnce(
`              bc={selectedBc}\n              catalog={selectedCatalog}\n              counts={counts}`, 
`              catalogSummary={\n                catalogsReady\n                  ? \`\${selectedCatalogs.length} catálogo(s) em \${selectedBusinessCenterIds.length} Business Center(s)\`\n                  : \"Selecione um catálogo para cada BC das contas escolhidas.\"\n              }\n              catalogsReady={catalogsReady}\n              counts={counts}`,
"LaunchScreen catalog props",
);

replaceOnce(
`              catalogCreativeReady={Boolean(catalogId)}`, 
`              catalogCreativeReady={catalogsReady}`,
"launch catalog creative readiness",
);

const catalogStart = source.indexOf("function CatalogScreen({");
const catalogEnd = source.indexOf("function SelectMode({", catalogStart);
if (catalogStart < 0 || catalogEnd < 0) throw new Error("CatalogScreen block not found");
const catalogReplacement = `function CatalogScreen({\n  businessCenters,\n  catalogs,\n  selectedByBusinessCenter,\n  requiredBusinessCenterIds,\n  mode,\n  loading,\n  onRefresh,\n  onSelect,\n  onMode,\n}: {\n  businessCenters: Choice[];\n  catalogs: Choice[];\n  selectedByBusinessCenter: Record<string, string>;\n  requiredBusinessCenterIds: string[];\n  mode: CatalogMode;\n  loading: boolean;\n  onRefresh: () => void;\n  onSelect: (businessCenterId: string, catalogId: string) => void;\n  onMode: (mode: CatalogMode) => void;\n}) {\n  return (\n    <div className=\"mx-auto max-w-[920px] pt-4\">\n      <div className=\"flex items-center justify-between gap-4\">\n        <div>\n          <p className=\"section-label\">Catálogos por Business Center</p>\n          <p className=\"mt-1 text-xs text-zinc-500\">\n            Cada conta usará somente o catálogo da sua própria BC.\n          </p>\n        </div>\n        <button type=\"button\" onClick={onRefresh} className=\"rocket-dark-button min-h-9 px-3 text-[11px]\">\n          <RefreshCw className={loading ? \"animate-spin\" : \"\"} size={14} />\n          Atualizar\n        </button>\n      </div>\n      <div className=\"mt-4 space-y-3\">\n        {loading ? (\n          <div className=\"py-10 text-center text-sm text-zinc-500\">\n            <Loader2 className=\"mx-auto mb-3 animate-spin text-[#d8b56b]\" size={20} />\n            Carregando catálogos de todas as BCs conectadas…\n          </div>\n        ) : businessCenters.length ? (\n          businessCenters.map((center) => {\n            const options = catalogs.filter((item) => item.businessCenterId === center.id);\n            const selectedId = selectedByBusinessCenter[center.id] || \"\";\n            const required = requiredBusinessCenterIds.includes(center.id);\n            return (\n              <section key={center.id} className=\"rounded-xl border border-white/[.08] bg-[#10151b]/90 p-3\">\n                <div className=\"flex flex-wrap items-center justify-between gap-2 border-b border-white/[.06] pb-3\">\n                  <div className=\"min-w-0\">\n                    <b className=\"block truncate text-sm text-zinc-100\">{center.name}</b>\n                    <small className=\"mt-1 block text-[10px] text-zinc-500\">BC ID: {center.id}</small>\n                  </div>\n                  <span className={\`rounded px-2 py-1 text-[9px] font-black uppercase \${required ? \"bg-sky-400/15 text-sky-200\" : \"bg-white/[.05] text-zinc-500\"}\`}>\n                    {required ? \"Em uso pelas contas\" : \"BC conectada\"}\n                  </span>\n                </div>\n                {options.length ? (\n                  <div className=\"mt-3 grid gap-2 sm:grid-cols-2\">\n                    {options.map((item) => (\n                      <button\n                        key={item.id}\n                        type=\"button\"\n                        onClick={() => onSelect(center.id, item.id)}\n                        aria-pressed={item.id === selectedId}\n                        className={\`catalog-card catalog-card--compact text-left \${item.id === selectedId ? \"catalog-selected\" : \"\"}\`}\n                      >\n                        <span className=\"grid h-9 w-9 place-items-center rounded-lg bg-white/[.06] text-[#d8b56b]\"><Database size={17} /></span>\n                        <span className=\"min-w-0 flex-1\">\n                          <b className=\"block truncate text-sm\">{item.name}</b>\n                          <small className=\"mt-1 block truncate text-[10px] text-zinc-500\">ID: {item.id} · {item.currency || \"Moeda da conta\"}</small>\n                        </span>\n                        {item.id === selectedId && <CircleCheck size={17} className=\"text-sky-300\" />}\n                      </button>\n                    ))}\n                  </div>\n                ) : (\n                  <div className=\"mt-3 rounded-lg border border-dashed border-white/[.1] px-4 py-5 text-center text-xs text-zinc-500\">\n                    Nenhum catálogo retornado para esta Business Center.\n                  </div>\n                )}\n              </section>\n            );\n          })\n        ) : (\n          <div className=\"rounded-xl border border-dashed border-white/[.12] px-5 py-8 text-center text-sm text-zinc-500\">\n            Conecte ao menos uma Business Center para carregar catálogos.\n          </div>\n        )}\n      </div>\n      <section className=\"mt-4 rounded-xl border border-white/[.08] bg-[#11161c]/80 p-3\">\n        <div className=\"flex items-center justify-between gap-3\">\n          <div>\n            <p className=\"section-label\">Alcance do catálogo</p>\n            <p className=\"mt-1 text-[10px] text-zinc-500\">Defina quais produtos entram na campanha.</p>\n          </div>\n          <span className=\"rounded bg-white/[.05] px-2 py-1 text-[10px] font-bold text-zinc-400\">{catalogs.length} catálogo(s)</span>\n        </div>\n        <div className=\"mt-3 grid gap-2 sm:grid-cols-2\">\n          <SelectMode icon={<Layers3 size={18} />} title=\"Selecionar Sets\" text=\"Grupos específicos.\" active={mode === \"SETS\"} onClick={() => onMode(\"SETS\")} />\n          <SelectMode icon={<Database size={18} />} title=\"Todos os Produtos\" text=\"Todo o catálogo.\" active={mode === \"ALL\"} onClick={() => onMode(\"ALL\")} />\n        </div>\n      </section>\n      {mode === \"SETS\" && (\n        <div className=\"mt-3 rounded-lg border border-sky-300/20 bg-sky-300/[.05] px-4 py-3 text-xs text-sky-100\">\n          A seleção de Product Sets será habilitada quando a API retornar os sets deste catálogo.\n        </div>\n      )}\n    </div>\n  );\n}\n`;
source = source.slice(0, catalogStart) + catalogReplacement + source.slice(catalogEnd);

replaceOnce(
`function LaunchScreen({\n  ready,\n  name,\n  bc,\n  catalog,`,
`function LaunchScreen({\n  ready,\n  name,\n  catalogSummary,\n  catalogsReady,`,
"LaunchScreen params",
);

replaceOnce(
`  ready: boolean;\n  name: string;\n  bc: Choice | null;\n  catalog: Choice | null;`,
`  ready: boolean;\n  name: string;\n  catalogSummary: string;\n  catalogsReady: boolean;`,
"LaunchScreen types",
);

replaceOnce(
`      label: \"Catálogo definido\",\n      detail: catalog?.name ?? \"Escolha o catálogo da Business Center.\",\n      complete: Boolean(bc && catalog),`,
`      label: \"Catálogos por Business Center\",\n      detail: catalogSummary,\n      complete: catalogsReady,`,
"LaunchScreen catalog check",
);

fs.writeFileSync(path, source);
console.log("Applied per-Business-Center catalog patch to", path);
