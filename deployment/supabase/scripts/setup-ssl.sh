#!/bin/bash
set -euo pipefail

DOMAIN="supabase.priyanshuvaliya.dev"

log() { echo "[SSL] $1"; }
err() { echo "[ERROR] $1"; exit 1; }

log "[1/6] Cleaning old nginx configs..."
sudo rm -f /etc/nginx/sites-enabled/*
sudo rm -f /etc/nginx/sites-available/*

log "[2/6] Creating fresh nginx config..."

sudo tee /etc/nginx/sites-available/supabase > /dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl;
    server_name $DOMAIN;

    ssl_certificate /etc/ssl/cloudflare/origin.pem;
    ssl_certificate_key /etc/ssl/cloudflare/origin.key;

    location / {
        proxy_pass http://127.0.0.1:8000;

        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        proxy_http_version 1.1;
        proxy_set_header Connection "";
    }
}
EOF

log "[3/6] Enabling config..."
sudo ln -s /etc/nginx/sites-available/supabase /etc/nginx/sites-enabled/

log "[4/6] Testing nginx config..."
sudo nginx -t || err "Nginx config invalid"

log "[5/6] Restarting nginx..."
sudo systemctl restart nginx

log "[6/6] Verifying proxy (CRITICAL)..."

RESPONSE=$(curl -k -s -o /dev/null -w "%{http_code}" https://localhost || true)

if [[ "$RESPONSE" == "401" || "$RESPONSE" == "200" ]]; then
  log "Proxy working  (HTTP $RESPONSE).."
else
  err "Proxy FAILED  (HTTP $RESPONSE) !!"
fi

log "Nginx + SSL fully working.."