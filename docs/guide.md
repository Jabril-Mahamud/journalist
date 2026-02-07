# docs/guide.md
# Journalist on Kubernetes (Kind) – hold your hand setup guide

This guide gets **the app running on Kubernetes as fast as possible**.
You already have Kind + ingress-nginx installed. Now we will stand up the stack:

1. Postgres in Kubernetes
2. Backend in Kubernetes (FastAPI)
3. Frontend in Kubernetes (Next.js)
4. Ingress routing to the frontend
5. Optional: migrations job later

Your code files are currently empty. That is fine.
You will only need tiny minimal endpoints to prove wiring works.

---

## What you will build
Kubernetes objects you will create:

- Postgres
  - Secret
  - Service
  - StatefulSet
- Backend
  - ConfigMap
  - Secret
  - Deployment
  - Service
- Frontend
  - ConfigMap
  - Secret (Clerk)
  - Deployment
  - Service
- Ingress
  - Ingress resource pointing to frontend

---

## Repo layout you are using
You showed:

- `app/backend/src/main.py`
- `app/frontend/` (your Next app)
- `infra/k8s/base/postgres/*` (currently empty files)

This guide will add:

- `infra/k8s/base/backend/*`
- `infra/k8s/base/frontend/*`
- `infra/k8s/base/ingress/*`

---

## Environment and secrets rules
You have these Clerk env var names:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (safe to be public, goes in ConfigMap)
- `CLERK_SECRET_KEY` (secret, goes in Secret)
- `JWT_URL` (treat as secret, goes in Secret)

Database env vars: keep them simple in Kubernetes:

- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`

In Kubernetes:
- ConfigMap: non secret values
- Secret: secret values
- Never commit real secret values

Tip for learning:
- Put placeholder values in YAML files for now.
- Replace with real values locally using `kubectl create secret …` later if you want.
- You can also use `stringData:` in a Secret during learning.

---

# Stage 0: Quick verify you are in the right cluster
Run:

```sh
kubectl config current-context
kubectl get pods -n ingress-nginx
kubectl get ns | grep journalist
```

Expected:
- ingress controller pod is Running
- journalist namespace exists

---

# Stage 1: Postgres (fill your empty files)

You already have these empty files:

- `infra/k8s/base/postgres/secret.yaml`
- `infra/k8s/base/postgres/service.yaml`
- `infra/k8s/base/postgres/statefulset.yaml`
- `infra/k8s/base/postgres/kustomization.yaml`

Fill them with the following.

## 1.1 secret.yaml

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: postgres-secret
  namespace: journalist
type: Opaque
stringData:
  POSTGRES_DB: journalist
  POSTGRES_USER: journalist
  POSTGRES_PASSWORD: change-me
```

## 1.2 service.yaml

```yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: journalist
spec:
  selector:
    app: postgres
  ports:
    - name: postgres
      port: 5432
      targetPort: 5432
```

## 1.3 statefulset.yaml

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: journalist
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
        - name: postgres
          image: postgres:17
          ports:
            - containerPort: 5432
              name: postgres
          envFrom:
            - secretRef:
                name: postgres-secret
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 1Gi
```

## 1.4 kustomization.yaml

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: journalist
resources:
  - secret.yaml
  - service.yaml
  - statefulset.yaml
```

## 1.5 Apply Postgres

```sh
kubectl apply -k infra/k8s/base/postgres
kubectl get pods -n journalist
kubectl get pvc -n journalist
```

Expected:
- postgres pod Running
- pvc Bound

### If Postgres is not Running
Run:

```sh
kubectl describe pod -n journalist postgres-0
kubectl logs -n journalist postgres-0 --tail=200
```

---

# Stage 2: Backend (FastAPI) on Kubernetes

## Goal
Backend runs in Kubernetes and can connect to Postgres via the `postgres` Service name.

## 2.1 Create backend k8s folder
Create:

- `infra/k8s/base/backend/`
  - `configmap.yaml`
  - `secret.yaml`
  - `deployment.yaml`
  - `service.yaml`
  - `kustomization.yaml`

## 2.2 Backend container image into Kind
You will build an image and load it into Kind.

