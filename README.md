# Journalist 📝

A personal journaling app built to learn Kubernetes properly while shipping something real.

The end goal is a **journaling app that syncs with Todoist**, so your daily reflections and your tasks live in the same mental space.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 + React 19 + Tailwind CSS v4 + shadcn/ui |
| Backend | FastAPI + SQLAlchemy 2.0 |
| Database | PostgreSQL (Supabase in production) |
| Auth | Clerk |
| Local Infra | Kubernetes (Kind) + Helm + Docker |
| Production | Fly.io |

---

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Kind](https://kind.sigs.k8s.io/docs/user/quick-start/#installation)
- [kubectl](https://kubernetes.io/docs/tasks/tools/)
- [Helm](https://helm.sh/docs/intro/install/)
- [Node.js 20+](https://nodejs.org/)
- [Python 3.11+](https://www.python.org/downloads/)

```bash
# Install Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Install Kind
curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.20.0/kind-linux-amd64
chmod +x ./kind && sudo mv ./kind /usr/local/bin/kind
```

---

## Local Development

### First time setup

```bash
make init
```

This creates the Kind cluster, builds Docker images, loads them into the cluster, and deploys everything with Helm. Your app will be running at:

- **Frontend:** <http://localhost:3001>
- **Backend:** <http://localhost:8001>
- **Health check:** <http://localhost:8001/health>

### Environment variables

Create `backend/.env`:

```env
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxxx.supabase.co:5432/postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-password
POSTGRES_DB=postgres
DB_HOST=localhost
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8001
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxx
CLERK_SECRET_KEY=sk_test_xxxx
```

### Daily workflow

```bash
make dev      # Build images + deploy (run this after any code change)
make stop     # Stop everything at end of day
```

### Other commands

```bash
make logs     # Backend logs
make logs-fe  # Frontend logs
make status   # Check pods and port forwarding
make destroy  # Nuclear option — deletes the entire cluster
```

---

## Project Structure

```
journalist/
├── backend/                  # FastAPI backend
│   ├── main.py              # Routes
│   ├── models.py            # SQLAlchemy models
│   ├── schemas.py           # Pydantic schemas
│   ├── crud.py              # Database operations
│   ├── auth.py              # Clerk JWT verification
│   ├── database.py          # DB connection
│   └── Dockerfile
├── frontend/                 # Next.js frontend
│   ├── app/                 # App router pages
│   ├── components/          # React components
│   ├── lib/                 # API client + hooks
│   └── Dockerfile
├── journalist/               # Helm chart
│   ├── Chart.yaml
│   ├── values.yaml
│   └── templates/
│       ├── backend.yaml
│       ├── frontend.yaml
│       └── postgres.yaml
├── scripts/
│   └── port-forward.sh
└── Makefile
```

---

## Deployment

The app deploys to **Fly.io** (frontend + backend) with **Supabase** for the database.

```bash
# Backend
cd backend
fly deploy

# Frontend
cd frontend
fly deploy
```

Secrets are managed with `fly secrets set`. See deployment docs for full setup.

---

## Troubleshooting

**Cluster not found**

```bash
make init
```

**Ports already in use**

```bash
make stop && make dev
```

**Pods not starting**

```bash
kubectl get pods
kubectl describe pod <pod-name>
kubectl logs <pod-name>
```

**Everything is broken**

```bash
make destroy && make init
```

---

## Roadmap

- [x] User authentication (Clerk)
- [x] Journal entry CRUD
- [x] Focus points (tags)
- [x] Calendar view
- [x] All entries browser with search and filters
- [x] Activity heatmap
- [x] Deploy to Fly.io + Supabase
- [ ] CI/CD pipeline
- [ ] Todoist integration

---

## Learning Resources

- [The Kubernetes Book — Nigel Poulton](https://www.amazon.com/Kubernetes-Book-Nigel-Poulton/dp/1916585000)
- [Kubernetes Docs](https://kubernetes.io/docs/home/)
- [Helm Docs](https://helm.sh/docs/)
- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [Next.js Docs](https://nextjs.org/docs)

---

MIT License
