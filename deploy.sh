#!/usr/bin/env bash
# ------------------------------------------------------------------
# Deploy the site on the VPS that serves pookie.nileapps.co.uk.
# Run it on the server, as root:  /srv/pookiekitchen/deploy.sh
#
# One-time setup for a new server is in README.md under "Deployment".
# ------------------------------------------------------------------
set -euo pipefail

REPO_DIR="/srv/pookiekitchen"
WEB_ROOT="/var/www/pookie"
BRANCH="main"
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

cd "$REPO_DIR"

echo "→ fetching $BRANCH"
git fetch --quiet origin "$BRANCH"
git reset --hard --quiet "origin/$BRANCH"

echo "→ building"
node build.js

# The audit is the gate, not a report. It exits non-zero on a structural or
# accessibility failure and on any launch-gate breach — and `set -e` means a
# broken build never reaches the web root.
echo "→ auditing"
node audit.js

echo "→ publishing to $WEB_ROOT"
mkdir -p "$WEB_ROOT"
rsync -a --delete dist/ "$WEB_ROOT/"
chown -R www-data:www-data "$WEB_ROOT"

sync_csp "$REPO_DIR/deploy/nginx.conf" "$VHOST"

echo "→ reloading nginx"
nginx -t
systemctl reload nginx

echo "deployed $(git rev-parse --short HEAD) → $WEB_ROOT"
