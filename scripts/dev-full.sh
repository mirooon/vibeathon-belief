#!/usr/bin/env bash
#
# Vibeahack — full dev launcher (backend + frontend + worker, all hot-reload).
# Same as dev-all.sh but adds the worker process for live Polymarket indexing.
# Mongo runs in docker; backend, frontend, worker run locally with watchers.
#
# Usage:
#   ./scripts/dev-full.sh           # start everything
#   ./scripts/dev-full.sh --seed    # also seed Kalshi/Myriad fixtures before launching
#   ./scripts/dev-full.sh --down    # stop everything (watchers + mongo)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "${SCRIPT_DIR}/dev-all.sh" --with-worker "$@"
