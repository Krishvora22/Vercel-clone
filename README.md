# Vercel Clone : Self-Hosted Cloud Deployment PaaS Platform

A production-grade, self-hosted deployment platform that replicates core Vercel functionality accepting GitHub repositories, building them automatically, and serving them via SSL-secured custom subdomains. Supports both static React frontends (served via S3) and Node.js backends (containerized and proxied dynamically).

## Project Overview

### What It Does

This platform allows developers to deploy their GitHub repositories with a single API call. It automatically clones the repository, installs dependencies, builds the project, and serves it on a unique subdomain mirroring the core deployment experience of Vercel.

### The Problem It Solves

Hosted deployment platforms like Vercel, Railway, and Render impose pricing tiers, cold starts, vendor lock-in, and limited infrastructure visibility. This project provides a fully self-owned alternative deployable on your own AWS infrastructure with complete transparency into every layer of the stack.

### Key Features

- **Automatic builds** - clones repo, detects framework, builds and deploys without manual intervention
- **Dual framework support** - React apps served statically via S3; Node.js apps containerized and proxied dynamically
- **Custom subdomain routing** - every deployed project receives a unique `<project-name>.<domain>` URL with SSL
- **Real-time build logs** - streamed and persisted to Supabase, accessible from the frontend during deployment
- **GitHub Webhook integration** - push to GitHub triggers automatic redeployment
- **Email notifications** - deployment success emails via Resend
- **On-demand infrastructure** - single-command Kubernetes cluster provisioning on AWS Spot instances (~70% cost reduction)
- **Idempotent teardown** - `destroy.sh` terminates all infrastructure cleanly, billing stops immediately

---

## User Diagram
<p align="center">
  <img src="https://github.com/PriyanshuValiya/vercel-v-2/blob/main/Vercel.png" alt="Vercel Clone Architecture" />
</p>

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 15, Tailwind CSS, Supabase Auth |
| **Backend API** | Node.js, Express, TypeScript |
| **Build Runner** | Node.js, Docker, TypeScript |
| **Proxy** | Node.js, `http-proxy`, Express |
| **Upload Service** | Node.js, AWS SDK v3 (S3) |
| **Queue** | Upstash Redis (managed Redis with TLS) |
| **Database** | Selfhosted Supabase (PostgreSQL) |
| **Object Storage** | AWS S3 |
| **Container Runtime** | Docker |
| **Container Orchestration** | Kubernetes (KIND cluster) |
| **Reverse Proxy** | Nginx (on EC2 host, managed by runner-service) |
| **SSL** | Cloudflare Origin Certificates |
| **Infrastructure** | AWS EC2 (Spot instances), Terraform |
| **Email** | Resend |
| **DNS / CDN** | Cloudflare |

---

## Architecture Overview

The system is composed of four independent microservices coordinated via a Redis queue and a shared Supabase database.

