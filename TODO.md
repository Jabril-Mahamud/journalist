# TODO.md
# Journalist Kubernetes course (Kind)

This repo is a hands on Kubernetes learning project using Kind.
You will build a real app by moving from Docker Compose to Kubernetes step by step.

Legend
☐ not started
⧖ in progress
☑ done

Rules
1. Keep commits small
2. Keep the project runnable after every milestone
3. If you get stuck, use the debug checks for that milestone before changing files
4. Keep `.env.local` as the only env file in the repo root

---

## Course setup
☐ Create `docs/learning-log.md`  
☐ Create `docs/debug-checklist.md`  
☐ Create `docs/notes.md`  

Learning log template
- What I did
- Commands I ran
- What broke
- Fix
- What I understand now

---

# M0 Baseline app on Docker Compose
Goal
Get a working baseline app locally so Kubernetes debugging is not confusing.

☐ Create folders:
- apps/backend
- apps/frontend
- infra/compose
- infra/k8s
- docs

☐ Backend skeleton
- FastAPI app exists
- `GET /health` returns 200
- `GET /ready` returns 200

☐ Frontend skeleton
- Next app serves a page
- Next route handler proxies to backend
- Browser never calls backend directly

☐ Postgres in compose
- Postgres 17 service
- Volume for persistence

☐ Compose file
- infra/compose/docker-compose.yml defines db api web

☐ Makefile targets
- make dev
- make down
- make logs
- make reset

Smoke checks
☐ make dev  
☐ curl backend /health  
☐ curl backend /ready  
☐ curl frontend proxy endpoint that hits backend  

Debug checks
☐ docker compose ps  
☐ docker compose logs api  
☐ docker compose logs web  
☐ docker compose logs db  

Notes
☐ Add 3 bullets to docs/notes.md about what Compose is doing  

---

# M1 Images you can run anywhere
Goal
Make frontend and backend images reliable.

☐ apps/backend/Dockerfile exists  
☐ apps/frontend/Dockerfile exists  
☐ Add dockerignore files  
☐ Compose builds from Dockerfiles  
☐ Fresh build works from scratch  

Smoke checks
☐ make down  
☐ docker compose build --no-cache  
☐ make dev  

Notes
☐ Write down the difference between image and container  

---

# M2 Kind cluster and kubectl muscle memory
Goal
Create a local Kubernetes cluster with Kind and get comfortable with kubectl.

☐ kind is installed  
☐ Create cluster named journalist  
☐ Create namespace journalist  
☐ Learn these commands and write them into docs/debug-checklist.md
- kubectl get pods -n journalist
- kubectl describe pod -n journalist <pod>
- kubectl logs -n journalist <pod>
- kubectl get events -n journalist --sort-by=.metadata.creationTimestamp
- kubectl get svc -n journalist
- kubectl get deploy -n journalist

Smoke checks
☐ Deploy a tiny test pod into journalist namespace  
☐ Delete it and watch it recreate if controlled by a Deployment  

Notes
☐ Write what a cluster node namespace and context are  

---

# M3 Postgres on Kubernetes with persistence
Goal
Run Postgres using StatefulSet and PVC.

Create folder
☐ infra/k8s/base/postgres

Manifests
☐ secret.yaml for db creds  
☐ service.yaml for postgres service  
☐ statefulset.yaml with volume claim  
☐ kustomization.yaml  

Apply and test
☐ kubectl apply -k infra/k8s/base/postgres  
☐ Pod Running  
☐ Connect to DB from an ephemeral pod inside cluster  
☐ Delete postgres pod and confirm it comes back  
☐ Confirm data persists  

Debug checks
☐ kubectl describe pod  
☐ kubectl logs  
☐ PVC bound status  

Notes
☐ Why StatefulSet not Deployment for Postgres  
☐ What PVC is doing  

---

# M4 Backend on Kubernetes
Goal
Run API as a Deployment with probes config and service discovery.

Create folder
☐ infra/k8s/base/backend

Manifests
☐ configmap.yaml non secrets  
☐ secret.yaml db url and any secrets  
☐ deployment.yaml
- readiness probe /ready
- liveness probe /health
☐ service.yaml ClusterIP

Apply and test
☐ kubectl apply -k infra/k8s/base/backend  
☐ Pod Ready  
☐ Port forward service and hit /health and /ready  
☐ Confirm API can connect to postgres using postgres service DNS  

Debug checks
☐ describe pod shows probe failures  
☐ logs show DB connection errors  
☐ env vars present  

Notes
☐ Difference between Deployment and Service  
☐ Difference between readiness and liveness  

---

# M5 Frontend on Kubernetes and keep proxy boundary
Goal
Run frontend and make it call backend through Service DNS.

Create folder
☐ infra/k8s/base/frontend

Manifests
☐ configmap.yaml includes backend service url  
☐ deployment.yaml  
☐ service.yaml  

Apply and test
☐ kubectl apply -k infra/k8s/base/frontend  
☐ Port forward frontend service and load page  
☐ Call frontend proxy endpoint and confirm it reaches backend  

Debug checks
☐ If you used localhost anywhere fix it  
☐ Confirm backend service name resolves  

Notes
☐ Why internal DNS matters  

---

# M6 Ingress local access
Goal
Use an ingress controller and an Ingress resource.

☐ Install ingress controller for Kind  
☐ Create infra/k8s/base/ingress with ingress.yaml and kustomization.yaml  
☐ Route traffic to frontend service  

Apply and test
☐ Apply ingress resources  
☐ Access app in browser without port forward  

Debug checks
☐ Controller installed and running  
☐ Ingress rules match service port  

Notes
☐ Ingress vs Service  

---

# M7 Alembic migrations as a Job
Goal
Run migrations in Kubernetes without tying them to API startup.

☐ Create infra/k8s/base/migrations/job.yaml  
☐ Job uses same env vars and secrets as backend  
☐ Document in docs/guide.md when you run it  

Apply and test
☐ Run job  
☐ Check logs  
☐ Confirm tables exist  
☐ Deploy API cleanly after  

Notes
☐ Why Jobs exist  

---

# M8 Helm packaging
Goal
Turn the manifests into a Helm chart.

☐ Create chart infra/k8s/chart/journalist  
☐ Templates for db api web ingress  
☐ values files local and default  
☐ Install and upgrade works  

Notes
☐ What Helm solves  

---

# M9 GitOps optional
Goal
Argo CD deploys this repo.

☐ Install Argo CD locally  
☐ Create Application  
☐ Sync and rollback  

---

# Final review
Write answers in docs/learning-log.md
☐ Explain request path browser to pod  
☐ Explain how postgres persistence works  
☐ Explain probes and how they affect rollouts  
☐ Explain how you debug CrashLoopBackOff  