import fs from "node:fs";

const path = "src/app/api/tiktok/launch/route.ts";
let source = fs.readFileSync(path, "utf8");

if (source.includes('const groupLabel = `${campaignName}-g${String(groupIndex + 1).padStart(2, "0")}`;')) {
  console.log("Compact campaign naming already applied to", path);
  process.exit(0);
}

function replaceOnce(search, replacement, label) {
  if (!source.includes(search)) throw new Error(`Patch point not found: ${label}`);
  source = source.replace(search, replacement);
}

replaceOnce(
`function uniqueCampaignName(baseName: string, existingNames: Set<string>) {\n  if (!existingNames.has(baseName)) {\n    existingNames.add(baseName);\n    return baseName;\n  }\n\n  for (let attempt = 0; attempt < 900; attempt += 1) {\n    const candidate = \`${"${baseName}"} \${randomInt(100, 1000)}\`;\n    if (!existingNames.has(candidate)) {\n      existingNames.add(candidate);\n      return candidate;\n    }\n  }\n  throw new Error(\`Não foi possível gerar um nome único para a campanha “\${baseName}”.\`);\n}`,
`function uniqueCampaignName(baseName: string, existingNames: Set<string>) {\n  if (!existingNames.has(baseName)) {\n    existingNames.add(baseName);\n    return baseName;\n  }\n\n  const sequential = baseName.match(/^(.*)-(\\d+)$/);\n  if (sequential) {\n    const root = sequential[1];\n    const start = Number(sequential[2]) + 1;\n    for (let number = start; number < start + 9999; number += 1) {\n      const candidate = \`\${root}-\${String(number).padStart(2, \"0\")}\`;\n      if (!existingNames.has(candidate)) {\n        existingNames.add(candidate);\n        return candidate;\n      }\n    }\n  }\n\n  for (let attempt = 0; attempt < 900; attempt += 1) {\n    const candidate = \`\${baseName}-\${randomInt(100, 1000)}\`;\n    if (!existingNames.has(candidate)) {\n      existingNames.add(candidate);\n      return candidate;\n    }\n  }\n  throw new Error(\`Não foi possível gerar um nome único para a campanha “\${baseName}”.\`);\n}`,
"unique campaign naming",
);

replaceOnce(
`        const suffix = campaignCount > 1 ? \` \${String(campaignIndex + 1).padStart(2, \"0\")}\` : \"\";\n        const requestedCampaignLabel = \`\${campaignName}\${suffix}\`;`,
`        const suffix = \`-\${String(campaignIndex + 1).padStart(2, \"0\")}\`;\n        const requestedCampaignLabel = \`\${campaignName}\${suffix}\`;`,
"campaign suffix",
);

replaceOnce(
`          const groupLabel = \`\${campaignLabel} · Grupo \${String(groupIndex + 1).padStart(2, \"0\")}\`;`,
`          const groupLabel = \`\${campaignName}-g\${String(groupIndex + 1).padStart(2, \"0\")}\`;`,
"ad group name",
);

replaceOnce(
`                ad_name: \`\${campaignLabel} · Anúncio \${String(adIndex + 1).padStart(2, \"0\")}\`,`,
`                ad_name: \`\${campaignName}-Ad\${adIndex + 1}\`,`,
"ad name",
);

fs.writeFileSync(path, source);
console.log("Applied compact campaign naming to", path);
