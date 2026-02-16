.PHONY: help build load deploy restart logs clean dev dev-frontend dev-backend setup port-forward status kill-ports init check-cluster

# Variables
CLUSTER_NAME = journalist
BACKEND_IMAGE = journalist-backend:latest
FRONTEND_IMAGE = journalist-frontend:latest
HELM_RELEASE = journalist
BACKEND_PORT = 8001
FRONTEND_PORT = 3001

## help: Show this help message
help:
	@echo "Journalist Development Commands:"
	@echo ""
	@sed -n 's/^##//p' ${MAKEFILE_LIST} | column -t -s ':' | sed -e 's/^/ /'

## init: Complete first-time setup (cluster + deploy)
init: setup dev
	@echo ""
	@echo "🎉 Journalist is ready!"
	@echo ""
	@echo "Next steps:"
	@echo "  1. Run 'make port-forward' to access the apps"
	@echo "  2. Visit http://localhost:$(FRONTEND_PORT)"
	@echo "  3. Run 'make help' to see all commands"

## setup: Create Kind cluster
setup:
	@echo "Checking if cluster exists..."
	@if kind get clusters 2>/dev/null | grep -q "^$(CLUSTER_NAME)$$"; then \
		echo "✓ Cluster '$(CLUSTER_NAME)' already exists"; \
	else \
		echo "Creating Kind cluster..."; \
		kind create cluster --name $(CLUSTER_NAME); \
		echo "✓ Cluster created"; \
	fi

build:
	@echo "Building backend..."
	docker build -t $(BACKEND_IMAGE) ./backend
	@echo "Building frontend..."
	docker build --build-arg CACHEBUST=$$(date +%s) -t $(FRONTEND_IMAGE) ./frontend
	@echo "✓ Images built"

## clean-images: Remove old Docker images from Kind and local
clean-images:
	@echo "Removing old images from Kind..."
	@docker exec $(CLUSTER_NAME)-control-plane crictl rmi $(BACKEND_IMAGE) 2>/dev/null || true
	@docker exec $(CLUSTER_NAME)-control-plane crictl rmi $(FRONTEND_IMAGE) 2>/dev/null || true
	@echo "Removing old images from Docker..."
	@docker rmi $(BACKEND_IMAGE) 2>/dev/null || true
	@docker rmi $(FRONTEND_IMAGE) 2>/dev/null || true
	@echo "✓ Old images removed"

## load: Load Docker images into Kind cluster
load: check-cluster
	@echo "Loading images into Kind..."
	kind load docker-image $(BACKEND_IMAGE) --name $(CLUSTER_NAME)
	kind load docker-image $(FRONTEND_IMAGE) --name $(CLUSTER_NAME)
	@echo "✓ Images loaded"

## deploy: Deploy application using Helm
deploy: check-cluster
	@echo "Deploying with Helm..."
	helm upgrade --install $(HELM_RELEASE) ./journalist
	@echo "✓ Deployed"

## dev: Full development with infrastructure in Docker/K8s and apps locally with live reload
dev: check-cluster kill-ports
	@echo "🚀 Setting up development environment..."
	@echo ""
	@echo "Step 1/3: Deploying infrastructure (PostgreSQL)..."
	@helm upgrade --install $(HELM_RELEASE) ./journalist > /dev/null 2>&1
	@echo "   ✓ Infrastructure deployed"
	@echo ""
	@echo "Step 2/3: Waiting for PostgreSQL to be ready..."
	@kubectl wait --for=condition=ready pod/postgres-0 --timeout=60s 2>/dev/null || \
		(echo "   ⏳ Waiting for postgres pod..." && sleep 5)
	@echo "   ✓ PostgreSQL ready"
	@echo ""
	@echo "Step 3/3: Starting local frontend and backend with live reload..."
	@echo ""
	@echo "═══════════════════════════════════════════════════════"
	@echo "  📝 Journalist is running!"
	@echo ""
	@echo "  Frontend: http://localhost:$(FRONTEND_PORT)"
	@echo "  Backend:  http://localhost:$(BACKEND_PORT)"
	@echo "  Postgres: localhost:5432"
	@echo ""
	@echo "  Press Ctrl+C to stop everything"
	@echo "═══════════════════════════════════════════════════════"
	@echo ""
	@(trap 'echo "" && echo "🛑 Shutting down..." && kill %1 %2 %3 2>/dev/null || true' INT; \
		kubectl port-forward postgres-0 5432:5432 > /dev/null 2>&1 & \
		cd backend && POSTGRES_USER=postgres POSTGRES_PASSWORD=devpassword POSTGRES_DB=journalist DB_HOST=localhost uvicorn main:app --reload --port $(BACKEND_PORT) > /dev/null 2>&1 & \
		cd frontend && npm run dev > /dev/null 2>&1 & \
		wait)

## dev-frontend: Run only frontend locally with live reload
dev-frontend: kill-ports
	@echo "🚀 Starting frontend development server..."
	@cd frontend && npm run dev

## dev-backend: Run only backend locally with live reload
dev-backend: kill-ports
	@echo "🚀 Starting backend development server..."
	@cd backend && uvicorn main:app --reload --port $(BACKEND_PORT)