Pick one tag and stick to it:

- `journalist-backend:dev`

Commands:

```sh
docker build -t journalist-backend:dev app/backend
kind load docker-image journalist-backend:dev --name journalist
```

If your backend Dockerfile does not exist yet, create one as a separate step.
Keep it simple: start the app on port 8001 inside the container.

## 2.3 Backend minimal app requirements
In `app/backend/src/main.py` create:
- a FastAPI app
- `GET /health` returns 200
- `GET /ready` returns 200 (later you can add DB checks)

Do not overbuild. Just make it start and respond.

## 2.4 Backend configmap.yaml
Non secrets go here.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: backend-config
  namespace: journalist
data:
  APP_ENV: local
```

## 2.5 Backend secret.yaml
We will inject a DATABASE_URL for the backend.

Use Postgres service name `postgres` and default port 5432.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: backend-secret
  namespace: journalist
type: Opaque
stringData:
  DATABASE_URL: postgresql+psycopg://journalist:change-me@postgres:5432/journalist
```

Keep the username password db name aligned with your Postgres secret.

## 2.6 Backend deployment.yaml
Important:
- containerPort must match your actual backend listen port (recommend 8001)
- readiness uses /ready
- liveness uses /health

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: journalist
spec:
  replicas: 1
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
        - name: backend
          image: journalist-backend:dev
          imagePullPolicy: IfNotPresent
          ports:
            - name: http
              containerPort: 8001
          envFrom:
            - configMapRef:
                name: backend-config
            - secretRef:
                name: backend-secret
          readinessProbe:
            httpGet:
              path: /ready
              port: http
            initialDelaySeconds: 3
            periodSeconds: 5
          livenessProbe:
            httpGet:
              path: /health
              port: http
            initialDelaySeconds: 10
            periodSeconds: 10
```

## 2.7 Backend service.yaml

```yaml
apiVersion: v1
kind: Service
metadata:
  name: backend
  namespace: journalist
spec:
  selector:
    app: backend
  ports:
    - name: http
      port: 8001
      targetPort: http
```

## 2.8 Backend kustomization.yaml

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: journalist
resources:
  - configmap.yaml
  - secret.yaml
  - deployment.yaml
  - service.yaml
```

## 2.9 Apply backend and test

```sh
kubectl apply -k infra/k8s/base/backend
kubectl get pods -n journalist
kubectl describe pod -n journalist -l app=backend
kubectl logs -n journalist -l app=backend --tail=200
```

Port forward:

```sh
kubectl port-forward -n journalist svc/backend 8001:8001
```

Test:

```sh
curl -sS localhost:8001/health
curl -sS localhost:8001/ready
```

### If backend is not Ready
Run:

```sh
kubectl describe pod -n journalist -l app=backend
kubectl get events -n journalist --sort-by=.metadata.creationTimestamp | tail -n 50
kubectl logs -n journalist -l app=backend --tail=200
```

Common causes:
- wrong container port
- app not listening on 0.0.0.0 inside container
- probes paths do not exist

---

# Stage 3: Frontend (Next.js) on Kubernetes

## Goal
Frontend runs in Kubernetes and proxies to backend via the backend Service name.

## 3.1 Create frontend k8s folder
Create:

- `infra/k8s/base/frontend/`
  - `configmap.yaml`
  - `secret.yaml`
  - `deployment.yaml`
  - `service.yaml`
  - `kustomization.yaml`

## 3.2 Frontend image into Kind
Choose a tag:

- `journalist-frontend:dev`

Commands:

```sh
docker build -t journalist-frontend:dev app/frontend
kind load docker-image journalist-frontend:dev --name journalist
```

Make sure your Next app listens on 3000 inside the container.

## 3.3 Frontend proxy contract
Your browser calls the frontend only.
Your frontend calls the backend service.

In your Next proxy route, the backend base URL should be:

- `http://backend:8001`

Do not use localhost.

## 3.4 frontend configmap.yaml
Put public values here.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: frontend-config
  namespace: journalist
