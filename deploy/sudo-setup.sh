#!/usr/bin/env bash
# Skyview (tapiocataste.com) — one-time privileged setup: DB, nginx, TLS.
# Run once as: sudo bash /var/www/skyview/deploy/sudo-setup.sh
set -euo pipefail

echo "==> Creating Postgres role + database (skyview)"
sudo -u postgres psql -v ON_ERROR_STOP=1 -f /var/www/skyview/deploy/db-setup.sql

echo "==> Installing nginx site (tapiocataste.com)"
cp /var/www/skyview/deploy/nginx-tapiocataste.conf /etc/nginx/sites-available/tapiocataste
ln -sf /etc/nginx/sites-available/tapiocataste /etc/nginx/sites-enabled/tapiocataste
nginx -t
systemctl reload nginx

echo "==> Requesting TLS certificate (certbot)"
certbot --nginx -d tapiocataste.com -d www.tapiocataste.com \
  --non-interactive --agree-tos -m walaalpakar08@gmail.com --redirect

echo "==> Done."
echo "    nginx: tapiocataste.com/       -> 127.0.0.1:3002 (web)"
echo "    nginx: tapiocataste.com/api/   -> 127.0.0.1:5000 (api)"
echo "    TLS certificate installed and auto-renew configured by certbot."
