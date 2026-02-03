# README.md

# Journalist
A lightweight journaling app that will become a proper Todoist companion.

This repo is intentionally structured as a Kubernetes learning project. You will build the app and its infrastructure in small steps, and each step teaches a specific Kubernetes concept.

## What you are building
1. Frontend
   1. Next.js App Router
   2. Tailwind and daisyUI
   3. Talks to backend through a Next proxy route only
2. Backend
   1. FastAPI
   2. SQLModel and Alembic
   3. Exposes health and readiness endpoints
3. Database
   1. Postgres 17
4. Auth
   1. Clerk on the frontend
   2. Backend receives a Bearer token

## Repo status
Right now the repo is empty except `.env.local`.

That is expected. The first milestones are about scaffolding, then containers, then Kubernetes.

## Learning goals
By the end you will be able to:
1. Run a multi service app on Kubernetes locally
2. Use Services, Deployments, StatefulSets, and persistent storage correctly
3. Configure apps using ConfigMaps and Secrets
4. Add health and readiness probes using real endpoints
5. Route traffic using Ingress
6. Run database migrations using a Job pattern
7. Package your app as a Helm chart
8. Deploy with a GitOps workflow (optional but recommended)
9. Debug common Kubernetes issues using logs, events, and describe output

## Ground rules
1. Keep changes small and keep the project runnable at each milestone
2. Prefer understanding over copying
3. If you copy something from a video or book, write a one sentence reason in your notes for why it exists
4. Keep all environment configuration in the root `.env.local` only

## Environment configuration
`.env.local` is the only env file. It will hold variables like:
1. WEB_PORT
2. API_PORT
3. DB_PORT
4. DATABASE_URL
5. API_INTERNAL_URL

Later, you will map these values into Kubernetes ConfigMaps and Secrets.

## Suggested repo structure
You will create this structure as part of the TODO list.

1. apps
   1. backend
   2. frontend
2. infra
   1. compose
   2. k8s
      1. base
      2. overlays
         1. local
3. docs
4. TODO.md

## How to use this repo as a tutorial
Work through `TODO.md` from top to bottom.

Each section includes:
1. Goal
2. What you will build
3. Why it matters
4. Definition of done
5. Notes to fill in from YouTube and The Kubernetes Book

Do not skip the notes. That is where the learning sticks.

## Endpoints you will keep stable
Once the backend exists, keep these endpoints stable because they will power probes and smoke checks.

1. API Health: http://localhost:${API_PORT}/health
2. API Ready: http://localhost:${API_PORT}/ready
3. Todoist Status: http://localhost:${API_PORT}/api/todoist/status
4. Proxy to backend via frontend: http://localhost:${WEB_PORT}/api/backend/health

## Milestone map
1. M0 Repo scaffold and local run using Compose
2. M1 Container images for frontend and backend
3. M2 Local Kubernetes cluster running
4. M3 Postgres StatefulSet with persistence
5. M4 Backend Deployment with probes and config
6. M5 Frontend Deployment and internal routing
7. M6 Ingress for browser access
8. M7 Alembic migration Job pattern
9. M8 Helm chart packaging
10. M9 GitOps deployment (optional)
11. M10 Observability and hardening (optional)

## How to contribute to your own learning
Keep a running log in `docs/learning-log.md` with entries like:
1. Date
2. What you built
3. What broke
4. How you fixed it
5. One concept you can explain now