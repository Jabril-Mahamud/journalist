.PHONY: help init dev stop logs status clean destroy

# Config
CLUSTER_NAME = journalist
BACKEND_PORT = 8001
FRONTEND_PORT = 3001

#━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# MAIN COMMANDS - These are what you actually use
#━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## help: Show available commands
help:
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "Journalist - Development Commands"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo ""
	@echo "🚀 Quick Start:"
	@echo "   make init    → First time setup (creates cluster + deploys)"
	@echo "   make dev     → Start dev environment (run this daily)"
	@echo "   make stop    → Stop everything for the day"
	@echo ""
	@echo "📝 Working:"
	@echo "   make logs    → View backend logs (Ctrl+C to exit)"
	@echo "   make logs-fe → View frontend logs"
	@echo "   make status  → Check what's running"
	@echo "   make ports   → Restart port forwarding if needed"
	@echo ""
	@echo "🔧 Updates:"
	@echo "   make update-backend  → Rebuild backend after code changes"
	@echo "   make update-frontend → Rebuild frontend after code changes"
	@echo ""
	@echo "🗑️  Cleanup:"
	@echo "   make clean   → Remove deployment (keeps cluster + data)"
	@echo "   make destroy → Delete entire cluster (nuclear option)"
	@echo ""

## init: First-time setup (run once)
init:
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "🎬 First Time Setup"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@$(MAKE) --no-print-directory _create-cluster
	@$(MAKE) --no-print-directory _deploy-all
	@echo ""
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "✅ Setup Complete!"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo ""
	@echo "🌐 Your app is running at:"
	@echo "   Frontend → http://localhost:$(FRONTEND_PORT)"
	@echo "   Backend  → http://localhost:$(BACKEND_PORT)"
	@echo ""
	@echo "💡 Useful commands:"
	@echo "   make logs        → View backend logs"
	@echo "   make stop        → Stop for the day"
	@echo "   make help        → See all commands"
	@echo ""

## dev: Start development environment (run this daily)
dev:
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "🚀 Starting Development Environment"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@$(MAKE) --no-print-directory _check-cluster
	@$(MAKE) --no-print-directory _deploy-all
	@echo ""
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "✅ Dev Environment Ready!"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo ""
	@if pgrep -f "kubectl port-forward" >/dev/null 2>&1; then \
		echo "🌐 Your app is running at:"; \
		echo "   Frontend → http://localhost:$(FRONTEND_PORT)"; \
		echo "   Backend  → http://localhost:$(BACKEND_PORT)"; \
	else \
		echo "⚠️  Port forwarding may not have started"; \
		echo "   Run 'make ports' to start it manually"; \
	fi
	@echo ""
	@echo "📝 View logs with:"
	@echo "   make logs"
	@echo ""

## stop: Stop development environment
stop:
	@echo "🛑 Stopping development environment..."
	@pkill -f "kubectl port-forward" 2>/dev/null || true
	@lsof -ti:$(BACKEND_PORT) | xargs kill -9 2>/dev/null || true
	@lsof -ti:$(FRONTEND_PORT) | xargs kill -9 2>/dev/null || true
	@echo "✅ Stopped (cluster and data preserved)"
	@echo ""
	@echo "💡 Run 'make dev' tomorrow to start again"

## ports: Restart port forwarding only
ports:
	@echo "🔌 Restarting port forwarding..."
	@$(MAKE) --no-print-directory _port-forward
	@echo ""
	@echo "🌐 Your app is accessible at:"
	@echo "   Frontend → http://localhost:$(FRONTEND_PORT)"
	@echo "   Backend  → http://localhost:$(BACKEND_PORT)"
	@echo ""

## logs: View backend logs (press Ctrl+C to exit)
logs:
	@echo "📋 Backend logs (Ctrl+C to exit)..."
	@kubectl logs -l app=backend --tail=50 -f

