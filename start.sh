#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "[start] Launching Anjanews frontend…"

if [ ! -d "${ROOT_DIR}/frontend" ]; then
  echo "[start] frontend directory not found. Nothing to start."
  exit 1
fi

cd "${ROOT_DIR}/frontend"

if [ ! -d node_modules ]; then
  echo "[start] Installing frontend dependencies (npm)…"
  npm install
fi

echo "[start] Starting Vite dev server (frontend only for now)…"
npm run dev
