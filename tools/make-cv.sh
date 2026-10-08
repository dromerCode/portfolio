#!/usr/bin/env bash
# Regenera site/assets/cv/cv-en.pdf (A4, 1 página) a partir de tools/cv/cv-en.html con playwright-cli.
# El CV en español se hace en Canva (refs/CV Daniel Romero.pdf → site/assets/cv/cv-es.pdf).
set -euo pipefail
cd "$(dirname "$0")/.."

python3 -m http.server 8766 >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER' EXIT
sleep 1

playwright-cli -s=cv open "http://localhost:8766/tools/cv/cv-en.html" >/dev/null
playwright-cli -s=cv run-code "async page => { await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(500); await page.pdf({ path: 'site/assets/cv/cv-en.pdf', format: 'A4', printBackground: true, preferCSSPageSize: true }); }" >/dev/null
playwright-cli -s=cv close >/dev/null
echo "site/assets/cv/cv-en.pdf generado"
