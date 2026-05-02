#!/bin/bash
set -euo pipefail

# ── Colors ────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[DEPLOY]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()  { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ── Config ────────────────────────────────────────────────
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEPLOY_DIR="$ROOT_DIR/deployment"
KEY="$DEPLOY_DIR/vercel.pem"
TF_DIR="$DEPLOY_DIR/terraform"
K8S_DIR="$DEPLOY_DIR/k8s"

echo "ROOT_DIR: $ROOT_DIR"
echo "DEPLOY_DIR: $DEPLOY_DIR"
echo "KEY: $KEY"
echo "TF_DIR: $TF_DIR"
echo "K8S_DIR: $K8S_DIR"


# ── Step 0: Verify local prerequisites ───────────────────
log "Step 0: Checking local prerequisites..."

[ -f "$KEY" ] || err "vercel.pem not found at $KEY"
[ -f "$ROOT_DIR/server/.env" ] || err "server/.env not found"
[ -f "$ROOT_DIR/upload-service/.env" ] || err "upload-service/.env not found"
[ -f "$ROOT_DIR/runner-service/.env" ] || err "runner-service/.env not found"
[ -f "$ROOT_DIR/proxy-service/.env" ] || err "proxy-service/.env not found"
[ -f "$DEPLOY_DIR/origin.pem" ] || err "origin.pem not found in deployment/"
[ -f "$DEPLOY_DIR/origin.key" ] || err "origin.key not found in deployment/"

chmod 400 "$KEY"
log "All prerequisites verified.."

# ── Step 1: Terraform Apply ───────────────────────────────
log "Step 1: Provisioning EC2 Instance via Terraform..."
cd "$TF_DIR"
terraform init -upgrade -input=false > /dev/null
terraform apply -auto-approve -input=false

EC2=$(terraform output -raw public_ip)
log "EC2 Instance created: $EC2.."

# ── Step 2: Wait for SSH ──────────────────────────────────
log "Step 2: Waiting for SSH to be ready..."
RETRIES=30
for i in $(seq 1 $RETRIES); do
  if ssh -i "$KEY" -o ConnectTimeout=5 -o StrictHostKeyChecking=no \
    ubuntu@$EC2 "echo ok" &>/dev/null; then
    log "SSH ready.."
    break
  fi
  warn "SSH not ready yet... attempt $i/$RETRIES"
  sleep 10
  [ $i -eq $RETRIES ] && err "SSH never became ready"
done

SSH="ssh -i $KEY -o StrictHostKeyChecking=no ubuntu@$EC2"

# ── Step 3: Install Dependencies ─────────────────────────
log "Step 3: Installing Docker, KIND, kubectl on EC2..."
scp -i "$KEY" -o StrictHostKeyChecking=no \
  "$DEPLOY_DIR/scripts/setup-ec2.sh" ubuntu@$EC2:/home/ubuntu/setup-ec2.sh
$SSH "sed -i 's/\r$//' /home/ubuntu/setup-ec2.sh && chmod +x /home/ubuntu/setup-ec2.sh && bash /home/ubuntu/setup-ec2.sh"
log "Dependencies installed.."

# ── Step 4: inotify Limits ───────────────────────────────
log "Step 4: Configuring inotify limits..."
$SSH "echo 'fs.inotify.max_user_instances=8192' | sudo tee -a /etc/sysctl.conf > /dev/null && \
      echo 'fs.inotify.max_user_watches=524288' | sudo tee -a /etc/sysctl.conf > /dev/null && \
      sudo sysctl -p > /dev/null && \
      sudo systemctl restart docker"
log "inotify limits configured.."

# ── Step 5: KIND Cluster ──────────────────────────────────
log "Step 5: Creating KIND cluster..."
scp -i "$KEY" -o StrictHostKeyChecking=no \
  "$K8S_DIR/kind-config.yaml" ubuntu@$EC2:/home/ubuntu/kind-config.yaml
scp -i "$KEY" -o StrictHostKeyChecking=no \
  "$DEPLOY_DIR/scripts/create-cluster.sh" ubuntu@$EC2:/home/ubuntu/create-cluster.sh
$SSH "sed -i 's/\r$//' /home/ubuntu/create-cluster.sh && \
      sed -i 's/kind create cluster.*/kind create cluster --name vercel-cluster --config \/home\/ubuntu\/kind-config.yaml/g' \
      /home/ubuntu/create-cluster.sh && \
      chmod +x /home/ubuntu/create-cluster.sh && \
      sg docker -c 'bash /home/ubuntu/create-cluster.sh'"
log "KIND cluster created.."

# ── Step 6: Verify Docker Socket ─────────────────────────
log "Step 6: Verifying Docker socket mount..."
$SSH "sg docker -c 'docker exec vercel-cluster-worker ls -la /var/run/docker.sock'" \
  || err "Docker socket not mounted in worker. Check kind-config.yaml"
log "Docker socket verified.."

