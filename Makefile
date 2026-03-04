.PHONY: help init dev dev-fe dev-be stop logs status destroy test test-docker

# Config
CLUSTER_NAME = journalist
BACKEND_PORT = 8001
FRONTEND_PORT = 3001

#━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# COMMANDS
#━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## help: Show available commands
help:
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "Journalist - Development Commands"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo ""
	@echo "   make init         → First time setup"
	@echo "   make dev          → Rebuild both services + deploy"
	@echo "   make dev-fe       → Rebuild frontend only (faster)"
	@echo "   make dev-be       → Rebuild backend only (faster)"
	@echo "   make stop         → Stop everything"
	@echo "   make logs         → View backend logs"
	@echo "   make status       → Check what's running"
	@echo "   make destroy      → Delete entire cluster"
	@echo "   make test         → Run backend tests locally (fast)"
	@echo "   make test-docker  → Run tests + verify production build (mirrors CI + Fly.io)"
	@echo ""

## init: First-time setup (run once)
init:
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "🎬 First Time Setup"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@$(MAKE) --no-print-directory _create-cluster
	@$(MAKE) --no-print-directory _build-images
	@$(MAKE) --no-print-directory _load-images
	@$(MAKE) --no-print-directory _helm-deploy
	-@$(MAKE) --no-print-directory _port-forward
	@echo ""
	@echo "✅ Ready!"
	@echo "   Frontend: http://localhost:$(FRONTEND_PORT)"
	@echo "   Backend:  http://localhost:$(BACKEND_PORT)"
	@echo "   API docs: http://localhost:$(BACKEND_PORT)/docs"
	@echo ""

## dev: Rebuild both services and deploy
dev:
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "🚀 Starting Dev Environment"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@$(MAKE) --no-print-directory _check-cluster
	@$(MAKE) --no-print-directory _build-images
	@$(MAKE) --no-print-directory _load-images
	@$(MAKE) --no-print-directory _helm-deploy
	@$(MAKE) --no-print-directory _restart-pods
	-@$(MAKE) --no-print-directory _port-forward
	@echo ""
	@echo "✅ Frontend: http://localhost:$(FRONTEND_PORT)"
	@echo "✅ Backend:  http://localhost:$(BACKEND_PORT)"
	@echo "✅ API docs: http://localhost:$(BACKEND_PORT)/docs"
	@echo ""

## dev-fe: Rebuild frontend only (use this after frontend changes)
dev-fe:
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "🎨 Rebuilding Frontend"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@$(MAKE) --no-print-directory _check-cluster
	@echo "🔨 Building frontend image..."
	@docker build -t journalist-frontend:latest ./frontend
	@echo "✓ Image built"
	@echo "📤 Loading image into cluster..."
	@kind load docker-image journalist-frontend:latest --name $(CLUSTER_NAME)
	@echo "✓ Image loaded"
	@echo "🔄 Restarting frontend pod..."
	@kubectl rollout restart deployment/frontend
	@kubectl rollout status deployment/frontend --timeout=60s
	-@$(MAKE) --no-print-directory _port-forward
	@echo ""
	@echo "✅ Frontend: http://localhost:$(FRONTEND_PORT)"
	@echo ""

## dev-be: Rebuild backend only (use this after backend changes)
dev-be:
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "⚙️  Rebuilding Backend"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@$(MAKE) --no-print-directory _check-cluster
	@echo "🔨 Building backend image..."
	@docker build -t journalist-backend:latest ./backend
	@echo "✓ Image built"
	@echo "📤 Loading image into cluster..."
	@kind load docker-image journalist-backend:latest --name $(CLUSTER_NAME)
	@echo "✓ Image loaded"
	@echo "🔄 Restarting backend pod..."
	@kubectl rollout restart deployment/backend
	@kubectl rollout status deployment/backend --timeout=60s
	-@$(MAKE) --no-print-directory _port-forward
	@echo ""
	@echo "✅ Backend:  http://localhost:$(BACKEND_PORT)"
	@echo "✅ API docs: http://localhost:$(BACKEND_PORT)/docs"
	@echo ""

