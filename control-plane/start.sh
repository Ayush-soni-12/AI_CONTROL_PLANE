#!/usr/bin/env bash

# ==============================================================================
# AI Control Plane — Backend Dev Runner (inside control-plane/)
# ==============================================================================

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR" || exit 1

if [ -f "$DIR/venv/bin/activate" ]; then
    # shellcheck source=/dev/null
    source "$DIR/venv/bin/activate"
    echo -e "\033[1;36m[AI Control Plane]\033[0m Activated virtual environment"
fi

PIDS=()

cleanup() {
    echo -e "\n\033[1;31m[AI Control Plane]\033[0m Shutting down backend processes..."
    for pid in "${PIDS[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid" 2>/dev/null
        fi
    done
    wait 2>/dev/null
    echo -e "\033[1;32m[AI Control Plane]\033[0m All backend processes stopped cleanly."
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

echo -e "\033[1;35m=====================================================\033[0m"
echo -e "\033[1;32m   🚀 Starting AI Control Plane Backend Services\033[0m"
echo -e "\033[1;35m=====================================================\033[0m"

echo -e "\033[1;34m[1/3]\033[0m Launching FastAPI Server on http://localhost:8000 ..."
uvicorn app.api:app --reload --port 8000 &
PIDS+=($!)

echo -e "\033[1;34m[2/3]\033[0m Launching Async Worker (app.worker) ..."
python -m app.worker &
PIDS+=($!)

echo -e "\033[1;34m[3/3]\033[0m Launching Adaptive Scheduler (app.scheduler) ..."
python -m app.scheduler &
PIDS+=($!)

echo -e "\033[1;32m✔ All 3 backend services running!\033[0m (Press \033[1;33mCtrl+C\033[0m to stop all)\n"

wait