# ── Step 7: ingress-nginx ─────────────────────────────────
log "Step 7: Installing ingress-nginx..."
$SSH "kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.12.0/deploy/static/provider/kind/deploy.yaml"
$SSH "kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=120s"
$SSH "kubectl delete validatingwebhookconfiguration ingress-nginx-admission --ignore-not-found=true"
log "ingress-nginx ready.."

# ── Step 8: Host Directories + SSL Certs ─────────────────
log "Step 8: Creating directories and transferring SSL certs..."
$SSH "sudo mkdir -p /home/ubuntu/vercel/builds /etc/nginx/conf.d /etc/ssl/cloudflare && \
      sudo chmod 777 /home/ubuntu/vercel/builds /etc/nginx/conf.d"
cat "$DEPLOY_DIR/origin.pem" | $SSH "sudo tee /etc/ssl/cloudflare/origin.pem > /dev/null"
cat "$DEPLOY_DIR/origin.key" | $SSH "sudo tee /etc/ssl/cloudflare/origin.key > /dev/null"
log "SSL certs transferred.."

# ── Step 9: Namespace + Secrets ─────────────────────────
log "Step 9: Creating namespace and K8s secrets..."
$SSH "kubectl create namespace vercel --dry-run=client -o yaml | kubectl apply -f -"
$SSH "mkdir -p /tmp/vercel-secrets"
cat "$ROOT_DIR/server/.env"          | $SSH "cat > /tmp/vercel-secrets/server.env"
cat "$ROOT_DIR/upload-service/.env"  | $SSH "cat > /tmp/vercel-secrets/upload-service.env"
cat "$ROOT_DIR/runner-service/.env"  | $SSH "cat > /tmp/vercel-secrets/runner-service.env"
cat "$ROOT_DIR/proxy-service/.env"   | $SSH "cat > /tmp/vercel-secrets/proxy-service.env"
scp -i "$KEY" -o StrictHostKeyChecking=no \
  "$DEPLOY_DIR/scripts/create-secrets.sh" ubuntu@$EC2:/home/ubuntu/create-secrets.sh
$SSH "sed -i 's/\r$//' /home/ubuntu/create-secrets.sh && bash /home/ubuntu/create-secrets.sh"
log "Secrets created.."

# ── Step 10: Transfer K8s Manifests ──────────────────────
log "Step 10: Transferring K8s manifests..."
for svc in upload-service server runner-service proxy-service; do
  $SSH "mkdir -p /home/ubuntu/k8s/$svc"
done

for f in \
  "upload-service/deployment.yaml" \
  "upload-service/service.yaml" \
  "server/deployment.yaml" \
  "server/service.yaml" \
  "runner-service/deployment.yaml" \
  "proxy-service/deployment.yaml" \
  "proxy-service/service.yaml" \
  "ingress.yaml"; do
  cat "$K8S_DIR/$f" | $SSH "cat > /home/ubuntu/k8s/$f"
done
log "Manifests transferred.."

# ── Step 11: Deploy All Services ─────────────────────────
log "Step 11: Deploying all services..."
$SSH "kubectl apply -f /home/ubuntu/k8s/upload-service/"
$SSH "kubectl apply -f /home/ubuntu/k8s/server/"
$SSH "kubectl apply -f /home/ubuntu/k8s/runner-service/"
$SSH "kubectl apply -f /home/ubuntu/k8s/proxy-service/"
$SSH "kubectl apply -f /home/ubuntu/k8s/ingress.yaml"
log "All manifests applied.."

# ── Step 12: Wait for All Pods ───────────────────────────
warn "Step 12: Waiting for all pods to be ready..."
$SSH "kubectl rollout status deployment/upload-service -n vercel --timeout=180s"
$SSH "kubectl rollout status deployment/server -n vercel --timeout=180s"
$SSH "kubectl rollout status deployment/runner-service -n vercel --timeout=180s"
$SSH "kubectl rollout status deployment/proxy-service -n vercel --timeout=180s"
log "All deployments ready.."

# ── Step 13: Final Summary ────────────────────────────────
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}   Deployment Complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "EC2 Public IP : $EC2"
echo "SSH Command   : ssh -i $KEY ubuntu@$EC2"
echo ""
echo "── Pod Status ──────────────────────────────"
$SSH "kubectl get pods -n vercel"
echo ""
echo "── Services ────────────────────────────────"
$SSH "kubectl get svc -n vercel"
echo ""
echo "── Ingress ─────────────────────────────────"
$SSH "kubectl get ingress -n vercel"
echo ""
echo -e "${YELLOW}Update Cloudflare DNS A records to: $EC2${NC}"
echo "   api-vercel.priyanshuvaliya.dev  → $EC2"
echo "   *.priyanshuvaliya.dev           → $EC2"
echo ""

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}        Have a nice day, Priyanshu          ${NC}"
echo -e "${GREEN}============================================${NC}"