#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -f "${ROOT_DIR}/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "${ROOT_DIR}/.env"
  set +a
fi

BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"

cleanup() {
  if [ -n "${BACKEND_PID:-}" ]; then
    kill "${BACKEND_PID}" 2>/dev/null || true
  fi
}

trap cleanup EXIT

echo "[start] Launching Anjanews backend + frontend…"

if [ -d "${ROOT_DIR}/backend" ]; then
  echo "[start] Installing backend dependencies (uv)…"
  cd "${ROOT_DIR}/backend"
  uv sync

  echo "[start] Running backend migrations…"
  uv run alembic upgrade head

  echo "[start] Starting backend on port ${BACKEND_PORT}…"
  if [ "${ENV:-development}" = "development" ]; then
    uv run uvicorn app.main:app --reload --host 0.0.0.0 --port "${BACKEND_PORT}" &
  else
    uv run uvicorn app.main:app --host 0.0.0.0 --port "${BACKEND_PORT}" &
  fi
  BACKEND_PID=$!
else
  echo "[start] backend directory not found. Nothing to start."
  exit 1
fi

if [ ! -d "${ROOT_DIR}/frontend" ]; then
  echo "[start] frontend directory not found. Nothing to start."
  exit 1
fi

cd "${ROOT_DIR}/frontend"

if [ ! -d node_modules ]; then
  echo "[start] Installing frontend dependencies (npm)…"
  npm install
fi

API_URL="${VITE_API_URL:-http://localhost:${BACKEND_PORT}}"

echo "[start] Starting Vite dev server…"
VITE_API_URL="${API_URL}" npm run dev -- --port "${FRONTEND_PORT}"
