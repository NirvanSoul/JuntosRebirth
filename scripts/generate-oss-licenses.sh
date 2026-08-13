#!/bin/sh
# Regenera src/features/legal/content/openSourceLicenses.json a partir de las
# dependencias de producción instaladas. Ejecutar tras cambiar dependencias
# antes de un release.
set -e

cd "$(dirname "$0")/.."

TMP_FILE="$(mktemp)"
npx --yes license-checker --production --json --excludePrivatePackages > "$TMP_FILE"

node -e '
const raw = require(process.argv[1]);
const entries = Object.entries(raw).map(([key, value]) => {
  const lastAt = key.lastIndexOf("@");
  const name = lastAt > 0 ? key.slice(0, lastAt) : key;
  const version = lastAt > 0 ? key.slice(lastAt + 1) : "";
  const licenseValue = value.licenses;
  const license = Array.isArray(licenseValue)
    ? licenseValue.join(" OR ")
    : (licenseValue || "LEGAL_REVIEW_REQUIRED");
  return { name, version, license, repository: value.repository || null };
}).sort((a, b) => a.name.localeCompare(b.name));
require("fs").writeFileSync(
  process.argv[2],
  JSON.stringify(entries, null, 2) + "\n",
);
' "$TMP_FILE" "src/features/legal/content/openSourceLicenses.json"

rm -f "$TMP_FILE"
echo "Actualizado src/features/legal/content/openSourceLicenses.json"
