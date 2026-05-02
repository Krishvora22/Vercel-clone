#!/bin/bash
set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[DESTROY]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()  { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TF_DIR="$(cd "$SCRIPT_DIR/../terraform" && pwd)"

warn "This will DESTROY the EC2 instance and all running services !!"
read -p "Are you sure? Type 'yes' to confirm: " CONFIRM
[ "$CONFIRM" = "yes" ] || { log "Aborted."; exit 0; }

log "Running terraform destroy..."
cd "$TF_DIR"
terraform destroy -auto-approve -input=false

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN} Infrastructure destroyed successfully      ${NC}"
echo -e "${GREEN}      Have a nice day, Priyanshu            ${NC}"
echo -e "${GREEN}============================================${NC}"