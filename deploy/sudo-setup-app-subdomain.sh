#!/usr/bin/env bash
# Skyview — move the app to app.tapiocataste.com; apex becomes a landing page.
# One-time privileged migration: nginx + TLS for the new subdomain.
# Run once as: sudo bash /var/www/skyview/deploy/sudo-setup-app-subdomain.sh
set -euo pipefail

LIVE=/etc/nginx/sites-available/tapiocataste
BACKUP="$LIVE.bak-$(date +%F)"

echo "==> Backing up current live config to $BACKUP"
cp "$LIVE" "$BACKUP"

echo "==> Installing landing-page config over $LIVE (apex: tapiocataste.com, www)"
cp /var/www/skyview/deploy/nginx-tapiocataste.conf "$LIVE"

echo "==> Installing app config (app.tapiocataste.com)"
cp /var/www/skyview/deploy/nginx-app-tapiocataste.conf /etc/nginx/sites-available/tapiocataste-app
ln -sf /etc/nginx/sites-available/tapiocataste-app /etc/nginx/sites-enabled/tapiocataste-app

echo "==> Testing + reloading nginx"
nginx -t
systemctl reload nginx

echo "==> Requesting TLS certificate for app.tapiocataste.com"
certbot --nginx -d app.tapiocataste.com \
  --non-interactive --agree-tos -m walaalpakar08@gmail.com --redirect

echo "==> Final reload"
nginx -t
systemctl reload nginx

echo "==> Done."
echo "    nginx: tapiocataste.com, www.tapiocataste.com -> static landing page (/var/www/skyview/landing)"
echo "    nginx: app.tapiocataste.com/       -> 127.0.0.1:3002 (web)"
echo "    nginx: app.tapiocataste.com/api/   -> 127.0.0.1:5000 (api)"
echo "    Backup of the old apex config: $BACKUP"
echo ""
echo "    NEXT: tell Claude this finished so it can rebuild the web app"
echo "    (bakes in the new API URL) and restart the skyview-web / skyview-api"
echo "    pm2 processes to pick up the new env vars."
