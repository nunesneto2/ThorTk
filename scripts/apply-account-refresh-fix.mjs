import fs from "node:fs";

const path = "src/app/page.tsx";
let source = fs.readFileSync(path, "utf8");

if (source.includes("onRefreshAccounts={refreshAccounts}")) {
  console.log("Account refresh patch already applied to", path);
  process.exit(0);
}

function replaceOnce(search, replacement, label) {
  if (!source.includes(search)) {
    throw new Error(`Patch point not found: ${label}`);
  }
  source = source.replace(search, replacement);
}

replaceOnce(
`    .filter(\n      (item) =>\n        accountFilter === "ALL" ||\n        (accountFilter === "ACTIVE" && isOperationalAdvertiser(item)) ||\n        (accountFilter === "SUSPENDED" && isSuspendedAdvertiser(item)) ||\n        (accountFilter === "SELECTED" &&\n          selectedAdvertiserIds.includes(item.id)),\n    );\n  const loadOverview = useCallback(async () => {`,
`    .filter(\n      (item) =>\n        accountFilter === "ALL" ||\n        (accountFilter === "ACTIVE" && isOperationalAdvertiser(item)) ||\n        (accountFilter === "SUSPENDED" && isSuspendedAdvertiser(item)) ||\n        (accountFilter === "SELECTED" &&\n          selectedAdvertiserIds.includes(item.id)),\n    );\n  const refreshAccounts = useCallback(async () => {\n    setLoading("overview");\n    try {\n      const response = await fetch("/api/tiktok/assets?scope=overview", {\n        cache: "no-store",\n      });\n      const payload = (await response.json().catch(() => null)) as\n        | (Overview & { error?: string })\n        | null;\n      if (!response.ok || !payload) {\n        throw new Error(payload?.error || "Não foi possível atualizar as contas do TikTok.");\n      }\n      setOverview(payload);\n      setSelectedAdvertiserIds((current) =>\n        current.filter((id) => payload.advertisers.some((item) => item.id === id)),\n      );\n      setAdvertiserId((current) =>\n        payload.advertisers.some((item) => item.id === current)\n          ? current\n          : payload.advertisers[0]?.id || "",\n      );\n      setAssetDetailsByAdvertiser((current) =>\n        Object.fromEntries(\n          Object.entries(current).filter(([id]) =>\n            payload.advertisers.some((item) => item.id === id),\n          ),\n        ),\n      );\n      setNotice({\n        tone: "success",\n        text: payload.advertisers.length + " conta(s) atualizada(s) diretamente do TikTok. Nomes e status foram sincronizados.",\n      });\n    } catch (error) {\n      setNotice({\n        tone: "error",\n        text:\n          error instanceof Error\n            ? error.message\n            : "Não foi possível atualizar as contas do TikTok.",\n      });\n    } finally {\n      setLoading(null);\n    }\n  }, []);\n  const loadOverview = useCallback(async () => {`,
"refresh accounts callback",
);

replaceOnce(
`              identitiesByAdvertiser={identityByAdvertiser}\n              loading={loading === "assets"}\n              onToggleAccount=`,
`              identitiesByAdvertiser={identityByAdvertiser}\n              loading={loading === "assets"}\n              refreshing={loading === "overview"}\n              onRefreshAccounts={refreshAccounts}\n              onToggleAccount=`,
"AccountsScreen refresh props",
);

replaceOnce(
`  identitiesByAdvertiser,\n  loading,\n  onToggleAccount,`,
`  identitiesByAdvertiser,\n  loading,\n  refreshing,\n  onRefreshAccounts,\n  onToggleAccount,`,
"AccountsScreen refresh destructuring",
);

replaceOnce(
`  identitiesByAdvertiser: Record<string, string>;\n  loading: boolean;\n  onToggleAccount: (id: string) => void;`,
`  identitiesByAdvertiser: Record<string, string>;\n  loading: boolean;\n  refreshing: boolean;\n  onRefreshAccounts: () => void;\n  onToggleAccount: (id: string) => void;`,
"AccountsScreen refresh types",
);

replaceOnce(
`        </label>\n        <div className="flex flex-wrap gap-2">\n          {filters.map((item) => (`,
`        </label>\n        <button\n          type="button"\n          onClick={onRefreshAccounts}\n          disabled={refreshing}\n          className="rocket-dark-button min-h-[48px] shrink-0 px-4 text-[11px] font-black text-sky-300 disabled:cursor-wait disabled:opacity-60"\n          title="Consultar novamente o TikTok e sincronizar nomes e status das contas"\n        >\n          <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />\n          {refreshing ? "Atualizando…" : "Atualizar contas"}\n        </button>\n        <div className="flex flex-wrap gap-2">\n          {filters.map((item) => (`,
"AccountsScreen refresh button",
);

fs.writeFileSync(path, source);
console.log("Applied account refresh patch to", path);
