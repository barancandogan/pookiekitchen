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

DOMAIN="pookiechicken.com"
STAGING_HOST="pookie.nileapps.co.uk"
NAMES="$DOMAIN www.$DOMAIN $STAGING_HOST"   # every name the vhost answers for
CERT_NAME="$STAGING_HOST"                   # certbot's lineage, as in deploy.sh
STAGE="/srv/pookie-deploy"
WEB_ROOT="/var/www/pookie"
VHOST="/etc/nginx/sites-available/pookie"

# The CSP lives in deploy/nginx.conf, but the live vhost is certbot's file
# now — it was installed once and then rewritten in place with the TLS
# block, so it must never be overwritten wholesale. This copies exactly one
# directive across: the Content-Security-Policy line, whenever the
# repository's differs from the server's. nginx -t below is the guard.
sync_csp() {
  local src="$1" vhost="$2"
  [ -f "$vhost" ] || return 0
  local want have
  want="$(grep -A1 'add_header Content-Security-Policy' "$src" | tail -1 | sed 's/^[[:space:]]*//')"
  have="$(grep -A1 'add_header Content-Security-Policy' "$vhost" | tail -1 | sed 's/^[[:space:]]*//')"
  [ -n "$want" ] && [ "$want" != "$have" ] || return 0
  echo "→ updating Content-Security-Policy in $vhost"
  python3 - "$vhost" "$want" <<'PYEOF'
import io, re, sys
p, want = sys.argv[1], sys.argv[2]
s = io.open(p, encoding='utf-8').read()
s2, n = re.subn(r'(add_header Content-Security-Policy\n)[ \t]*[^\n]*', lambda m: m.group(1) + '        ' + want, s, count=1)
assert n == 1, 'CSP directive not found in the live vhost'
io.open(p, 'w', encoding='utf-8').write(s2)
PYEOF
}

[ "$(id -u)" -eq 0 ] || { echo "remote.sh must run as root" >&2; exit 1; }

# The owner's panel (README → The panel) keeps its edits and photographs
# outside git, and deploy.sh builds the site with them. The build that
# arrived in $STAGE was made on GitHub and knows nothing of them, so once
# the panel is installed it must not be published over the owner's: this
# hands over to deploy.sh, which fetches this same commit into its clone,
# builds with the owner's content, audits and publishes.
PANEL_REPO="/srv/pookiekitchen"
if [ -f /etc/systemd/system/pookie-admin.service ] && [ -f "$PANEL_REPO/deploy.sh" ]; then
  echo "→ the panel is installed: deploying through $PANEL_REPO/deploy.sh so the owner's edits survive"
  exec bash "$PANEL_REPO/deploy.sh"
fi
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

# 3. the one directive we keep in step with the repo, then reload, guarded
sync_csp "$STAGE/deploy/nginx.conf" "$VHOST"
echo "→ reloading nginx"
nginx -t
systemctl reload nginx

# 4. TLS, once. deploy.sh (the panel path above) is what keeps the certificate
#    in step with the names afterwards.
if [ ! -d "/etc/letsencrypt/live/$CERT_NAME" ]; then
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
    ds=(); for n in $NAMES; do ds+=(-d "$n"); done
    certbot --nginx --cert-name "$CERT_NAME" "${ds[@]}" --non-interactive --agree-tos --redirect \
      || echo "::warning::certbot failed; the site is up on http only. See /var/log/letsencrypt/letsencrypt.log"
  fi
fi

echo "deployed → $WEB_ROOT ($(du -sh "$WEB_ROOT" | cut -f1))"
