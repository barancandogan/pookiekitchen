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
CONTENT_DIR="/srv/pookie-content"           # the owner's edits live here, outside git
ADMIN_SNIPPET="/etc/nginx/snippets/pookie-admin.conf"
ADMIN_UNIT="/etc/systemd/system/pookie-admin.service"
export POOKIE_CONTENT_DIR="$CONTENT_DIR"    # so this build honours the panel's content

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

# The panel. Its content directory, owned by the service user; the nginx
# location, included into certbot's vhost by one inserted line; the systemd
# unit, refreshed from the repository and restarted so it runs this commit.
echo "→ the panel"
install -d -o www-data -g www-data -m 750 "$CONTENT_DIR"
install -d /etc/nginx/snippets
install -m 644 "$REPO_DIR/deploy/nginx-admin.conf" "$ADMIN_SNIPPET"
if [ -f "$VHOST" ] && ! grep -q "pookie-admin.conf" "$VHOST"; then
  echo "→ including the panel location in $VHOST"
  # Into the server block that serves the site — the one carrying `root
  # /var/www/pookie` — and not simply before the last brace in the file:
  # once certbot has run, the last block is its port-80 redirect, where a
  # location is never reached.
  python3 - "$VHOST" "$ADMIN_SNIPPET" "$WEB_ROOT" <<'PYEOF'
import io, re, sys
p, snip, root = sys.argv[1], sys.argv[2], sys.argv[3]
s = io.open(p, encoding='utf-8').read()
# Comments blanked rather than removed, so every offset still points into s.
t = '\n'.join(l if l.find('#') < 0 else l[:l.find('#')] + ' ' * (len(l) - l.find('#')) for l in s.split('\n'))
blocks, stack = [], []
for m in re.finditer(r'[{}]', t):
    if m.group() == '{':
        stack.append(m.start())
    elif stack:
        start = stack.pop()
        if not stack:
            blocks.append((start, m.start()))
assert blocks and not stack, 'could not parse the live vhost'
def has(b, needle): return re.search(needle, t[b[0]:b[1]]) is not None
pick = ([b for b in blocks if has(b, r'\broot\s+' + re.escape(root) + r'\s*;')]
        or [b for b in blocks if has(b, r'\blisten\s+[^;]*\b443\b')]
        or blocks[:1])[0]
end = pick[1]
s = s[:end].rstrip() + f'\n\n    include {snip};\n' + s[end:]
io.open(p, 'w', encoding='utf-8').write(s)
PYEOF
fi
install -m 644 "$REPO_DIR/deploy/pookie-admin.service" "$ADMIN_UNIT"
systemctl daemon-reload
systemctl enable --quiet pookie-admin
systemctl restart pookie-admin

echo "→ reloading nginx"
nginx -t
systemctl reload nginx

if [ ! -f "$CONTENT_DIR/admin.json" ]; then
  echo
  echo "  The panel has no password yet. Set one with:"
  echo "    sudo -u www-data POOKIE_CONTENT_DIR=$CONTENT_DIR node $REPO_DIR/admin/server.js --set-password"
  echo "  then sign in at https://pookie.nileapps.co.uk/admin/"
fi

echo "deployed $(git rev-parse --short HEAD) → $WEB_ROOT"
