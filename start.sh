#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
API_PORT=${API_PORT:-8000}
WEB_PORT=${WEB_PORT:-5173}

if ! command -v uv >/dev/null 2>&1; then
  echo "[start.sh] uv est requis (pip install uv)." >&2
  exit 1
fi

free_port() {
  local port=$1
  if lsof -ti tcp:"$port" >/dev/null 2>&1; then
    echo "[start.sh] Port $port occupé, arrêt des processus existants..."
    lsof -ti tcp:"$port" | xargs kill -9 >/dev/null 2>&1 || true
  fi
}

cd "$ROOT"

if [ ! -d ".venv" ]; then
  echo "[start.sh] Création de l'environnement .venv avec uv venv..."
  uv venv
fi

echo "[start.sh] Installation des dépendances backend (uv pip install -r backend/requirements.txt)..."
uv pip install -r backend/requirements.txt >/dev/null

if [ ! -d "frontend/node_modules" ]; then
  echo "[start.sh] Installation des dépendances frontend (npm install)..."
  (cd frontend && npm install >/dev/null)
fi

free_port "$API_PORT"
free_port "$WEB_PORT"

# Backend
(
  cd backend
  uv run uvicorn app.main:app --reload --host 0.0.0.0 --port "$API_PORT"
) &
API_PID=$!

# Frontend
(
  cd frontend
  npm run dev -- --host --port "$WEB_PORT"
) &
WEB_PID=$!

trap 'kill "$API_PID" "$WEB_PID" 2>/dev/null || true' EXIT

# Attend la fin des deux processus (Ctrl+C pour arrêter)
wait "$API_PID" "$WEB_PID"
