#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-8000}"
URL="http://localhost:$PORT"

echo "=== Analytics Platform Demo ==="

# ── Cleanup: kill server on any exit (Ctrl+C, terminal close, etc.) ──
cleanup() {
    echo ""
    echo "Shutting down..."
    # Kill the uvicorn process group
    if [[ -n "${SERVER_PID:-}" ]]; then
        kill -- -"$SERVER_PID" 2>/dev/null || kill "$SERVER_PID" 2>/dev/null || true
    fi
    # Kill anything still on our port
    lsof -ti :"$PORT" | xargs kill 2>/dev/null || true
    echo "Done."
}
trap cleanup EXIT INT TERM HUP

# ── Kill any existing process on the port ──
if lsof -ti :"$PORT" >/dev/null 2>&1; then
    echo "Port $PORT is in use — stopping existing process..."
    lsof -ti :"$PORT" | xargs kill 2>/dev/null || true
    sleep 1
fi

# ── Build frontend if needed ──
if [ ! -d "frontend/dist" ]; then
    echo "Building frontend..."
    (cd frontend && npm install && npm run build)
fi

# ── Start backend (serves frontend from dist/) ──
echo "Starting on $URL"
uv run uvicorn backend.main:app --host 0.0.0.0 --port "$PORT" &
SERVER_PID=$!

# Wait for server to be ready
echo -n "Waiting for server"
for i in $(seq 1 30); do
    if curl -sf "$URL/api/health" >/dev/null 2>&1 || curl -sf "$URL" >/dev/null 2>&1; then
        echo " ready!"
        break
    fi
    echo -n "."
    sleep 0.5
done

# ── Open browser ──
if command -v open >/dev/null 2>&1; then
    open "$URL"
elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$URL"
fi

echo ""
echo "  App running at $URL"
echo "  Press Ctrl+C to stop"
echo ""

# Wait for the server process — when it dies or we get Ctrl+C, cleanup runs
wait "$SERVER_PID" 2>/dev/null || true
