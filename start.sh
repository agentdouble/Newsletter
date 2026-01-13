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

kill_port() {
  local port="$1"
  local label="$2"

  if ! command -v lsof >/dev/null 2>&1; then
    echo "[start] lsof not available; skipping port check for ${label} (${port})."
    return 0
  fi

  local pids
  pids=$(lsof -tiTCP:"${port}" -sTCP:LISTEN 2>/dev/null || true)
  if [ -z "${pids}" ]; then
    return 0
  fi

  echo "[start] Port ${port} already in use (${label}). Stopping PID(s): ${pids}"
  kill ${pids} 2>/dev/null || true

  local retries=25
  while lsof -tiTCP:"${port}" -sTCP:LISTEN >/dev/null 2>&1; do
    if [ "${retries}" -le 0 ]; then
      local still
      still=$(lsof -tiTCP:"${port}" -sTCP:LISTEN 2>/dev/null || true)
      if [ -n "${still}" ]; then
        echo "[start] Port ${port} still busy; forcing stop: ${still}"
        kill -9 ${still} 2>/dev/null || true
      fi
      break
    fi
    sleep 0.2
    retries=$((retries - 1))
  done
}

cleanup() {
  if [ -n "${BACKEND_PID:-}" ]; then
    kill "${BACKEND_PID}" 2>/dev/null || true
  fi
}

trap cleanup EXIT

echo "[start] Launching Anjanews backend + frontend…"

kill_port "${BACKEND_PORT}" "backend"
kill_port "${FRONTEND_PORT}" "frontend"

if [ -d "${ROOT_DIR}/backend" ]; then
  echo "[start] Installing backend dependencies (uv)…"
  cd "${ROOT_DIR}/backend"
  uv sync

  echo "[start] Running backend migrations…"
  uv run -m alembic upgrade head

  echo "[start] Starting backend on port ${BACKEND_PORT}…"
  if [ "${ENV:-development}" = "development" ]; then
    uv run -m uvicorn app.main:app --reload --host 0.0.0.0 --port "${BACKEND_PORT}" &
  else
    uv run -m uvicorn app.main:app --host 0.0.0.0 --port "${BACKEND_PORT}" &
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
VITE_API_URL="${API_URL}" npm run dev -- --port "${FRONTEND_PORT}" --strictPort
