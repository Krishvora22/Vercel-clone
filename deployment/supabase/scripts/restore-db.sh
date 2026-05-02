#!/bin/bash
set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[RESTORE]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()  { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ── Config ────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"
DEPLOY_DIR="$ROOT_DIR/deployment"
SUPABASE_DIR="$DEPLOY_DIR/supabase"
TF_DIR="$SUPABASE_DIR/terraform"
KEY="$DEPLOY_DIR/vercel.pem"

chmod 400 "$KEY"

# ── Step 1: Terraform Apply ───────────────────────────────
log "Provisioning EC2 from snapshot via Terraform..."
cd "$TF_DIR"
terraform init -upgrade -input=false > /dev/null
terraform apply -auto-approve -input=false

EC2=$(terraform output -raw public_ip)
log "EC2 created from snapshot: $EC2"

SSH="ssh -i $KEY -o StrictHostKeyChecking=no ubuntu@$EC2"

# ── Step 2: Wait for SSH ──────────────────────────────────
log "Step 2: Waiting for SSH to be ready..."
RETRIES=30
for i in $(seq 1 $RETRIES); do
  if ssh -i "$KEY" \
    -o ConnectTimeout=5 \
    -o StrictHostKeyChecking=no \
    ubuntu@$EC2 "echo ok" &>/dev/null; then
    log "SSH ready.."
    break
  fi
  warn "SSH not ready yet... attempt $i/$RETRIES"
  sleep 10
  [ $i -eq $RETRIES ] && err "SSH never became ready"
done

# ── Step 3: Transfer .env ─────────────────────────────────
log "Step 3: Transferring supabase .env..."
cat "$ROOT_DIR/deployment/supabase/.env" | $SSH "cat > /tmp/supabase.env"
log "Local .env transferred.."

# ── Step 4: Transfer + Run restore-supabase.sh ───────────
log "Step 4: Restoring Supabase containers..."
cat "$SUPABASE_DIR/scripts/restore-supabase.sh" | \
  $SSH "cat > /home/ubuntu/restore-supabase.sh"
$SSH "sed -i 's/\r$//' /home/ubuntu/restore-supabase.sh && \
      chmod +x /home/ubuntu/restore-supabase.sh && \
      bash /home/ubuntu/restore-supabase.sh"
log "Supabase containers running.."

# ── Step 5: Transfer SSL Certs ───────────────────────────
log "Step 5: Transferring Cloudflare SSL certificates..."
$SSH "sudo mkdir -p /etc/ssl/cloudflare"
cat "$DEPLOY_DIR/origin.pem" | $SSH "sudo tee /etc/ssl/cloudflare/origin.pem > /dev/null"
cat "$DEPLOY_DIR/origin.key" | $SSH "sudo tee /etc/ssl/cloudflare/origin.key > /dev/null"
$SSH "sudo chmod 644 /etc/ssl/cloudflare/origin.pem && \
      sudo chmod 600 /etc/ssl/cloudflare/origin.key"
log "SSL certs transferred.."

# ── Step 6: Transfer + Run setup-ssl.sh ──────────────────
log "Step 6: Configuring Nginx + SSL..."
cat "$SUPABASE_DIR/scripts/setup-ssl.sh" | \
  $SSH "cat > /home/ubuntu/setup-ssl.sh"
$SSH "sed -i 's/\r$//' /home/ubuntu/setup-ssl.sh && \
      chmod +x /home/ubuntu/setup-ssl.sh && \
      bash /home/ubuntu/setup-ssl.sh"
log "Nginx + SSL configured.."

# ── Step 7: Final verification ────────────────────────────
log "Step 7: Final health check..."
echo ""
echo "── Container Status ────────────────────────"
$SSH "cd /home/ubuntu/supabase/docker && sg docker -c 'docker compose ps --format \"table {{.Name}}\t{{.Status}}\"'"

echo ""
echo "── Nginx Status ────────────────────────────"
$SSH "sudo systemctl is-active nginx && echo 'Nginx: active'"

echo ""
echo "── Port Check ──────────────────────────────"
$SSH "sudo ss -tlnp | grep -E '80|443'"

echo ""
echo "── Kong Health ─────────────────────────────"
KONG_STATUS=$($SSH "curl -s -o /dev/null -w '%{http_code}' http://localhost:8000/" 2>/dev/null || echo "000")
if [ "$KONG_STATUS" = "401" ] || [ "$KONG_STATUS" = "200" ]; then
  echo "Kong responding: HTTP $KONG_STATUS.."
else
  warn "Kong returned: HTTP $KONG_STATUS — may still be starting"
fi

# ── Summary ───────────────────────────────────────────────
echo ""
echo "============================================"
echo -e "${GREEN}  Supabase Fully Restored !!${NC}"
echo "============================================"
echo ""
echo "EC2 Public IP  : $EC2"
echo "SSH Command    : ssh -i $KEY ubuntu@$EC2"
echo ""
echo -e "${YELLOW}  Update Cloudflare DNS"
echo "   supabase.priyanshuvaliya.dev → $EC2"
echo ""
echo "Once DNS propagates:"
echo "   Studio: https://supabase.priyanshuvaliya.dev"
echo "   Credentials: Username: supabase | Password: supabase@vercel"
echo ""