## check-cluster: Internal - verify cluster exists
check-cluster:
	@if ! kind get clusters 2>/dev/null | grep -q "^$(CLUSTER_NAME)$$"; then \
		echo "❌ Error: Cluster '$(CLUSTER_NAME)' not found"; \
		echo ""; \
		echo "Run 'make setup' to create the cluster first, or"; \
		echo "Run 'make init' for complete first-time setup"; \
		exit 1; \
	fi

## restart: Restart all deployments
restart:
	kubectl rollout restart deployment/backend
	kubectl rollout restart deployment/frontend
	kubectl rollout restart statefulset/postgres
	@echo "✓ Deployments restarted"

## kill-ports: Kill processes using ports 3001 and 8001
kill-ports:
	@echo "Killing processes on ports $(BACKEND_PORT) and $(FRONTEND_PORT)..."
	@lsof -ti:$(BACKEND_PORT) | xargs kill -9 2>/dev/null || true
	@lsof -ti:$(FRONTEND_PORT) | xargs kill -9 2>/dev/null || true
	@echo "✓ Ports freed"

## port-forward: Forward ports to local machine
port-forward:
	@echo "Checking if ports are available..."
	@if lsof -Pi :$(BACKEND_PORT) -sTCP:LISTEN -t >/dev/null 2>&1; then \
		echo "⚠️  Port $(BACKEND_PORT) is already in use"; \
		echo "Run 'make kill-ports' to free it, or use a different port"; \
		exit 1; \
	fi
	@if lsof -Pi :$(FRONTEND_PORT) -sTCP:LISTEN -t >/dev/null 2>&1; then \
		echo "⚠️  Port $(FRONTEND_PORT) is already in use"; \
		echo "Run 'make kill-ports' to free it, or use a different port"; \
		exit 1; \
	fi
	@echo "Port forwarding backend to localhost:$(BACKEND_PORT)..."
	@echo "Port forwarding frontend to localhost:$(FRONTEND_PORT)..."
	@echo ""
	@echo "✅ Access frontend at: http://localhost:$(FRONTEND_PORT)"
	@echo "✅ Access backend at: http://localhost:$(BACKEND_PORT)"
	@echo ""
	@echo "Press Ctrl+C to stop port forwarding"
	@kubectl port-forward service/backend $(BACKEND_PORT):$(BACKEND_PORT) & \
	kubectl port-forward service/frontend $(FRONTEND_PORT):$(FRONTEND_PORT)

## logs: Show logs from all pods
logs:
	@echo "=== Backend Logs ==="
	kubectl logs -l app=backend --tail=50 -f

## logs-frontend: Show frontend logs
logs-frontend:
	kubectl logs -l app=frontend --tail=50 -f

## logs-backend: Show backend logs
logs-backend:
	kubectl logs -l app=backend --tail=50 -f

## logs-postgres: Show postgres logs
logs-postgres:
	kubectl logs postgres-0 --tail=50 -f

## status: Show status of all resources
status:
	@echo "=== Pods ==="
	kubectl get pods
	@echo ""
	@echo "=== Services ==="
	kubectl get services
	@echo ""
	@echo "=== Helm Releases ==="
	helm list

## clean: Remove deployment but keep cluster
clean:
	@echo "Removing Helm release..."
	-helm uninstall $(HELM_RELEASE) 2>/dev/null || true
	@echo "✓ Deployment removed"

## destroy: Destroy Kind cluster
destroy:
	@echo "Destroying Kind cluster..."
	kind delete cluster --name $(CLUSTER_NAME)
	@echo "✓ Cluster destroyed"

## rebuild-backend: Rebuild and redeploy backend only
rebuild-backend:
	docker build -t $(BACKEND_IMAGE) ./backend
	kind load docker-image $(BACKEND_IMAGE) --name $(CLUSTER_NAME)
	kubectl delete pod -l app=backend
	@echo "✓ Backend rebuilt and redeployed"

## rebuild-frontend: Rebuild and redeploy frontend only
rebuild-frontend:
	@echo "Removing old frontend image..."
	@docker exec $(CLUSTER_NAME)-control-plane crictl rmi $(FRONTEND_IMAGE) 2>/dev/null || true
	@docker rmi $(FRONTEND_IMAGE) 2>/dev/null || true
	@echo "Building frontend..."
	docker build -t $(FRONTEND_IMAGE) ./frontend
	kind load docker-image $(FRONTEND_IMAGE) --name $(CLUSTER_NAME)
	kubectl delete pod -l app=frontend
	@echo "✓ Frontend rebuilt and redeployed"

## shell-backend: Open shell in backend pod
shell-backend:
	kubectl exec -it deployment/backend -- /bin/bash

## shell-frontend: Open shell in frontend pod
shell-frontend:
	kubectl exec -it deployment/frontend -- /bin/sh

## shell-postgres: Open psql in postgres pod
shell-postgres:
	kubectl exec -it postgres-0 -- psql -U postgres -d journalist

## stop-all: Stop port-forwards and remove app (keeps data + cluster)
## stop: Stop local dev processes (port-forwards)
stop: kill-ports
	@echo "✓ Local processes stopped"

## stop-all: Stop work for the day (keeps cluster + data)
stop-all: stop clean
	@echo ""
	@echo "🛑 Development environment stopped for the day"
	@echo "✓ Cluster kept"
	@echo "✓ Persistent data preserved"
