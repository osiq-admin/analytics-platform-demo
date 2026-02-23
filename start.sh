#!/usr/bin/env bash
set -euo pipefail
echo "=== Analytics Platform Demo ==="

# Build frontend if needed
if [ ! -d "frontend/dist" ]; then
    echo "Building frontend..."
    (cd frontend && npm install && npm run build)
fi

echo "Starting on http://localhost:8000"
uv run uvicorn backend.main:app --host 0.0.0.0 --port 8000
