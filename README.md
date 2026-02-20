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

* **Frontend:** Next.js (Node 20+)
* **Backend:** FastAPI (Python 3.11)
* **Database:** PostgreSQL 15
* **Auth:** Clerk
* **Future Integration:** Todoist API

### Infrastructure

* **Orchestration:** Kubernetes (via Kind for local dev)
* **Package Manager:** Helm
* **Container Runtime:** Docker

---

## Prerequisites

Before you begin, ensure you have the following installed:

* **Docker** - [Install Docker](https://docs.docker.com/get-docker/)
* **Kind** (Kubernetes in Docker) - [Install Kind](https://kind.sigs.k8s.io/docs/user/quick-start/#installation)
* **kubectl** - [Install kubectl](https://kubernetes.io/docs/tasks/tools/)
* **Helm** - [Install Helm](https://helm.sh/docs/intro/install/)
* **Make** - Usually pre-installed on Linux/macOS
* **Node.js 20+** - [Install Node](https://nodejs.org/)
* **Python 3.11+** - [Install Python](https://www.python.org/downloads/)

### Quick Install (Ubuntu/Debian)

```bash
# Install Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Install Kind
curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.20.0/kind-linux-amd64
chmod +x ./kind
sudo mv ./kind /usr/local/bin/kind

# Docker should already be installed on your system
```

---

## Project Structure

```md
journalist/
├── backend/                    # FastAPI backend
│   ├── main.py                # Main API application
│   ├── requirements.txt       # Python dependencies
│   └── Dockerfile            # Backend container image
├── frontend/                  # Next.js frontend
│   ├── app/                  # Next.js app directory
│   ├── package.json          # Node dependencies
│   └── Dockerfile            # Frontend container image
├── journalist/                # Helm chart
│   ├── Chart.yaml            # Chart metadata
│   ├── values.yaml           # Default configuration
│   └── templates/            # Kubernetes manifests
│       ├── backend.yaml      # Backend deployment & service
│       ├── frontend.yaml     # Frontend deployment & service
│       └── postgres.yaml     # PostgreSQL statefulset
├── Makefile                   # Development automation
└── README.md                  # This file
```

---

## Getting Started

### 🚀 One Command Setup

```bash
make init
```

This single command will:

1. Create a Kind cluster
2. Build Docker images
3. Load images into the cluster
4. Deploy everything with Helm

### Access Your Application

After `make init`, your app is automatically accessible at:

* **Frontend:** http://localhost:3001
* **Backend API:** http://localhost:8001
* **Backend Health:** http://localhost:8001/health

If port forwarding stopped, run:

```bash
make ports
```

---

## Development Workflow

### Common Commands

```bash
# See all available commands
make help

# Check status of your deployment
make status

# View logs
make logs       # Backend logs
make logs-fe    # Frontend logs
make logs-db    # Database logs

# Rebuild and redeploy after code changes
make update-backend    # Backend only
make update-frontend   # Frontend only
```

### Making Code Changes

**For Backend changes:**

1. Edit code in `backend/`
2. Run `make update-backend`
3. Changes are live!

**For Frontend changes:**

1. Edit code in `frontend/`
2. Run `make update-frontend`
3. Refresh browser

**For Helm template changes:**

1. Edit templates in `journalist/templates/`
2. Run `make dev`

### Debugging

```bash
# View detailed pod information
kubectl describe pod <pod-name>

# Get all resources
kubectl get all
```

---

## Makefile Commands Reference

| Command | Description |
|---------|-------------|
| `make help` | Show all available commands |
| `make init` | **First-time setup** - create cluster + deploy everything |
| `make dev` | Start dev environment (run this daily) |
| `make stop` | Stop everything (cluster and data preserved) |
| `make ports` | Restart port forwarding to localhost |
| `make status` | Show status of all resources |
| `make logs` | View backend logs |
| `make logs-fe` | View frontend logs |
| `make logs-db` | View database logs |
| `make update-backend` | Rebuild and deploy backend only |
| `make update-frontend` | Rebuild and deploy frontend only |
| `make clean` | Remove deployment (keeps cluster + data) |
| `make destroy` | Delete Kind cluster completely (⚠️ deletes all data) |

---

## Troubleshooting

### ❌ "Cluster not found" Error

If you see an error about the cluster not existing:

```bash
# Create the cluster and deploy
make init
```

### ❌ Port Already in Use

If ports 3001 or 8001 are already in use:

```bash
# Stop everything and restart
make stop
make dev
```

### ❌ Pods Not Starting

```bash
# Check pod status
kubectl get pods

# Describe the failing pod
kubectl describe pod <pod-name>

# Check logs
kubectl logs <pod-name>
```

### ❌ Image Not Found

```bash
# Rebuild images
make update-backend
make update-frontend
```

### ❌ Frontend Crashing with Node.js Version Error

The frontend requires Node.js 20+. Make sure your `frontend/Dockerfile` uses:

```dockerfile
FROM node:20-alpine
```

Not `node:18-alpine`.

### 🔄 Complete Reset

If everything is broken:

```bash
# Nuclear option - start fresh
make destroy
make init
```

---

## Common Workflows

### Starting Fresh Each Day

```bash
make dev
```

### Quick Iteration on Code

```bash
# Backend changes
make update-backend

# Frontend changes  
make update-frontend

# View logs to debug
make logs
make logs-fe
```

### Checking Everything is Running

```bash
make status

# Should show:
# - 3 pods running (backend, frontend, postgres)
# - 3 services
# - Port forwarding active
```

---

## Next Steps

* [x] Implement user authentication (Clerk)
* [x] Create journal entry CRUD endpoints
* [x] Build frontend UI for journaling
* [x] Set up PostgreSQL schema and migrations
* [ ] Integrate Todoist API
* [ ] Add proper logging and monitoring
* [ ] Set up CI/CD pipeline
* [ ] Deploy to production cluster

---

## Learning Resources

* [The Kubernetes Book by Nigel Poulton](https://www.amazon.com/Kubernetes-Book-Nigel-Poulton/dp/1916585000)
* [Kubernetes Documentation](https://kubernetes.io/docs/home/)
* [Helm Documentation](https://helm.sh/docs/)
* [FastAPI Documentation](https://fastapi.tiangolo.com/)
* [Next.js Documentation](https://nextjs.org/docs)

---

## License

MIT

---

## Contributing

This is a learning project, but PRs are welcome! Feel free to:

* Report bugs
* Suggest improvements
* Share what you've learned
* Add features

---

**Happy Learning! 🚀**
