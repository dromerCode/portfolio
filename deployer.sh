#!/bin/sh
# Despliegue automático: cada INTERVAL segundos mira cuál es el último commit de main con el CI en verde
# y, si es nuevo, descarga ese commit de GitHub y sincroniza site/. Solo lee la API pública: sin claves ni SSH.
# Corre en un contenedor alpine (ver compose.yaml); SITE es el site/ que sirve nginx y STATE guarda el último sha.
REPO=dromerCode/portfolio
NAME=${REPO#*/}
API="https://api.github.com/repos/$REPO/actions/workflows/ci.yml/runs?branch=main&event=push&status=success&per_page=1"
INTERVAL=${INTERVAL:-120}
SITE=${SITE:-/site}
STATE=${STATE:-/state}

log() { echo "$(date -u '+%F %T') $*"; }

# Primer head_sha de la respuesta = el run correcto más reciente
latest_green() {
  wget -qO- "$API" | sed -n 's/.*"head_sha": *"\([0-9a-f]\{40\}\)".*/\1/p' | head -n 1
}

deploy() {
  sha=$1
  rm -rf "$STATE/new" && mkdir -p "$STATE/new"
  if ! wget -qO- "https://codeload.github.com/$REPO/tar.gz/$sha" | tar -xz -C "$STATE/new" --strip-components=2 "$NAME-$sha/site"; then
    log "error descargando $sha"
    return 1
  fi
  [ -f "$STATE/new/index.html" ] || { log "descarga de $sha sin index.html, no se toca nada"; return 1; }
  cp -a "$STATE/new/." "$SITE/"
  # Borra lo que ya no existe en el commit (equivale a rsync --delete)
  (cd "$SITE" && find . -type f) | while read -r f; do [ -e "$STATE/new/$f" ] || rm -f "$SITE/$f"; done
  find "$SITE" -mindepth 1 -type d -empty -delete
  echo "$sha" > "$STATE/sha"
  rm -rf "$STATE/new"
  log "desplegado $sha"
}

# Los tests cargan las funciones sin arrancar el bucle
[ -n "$DEPLOYER_LIB" ] && return 0

log "vigilando $REPO cada ${INTERVAL}s"
while true; do
  sha=$(latest_green)
  if [ -n "$sha" ] && [ "$sha" != "$(cat "$STATE/sha" 2>/dev/null)" ]; then
    deploy "$sha"
  fi
  sleep "$INTERVAL"
done