## test: Run backend tests locally (fast, for TDD)
test:
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "🧪 Running Backend Tests"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@cd backend && pytest
	@echo ""

## test-docker: Run tests + verify production build (mirrors exactly what CI and Fly.io run)
test-docker:
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "🐳 Running Backend Tests in Docker"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@docker build --target test --tag journalist-backend-test ./backend
	@echo ""
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "🏭 Verifying Production Build"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@docker build --target production --tag journalist-backend:latest ./backend
	@echo "✅ Production image built successfully"
	@echo ""

## stop: Stop everything
stop:
	@echo "🛑 Stopping..."
	@pkill -f "kubectl port-forward" 2>/dev/null || true
	@lsof -ti:$(BACKEND_PORT) | xargs kill -9 2>/dev/null || true
	@lsof -ti:$(FRONTEND_PORT) | xargs kill -9 2>/dev/null || true
	@echo "✅ Stopped (cluster and data preserved)"

## logs: View backend logs
logs:
	@kubectl logs -l app=backend --tail=50 -f

## logs-fe: View frontend logs
logs-fe:
	@kubectl logs -l app=frontend --tail=50 -f

## status: Check what's running
status:
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "📊 Cluster Status"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo ""
	@kubectl get pods 2>/dev/null || echo "  No cluster running"
	@echo ""
	@if pgrep -f "kubectl port-forward" >/dev/null 2>&1; then \
		echo "Port forwarding: ✓ Active"; \
	else \
		echo "Port forwarding: ✗ Not running — run 'make dev'"; \
	fi
	@echo ""

## destroy: Delete entire cluster (⚠️  deletes all data)
destroy:
	@echo "⚠️  This will delete the entire cluster and all data"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		kind delete cluster --name $(CLUSTER_NAME); \
		echo "✅ Cluster destroyed"; \
	else \
		echo "❌ Cancelled"; \
	fi

#━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# INTERNAL HELPERS
#━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

_check-cluster:
	@if ! kind get clusters 2>/dev/null | grep -q "^$(CLUSTER_NAME)$$"; then \
		echo "❌ Cluster not found — run 'make init' first"; \
		exit 1; \
	fi

_create-cluster:
	@if kind get clusters 2>/dev/null | grep -q "^$(CLUSTER_NAME)$$"; then \
		echo "✓ Cluster already exists"; \
	else \
		echo "📦 Creating cluster..."; \
		kind create cluster --name $(CLUSTER_NAME); \
		echo "✓ Cluster created"; \
	fi

_build-images:
	@echo "🔨 Building images..."
	@docker build -t journalist-backend:latest ./backend
	@docker build -t journalist-frontend:latest ./frontend
	@echo "✓ Images built"

_load-images:
	@echo "📤 Loading images into cluster..."
	@kind load docker-image journalist-backend:latest --name $(CLUSTER_NAME)
	@kind load docker-image journalist-frontend:latest --name $(CLUSTER_NAME)
	@echo "✓ Images loaded"

_helm-deploy:
	@echo "⚙️  Deploying..."
	@helm upgrade --install journalist ./journalist \
		--values ./journalist/values.secret.yaml \
		--wait
	@echo "✓ Deployed"

_restart-pods:
	@echo "🔄 Restarting pods to pick up new images..."
	@kubectl rollout restart deployment/backend deployment/frontend
	@kubectl rollout status deployment/backend --timeout=60s
	@kubectl rollout status deployment/frontend --timeout=60s
	@echo "✓ Pods updated"

_port-forward:
	@echo "🔌 Starting port forwarding..."
	@chmod +x scripts/port-forward.sh
	@./scripts/port-forward.sh
	@sleep 2 || true
	@if pgrep -f "kubectl port-forward" >/dev/null 2>&1; then \
		echo "✓ Port forwarding active"; \
	else \
		echo "⚠️  Port forwarding check: run 'make status' to verify"; \
	fi