```
                        ┌─────────────────────────────────────────────────┐
                        │              USER / FRONTEND (www)              │
                        │     Next.js — hosted on Vercel (vercel-v-2)     │
                        └──────────────────────┬──────────────────────────┘
                                               │ HTTPS API calls
                                               ▼
                        ┌─────────────────────────────────────────────────┐
                        │         api-vercel.priyanshuvaliya.dev          │
                        │                SERVER (port 4500)               │
                        │    Express API — manages projects, queues jobs  │
                        └────────┬──────────────────────┬─────────────────┘
                                 │ lpush                │ read/write
                                 ▼                      ▼
                   ┌─────────────────────┐   ┌──────────────────────┐
                   │   Upstash Redis     │   │  Supabase (Postgres) │
                   │   build-queue       │   │  projects, users,    │
                   └──────────┬──────────┘   │  logs table          │
                              │ rpop         └──────────────────────┘
                              ▼
                   ┌──────────────────────────────────────────────────────┐
                   │                 RUNNER SERVICE                       │
                   │  Polls Redis → clones repo → installs deps → builds  │
                   │                                                      │
                   │  React project:                                      │
                   │    npm run build → POST /upload (upload-service)     │
                   │    writeNginxRoute() → reloadNginx()                 │
                   │                                                      │
                   │  Node project:                                       │
                   │    docker build → docker run -p HOST:3000            │
                   │    writeNginxRoute() → reloadNginx()                 │
                   └───────────┬──────────────────┬───────────────────────┘
                               │                  │
                               ▼                  ▼
              ┌─────────────────────┐   ┌─────────────────────────────────┐
              │   UPLOAD SERVICE    │   │  Nginx (EC2 host)               │
              │   (port 4000)       │   │  /etc/nginx/conf.d/<id>.conf    │
              │   Uploads build →   │   │  SSL termination per project    │
              │   AWS S3 bucket     │   │  Proxy pass → S3 or container   │
              └─────────────────────┘   └─────────────────────────────────┘
                               │
                               ▼
                   ┌──────────────────────────────────────────────────────┐
                   │       *.priyanshuvaliya.dev (Cloudflare → EC2)       │
                   │                PROXY SERVICE (port 5000)             │
                   │  Extracts subdomain → queries Supabase for project   │
                   │  React  → 302 redirect to S3 URL                     │
                   │  Node   → http-proxy to 127.0.0.1:<port>             │
                   └──────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Service | Responsibility |
|---|---|
| `server` | REST API, project CRUD, Redis queue producer, webhook handler |
| `runner-service` | Redis consumer, build orchestrator, Docker image builder, Nginx config writer |
| `upload-service` | Receives build artifacts from runner, uploads to S3 |
| `proxy-service` | Subdomain-based request router — dispatches to S3 or running container |

---

## Project Structure

```
vercel/
│
├── server/                         # Main API backend
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── projectController.ts  # CRUD, queue push, webhook handler
│   │   │   └── proxyController.ts    # Legacy ID-based redirect
│   │   ├── routes/projectRoutes.ts   # Route definitions
│   │   ├── utils/
│   │   │   ├── redis.ts              # Upstash Redis client (TLS)
│   │   │   └── supabase.ts           # Supabase service-role client
│   │   └── index.ts                  # Express app, CORS, server bootstrap
│   └── Dockerfile
│
├── runner-service/                 # Build worker (queue consumer)
│   ├── src/
│   │   ├── index.ts                  # Redis polling loop, job dispatcher
│   │   ├── types/types.ts            # Project interface definition
│   │   └── utils/
│   │       ├── command.ts            # Shell command runner with log streaming
│   │       ├── logger.ts             # Appends build logs to Supabase
│   │       ├── mail.ts               # Deployment success email via Resend
│   │       ├── nginx.ts              # Generates and writes Nginx .conf files
│   │       ├── portManager.ts        # Tracks/allocates host ports for Node apps
│   │       ├── redis.ts              # Upstash Redis client
│   │       └── supabase.ts           # Supabase client
│   └── Dockerfile
│
├── upload-service/                 # S3 upload microservice
│   ├── src/
│   │   ├── index.ts                  # Express server, /upload endpoint
│   │   └── utils/s3.ts               # AWS S3 client configuration
│   └── Dockerfile
│
├── proxy-service/                  # Subdomain reverse proxy
│   ├── src/
│   │   ├── index.ts                  # Express server with http-proxy
│   │   └── utils/supabase.ts         # Supabase client
│   └── Dockerfile
│
├── www/                            # Next.js frontend (deployed to Vercel)
│   ├── app/                          # App router pages
│   │   ├── dashboard/                # Project list and new project flow
│   │   ├── deploy/[projectId]/       # Real-time deployment log viewer
│   │   └── login/                    # GitHub OAuth login
│   ├── actions/OAuth.ts              # Server-side OAuth actions
│   ├── context/AuthContext.tsx       # Global auth state
│   └── lib/supabase/                 # Supabase client/server instances
│
├── deployment/                     # Infrastructure as Code
│   ├── terraform/
│   │   ├── main.tf                   # Root module — wires networking + compute
│   │   ├── variables.tf              # Input variable declarations
│   │   ├── outputs.tf                # Public IP, SSH command outputs
│   │   ├── terraform.tfvars          # Actual values (gitignored)
│   │   └── modules/
│   │       ├── networking/           # Security group (ports 22, 80, 443)
│   │       └── compute/              # EC2 Spot instance + Ubuntu AMI lookup
│   ├── k8s/
│   │   ├── kind-config.yaml          # KIND cluster config with port + socket mounts
│   │   ├── ingress.yaml              # Nginx Ingress routing rules
│   │   ├── upload-service/           # Deployment + ClusterIP Service
│   │   ├── server/                   # Deployment + ClusterIP Service
│   │   ├── runner-service/           # Privileged Deployment with hostPath volumes
│   │   └── proxy-service/            # hostNetwork Deployment + ClusterIP Service
│   ├── scripts/
│   │   ├── deploy.sh                 # Master automation: EC2 → cluster → services
│   │   ├── destroy.sh                # Terraform destroy + confirmation gate
│   │   ├── setup-ec2.sh              # Installs Docker, kubectl, KIND on Ubuntu
│   │   ├── create-cluster.sh         # Creates KIND cluster + ingress-nginx
│   │   └── create-secrets.sh         # Creates K8s Secrets from .env files
│   ├── origin.pem                    # Cloudflare origin cert (gitignored)
│   └── origin.key                    # Cloudflare origin key (gitignored)
│
├── docker-compose.yml              # Local/legacy EC2 orchestration
└── README.md
```

---

## Setup Instructions

### Prerequisites

- Node.js 18+
- Docker Desktop (for local development)
- AWS account with programmatic access (`aws configure`)
- Supabase project (free tier sufficient)
- Upstash Redis instance (free tier sufficient)
- Cloudflare account with a registered domain
- Terraform >= 1.5.0 (for deployment)
- Git Bash (on Windows) or any Unix shell

### Supabase Schema

Create the following tables in your Supabase project:

```sql
-- Users table (populated via Supabase Auth)
create table users (
  id uuid primary key references auth.users,
  name text,
  email text
);

