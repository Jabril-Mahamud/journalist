# Journalist — Kubernetes Learning Guide

This guide is structured like a **mini course**.

Short sections. Clear goals. One idea at a time.

You are expected to:

* Read
* Run commands
* Observe
* Break things

If you feel slightly uncomfortable, you’re doing it right.

---

## How to Use This Guide (ADHD Friendly Rules)

* One section per session
* Stop after each ✅ checkpoint
* Never copy blindly
* Always run `kubectl get pods` after changes

Think in **layers**, not steps:
Containers → Pods → Services → Ingress

---

## Lesson 0 — Mental Model (Read Only)

Kubernetes is not magic.

It does three things:

1. Runs containers
2. Keeps them running
3. Connects them together

Everything else is plumbing.

Keep this in mind when YAML starts feeling stupid.

---

## Lesson 1 — Create a Local Cluster (Kind)

### Goal

Have a real Kubernetes cluster running locally.

### Actions

```bash
kind create cluster --name journalist
kubectl cluster-info
```

### What You Learned

* Kubernetes is just an API
* Kind runs it inside Docker

✅ **Checkpoint:** `kubectl get nodes` shows one node

---

## Lesson 2 — Kubernetes Objects You Will Use Constantly

You only need to understand these deeply:

* Pod
* Deployment
* Service
* ConfigMap
* Secret
* Ingress

Everything else is optional noise for now.

---

## Lesson 3 — PostgreSQL First (State Matters)

### Why Start With the DB

Stateless apps are easy.
State is where Kubernetes gets real.

### Goal

Run PostgreSQL inside Kubernetes with persistent storage.

### Concepts

* StatefulSet vs Deployment
* PersistentVolumeClaim
* Secrets

### Tasks

* Create a Secret for DB credentials
* Deploy PostgreSQL
* Expose it with a ClusterIP Service

### Think About

* What happens if the pod dies?
* Why can’t this be a NodePort?

✅ **Checkpoint:** Backend *could* connect to Postgres

---

## Lesson 4 — Backend Deployment (FastAPI)

### Goal

Run FastAPI as a Kubernetes Deployment.

### Concepts

* Deployments
* ReplicaSets
* Environment variables

### Tasks

* Build Docker image
* Deploy backend
* Create Service

### Think About

* Why is the Service name important?
* Why not hardcode IPs?

✅ **Checkpoint:** Backend pod is Running

---

## Lesson 5 — Frontend Deployment (Next.js)

### Goal

Serve the UI inside Kubernetes.

### Concepts

* Internal vs external traffic
* Service types

### Tasks

* Build frontend image
* Deploy frontend
* Create Service

### Think About

* Why does frontend talk to backend via Service name?

✅ **Checkpoint:** Frontend pod is Running

---

## Lesson 6 — Ingress (The Door Into the Cluster)

### Goal

Access the app from your browser.

### Concepts

* Ingress controller
* Host-based routing

### Tasks

* Install NGINX Ingress
* Create Ingress resource
* Use nip.io or localtest.me

### Think About

* Why not expose everything with NodePort?

✅ **Checkpoint:** App opens in browser

---

## Lesson 7 — ConfigMaps vs Secrets (This Matters)

### Goal

Understand configuration separation.

### Concepts

* ConfigMaps = non-sensitive
* Secrets = sensitive

### Tasks

* Move env vars into ConfigMaps
* Move passwords and API keys into Secrets

### Think About

* Why this matters in Git

✅ **Checkpoint:** App still works

---

## Lesson 8 — Authentication

### Goal

Add real authentication without reinventing it.

### Tasks

* Choose Clerk or SuperTokens
* Store keys as Secrets
* Pass to backend + frontend

### Think About

* Why auth belongs at app layer, not Kubernetes

✅ **Checkpoint:** User can log in

---

## Lesson 9 — Helm (Optional but Important)

### Goal

Stop duplicating YAML.

### Concepts

* Charts
* Values
* Templates

### Tasks

* Convert raw YAML into Helm chart
* Parameterise images and replicas

### Think About

* Why companies mandate Helm

✅ **Checkpoint:** `helm install` works

---

## Lesson 10 — Todoist Integration (The Real Product Goal)

### Goal

Sync journal entries with Todoist.

### Architecture Idea

* Backend owns Todoist sync
* Todoist API token stored as Secret
* Optional CronJob for background sync

### Kubernetes Concepts

* Secrets
* CronJobs
* Separation of concerns

### Think About

* Why background jobs belong in K8s

---

## Lesson 11 — Debugging Like a Platform Engineer

Learn these commands by heart:

```bash
kubectl get pods
kubectl describe pod <name>
kubectl logs <pod>
kubectl exec -it <pod> -- sh
```

If you can debug pods, you’re already dangerous.

---

## Final Advice

You don’t need to memorise Kubernetes.

You need:

* A mental model
* Repetition
* Real failures

This project gives you all three.

When this clicks, *The Kubernetes Book* will suddenly make sense.

That’s the moment you’re aiming for.
