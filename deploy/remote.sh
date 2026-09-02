#!/usr/bin/env bash
# ------------------------------------------------------------------
# Server side of a GitHub Actions deploy. Runs ON the VPS, as root, after
# the workflow has rsynced a freshly built and audited dist/ plus this
# deploy/ directory into $STAGE.
#
# Idempotent: it runs on every deploy and only changes what is missing.
#   1. nginx vhost, installed once from deploy/nginx.conf. certbot later
#      rewrites that file in place, so it is never overwritten again.
#   2. the build in $STAGE/dist becomes the web root
#   3. nginx is reloaded only after nginx -t passes — other sites share
#      this server and a broken config takes them down too
#   4. a certificate is requested once, and only when the domain already
#      resolves to this machine: a failed validation counts against
#      Let's Encrypt's rate limit, so there is no point asking early
#
# It can also be run by hand, e.g. from the hPanel browser terminal:
#   bash /srv/pookie-deploy/deploy/remote.sh
# ------------------------------------------------------------------
set -euo pipefail

DOMAIN="pookie.nileapps.co.uk"
STAGE="/srv/pookie-deploy"
WEB_ROOT="/var/www/pookie"
VHOST="/etc/nginx/sites-available/pookie"

[ "$(id -u)" -eq 0 ] || { echo "remote.sh must run as root" >&2; exit 1; }
[ -f "$STAGE/dist/index.html" ] || { echo "no build in $STAGE/dist" >&2; exit 1; }
command -v nginx >/dev/null || { echo "nginx is not installed" >&2; exit 1; }
command -v rsync >/dev/null || { echo "rsync is not installed" >&2; exit 1; }

# 1. vhost, once
if [ ! -f "$VHOST" ]; then
  echo "→ installing nginx vhost"
  install -m 644 "$STAGE/deploy/nginx.conf" "$VHOST"
  ln -sfn "$VHOST" /etc/nginx/sites-enabled/pookie
fi

# 2. publish
echo "→ publishing to $WEB_ROOT"
mkdir -p "$WEB_ROOT"
rsync -a --delete "$STAGE/dist/" "$WEB_ROOT/"
chown -R www-data:www-data "$WEB_ROOT"

# 3. reload, guarded
echo "→ reloading nginx"
nginx -t
systemctl reload nginx

# 4. TLS, once
if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
  resolved="$(getent ahostsv4 "$DOMAIN" 2>/dev/null | awk '{ print $1; exit }' || true)"
  if [ -z "$resolved" ]; then
    echo "::warning::$DOMAIN does not resolve yet; skipping the certificate (http only)"
  elif ! hostname -I | tr ' ' '\n' | grep -qx "$resolved"; then
    echo "::warning::$DOMAIN resolves to $resolved, which is not this server; skipping the certificate (http only)"
  elif ! command -v certbot >/dev/null; then
    echo "::warning::certbot is not installed; skipping the certificate (http only)"
  else
    echo "→ requesting a certificate for $DOMAIN"
    # Reuses the account certbot already has on this box (the other sites
    # use it). --redirect makes certbot write the port-80 → https server.
    certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --redirect \
      || echo "::warning::certbot failed; the site is up on http only. See /var/log/letsencrypt/letsencrypt.log"
  fi
fi

echo "deployed → $WEB_ROOT ($(du -sh "$WEB_ROOT" | cut -f1))"
