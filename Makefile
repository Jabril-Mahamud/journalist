.PHONY: help init dev dev-fe dev-be stop logs logs-fe status destroy test test-docker \
        push push-be push-fe deploy-dev deploy-prod status logs-dev logs-be-dev \
        logs-prod logs-be-prod

# ── Local Kind config ─────────────────────────────────────────────────────────
CLUSTER_NAME   = journalist
BACKEND_PORT   = 8001
FRONTEND_PORT  = 3001

# ── GHCR config ──────────────────────────────────────────────────────────────
REGISTRY       = ghcr.io/jabril-mahamud/journalist

#━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# COMMANDS
#━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## help: Show available commands
help:
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "Journalist - Development Commands"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo ""
	@echo "  Local (Kind)"
	@echo "   make init         → First time local setup"
	@echo "   make dev          → Rebuild both services + deploy locally"
	@echo "   make dev-fe       → Rebuild frontend only (faster)"
	@echo "   make dev-be       → Rebuild backend only (faster)"
	@echo "   make stop         → Stop port forwarding"
	@echo "   make destroy      → Delete local Kind cluster"
	@echo ""
	@echo "  Civo"
	@echo "   make push         → Build + push all images to GHCR"
	@echo "   make push-be      → Build + push backend only"
	@echo "   make push-fe      → Build + push both frontend images"
	@echo "   make deploy-dev   → Helm deploy to dev namespace"
	@echo "   make deploy-prod  → Helm deploy to prod namespace"
	@echo "   make status       → Show pods in dev + prod"
	@echo "   make logs-dev     → Stream frontend logs (dev)"
	@echo "   make logs-be-dev  → Stream backend logs (dev)"
	@echo "   make logs-prod    → Stream frontend logs (prod)"
	@echo "   make logs-be-prod → Stream backend logs (prod)"
	@echo ""
	@echo "  Testing"
	@echo "   make test         → Run backend tests locally (fast)"
	@echo "   make test-docker  → Run tests in Docker (mirrors CI)"
	@echo ""

#━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# LOCAL (Kind)
#━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## init: First-time local setup (run once)
init:
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "🎬 First Time Setup"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@$(MAKE) --no-print-directory _create-cluster
	@$(MAKE) --no-print-directory _build-local-images
	@$(MAKE) --no-print-directory _load-images
	@$(MAKE) --no-print-directory _helm-deploy-local
	-@$(MAKE) --no-print-directory _port-forward
	@echo ""
	@echo "✅ Ready!"
	@echo "   Frontend: http://localhost:$(FRONTEND_PORT)"
	@echo "   Backend:  http://localhost:$(BACKEND_PORT)"
	@echo "   API docs: http://localhost:$(BACKEND_PORT)/docs"
	@echo ""

## dev: Rebuild both services and deploy locally
dev:
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "🚀 Starting Dev Environment"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@$(MAKE) --no-print-directory _check-cluster
	@$(MAKE) --no-print-directory _build-local-images
	@$(MAKE) --no-print-directory _load-images
	@$(MAKE) --no-print-directory _helm-deploy-local
	@$(MAKE) --no-print-directory _restart-pods
	-@$(MAKE) --no-print-directory _port-forward
	@echo ""
	@echo "✅ Frontend: http://localhost:$(FRONTEND_PORT)"
	@echo "✅ Backend:  http://localhost:$(BACKEND_PORT)"
	@echo "✅ API docs: http://localhost:$(BACKEND_PORT)/docs"
	@echo ""

## dev-fe: Rebuild frontend only
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

## dev-be: Rebuild backend only
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

## stop: Stop port forwarding
stop:
	@echo "🛑 Stopping..."
	@pkill -f "kubectl port-forward" 2>/dev/null || true
	@lsof -ti:$(BACKEND_PORT) | xargs kill -9 2>/dev/null || true
	@lsof -ti:$(FRONTEND_PORT) | xargs kill -9 2>/dev/null || true
	@echo "✅ Stopped (cluster and data preserved)"

## destroy: Delete local Kind cluster (⚠️  deletes all data)
destroy:
	@echo "⚠️  This will delete the local Kind cluster and all data"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		kind delete cluster --name $(CLUSTER_NAME); \
		echo "✅ Cluster destroyed"; \
	else \
		echo "❌ Cancelled"; \
	fi

#━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CIVO
#━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## push: Build + push all images to GHCR (backend + both frontend tags)
push:
	@$(MAKE) --no-print-directory push-be
	@$(MAKE) --no-print-directory push-fe

