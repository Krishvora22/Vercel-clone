#!/bin/bash
set -euo pipefail   

echo "============================================"
echo " Vercel — EC2 Setup Script"
echo "============================================"

# ── 1. System Update ───
echo "[1/6] Updating system packages..."
sudo apt-get update -qq
sudo apt-get upgrade -y -qq
echo "System updated.."

# ── 2. Install Docker ───
echo "[2/6] Installing Docker..."
sudo apt-get install -y ca-certificates curl gnupg

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) \
  signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update -qq
sudo apt-get install -y docker-ce docker-ce-cli containerd.io

sudo usermod -aG docker ubuntu
echo "Docker installed.."

# ── 3. Install kubectl ───
echo "[3/6] Installing kubectl..."
curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.33/deb/Release.key | \
  sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg

echo "deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] \
  https://pkgs.k8s.io/core:/stable:/v1.33/deb/ /" | \
  sudo tee /etc/apt/sources.list.d/kubernetes.list > /dev/null

sudo apt-get update -qq
sudo apt-get install -y kubectl
echo "kubectl installed.."

# ── 4. Install KIND ───
echo "[4/6] Installing KIND..."
KIND_VERSION="v0.27.0"
curl -fsSL \
  "https://kind.sigs.k8s.io/dl/${KIND_VERSION}/kind-linux-amd64" \
  -o /tmp/kind
sudo install -o root -g root -m 0755 /tmp/kind /usr/local/bin/kind
echo "KIND installed.."

# ── 5. Install Helper Tools ───
echo "[5/6] Installing helper tools..."
sudo apt-get install -y jq git curl wget unzip
echo "Helper tools installed.."

# ── 6. Version Verification ───
echo "[6/6] Verifying installations..."
echo ""
echo "── Docker ──────────────────────────────────"
docker --version

echo "── kubectl ─────────────────────────────────"
kubectl version --client

echo "── KIND ────────────────────────────────────"
kind version

echo ""
echo "============================================"
echo "EC2 Setup Complete.."
echo "============================================"