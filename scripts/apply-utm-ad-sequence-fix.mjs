import fs from "node:fs";

const path = "src/app/api/tiktok/launch/route.ts";
let source = fs.readFileSync(path, "utf8");

if (source.includes('{ key: "utm_term", value: "__AID_NAME__" }') && source.includes('const globalAdNumber = groupIndex * adCount + adIndex + 1;')) {
  console.log("UTM/ad sequence fix already applied to", path);
  process.exit(0);
}

function replaceOnce(search, replacement, label) {
  if (!source.includes(search)) throw new Error(`Patch point not found: ${label}`);
  source = source.replace(search, replacement);
}

replaceOnce(
`                  { key: "utm_campaign", value: "__CAMPAIGN_NAME__" },\n                  { key: "tt_campaign_id", value: "__CAMPAIGN_ID__" },\n                  { key: "tt_adgroup", value: "__AID_NAME__" },`,
`                  { key: "utm_campaign", value: "__CAMPAIGN_NAME__" },\n                  { key: "utm_term", value: "__AID_NAME__" },\n                  { key: "tt_campaign_id", value: "__CAMPAIGN_ID__" },\n                  { key: "tt_adgroup", value: "__AID_NAME__" },`,
"standard adgroup UTM",
);

replaceOnce(
`          for (let adIndex = 0; adIndex < adCount; adIndex += 1) {\n            assertLaunchActive();`,
`          for (let adIndex = 0; adIndex < adCount; adIndex += 1) {\n            assertLaunchActive();\n            const globalAdNumber = groupIndex * adCount + adIndex + 1;`,
"global ad sequence",
);

replaceOnce(
`                ad_name: \`\${campaignName}-Ad\${adIndex + 1}\`,`,
`                ad_name: \`\${campaignName}-Ad\${globalAdNumber}\`,`,
"sequential ad name",
);

fs.writeFileSync(path, source);
console.log("Applied UTM/ad sequence fix to", path);
