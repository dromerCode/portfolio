#!/usr/bin/env bash
# Sube el portfolio a ZimaOS y (re)arranca el contenedor.
set -euo pipefail
cd "$(dirname "$0")"

HOST=zimaos
DEST=/DATA/AppData/portfolio

ssh "$HOST" "mkdir -p $DEST/site"
rsync -av --delete site/ "$HOST:$DEST/site/"
rsync -av --inplace compose.yaml nginx.conf "$HOST:$DEST/"
ssh "$HOST" "cd $DEST && docker compose up -d && docker compose exec -T portfolio nginx -s reload"
echo "Desplegado en $HOST:$DEST"
