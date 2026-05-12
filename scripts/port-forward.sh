#!/bin/bash
# Port forwarding script for Journalist
# Ports can be overridden: BACKEND_PORT=9001 FRONTEND_PORT=9002 ./scripts/port-forward.sh

BACKEND_PORT="${BACKEND_PORT:-8001}"
FRONTEND_PORT="${FRONTEND_PORT:-3001}"

# Kill only existing journalist port-forwards (not other processes on those ports)
pkill -f "kubectl port-forward service/backend" 2>/dev/null || true
pkill -f "kubectl port-forward service/frontend" 2>/dev/null || true
sleep 0.5

check_port() {
  local port=$1 name=$2
  if ss -tln sport = :"$port" 2>/dev/null | grep -q LISTEN; then
    echo "⚠️  Port $port is already in use — skipping $name port-forward"
    echo "   Try: make dev FRONTEND_PORT=3002  (or any free port)"
    return 1
  fi
  return 0
}

if check_port "$BACKEND_PORT" "backend"; then
  nohup kubectl port-forward service/backend "$BACKEND_PORT":8001 >/dev/null 2>&1 &
fi

if check_port "$FRONTEND_PORT" "frontend"; then
  nohup kubectl port-forward service/frontend "$FRONTEND_PORT":3001 >/dev/null 2>&1 &
fi

exit 0
