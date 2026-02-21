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
| Auth | Clerk (JWT verified via JWKS) |
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

Create `backend/.env` (see `backend/.env.example` for all required vars):

```env
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxxx.supabase.co:5432/postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-password
POSTGRES_DB=postgres
DB_HOST=localhost
CLERK_JWKS_URL=https://your-clerk-domain/.well-known/jwks.json
ALLOWED_ORIGINS=http://localhost:3001
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8001
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxx
CLERK_SECRET_KEY=sk_test_xxxx
```

### Secret Helm values

Create `journalist/values.secret.yaml` (gitignored — never commit this):

```bash
cat > journalist/values.secret.yaml << 'EOF'
postgres:
  user: postgres
  password: devpassword
  db: journalist
  host: postgres
EOF
```

### Install git hooks

Run once after cloning. Installs a pre-push hook that runs lint, type checking, backend syntax, and Helm lint before every push:

```bash
./scripts/install-hooks.sh
```

To bypass in an emergency:

```bash
git push --no-verify
```

### Daily workflow

```bash
make dev      # Build images + deploy (run this after any code change)
make stop     # Stop everything at end of day
```

### Smoke test

Manually verify the backend is working while `make dev` is running:

```bash
./scripts/smoke-test.sh
```

Checks `/health` returns 200, forged tokens return 401, and missing tokens return 403.

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
│   ├── auth.py              # Clerk JWT verification (via JWKS)
│   ├── database.py          # DB connection
│   ├── .env.example         # Required env vars (copy to .env)
│   └── Dockerfile
├── frontend/                 # Next.js frontend
│   ├── app/                 # App router pages
│   ├── components/          # React components
│   ├── lib/                 # API client + hooks
│   └── Dockerfile
├── journalist/               # Helm chart
│   ├── Chart.yaml
│   ├── values.yaml          # Non-secret defaults
│   ├── values.secret.yaml   # Secret overrides (gitignored — create locally)
│   └── templates/
│       ├── backend.yaml
│       ├── frontend.yaml
│       └── postgres.yaml
├── .vscode/
│   └── settings.json        # K8s YAML, indent-rainbow, and .git visibility config
├── scripts/
│   ├── install-hooks.sh     # Run once after cloning to install git hooks
│   ├── pre-push.sh          # Reference copy of the pre-push hook
│   ├── smoke-test.sh        # Manual backend smoke test
│   └── port-forward.sh
└── Makefile
```

---

## Deployment

The app deploys to **Fly.io** (frontend + backend) with **Supabase** for the database.
CI/CD runs via GitHub Actions on push to `main` — linting runs on every PR.

### Fly secrets (backend)

```bash
cd backend
fly secrets set CLERK_JWKS_URL=https://your-clerk-domain/.well-known/jwks.json
fly secrets set ALLOWED_ORIGINS=https://journalist-frontend.fly.dev
fly secrets set DATABASE_URL=postgresql://...
```

### Manual deploy

```bash
cd backend && fly deploy
cd frontend && fly deploy
```

---

## Authentication

Auth is handled by [Clerk](https://clerk.com). JWTs from the frontend are verified on every request using Clerk's public JWKS endpoint — the backend never trusts unverified tokens.

To find your JWKS URL: Clerk Dashboard → Configure → Domains → copy the domain and append `/.well-known/jwks.json`.

---

## VS Code

The repo includes `.vscode/settings.json` with:

- Kubernetes schema validation and autocomplete for `journalist/templates/`
- 2-space YAML indentation with format on save
- Tuned indent-rainbow colours for deeply nested YAML
- `.git` folder visible in the explorer (but excluded from file search)

Recommended extensions: **YAML** (Red Hat), **indent-rainbow**, **Kubernetes** (Microsoft).

---

## Troubleshooting

**`values.secret.yaml` not found**

```bash
cat > journalist/values.secret.yaml << 'EOF'
postgres:
  user: postgres
  password: devpassword
  db: journalist
  host: postgres
EOF
```

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

### Done

- [x] User authentication (Clerk)
- [x] Journal entry CRUD
- [x] Focus points (tags)
- [x] Calendar view
- [x] All entries browser with search and filters
- [x] Activity heatmap
- [x] Deploy to Fly.io + Supabase
- [x] CI/CD pipeline (GitHub Actions → Fly.io)
- [x] JWT signature verification
- [x] Pre-push hooks (lint, type check, helm lint, smoke test)
- [x] CORS locked to production origin
- [x] Input length validation (Pydantic)
- [x] Rate limiting
- [x] Markdown rendering in entries
- [x] Tag colour picker
- [x] Streak counter
- [x] Day/date on entry cards
- [x] Adaptive activity heatmap with range selector
- [x] New entry as modal
- [x] Search by title and content

### Up next

**Security & reliability**

- [ ] Drive all secrets from env vars (`.env.example` documenting every var)

**Writing experience**

- [ ] Entry templates (daily review, weekly review, monthly, yearly)
- [ ] Writing prompts — surface a random prompt if new entry is idle for 5 seconds
- [ ] Word count and reading time on entries
- [ ] Draft autosave to localStorage if dialog is closed mid-write
- [ ] Keyboard shortcuts — `N` for new entry, `Cmd+K` for search/jump

**Revisiting entries**

- [ ] On this day — show entries from the same date in previous years
- [ ] Related entries — entries sharing focus points shown when viewing an entry

**Insights**

- [ ] Writing stats page — total entries, total words, most used tags, most productive day of week, average streak
- [ ] Focus point breakdown — time distribution across tags over a period

**Data ownership**

- [ ] Export — download all entries as individual markdown files or a single JSON (most important missing feature for user trust)

**Integrations**

- [ ] Todoist integration — sync daily reflections and tasks into the same mental space

---

## Learning Resources

- [The Kubernetes Book — Nigel Poulton](https://www.amazon.com/Kubernetes-Book-Nigel-Poulton/dp/1916585000)
- [Kubernetes Docs](https://kubernetes.io/docs/home/)
- [Helm Docs](https://helm.sh/docs/)
- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [Next.js Docs](https://nextjs.org/docs)

---

MIT License
