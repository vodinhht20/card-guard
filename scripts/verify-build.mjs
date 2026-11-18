import { readFile, access } from "node:fs/promises";
const manifest = JSON.parse(await readFile("dist/manifest.json", "utf8"));
for (const path of [
  manifest.background.service_worker,
  manifest.action.default_popup,
  manifest.side_panel.default_path,
  "content.js",
  "privacy.html",
  ...Object.values(manifest.icons),
  "_locales/en/messages.json",
  "_locales/vi/messages.json",
])
  await access(`dist/${path}`);
const content = await readFile("dist/content.js", "utf8");
if (/^import\s/m.test(content))
  throw new Error("Content script must be self-contained");
if (
  manifest.manifest_version !== 3 ||
  manifest.host_permissions ||
  manifest.content_scripts ||
  manifest.externally_connectable
)
  throw new Error("Unexpected manifest exposure");
if (
  !manifest.content_security_policy.extension_pages.includes(
    "connect-src 'none'",
  )
)
  throw new Error("Network CSP missing");
console.log(
  "MV3 package verified: entry points, isolated content bundle, CSP, optional hosts.",
);

for (const size of [16, 32, 48, 128]) {
  const data = await readFile(`dist/icon${size}.png`);
  if (data.readUInt32BE(16) !== size || data.readUInt32BE(20) !== size)
    throw new Error("Icon dimensions mismatch");
}
