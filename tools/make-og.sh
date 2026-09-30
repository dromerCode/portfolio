#!/usr/bin/env bash
# Regenera site/assets/img/og.png (1200x630) a partir de tools/og.html con playwright-cli.
set -euo pipefail
cd "$(dirname "$0")/.."

python3 -m http.server 8765 >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER' EXIT
sleep 1

playwright-cli -s=og open "http://localhost:8765/tools/og.html" >/dev/null
playwright-cli -s=og run-code "async page => { await page.setViewportSize({ width: 1200, height: 630 }); await page.waitForTimeout(500); await page.screenshot({ path: 'site/assets/img/og.png' }); }" >/dev/null
playwright-cli -s=og close >/dev/null
echo "site/assets/img/og.png generado"
