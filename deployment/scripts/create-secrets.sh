#!/bin/bash
set -euo pipefail

echo "============================================"
echo " Vercel Clone — Creating K8s Secrets"
echo "============================================"

NAMESPACE="vercel"
SECRETS_DIR="/tmp/vercel-secrets"

echo "[1/3] Verifying env files..."
for f in server.env upload-service.env runner-service.env proxy-service.env; do
  if [ ! -f "${SECRETS_DIR}/${f}" ]; then
    echo "Missing: ${SECRETS_DIR}/${f}"
    exit 1
  fi
  echo "Found: ${f}.."
done

echo ""
echo "[2/3] Creating Kubernetes secrets..."

kubectl create secret generic secret-server \
  --from-env-file="${SECRETS_DIR}/server.env" \
  --namespace="${NAMESPACE}" \
  --dry-run=client -o yaml | kubectl apply -f -
echo "secret-server created.."

kubectl create secret generic secret-upload-service \
  --from-env-file="${SECRETS_DIR}/upload-service.env" \
  --namespace="${NAMESPACE}" \
  --dry-run=client -o yaml | kubectl apply -f -
echo "secret-upload-service created.."

kubectl create secret generic secret-runner-service \
  --from-env-file="${SECRETS_DIR}/runner-service.env" \
  --namespace="${NAMESPACE}" \
  --dry-run=client -o yaml | kubectl apply -f -
echo "secret-runner-service created.."

kubectl create secret generic secret-proxy-service \
  --from-env-file="${SECRETS_DIR}/proxy-service.env" \
  --namespace="${NAMESPACE}" \
  --dry-run=client -o yaml | kubectl apply -f -
echo "secret-proxy-service created.."

echo ""
echo "[3/3] Cleaning up env files from EC2 disk..."
rm -rf "${SECRETS_DIR}"
echo "/tmp/vercel-secrets deleted.."

echo ""
echo "============================================"
echo "All Secrets Created Successfully"
echo "============================================"
echo ""
kubectl get secrets -n "${NAMESPACE}"