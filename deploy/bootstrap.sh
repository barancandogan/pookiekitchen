#!/usr/bin/env bash
# ------------------------------------------------------------------
# One-time setup for pookie.nileapps.co.uk, meant to be pasted into the
# Hostinger browser terminal and run as root. Safe to run again: every step
# checks before it acts, and a second run is simply a deploy.
#
# It is written for a server that already hosts other sites — it installs one
# nginx vhost, for this hostname only, and never reloads nginx without
# `nginx -t` passing first.
#
# The repository is private, so the server needs its own read-only deploy key.
# The first run creates that key, prints it, and stops. Add it to GitHub, run
# the script again, and it clones, builds, publishes and requests a
# certificate.
#
# After this, deploying is:  /srv/pookiekitchen/deploy.sh
# ------------------------------------------------------------------
set -euo pipefail

REPO_SSH="git@github-pookie:barancandogan/pookiekitchen.git"
REPO_DIR="/srv/pookiekitchen"
WEB_ROOT="/var/www/pookie"
DOMAIN="pookie.nileapps.co.uk"
KEY="/root/.ssh/pookie_deploy"
VHOST="/etc/nginx/sites-available/pookie"

say()  { printf '\n\033[1m→ %s\033[0m\n' "$*"; }
fail() { printf '\n\033[31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || fail "run this as root"

# ---------------------------------------------------------------- packages
say "checking what is installed"
need=()
for c in git rsync nginx curl; do command -v "$c" >/dev/null || need+=("$c"); done
command -v ssh-keygen >/dev/null || need+=(openssh-client)
command -v certbot >/dev/null || need+=(certbot python3-certbot-nginx)
if [ ${#need[@]} -gt 0 ]; then
  say "installing: ${need[*]}"
  apt-get update -qq
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq "${need[@]}"
fi

# Node 18+ builds the site. The other site on this box may already have it.
node_ok=false
if command -v node >/dev/null; then
  v=$(node -v | sed 's/^v//; s/\..*//')
  if [ "${v:-0}" -ge 18 ]; then node_ok=true; fi
fi
if [ "$node_ok" = false ]; then
  say "installing Node 20"
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq nodejs
fi
echo "  node $(node -v), nginx $(nginx -v 2>&1 | sed 's/.*\///')"

# -------------------------------------------------------------- deploy key
mkdir -p /root/.ssh && chmod 700 /root/.ssh
if [ ! -f "$KEY" ]; then
  say "creating a read-only deploy key for this server"
  ssh-keygen -t ed25519 -C "pookie-deploy@$(hostname)" -f "$KEY" -N "" >/dev/null
fi
if ! grep -q "^Host github-pookie$" /root/.ssh/config 2>/dev/null; then
  cat >> /root/.ssh/config <<EOF

Host github-pookie
  HostName github.com
  User git
  IdentityFile $KEY
  IdentitiesOnly yes
EOF
  chmod 600 /root/.ssh/config
fi
ssh-keygen -F github.com >/dev/null 2>&1 \
  || ssh-keyscan -t rsa,ed25519 github.com >> /root/.ssh/known_hosts 2>/dev/null \
  || true

# Can the key read the repository yet?
if ! GIT_SSH_COMMAND="ssh -o BatchMode=yes" git ls-remote "$REPO_SSH" >/dev/null 2>&1; then
  cat <<EOF

────────────────────────────────────────────────────────────────────
This server cannot read the repository yet. Add its key to GitHub:

  1. Copy the line below, all of it.
  2. Open https://github.com/barancandogan/pookiekitchen/settings/keys/new
  3. Title: this server.  Key: paste.  Leave "Allow write access" OFF.
  4. Run this script again.

$(cat "$KEY.pub")

────────────────────────────────────────────────────────────────────
EOF
  exit 0
fi

# ------------------------------------------------------------------- clone
if [ -d "$REPO_DIR/.git" ]; then
  say "updating $REPO_DIR"
  git -C "$REPO_DIR" remote set-url origin "$REPO_SSH"
  git -C "$REPO_DIR" fetch --quiet origin main
  git -C "$REPO_DIR" reset --hard --quiet origin/main
else
  say "cloning into $REPO_DIR"
  git clone --quiet "$REPO_SSH" "$REPO_DIR"
fi
chmod +x "$REPO_DIR/deploy.sh"

# ------------------------------------------------------------------- nginx
if [ ! -f "$VHOST" ]; then
  say "installing the nginx vhost for $DOMAIN"
  install -m 644 "$REPO_DIR/deploy/nginx.conf" "$VHOST"
  ln -sfn "$VHOST" /etc/nginx/sites-enabled/pookie
  mkdir -p "$WEB_ROOT"
  nginx -t
  systemctl reload nginx
fi

# ------------------------------------------------------- build and publish
say "building and publishing"
"$REPO_DIR/deploy.sh"

# --------------------------------------------------------------------- TLS
if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
  resolved="$(getent ahostsv4 "$DOMAIN" 2>/dev/null | awk '{print $1; exit}' || true)"
  if [ -z "$resolved" ]; then
    echo "  $DOMAIN does not resolve yet — skipping the certificate, http only"
  elif ! hostname -I | tr ' ' '\n' | grep -qx "$resolved"; then
    echo "  $DOMAIN points at $resolved, not this server — skipping the certificate"
  else
    say "requesting a certificate"
    reg=()
    if [ -z "$(ls -A /etc/letsencrypt/accounts 2>/dev/null || true)" ]; then
      echo "  no Let's Encrypt account on this server yet, registering without an email"
      echo "  (add one later with: certbot update_account -m you@example.com)"
      reg=(--register-unsafely-without-email)
    fi
    certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos "${reg[@]+"${reg[@]}"}" --redirect \
      || echo "  certbot failed; the site is up on http. See /var/log/letsencrypt/letsencrypt.log"
  fi
fi

# ------------------------------------------------------------------ report
say "checking the site answers"
code=$(curl -s -o /dev/null -w '%{http_code}' -H "Host: $DOMAIN" http://127.0.0.1/ || echo 000)
echo "  http://127.0.0.1/ with Host: $DOMAIN  ->  $code"
tls=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "https://$DOMAIN/" || echo 000)
echo "  https://$DOMAIN/                      ->  $tls"

cat <<EOF

Done. $(git -C "$REPO_DIR" rev-parse --short HEAD) is live in $WEB_ROOT.

From now on, deploying the latest main is one command:

  $REPO_DIR/deploy.sh

EOF
