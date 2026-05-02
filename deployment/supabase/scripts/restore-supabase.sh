#!/bin/bash
set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[SUPABASE]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()  { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

DOCKER_DIR="/home/ubuntu/supabase/docker"

echo "============================================"
echo " Supabase — Restore From Snapshot"
echo "============================================"

# ── 1. Verify snapshot contents ───────────────────────────
log "[1/5] Verifying snapshot contents..."
[ -d "$DOCKER_DIR" ] || err "Supabase docker dir not found — wrong snapshot?"
[ -f "$DOCKER_DIR/docker-compose.yml" ] || err "docker-compose.yml not found"
echo "  Supabase docker directory found"
echo "  docker-compose.yml found"

# ── 2. Ensure Docker is running ───────────────────────────
log "[2/5] Ensuring Docker is running..."
sudo systemctl start docker
sudo systemctl enable docker

for i in $(seq 1 10); do
  if sg docker -c "docker info" > /dev/null 2>&1; then
    echo " Docker is ready.."
    break
  fi
  warn "  Waiting for Docker... attempt $i/10"
  sleep 3
  [ $i -eq 10 ] && err "Docker daemon not responding"
done

# ── 3. Apply updated .env ─────────────────────────────────
log "[3/5] Applying .env file..."
[ -f "/tmp/supabase.env" ] || err ".env not found at /tmp/supabase.env"

# Backup existing .env
if [ -f "$DOCKER_DIR/.env" ]; then
  cp "$DOCKER_DIR/.env" "$DOCKER_DIR/.env.backup.$(date +%Y%m%d%H%M%S)"
  echo "  Existing .env backed up"
fi

cp /tmp/supabase.env "$DOCKER_DIR/.env"
rm -f /tmp/supabase.env
echo "  New .env applied"
echo "  /tmp/supabase.env cleaned up"

# ── 4. Start Supabase containers ──────────────────────────
log "[4/5] Starting Supabase containers..."
cd "$DOCKER_DIR"

sg docker -c "docker compose down --remove-orphans" 2>/dev/null || true
echo "   Stopped any existing containers"

sg docker -c "docker compose up -d"
echo "   Containers started"

# ── 5. Health check ───────────────────────────────────────
log "[5/5] Waiting for services to be healthy..."
sleep 20

echo ""
echo "── Container Status ────────────────────────"
sg docker -c "docker compose ps"

echo ""
echo "── Kong Health ─────────────────────────────"
KONG_PORT=$(grep "^KONG_HTTP_PORT=" "$DOCKER_DIR/.env" | cut -d'=' -f2-)
KONG_PORT=${KONG_PORT:-8000}

for i in $(seq 1 12); do
  if curl -sf "http://localhost:${KONG_PORT}/" > /dev/null 2>&1; then
    echo "   Kong responding on port $KONG_PORT"
    break
  fi
  warn "  Kong not ready yet... attempt $i/12"
  sleep 5
  [ $i -eq 12 ] && warn "Kong slow to start — check: docker compose logs kong"
done

echo ""
echo "============================================"
echo " Supabase Restored and Running Successfully "
echo "        Have a Nice Day, Priyanshu          "
echo "============================================"