#!/usr/bin/env bash
#
# Vibeahack — one-shot dev launcher.
# Ensures MongoDB is running (via docker compose), then starts backend (NestJS watch)
# + frontend (Vite) locally with hot reload. Edits under backend/src and frontend/src
# trigger reloads automatically.
#
# Usage:
#   ./scripts/dev-all.sh                  # bring up mongo if needed, then run backend + frontend
#   ./scripts/dev-all.sh --seed           # also seed fixtures before launching
#   ./scripts/dev-all.sh --with-worker    # also run the worker locally (live Polymarket/Kalshi/Myriad indexing)
#   ./scripts/dev-all.sh --with-mcp       # also run `tsc --watch` on mcp/ (keeps mcp/dist fresh)
#   ./scripts/dev-all.sh --down           # stop everything (services + mongo container)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${REPO_ROOT}"

RUN_SEED=0
DOWN=0
WITH_WORKER=0
WITH_MCP=0
for arg in "$@"; do
  case "${arg}" in
    --seed) RUN_SEED=1 ;;
    --down) DOWN=1 ;;
    --with-worker) WITH_WORKER=1 ;;
    --with-mcp) WITH_MCP=1 ;;
    -h|--help) sed -n '2,14p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Unknown arg: ${arg}" >&2; exit 2 ;;
  esac
done

step() { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
info() { printf '\033[1;34m•\033[0m %s\n' "$*"; }
ok()   { printf '\033[1;32m✓\033[0m %s\n' "$*"; }
fail() { printf '\n\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

if ! docker info >/dev/null 2>&1; then
  fail "Docker daemon not reachable — is Docker Desktop running?"
fi

if [[ ${DOWN} -eq 1 ]]; then
  step "stopping local backend/frontend/worker/mcp watchers"
  pkill -f "nest start --watch" 2>/dev/null || true
  pkill -f "node .*vite" 2>/dev/null || true
  pkill -f "tsx watch.*worker/src/main" 2>/dev/null || true
  pkill -f "tsc -p tsconfig.json --watch" 2>/dev/null || true
  step "docker compose down (mongodb)"
  docker compose down
  ok "stack stopped"
  exit 0
fi

# --- MongoDB: start if not already healthy ---
mongo_health() {
  docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' \
    vibeathon-mongodb-1 2>/dev/null || echo "absent"
}

MH="$(mongo_health)"
if [[ "${MH}" == "healthy" ]]; then
  ok "mongodb already healthy"
else
  step "starting mongodb (was: ${MH})"
  docker compose up -d mongodb
  info "waiting for mongodb healthcheck"
  DEADLINE=$(( $(date +%s) + 60 ))
  while true; do
    MH="$(mongo_health)"
    if [[ "${MH}" == "healthy" ]]; then ok "mongodb healthy"; break; fi
    if [[ $(date +%s) -gt ${DEADLINE} ]]; then
      fail "mongodb did not become healthy within 60s — check 'docker compose logs mongodb'"
    fi
    sleep 2
  done
fi

# --- make sure nothing else is holding the dev ports ---
# Prefer stopping a docker compose container over killing PIDs (the PID may be
# Docker Desktop's proxy, and killing it would take down the whole daemon).
free_port() {
  local port="$1" svc="${2:-}"
  lsof -iTCP:"${port}" -sTCP:LISTEN -nP >/dev/null 2>&1 || return 0
  if [[ -n "${svc}" ]] && docker compose ps -q "${svc}" 2>/dev/null | grep -q .; then
    step "stopping docker ${svc} container (holds :${port})"
    docker compose stop "${svc}" >/dev/null || true
    sleep 1
    return 0
  fi
  local pids
  pids=$(lsof -tiTCP:"${port}" -sTCP:LISTEN 2>/dev/null || true)
  [[ -z "${pids}" ]] && return 0
  step "killing PID(s) on :${port}: $(echo ${pids} | tr '\n' ' ')"
  kill ${pids} 2>/dev/null || true
  sleep 1
  pids=$(lsof -tiTCP:"${port}" -sTCP:LISTEN 2>/dev/null || true)
  if [[ -n "${pids}" ]]; then
    kill -9 ${pids} 2>/dev/null || true
    sleep 1
  fi
}

free_port 3000 backend
free_port 5173 frontend

step "handing off to dev.sh (backend watch + vite HMR)"
DEV_ARGS=(--no-check)
[[ ${RUN_SEED} -eq 1 ]] && DEV_ARGS+=(--seed)
[[ ${WITH_WORKER} -eq 1 ]] && DEV_ARGS+=(--with-worker)
[[ ${WITH_MCP} -eq 1 ]] && DEV_ARGS+=(--with-mcp)
exec "${SCRIPT_DIR}/dev.sh" "${DEV_ARGS[@]}"