## logs-fe: View frontend logs
logs-fe:
	@echo "📋 Frontend logs (Ctrl+C to exit)..."
	@kubectl logs -l app=frontend --tail=50 -f

## logs-db: View database logs
logs-db:
	@echo "📋 Database logs (Ctrl+C to exit)..."
	@kubectl logs postgres-0 --tail=50 -f

## status: Check what's running
status:
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "📊 Cluster Status"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo ""
	@echo "Pods:"
	@kubectl get pods 2>/dev/null || echo "  No cluster running"
	@echo ""
	@echo "Services:"
	@kubectl get services 2>/dev/null || echo "  No cluster running"
	@echo ""
	@echo "Port Forwarding:"
	@if pgrep -f "kubectl port-forward" >/dev/null 2>&1; then \
		echo "  ✓ Active"; \
		pgrep -af "kubectl port-forward" | sed 's/^/  /'; \
	else \
		echo "  ✗ Not running"; \
		echo "  Run 'make dev' to start"; \
	fi
	@echo ""

## update-backend: Rebuild and deploy backend changes
update-backend:
	@echo "🔨 Rebuilding backend..."
	@docker build -t journalist-backend:latest ./backend
	@kind load docker-image journalist-backend:latest --name $(CLUSTER_NAME)
	@kubectl delete pod -l app=backend
	@echo "✅ Backend updated"
	@echo ""
	@echo "💡 Check logs with: make logs"

## update-frontend: Rebuild and deploy frontend changes
update-frontend:
	@echo "🔨 Rebuilding frontend..."
	@docker exec $(CLUSTER_NAME)-control-plane crictl rmi journalist-frontend:latest 2>/dev/null || true
	@docker rmi journalist-frontend:latest 2>/dev/null || true
	@docker build -t journalist-frontend:latest ./frontend
	@kind load docker-image journalist-frontend:latest --name $(CLUSTER_NAME)
	@kubectl delete pod -l app=frontend
	@echo "✅ Frontend updated"
	@echo ""
	@echo "💡 Check logs with: make logs-fe"

## clean: Remove deployment (keeps cluster and data)
clean:
	@echo "🗑️  Removing deployment..."
	@helm uninstall journalist 2>/dev/null || true
	@echo "✅ Deployment removed (cluster and data preserved)"

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
# INTERNAL HELPERS - Don't run these directly
#━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

_check-cluster:
	@if ! kind get clusters 2>/dev/null | grep -q "^$(CLUSTER_NAME)$$"; then \
		echo ""; \
		echo "❌ Cluster not found"; \
		echo ""; \
		echo "Run 'make init' to create it"; \
		echo ""; \
		exit 1; \
	fi

_create-cluster:
	@if kind get clusters 2>/dev/null | grep -q "^$(CLUSTER_NAME)$$"; then \
		echo "✓ Cluster already exists"; \
	else \
		echo "📦 Creating Kubernetes cluster..."; \
		kind create cluster --name $(CLUSTER_NAME); \
		echo "✓ Cluster created"; \
	fi

_build-images:
	@echo "🔨 Building Docker images..."
	@docker build -q -t journalist-backend:latest ./backend
	@docker build -q -t journalist-frontend:latest ./frontend
	@echo "✓ Images built"

_load-images:
	@echo "📤 Loading images into cluster..."
	@kind load docker-image journalist-backend:latest --name $(CLUSTER_NAME)
	@kind load docker-image journalist-frontend:latest --name $(CLUSTER_NAME)
	@echo "✓ Images loaded"

_helm-deploy:
	@echo "⚙️  Deploying with Helm..."
	@helm upgrade --install journalist ./journalist --wait
	@echo "✓ Deployed"

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

_deploy-all:
	@$(MAKE) --no-print-directory _build-images
	@$(MAKE) --no-print-directory _load-images
	@$(MAKE) --no-print-directory _helm-deploy
	-@$(MAKE) --no-print-directory _port-forward