## push-be: Build + push backend image
push-be:
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "🔨 Building + pushing backend"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@docker build \
		--platform linux/amd64 \
		-t $(REGISTRY)/backend:latest \
		./backend
	@docker push $(REGISTRY)/backend:latest
	@echo "✅ Backend pushed"

## push-fe: Build + push both frontend images (dev + latest)
push-fe:
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "🔨 Building + pushing frontend (dev)"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@docker build \
		--platform linux/amd64 \
		--build-arg NEXT_PUBLIC_API_URL=https://dev.writejrnl.uk \
		-t $(REGISTRY)/frontend:dev \
		./frontend
	@docker push $(REGISTRY)/frontend:dev
	@echo "✅ Frontend (dev) pushed"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "🔨 Building + pushing frontend (prod)"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@docker build \
		--platform linux/amd64 \
		--build-arg NEXT_PUBLIC_API_URL=https://writejrnl.uk \
		-t $(REGISTRY)/frontend:latest \
		./frontend
	@docker push $(REGISTRY)/frontend:latest
	@echo "✅ Frontend (prod) pushed"

## deploy-dev: Helm deploy to dev namespace
deploy-dev:
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "🚀 Deploying to dev"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@helm upgrade --install journalist-dev ./journalist \
		--namespace dev \
		--values journalist/values.yaml \
		--values journalist/values.dev.yaml
	@kubectl rollout status deployment/frontend -n dev
	@kubectl rollout status deployment/backend -n dev
	@echo "✅ Dev deployed — https://dev.writejrnl.uk"

## deploy-prod: Helm deploy to prod namespace
deploy-prod:
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "🚀 Deploying to prod"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@helm upgrade --install journalist-prod ./journalist \
		--namespace prod \
		--values journalist/values.yaml \
		--values journalist/values.prod.yaml
	@kubectl rollout status deployment/frontend -n prod
	@kubectl rollout status deployment/backend -n prod
	@echo "✅ Prod deployed — https://writejrnl.uk"

## status: Show pod status across dev + prod namespaces
status:
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "📊 Cluster Status"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo ""
	@echo "── dev ──────────────────────────────────────────"
	@kubectl get pods -n dev 2>/dev/null || echo "  No pods"
	@echo ""
	@echo "── prod ─────────────────────────────────────────"
	@kubectl get pods -n prod 2>/dev/null || echo "  No pods"
	@echo ""
	@echo "── certificates ─────────────────────────────────"
	@kubectl get certificate -n dev 2>/dev/null
	@kubectl get certificate -n prod 2>/dev/null
	@echo ""

## logs-dev: Stream frontend logs (dev)
logs-dev:
	@kubectl logs -n dev deployment/frontend --tail=50 -f

## logs-be-dev: Stream backend logs (dev)
logs-be-dev:
	@kubectl logs -n dev deployment/backend --tail=50 -f

## logs-prod: Stream frontend logs (prod)
logs-prod:
	@kubectl logs -n prod deployment/frontend --tail=50 -f

## logs-be-prod: Stream backend logs (prod)
logs-be-prod:
	@kubectl logs -n prod deployment/backend --tail=50 -f

#━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TESTING
#━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## test: Run backend tests locally (fast, for TDD)
test:
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "🧪 Running Backend Tests"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@cd backend && pytest
	@echo ""

## test-docker: Run tests in Docker (mirrors CI)
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

#━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# INTERNAL HELPERS
#━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

_check-cluster:
	@if ! kind get clusters 2>/dev/null | grep -q "^$(CLUSTER_NAME)$$"; then \
		echo "❌ Local cluster not found — run 'make init' first"; \
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

_build-local-images:
	@echo "🔨 Building images..."
	@docker build -t journalist-backend:latest ./backend
	@docker build -t journalist-frontend:latest ./frontend
	@echo "✓ Images built"

_load-images:
	@echo "📤 Loading images into cluster..."
	@kind load docker-image journalist-backend:latest --name $(CLUSTER_NAME)
	@kind load docker-image journalist-frontend:latest --name $(CLUSTER_NAME)
	@echo "✓ Images loaded"

_helm-deploy-local:
	@echo "⚙️  Deploying..."
	@helm upgrade --install journalist ./journalist \
		--values ./journalist/values.secret.yaml \
		--set backend.image=journalist-backend \
		--set backend.tag=latest \
		--set frontend.image=journalist-frontend \
		--set frontend.tag=latest \
		--set ingress.enabled=false
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