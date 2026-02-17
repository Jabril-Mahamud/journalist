#!/bin/bash
# Port forwarding script for Journalist
# This runs independently of Make to avoid signal issues

BACKEND_PORT=8001
FRONTEND_PORT=3001

# Kill any existing port forwards
pkill -f "kubectl port-forward" 2>/dev/null || true
lsof -ti:$BACKEND_PORT | xargs kill -9 2>/dev/null || true
lsof -ti:$FRONTEND_PORT | xargs kill -9 2>/dev/null || true

# Start port forwarding in background (detached)
nohup kubectl port-forward service/backend $BACKEND_PORT:$BACKEND_PORT >/dev/null 2>&1 &
nohup kubectl port-forward service/frontend $FRONTEND_PORT:$FRONTEND_PORT >/dev/null 2>&1 &

exit 0