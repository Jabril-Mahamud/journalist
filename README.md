# Journalist 📝

A personal journaling app built to learn Kubernetes properly while shipping something real.

The end goal is a **journaling app that syncs with Todoist**, so your daily reflections and your tasks live in the same mental space.

---

## Tech Stack

| Layer | Technology |
| ------- | ----------- |
| Frontend | Next.js 16 + React 19 + Tailwind CSS v4 + shadcn/ui |
| Backend | FastAPI + SQLAlchemy 2.0 |
| Database | PostgreSQL (in-cluster on Civo, local StatefulSet on Kind) |
| Auth | Clerk (JWT verified via JWKS) |
| Local Infra | Kubernetes (Kind) + Helm + Docker |
| Production | Civo (K3s) |

---

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Kind](https://kind.sigs.k8s.io/docs/user/quick-start/#installation)
- [kubectl](https://kubernetes.io/docs/tasks/tools/)
- [Helm](https://helm.sh/docs/intro/install/)
- [Node.js 20+](https://nodejs.org/)
- [Python 3.11+](https://www.python.org/downloads/)

```bash
# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl && sudo mv kubectl /usr/local/bin/kubectl

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
CLERK_JWKS_URL=https://your-clerk-domain/.well-known/jwks.json
CLERK_SECRET_KEY=sk_test_xxxx
ALLOWED_ORIGINS=http://localhost:3001
TODOIST_TOKEN=your-todoist-api-token  # Optional, for testing
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

clerk:
  jwks_url: https://your-clerk-domain/.well-known/jwks.json

cors:
  allowed_origins: http://localhost:3001
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

### Database migrations

This project uses [yoyo-migrations](https://ollycope.com/software/yoyo/latest/) for database schema migrations. The backend automatically runs migrations on startup via `entrypoint.sh`.

Migrations are plain SQL files in `backend/migrations/`:

```md
backend/migrations/
  0001_initial_schema.sql
  0002_add_indexes.sql
  0003_add_templates.sql
  0004_seed_builtin_templates.sql
  0005_update_builtin_templates.sql   # Updates built-ins to use structured syntax
```

**Creating a new migration:**

```bash
touch backend/migrations/0006_your_change.sql
```

Write plain SQL in the file. yoyo tracks which migrations have run and applies any pending ones automatically on the next deploy.

**Running migrations locally:**

```bash
cd backend
set -a && source .env && set +a
yoyo apply --no-config-file --database "$DATABASE_URL" ./migrations
```

### Smoke test

Manually verify the backend is working while `make dev` is running:

```bash
./scripts/smoke-test.sh
```

### Running tests

```bash
cd backend
pip install -r requirements/dev.txt
pytest
```

Tests use an in-memory SQLite database by default (no external dependencies).

### Other commands

```bash
make logs     # Backend logs
make logs-fe  # Frontend logs
make status   # Check pods and port forwarding
make destroy  # Nuclear option — deletes the entire cluster
```

---

## Template System

Templates use a custom field syntax that gets parsed into interactive form fields when creating an entry. On save, all fields assemble into a single markdown string stored in the entry's `content` column.

### Field syntax

```md
::type[Label]{options}
```

Any line that doesn't match this pattern is treated as static markdown and passed through as-is.

### Supported field types

| Type | Description | Markdown output |
| --- | --- | --- |
| `::textarea[Label]` | Large freetext box | Raw text, no label |
| `::text[Label]` | Single line input | `**Label:** value` |
| `::stars[Label]` | 1–5 star rating | `**Label:** ⭐⭐⭐⭐` |
| `::select[Label]{options="a,b,c"}` | Dropdown with free-type fallback | `**Label:** value` |
| `::number[Label]` | Number input | `**Label:** value` |
| `::checkbox[Label]` | Toggle | `**Label:** Yes / No` |

### Example template

```markdown
## {{date}}

::stars[Energy Level]

::select[Day Type]{options="rest,push,work,recovery"}

::textarea[Journal]

::text[Focus for tomorrow]
```

Assembled entry output:

```markdown
## Monday 2nd June

**Energy Level:** ⭐⭐⭐⭐

**Day Type:** Push

Had a solid session today, shipped the template feature...

**Focus for tomorrow:** Write tests
```

### Building templates

Templates are created and managed in **Settings → Templates**. The builder has two modes:

- **Visual** — drag-and-drop field editor, add fields from a picker
- **Raw** — edit the syntax directly as plain text

Switching between modes syncs the content both ways. Users can always override a `select` field by typing a custom value — nothing enforces the options strictly.

---

## Project Structure

```md
journalist/
├── backend/                  # FastAPI backend
│   ├── main.py              # App setup and route includes
│   ├── models.py            # SQLAlchemy models
│   ├── schemas.py           # Pydantic schemas
│   ├── crud.py              # Database operations
│   ├── auth.py              # Clerk JWT verification (via JWKS)
│   ├── database.py          # DB connection
│   ├── routers/             # API route modules
│   │   ├── entries.py       # Entry endpoints
│   │   ├── projects.py      # Project endpoints
│   │   ├── todoist.py       # Todoist integration endpoints
│   │   └── templates.py     # Template endpoints
│   ├── tests/               # Pytest test suite
│   │   ├── conftest.py      # Fixtures and test setup
│   │   ├── test_health.py
│   │   ├── test_auth.py
│   │   ├── test_projects.py
│   │   ├── test_entries.py
│   │   ├── test_todoist.py
│   │   ├── test_entry_tasks.py
│   │   ├── test_templates.py
│   │   └── test_trigger_matcher.py
│   ├── migrations/          # yoyo SQL migration files
│   ├── utils/
│   │   └── trigger_matcher.py
│   ├── requirements/
│   │   ├── prod.txt
│   │   └── dev.txt
│   ├── pyproject.toml
│   ├── .env.example
│   └── Dockerfile
├── frontend/                 # Next.js frontend
│   ├── app/                 # App router pages
│   ├── components/          # React components
│   │   ├── template-builder.tsx      # Visual + raw template editor
│   │   └── structured-entry-form.tsx # Renders template fields on entry creation
│   ├── lib/
│   │   ├── api.ts           # API client
│   │   ├── template-parser.ts        # Parses ::type[Label] syntax
│   │   └── hooks/
│   └── Dockerfile
├── journalist/               # Helm chart
│   ├── Chart.yaml
│   ├── values.yaml
│   ├── values.secret.yaml   # Gitignored — create locally
│   └── templates/
├── scripts/
│   ├── install-hooks.sh
│   ├── pre-push.sh
│   ├── smoke-test.sh
│   └── port-forward.sh
└── Makefile
```

---

## Deployment

The app deploys to **Civo** (Kubernetes) with in-cluster PostgreSQL and **GHCR** for container images.
CI/CD runs via GitHub Actions — push to `dev` deploys to dev namespace, push to `main` deploys to prod.

### Manual deploy

```bash
make push          # Build + push images to GHCR
make deploy-dev    # Deploy to dev namespace
make deploy-prod   # Deploy to prod namespace
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

clerk:
  jwks_url: https://your-clerk-domain/.well-known/jwks.json

cors:
  allowed_origins: http://localhost:3001
EOF
```

**kubectl or helm not found**

```bash
# kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl && sudo mv kubectl /usr/local/bin/kubectl

# helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
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
- [x] Projects (organize entries)
- [x] Calendar view
- [x] All entries browser with search and filters
- [x] Activity heatmap
- [x] Deploy to Civo + in-cluster PostgreSQL
- [x] CI/CD pipeline (GitHub Actions → Civo)
- [x] JWT signature verification
- [x] Pre-push hooks (lint, type check, helm lint, smoke test)
- [x] CORS locked to production origin
- [x] Input length validation (Pydantic)
- [x] Rate limiting
- [x] Markdown rendering in entries
- [x] Project colour picker
- [x] Streak counter
- [x] Day/date on entry cards
- [x] Adaptive activity heatmap with range selector
- [x] New entry as modal
- [x] Search by title and content
- [x] Todoist integration — connect account, view and complete tasks, link tasks to entries
- [x] Markdown preview/edit toggle in entry editor
- [x] Link Todoist tasks while writing entries
- [x] Database migrations (yoyo — plain SQL files)
- [x] Template system — backend CRUD, built-in templates, time/day-based triggers

### Done (cont.)

- [x] Template field syntax (`::type[Label]{options}`)
- [x] Template parser + markdown assembler (`frontend/lib/template-parser.ts`)
- [x] Structured entry form — renders typed fields on entry creation
- [x] Template picker in new entry dialog (with suggestions)
- [x] Visual + raw template builder with drag-to-reorder fields
- [x] Update built-in templates to use structured syntax
- [x] Drive all secrets from env vars (`.env.example` documenting every var)

---

## Learning Resources

- [The Kubernetes Book — Nigel Poulton](https://www.amazon.com/Kubernetes-Book-Nigel-Poulton/dp/1916585000)
- [Kubernetes Docs](https://kubernetes.io/docs/home/)
- [Helm Docs](https://helm.sh/docs/)
- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [Next.js Docs](https://nextjs.org/docs)

---

MIT License