-- Projects table
create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  repo_url text not null,
  project_name text,
  framework text check (framework in ('React', 'Node')),
  env_variables jsonb default '{}',
  status text default 'queued',
  deployed_url text default '',
  port integer,
  logs text default '',
  total_deployments integer default 1,
  created_at timestamptz default now()
);
```

### Environment Variables

Each service requires its own `.env` file. **Do not commit these files.**

**`server/.env`**
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
REDIS_URL=rediss://your-upstash-url
BASE_URL=https://your-bucket.s3.ap-south-1.amazonaws.com
DOMAIN_URL=https://your-domain.dev
```

**`upload-service/.env`**
```env
AWS_ACCESS_KEY=your-access-key
AWS_SECRET_KEY=your-secret-key
AWS_REGION=ap-south-1
S3_BUCKET=your-bucket-name
BASE_URL=https://your-bucket.s3.ap-south-1.amazonaws.com
```

**`runner-service/.env`**
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
REDIS_URL=rediss://your-upstash-url
BASE_IP_URL=http://upload-service:4000
DEPLOY_DOMAIN=your-domain.dev
S3_BUCKET=your-bucket-name
AWS_REGION=ap-south-1
SSL_CERT_PATH=/etc/ssl/cloudflare/origin.pem
SSL_CERT_KEY_PATH=/etc/ssl/cloudflare/origin.key
RESEND_API_KEY=re_your-resend-key
```

**`proxy-service/.env`**
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
BUCKET_NAME=https://your-bucket.s3.ap-south-1.amazonaws.com
HOST_URL=127.0.0.1
PORT=5000
```

**`www/.env.local`**
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=https://api-vercel.your-domain.dev
```

---

## Running the Project

## Production Deployment

The production deployment runs all backend services inside a **Kubernetes (KIND) cluster** on a single AWS EC2 Spot instance, provisioned entirely via Terraform and automated via shell scripts.

### Infrastructure Summary

| Resource | Spec |
|---|---|
| EC2 Instance | `m7i-flex.large` — 2 vCPU, 8GB RAM |
| Instance Mode | **Spot** (~$0.06/hr vs $0.19/hr on-demand) |
| Storage | 30GB gp3 EBS |
| Region | `ap-south-1` (Mumbai) |
| Cluster | KIND — 1 control-plane + 3 workers |
| Ingress | ingress-nginx via KIND port mapping |
| SSL | Cloudflare Origin Certificates |

### Deploy (End to End Auto Deployment Script - Zero Manuall Work !!)

```bash
# From the project root in Git Bash
bash deployment/scripts/deploy.sh
```

This single command performs the following steps automatically:

1. Runs `terraform apply` — provisions EC2 Spot instance + security group
2. Waits for SSH availability (polls with retries)
3. Installs Docker, kubectl, KIND on the fresh Ubuntu instance
4. Configures OS-level inotify limits for KIND stability
5. Creates the KIND cluster using `kind-config.yaml` (with Docker socket mounts)
6. Installs `ingress-nginx` and removes the admission webhook
7. Labels the worker node with `dockerhost=true` for privileged workload scheduling
8. Creates host directories and transfers Cloudflare SSL certificates
9. Transfers `.env` files and creates Kubernetes Secrets (env files deleted after)
10. Transfers all K8s manifests and applies them
11. Waits for all deployments to roll out successfully
12. Prints EC2 IP, pod status, and Cloudflare DNS update instructions

### Teardown

```bash
bash deployment/scripts/destroy.sh
# Prompts for confirmation, then runs terraform destroy
# EC2 terminated, security group deleted, billing stops
```

### DNS Configuration (Cloudflare)

After deployment, update two A records in Cloudflare:

```
Type   Name                      Value           Proxy Status
A      api-vercel                <EC2_PUBLIC_IP>  Proxied
A      *                         <EC2_PUBLIC_IP>  Proxied
```

---

### Local Development (Docker Compose)

```bash
# Clone the repository
git clone https://github.com/yourusername/vercel-v-2.git
cd vercel-v-2

