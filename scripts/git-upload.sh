#!/usr/bin/env sh
# Sube los cambios locales a la rama actual del remoto `origin`.
#
# Uso:
#   npm run upload                  # pide el mensaje de commit de forma interactiva
#   npm run upload -- "mi mensaje"  # usa el mensaje indicado sin preguntar
set -eu

BRANCH=$(git rev-parse --abbrev-ref HEAD)

if [ "$#" -gt 0 ]; then
  MESSAGE="$*"
else
  printf 'Mensaje de commit: '
  read -r MESSAGE
fi

if [ -z "${MESSAGE}" ]; then
  echo "El mensaje de commit no puede estar vacio." >&2
  exit 1
fi

git add -A

if git diff --cached --quiet; then
  echo "No hay cambios por subir."
  exit 0
fi

git commit -m "${MESSAGE}"
git push origin "${BRANCH}"
