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

echo "→ reloading nginx"
nginx -t
systemctl reload nginx

echo "deployed $(git rev-parse --short HEAD) → $WEB_ROOT"
