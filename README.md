# Journalist 📝

**Journalist** is a journaling app built to learn Kubernetes properly while still shipping something useful.

The end goal is a **journaling app that can sync with Todoist**, so your daily reflections and your tasks live in the same mental space.

This project is intentionally designed as:

* A real MVP you could actually extend
* A hands-on Kubernetes learning lab
* A companion to *The Kubernetes Book* by Nigel Poulton

If you finish this project end-to-end, you will **genuinely understand Kubernetes fundamentals**, not just YAML incantations.

---

## Tech Stack

### Application

* **Frontend:** Next.js
* **Backend:** FastAPI (Python)
* **Database:** PostgreSQL
* **Auth:** Clerk or SuperTokens
* **Future Integration:** Todoist API

### Platform / Infra

* **Containers:** Docker
* **Orchestration:** Kubernetes (Kind)
* **Ingress:** NGINX Ingress Controller
* **Config Management:** ConfigMaps & Secrets
* **Packaging:** Helm (later stage)
* **CI/CD:** GitHub Actions (optional)

---

## Why This Project Exists

Most Kubernetes tutorials:

* Are toy examples
* Skip *why* things exist
* Don’t resemble real systems

Journalist is different:

* You deploy a real frontend + backend + database
* You deal with auth secrets
* You expose services correctly
* You prepare for third-party integrations (Todoist)

Everything maps cleanly to concepts from *The Kubernetes Book*.

---

## Architecture (High Level)

Client Browser
→ Ingress
→ Frontend Service (Next.js)
→ Backend Service (FastAPI)
→ PostgreSQL Service

* Each component runs in its own **Deployment**
* Internal traffic uses **ClusterIP Services**
* External traffic enters through **Ingress**
* Configuration is split between **ConfigMaps** and **Secrets**

---

## Repo Structure

```
.
├── frontend/        # Next.js app
├── backend/         # FastAPI app
├── k8s/             # Raw Kubernetes manifests
│   ├── postgres/
│   ├── backend/
│   ├── frontend/
│   └── ingress/
├── helm/            # Helm chart (later)
├── guide.md         # Step-by-step learning guide
└── README.md
```

---

## Prerequisites

* Docker
* kubectl
* Kind
* Basic React knowledge
* Basic Python knowledge

You **do not** need prior Kubernetes experience.

---

## How to Use This Repo

1. Read **guide.md**
2. Do not skip steps
3. Run commands manually
4. Break things on purpose
5. Fix them

This is a learning repo, not a copy-paste repo.

---

## Roadmap

### Phase 1 — Core Platform

* [ ] Next.js frontend deployed to K8s
* [ ] FastAPI backend deployed to K8s
* [ ] PostgreSQL with persistent storage
* [ ] Ingress-based access

### Phase 2 — Platform Skills

* [ ] ConfigMaps vs Secrets
* [ ] Helm chart
* [ ] Resource limits
* [ ] Scaling replicas

### Phase 3 — Product

* [ ] User auth
* [ ] Journal CRUD
* [ ] Todoist API sync
* [ ] Background sync jobs (CronJobs)

---

## Naming

Working name: **Journalist**

Because it journals.
And it’s nosy about your tasks.

---

## Final Note

If this ever feels hard: good.

Kubernetes only clicks once you *wrestle* with it.
