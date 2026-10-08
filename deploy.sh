#!/usr/bin/env bash
# Sube el portfolio a ZimaOS y (re)arranca el contenedor.
set -euo pipefail
cd "$(dirname "$0")"

HOST=zimaos
DEST=/DATA/AppData/portfolio

ssh "$HOST" "mkdir -p $DEST/site"
rsync -av --delete site/ "$HOST:$DEST/site/"
rsync -av --inplace compose.yaml nginx.conf deployer.sh "$HOST:$DEST/"
ssh "$HOST" "mkdir -p $DEST/.deployer"
# En ZimaOS, $HOME/.docker (/DATA/.docker) no es legible para el usuario: usamos una config propia
ssh "$HOST" "cd $DEST && export DOCKER_CONFIG=$DEST/.docker && docker compose up -d && docker compose exec -T portfolio nginx -s reload"
echo "Desplegado en $HOST:$DEST"
