#!/usr/bin/env bash
#
# Vibeahack — local dev launcher (no docker image build/pull).
# Starts backend (NestJS watch) + frontend (Vite) from your local node_modules.
# Mongo is NOT managed here — bring your own, either native or `docker compose up -d mongodb`.
#
# Usage:
#   ./scripts/dev.sh            # run both, stream logs (Ctrl-C to stop both)
#   ./scripts/dev.sh --no-check # skip the mongo reachability check
#   ./scripts/dev.sh --seed     # run `npm run seed` before launching

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${REPO_ROOT}"

CHECK_MONGO=1
RUN_SEED=0
for arg in "$@"; do
  case "${arg}" in
    --no-check) CHECK_MONGO=0 ;;
    --seed) RUN_SEED=1 ;;
    -h|--help) sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Unknown arg: ${arg}" >&2; exit 2 ;;
  esac
done

MONGO_URL="${MONGO_URL:-mongodb://localhost:27017/vibeahack}"
MONGO_HOST="$(printf '%s' "${MONGO_URL}" | sed -E 's|^mongodb(\+srv)?://([^/@]+@)?([^:/]+).*|\3|')"
MONGO_PORT="$(printf '%s' "${MONGO_URL}" | sed -nE 's|^mongodb(\+srv)?://([^/@]+@)?[^:/]+:([0-9]+).*|\3|p')"
MONGO_PORT="${MONGO_PORT:-27017}"

step() { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
info() { printf '\033[1;34m•\033[0m %s\n' "$*"; }
ok()   { printf '\033[1;32m✓\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m!\033[0m %s\n' "$*"; }

if [[ ! -d node_modules ]]; then
  step "installing dependencies (first run)"
  npm install
fi

if [[ ! -d shared/dist ]]; then
  step "building @vibeahack/shared (first run)"
  npm run build:shared
fi

if [[ ${CHECK_MONGO} -eq 1 ]]; then
  step "checking Mongo at ${MONGO_HOST}:${MONGO_PORT}"
  if (exec 3<>"/dev/tcp/${MONGO_HOST}/${MONGO_PORT}") 2>/dev/null; then
    exec 3>&- 3<&-
    ok "Mongo is reachable"
  else
    warn "Mongo is NOT reachable at ${MONGO_HOST}:${MONGO_PORT}"
    warn "Start it (either option):"
    warn "    docker compose up -d mongodb      # uses the existing compose file, pulls only the mongo image"
    warn "    brew services start mongodb-community   # native install"
    warn "Re-run once Mongo is up. (Pass --no-check to bypass this check.)"
    exit 1
  fi
fi

if [[ ${RUN_SEED} -eq 1 ]]; then
  step "seeding fixtures (MONGO_URL=${MONGO_URL})"
  MONGO_URL="${MONGO_URL}" npm run seed --workspace=backend
fi

# Free a TCP port if anything is holding it. If the listener is a docker compose
# service (svc arg), stop the container — killing Docker Desktop's proxy PID would
# take down the whole daemon. Otherwise SIGTERM, then SIGKILL the offending PIDs.
free_port() {
  local port="$1" svc="${2:-}"
  lsof -iTCP:"${port}" -sTCP:LISTEN -nP >/dev/null 2>&1 || return 0
  if [[ -n "${svc}" ]] && docker compose ps -q "${svc}" 2>/dev/null | grep -q .; then
    info "stopping docker ${svc} container (holds :${port})"
    docker compose stop "${svc}" >/dev/null || true
    sleep 1
    return 0
  fi
  local pids
  pids=$(lsof -tiTCP:"${port}" -sTCP:LISTEN 2>/dev/null || true)
  [[ -z "${pids}" ]] && return 0
  info "killing PID(s) on :${port}: $(echo ${pids} | tr '\n' ' ')"
  kill ${pids} 2>/dev/null || true
  sleep 1
  pids=$(lsof -tiTCP:"${port}" -sTCP:LISTEN 2>/dev/null || true)
  if [[ -n "${pids}" ]]; then
    kill -9 ${pids} 2>/dev/null || true
    sleep 1
  fi
}

step "freeing dev ports (3000 backend, 5173 frontend)"
free_port 3000 backend
free_port 5173 frontend

step "starting backend (NestJS watch) + frontend (Vite)"
info "backend  → http://localhost:3000/api/v1  (Swagger: /docs)"
info "frontend → http://localhost:5173"
info "press Ctrl-C to stop both"

# Launch both, forward stdout/stderr, and make sure Ctrl-C kills the whole group.
MONGO_URL="${MONGO_URL}" npm run start:dev --workspace=backend &
BACKEND_PID=$!

npm run dev --workspace=frontend &
FRONTEND_PID=$!

cleanup() {
  printf '\n'
  info "stopping…"
  kill "${BACKEND_PID}" "${FRONTEND_PID}" 2>/dev/null || true
  wait "${BACKEND_PID}" "${FRONTEND_PID}" 2>/dev/null || true
}
trap cleanup INT TERM EXIT

# Poll both PIDs (portable replacement for `wait -n`, which needs bash 4.3+).
while kill -0 "${BACKEND_PID}" 2>/dev/null && kill -0 "${FRONTEND_PID}" 2>/dev/null; do
  sleep 1
done
