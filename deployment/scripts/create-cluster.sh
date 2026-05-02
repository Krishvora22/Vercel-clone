#!/bin/bash
set -euo pipefail

echo "============================================"
echo " Vercel Clone — KIND Cluster Setup"
echo "============================================"

CLUSTER_NAME="vercel-cluster"

echo "[1/4] Checking existing clusters..."
if kind get clusters 2>/dev/null | grep -q "^${CLUSTER_NAME}$"; then
  echo "Cluster '${CLUSTER_NAME}' already exists. Deleting it first..."
  kind delete cluster --name "${CLUSTER_NAME}"
  echo "Old cluster deleted.."
fi

echo "[2/4] Writing KIND cluster config..."
cat <<EOF > /tmp/kind-config.yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
name: ${CLUSTER_NAME}
nodes:
  - role: control-plane
    kubeadmConfigPatches:
      - |
        kind: InitConfiguration
        nodeRegistration:
          kubeletExtraArgs:
            node-labels: "ingress-ready=true"
    extraPortMappings:
      - containerPort: 80
        hostPort: 80
        protocol: TCP
      - containerPort: 443
        hostPort: 443
        protocol: TCP
  - role: worker
    extraMounts:
      - hostPath: /var/run/docker.sock
        containerPath: /var/run/docker.sock
      - hostPath: /home/ubuntu/vercel/builds
        containerPath: /home/ubuntu/vercel/builds
      - hostPath: /etc/nginx/conf.d
        containerPath: /etc/nginx/conf.d
      - hostPath: /etc/ssl/cloudflare
        containerPath: /etc/ssl/cloudflare
EOF
echo "KIND config written.."

echo "[3/4] Creating KIND cluster (this takes 2-3 mins)..."
kind create cluster --config /tmp/kind-config.yaml
echo "KIND cluster created.."

echo "[4/4] Installing ingress-nginx..."
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.12.0/deploy/static/provider/kind/deploy.yaml

echo "Waiting for ingress-nginx controller to be ready..."
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=120s

echo ""
echo "============================================"
echo " KIND Cluster Ready.."
echo "============================================"

echo ""
echo "── Nodes ───────────────────────────────────"
kubectl get nodes

echo ""
echo "── Namespaces ──────────────────────────────"
kubectl get namespaces

echo ""
echo "── ingress-nginx pods ──────────────────────"
kubectl get pods -n ingress-nginx