data:
  BACKEND_INTERNAL_URL: http://backend:8001
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: replace-me
```

## 3.5 frontend secret.yaml
Put secret values here.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: frontend-secret
  namespace: journalist
type: Opaque
stringData:
  CLERK_SECRET_KEY: replace-me
  JWT_URL: replace-me
```

## 3.6 frontend deployment.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: journalist
spec:
  replicas: 1
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
        - name: frontend
          image: journalist-frontend:dev
          imagePullPolicy: IfNotPresent
          ports:
            - name: http
              containerPort: 3000
          envFrom:
            - configMapRef:
                name: frontend-config
            - secretRef:
                name: frontend-secret
```

## 3.7 frontend service.yaml

```yaml
apiVersion: v1
kind: Service
metadata:
  name: frontend
  namespace: journalist
spec:
  selector:
    app: frontend
  ports:
    - name: http
      port: 3000
      targetPort: http
```

## 3.8 frontend kustomization.yaml

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: journalist
resources:
  - configmap.yaml
  - secret.yaml
  - deployment.yaml
  - service.yaml
```

## 3.9 Apply frontend and test

```sh
kubectl apply -k infra/k8s/base/frontend
kubectl get pods -n journalist
kubectl logs -n journalist -l app=frontend --tail=200
```

Port forward:

```sh
kubectl port-forward -n journalist svc/frontend 3000:3000
```

Open:
- http://localhost:3000

### If frontend fails
```sh
kubectl describe pod -n journalist -l app=frontend
kubectl logs -n journalist -l app=frontend --tail=200
kubectl get svc -n journalist
```

---

# Stage 4: Ingress for browser access

## Goal
Access the frontend through ingress-nginx without port forwarding.

## 4.1 Add hosts entry
Pick a hostname:

- `journalist.local`

Add to `/etc/hosts`:

```sh
echo "127.0.0.1 journalist.local" | sudo tee -a /etc/hosts
```

## 4.2 Create ingress manifests
Create:

- `infra/k8s/base/ingress/`
  - `ingress.yaml`
  - `kustomization.yaml`

### ingress.yaml

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: journalist
  namespace: journalist
spec:
  ingressClassName: nginx
  rules:
    - host: journalist.local
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: frontend
                port:
                  number: 3000
```

### kustomization.yaml

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: journalist
resources:
  - ingress.yaml
```

## 4.3 Apply and test

```sh
kubectl apply -k infra/k8s/base/ingress
kubectl get ingress -n journalist
```

Test:

```sh
curl -I http://journalist.local/
```

Expected:
- 200 or 304 from the frontend

### If ingress returns 404 or 503
```sh
kubectl describe ingress -n journalist journalist
kubectl get endpoints -n journalist frontend
kubectl logs -n ingress-nginx deploy/ingress-nginx-controller --tail=200
kubectl get pods -n journalist
```

---

# Stage 5: Make env handling nicer (recommended after it works)

# Development workflow
After the backend and frontend are running successfully, you can access them using:
- Backend: http://localhost:8001
- Frontend: http://localhost:8080

## Using the Makefile
The `make dev` command will:
1. Build and deploy all components
2. Provide instructions for accessing the services

If you prefer to run port-forwards manually, you can:
```sh
kubectl port-forward -n journalist svc/backend 8001:8001
kubectl port-forward -n journalist svc/frontend 8080:80
```

## Testing the endpoints
After starting the port-forwards, you can test the services:
```sh
curl -sS http://localhost:8001/health
curl -sS http://localhost:8001/ready
```

# Make env handling nicer (recommended after it works)

Right now you are editing YAML with placeholder values.
Once you are comfortable, move secrets creation to commands so you do not store secret values in repo.

Example pattern:
- keep Secret YAML in repo with keys only
- or create secrets with `kubectl create secret generic …`

Do this later. First get it running.

---

## Quick command cheat sheet
```sh
kubectl get pods -n journalist
kubectl get svc -n journalist
kubectl get ingress -n journalist
kubectl get events -n journalist --sort-by=.metadata.creationTimestamp | tail -n 50
kubectl describe pod -n journalist <pod>
kubectl logs -n journalist <pod> --tail=200
```
