#!/usr/bin/env bash
#
# Vibeahack — launch the full stack (mongodb + backend + frontend) via docker compose,
# wait for backend health, seed fixtures, and print URLs.
#
# Usage:
#   ./scripts/start.sh              # start everything, stay attached to logs at the end
#   ./scripts/start.sh --detach     # start everything and return (no log tail)
#   ./scripts/start.sh --no-seed    # skip the seed step
#   ./scripts/start.sh --rebuild    # force rebuild of images before up
#   ./scripts/start.sh --with-mongo-express   # also start the mongo-express UI (port 8081)
#   ./scripts/start.sh --down       # tear everything down and exit

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${REPO_ROOT}"

DETACH=0
SEED=1
REBUILD=0
WITH_MONGO_EXPRESS=0
DOWN=0

for arg in "$@"; do
  case "${arg}" in
    --detach|-d) DETACH=1 ;;
    --no-seed) SEED=0 ;;
    --rebuild) REBUILD=1 ;;
    --with-mongo-express) WITH_MONGO_EXPRESS=1 ;;
    --down) DOWN=1 ;;
    -h|--help)
      sed -n '2,13p' "$0" | sed 's/^# \{0,1\}//'
      exit 0 ;;
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

COMPOSE_PROFILE=()
if [[ ${WITH_MONGO_EXPRESS} -eq 1 ]]; then
  COMPOSE_PROFILE=(--profile dev)
fi

compose() {
  if [[ ${#COMPOSE_PROFILE[@]} -gt 0 ]]; then
    docker compose "${COMPOSE_PROFILE[@]}" "$@"
  else
    docker compose "$@"
  fi
}

if [[ ${DOWN} -eq 1 ]]; then
  step "docker compose down"
  compose down
  ok "stack stopped"
  exit 0
fi

START=$(date +%s)

if [[ ${REBUILD} -eq 1 ]]; then
  step "docker compose build (--no-cache)"
  compose build --no-cache
else
  step "docker compose build"
  compose build
fi

SERVICES=(mongodb backend frontend)
if [[ ${WITH_MONGO_EXPRESS} -eq 1 ]]; then
  SERVICES+=(mongo-express)
fi

step "docker compose up -d ${SERVICES[*]}"
compose up -d "${SERVICES[@]}"

step "waiting for backend healthcheck"
DEADLINE=$(( $(date +%s) + 120 ))
while true; do
  STATUS=$(docker inspect --format '{{.State.Health.Status}}' "$(docker compose ps -q backend)" 2>/dev/null || echo "starting")
  case "${STATUS}" in
    healthy) ok "backend healthy"; break ;;
    unhealthy) fail "backend reported unhealthy — check 'docker compose logs backend'" ;;
  esac
  if [[ $(date +%s) -gt ${DEADLINE} ]]; then
    fail "backend did not become healthy within 120s — check 'docker compose logs backend'"
  fi
  sleep 2
done

SEED_LINE=""
if [[ ${SEED} -eq 1 ]]; then
  step "seed Mongo with mocked fixtures"
  SEED_OUT=$(docker compose exec -T backend npm run seed 2>&1 | tail -n 20)
  echo "${SEED_OUT}"
  SEED_LINE=$(printf '%s\n' "${SEED_OUT}" | grep -E '^\[seed\] done:' | head -1 | sed 's/^\[seed\] //' || true)
  ok "seed complete"
else
  info "skipping seed (--no-seed)"
fi

DURATION=$(( $(date +%s) - START ))

# --- summary ---
status_of() {
  local svc="$1"
  local cid
  cid=$(docker compose ps -q "${svc}" 2>/dev/null || echo "")
  if [[ -z "${cid}" ]]; then
    echo "not running"
    return
  fi
  local state health
  state=$(docker inspect --format '{{.State.Status}}' "${cid}" 2>/dev/null || echo "?")
  health=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}no-healthcheck{{end}}' "${cid}" 2>/dev/null || echo "?")
  echo "${state} / ${health}"
}

MONGO_STATUS=$(status_of mongodb)
BACKEND_STATUS=$(status_of backend)
FRONTEND_STATUS=$(status_of frontend)

API_PROBE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 http://localhost:3000/api/v1/health || echo "---")
FE_PROBE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 http://localhost:5173/ || echo "---")

printf '\n'
printf '============================================================\n'
printf '\033[1;32m✓ Stack up in %ds\033[0m\n' "${DURATION}"
printf '\n'
printf '  \033[1mServices\033[0m\n'
printf '    mongodb   %s\n' "${MONGO_STATUS}"
printf '    backend   %s  (GET /api/v1/health → %s)\n' "${BACKEND_STATUS}" "${API_PROBE}"
printf '    frontend  %s  (GET / → %s)\n' "${FRONTEND_STATUS}" "${FE_PROBE}"
if [[ ${WITH_MONGO_EXPRESS} -eq 1 ]]; then
  printf '    mongo-ui  %s\n' "$(status_of mongo-express)"
fi
printf '\n'
printf '  \033[1mURLs\033[0m\n'
printf '    Frontend    http://localhost:5173\n'
printf '    API         http://localhost:3000/api/v1\n'
printf '    Swagger     http://localhost:3000/api/v1/docs\n'
printf '    MongoDB     mongodb://localhost:27017/vibeahack\n'
if [[ ${WITH_MONGO_EXPRESS} -eq 1 ]]; then
  printf '    Mongo UI    http://localhost:8081\n'
fi
if [[ -n "${SEED_LINE}" ]]; then
  printf '\n'
  printf '  \033[1mSeed\033[0m\n'
  printf '    %s\n' "${SEED_LINE}"
fi
printf '\n'
printf '  \033[1mTry it\033[0m\n'
printf '    curl http://localhost:3000/api/v1/markets/fifa-2026-winner | jq .\n'
printf '    open http://localhost:5173\n'
printf '\n'
printf '  \033[1mManage\033[0m\n'
printf '    Logs        docker compose logs -f backend frontend\n'
printf '    Stop        ./scripts/start.sh --down\n'
printf '    Reseed      docker compose exec backend npm run seed\n'
printf '============================================================\n'

if [[ ${DETACH} -eq 1 ]]; then
  info "detached — stack continues in background. Stop with: ./scripts/start.sh --down"
  exit 0
fi

info "tailing logs (Ctrl-C to detach; stack keeps running)"
exec docker compose logs -f backend frontend
