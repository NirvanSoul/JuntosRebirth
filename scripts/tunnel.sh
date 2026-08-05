#!/usr/bin/env sh
# Arranca Expo Go con tunel ngrok para compartir la app fuera de la red local.
#
# El tunel gratuito de Expo es compartido entre todos sus usuarios y a veces
# rechaza la conexion con "failed to start tunnel / remote gone away". Ese fallo
# es transitorio, asi que aqui se libera el puerto y se reintenta.
set -u

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT_ROOT=$(dirname "${SCRIPT_DIR}")
PORT="${RCT_METRO_PORT:-8081}"
ATTEMPTS="${TUNNEL_ATTEMPTS:-5}"
RETRY_DELAY="${TUNNEL_RETRY_DELAY:-8}"
# Un fallo del tunel ocurre al arrancar. Si Expo vivio mas que esto, la sesion
# fue real y no se reintenta.
STARTUP_WINDOW=60

trap 'exit 130' INT TERM

free_port() {
  pids=$(lsof -ti "tcp:${PORT}" 2>/dev/null)
  [ -z "${pids}" ] && return 0

  echo "Liberando el puerto ${PORT}..."
  echo "${pids}" | xargs kill 2>/dev/null
  sleep 3

  pids=$(lsof -ti "tcp:${PORT}" 2>/dev/null)
  [ -n "${pids}" ] && echo "${pids}" | xargs kill -9 2>/dev/null
  return 0
}

attempt=1
while [ "${attempt}" -le "${ATTEMPTS}" ]; do
  free_port

  [ "${attempt}" -gt 1 ] && echo "Reintentando el tunel (${attempt}/${ATTEMPTS})..."
  started_at=$(date +%s)
  (
    cd "${PROJECT_ROOT}" || exit 1
    NODE_OPTIONS="--require=./scripts/expo-ngrok-guard.cjs${NODE_OPTIONS:+ ${NODE_OPTIONS}}" \
      npx expo start --go --tunnel --port "${PORT}"
  ) && exit 0
  status=$?
  elapsed=$(($(date +%s) - started_at))

  [ "${status}" -eq 130 ] && exit 0
  if [ "${elapsed}" -ge "${STARTUP_WINDOW}" ]; then
    exit "${status}"
  fi

  attempt=$((attempt + 1))
  [ "${attempt}" -le "${ATTEMPTS}" ] && sleep "${RETRY_DELAY}"
done

echo "" >&2
echo "El tunel de ngrok no arranco tras ${ATTEMPTS} intentos." >&2
echo "Revisa https://status.ngrok.com/ o usa 'npm run start:lan' en la misma wifi." >&2
exit 1