# Ensure all .env files are populated (see above)

# Build and start all backend services
docker compose up --build

# Services will be available at:
# server:         http://localhost:4500
# upload-service: http://localhost:4000
# runner-service: background worker (no HTTP port)
# proxy-service:  http://localhost:5000
```

```bash
# Start the frontend separately
cd www
npm install
npm run dev
# Frontend: http://localhost:3000
```

### Individual Service Development

```bash
# Run any service individually
cd server
npm install
npm run dev   # uses ts-node or tsx for hot reload

cd runner-service
npm install
npm run dev

cd upload-service
npm install
npm run dev
```

### Build Docker Images

```bash
# Build and push all images to Docker Hub
docker build -t yourdockerhubuser/vercel-server:latest ./server
docker build -t yourdockerhubuser/vercel-runner-service:latest ./runner-service
docker build -t yourdockerhubuser/vercel-upload-service:latest ./upload-service
docker build -t yourdockerhubuser/vercel-proxy-service:latest ./proxy-service

docker push yourdockerhubuser/vercel-server:latest
docker push yourdockerhubuser/vercel-runner-service:latest
docker push yourdockerhubuser/vercel-upload-service:latest
docker push yourdockerhubuser/vercel-proxy-service:latest
```

---

## End-to-End Workflow

```
1. User logs in via GitHub OAuth (Supabase Auth)
   └── GitHub token stored in session for repo access

2. User selects a repository and framework in the dashboard
   └── POST /api/project → project row inserted in Supabase (status: "queued")
   └── Project JSON pushed to Redis `build-queue` via lpush

3. runner-service polls Redis every 5 seconds (rpop)
   └── Job dequeued → processJob() called
   └── Supabase updated → status: "building", logs: ""

4. Build Phase (React):
   └── git clone <repo_url>
   └── npm install
   └── vite.config patched with base path (project ID)
   └── npm run build
   └── POST /upload to upload-service → build artifacts → S3
   └── writeNginxRoute() → /etc/nginx/conf.d/<project-id>.conf written
   └── nsenter reloads Nginx on EC2 host
   └── Supabase updated → status: "deployed", deployed_url: "https://<slug>.domain"

4. Build Phase (Node.js):
   └── git clone + npm install
   └── Dockerfile generated if missing
   └── docker build -t <image-name>
   └── docker run -d -p 127.0.0.1:<port>:3000 <image>
   └── writeNginxRoute() → proxy_pass to localhost:<port>
   └── Nginx reloaded via nsenter
   └── Supabase updated → status: "deployed", port: <allocated>

5. Deployment email sent via Resend to the user's email

6. User visits https://<project-name>.your-domain.dev
   └── Cloudflare → EC2 port 443
   └── Nginx → SSL termination → proxy to S3 (React) or container port (Node)

7. For future pushes → GitHub webhook fires POST /webhook
   └── Project re-queued automatically → full rebuild cycle repeats
```
---

## Demo Video (Click the image to see a demo video)

<p align="center">
  <a href="https://assets-priyanshuvaliya.s3.ap-south-1.amazonaws.com/Vercel.mp4">
    <img src="https://raw.githubusercontent.com/PriyanshuValiya/vercel-v-2/main/Vercel.png" />
  </a>
</p>