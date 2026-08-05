#!/usr/bin/env sh
# Descarga la ultima version de la rama actual desde el remoto `origin`.
set -eu

BRANCH=$(git rev-parse --abbrev-ref HEAD)

git pull origin "${BRANCH}"
