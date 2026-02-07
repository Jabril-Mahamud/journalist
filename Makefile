# ===========================
# Makefile – Journalist Kubernetes Dev
# ===========================
# ===== Config =====
KIND_CLUSTER := journalist
NAMESPACE := journalist
# ===== Backend =====
BACKEND_IMAGE := journalist-backend
BACKEND_TAG := dev
BACKEND_IMAGE_REF := $(BACKEND_IMAGE):$(BACKEND_TAG)
BACKEND_PORT := 8001
# ===== Frontend =====
FRONTEND_IMAGE := journalist-frontend
FRONTEND_TAG := dev
FRONTEND_IMAGE_REF := $(FRONTEND_IMAGE):$(FRONTEND_TAG)
FRONTEND_PORT := 8080  # Local port for frontend
# ===========================
# Backend targets
# ===========================
.PHONY: backend-build
backend-build:
	docker build -t $(BACKEND_IMAGE_REF) app/backend
.PHONY: backend-load
backend-load:
	kind load docker-image $(BACKEND_IMAGE_REF) --name $(KIND_CLUSTER)
.PHONY: backend-deploy
backend-deploy:
	kubectl apply -k infra/k8s/base/backend
.PHONY: backend
backend: backend-build backend-load backend-deploy
# ===========================
# Frontend targets
# ===========================
.PHONY: frontend-build
frontend-build:
	docker build -t $(FRONTEND_IMAGE_REF) app/frontend
.PHONY: frontend-load
frontend-load:
	kind load docker-image $(FRONTEND_IMAGE_REF) --name $(KIND_CLUSTER)
.PHONY: frontend-deploy
frontend-deploy:
	kubectl apply -k infra/k8s/base/frontend
.PHONY: frontend
frontend: frontend-build frontend-load frontend-deploy
# ===========================
# Dev target – build, deploy, and port-forward everything
# ===========================

.PHONY: dev
dev: backend frontend
	@echo "✅ Backend and Frontend deployed!"
	@echo "🌐 Starting port-forwards..."
	@echo "Frontend: http://localhost:$(FRONTEND_PORT)"
	@echo "Backend:  http://localhost:$(BACKEND_PORT)"
	@echo "Press Ctrl+C to stop port-forwards"
	( kubectl port-forward -n $(NAMESPACE) svc/backend $(BACKEND_PORT):$(BACKEND_PORT) & \
	kubectl port-forward -n $(NAMESPACE) svc/frontend $(FRONTEND_PORT):80 & \
	wait )

# ===========================
# Clean targets
# ===========================
.PHONY: clean
clean:
	@echo "🧹 Deleting backend and frontend deployments"
	kubectl delete deployment backend frontend -n $(NAMESPACE) --ignore-not-found
	@echo "🧹 Deleting backend and frontend services"
	kubectl delete svc backend frontend -n $(NAMESPACE) --ignore-not-found
	@echo "🧹 Deleting leftover pods"
	kubectl delete pod -n $(NAMESPACE) -l 'app in (backend,frontend)' --ignore-not-found || true
