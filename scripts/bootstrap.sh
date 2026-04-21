#!/usr/bin/env bash
#
# Vibeahack Phase 1 — one-shot bootstrap
# Build → up (mongodb + backend) → seed → e2e → exit with test suite's exit code.
#
# Usage:
#   ./scripts/bootstrap.sh          # run everything, leave stack up on failure
#   ./scripts/bootstrap.sh --down   # tear stack down on success

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${REPO_ROOT}"

TEAR_DOWN_ON_SUCCESS=0
for arg in "$@"; do
  case "${arg}" in
    --down) TEAR_DOWN_ON_SUCCESS=1 ;;
    *) echo "Unknown arg: ${arg}" >&2; exit 2 ;;
  esac
done

step() {
  printf '\n\033[1;36m==> %s\033[0m\n' "$*"
}

fail() {
  printf '\n\033[1;31m✗ %s\033[0m\n' "$*" >&2
  exit 1
}

START=$(date +%s)

step "1/4 docker compose build"
docker compose build

step "2/4 docker compose up -d mongodb backend"
docker compose up -d mongodb backend

# Wait for backend to report healthy (compose depends_on only waits at start).
step "  waiting for backend healthcheck"
DEADLINE=$(( $(date +%s) + 120 ))
while true; do
  STATUS=$(docker inspect --format '{{.State.Health.Status}}' "$(docker compose ps -q backend)" 2>/dev/null || echo "starting")
  case "${STATUS}" in
    healthy) echo "  backend healthy"; break ;;
    unhealthy) fail "backend reported unhealthy — check 'docker compose logs backend'" ;;
  esac
  if [[ $(date +%s) -gt ${DEADLINE} ]]; then
    fail "backend did not become healthy within 120s — check 'docker compose logs backend'"
  fi
  sleep 2
done

step "3/4 seed Mongo with mocked fixtures"
docker compose exec -T backend npm run seed

step "4/4 run e2e test suite inside backend container"
set +e
docker compose exec -T backend npm run test:e2e
E2E_EXIT=$?
set -e

END=$(date +%s)
DURATION=$(( END - START ))

printf '\n'
printf '============================================================\n'
if [[ ${E2E_EXIT} -eq 0 ]]; then
  printf '\033[1;32m✓ Bootstrap succeeded in %ds\033[0m\n' "${DURATION}"
  if [[ ${TEAR_DOWN_ON_SUCCESS} -eq 1 ]]; then
    step "tearing stack down (--down)"
    docker compose down
  fi
else
  printf '\033[1;31m✗ Bootstrap failed — e2e exit %d (duration %ds)\033[0m\n' "${E2E_EXIT}" "${DURATION}"
  printf '   Stack left running for inspection. Use:\n'
  printf '     docker compose logs backend\n'
  printf '     docker compose exec backend npm run test:e2e\n'
fi
printf '============================================================\n'

exit "${E2E_EXIT}"
