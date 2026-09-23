#!/usr/bin/env bash
# ------------------------------------------------------------------
# Deploy the site on the VPS that serves pookiechicken.com.
# Run it on the server, as root:  /srv/pookiekitchen/deploy.sh
#
# One-time setup for a new server is in README.md under "Deployment".
# ------------------------------------------------------------------
set -euo pipefail

REPO_DIR="/srv/pookiekitchen"
WEB_ROOT="/var/www/pookie"
BRANCH="main"
VHOST="/etc/nginx/sites-available/pookie"
DOMAIN="pookiechicken.com"                  # the site
STAGING_HOST="pookie.nileapps.co.uk"        # where it lived first; sent to the site now
NAMES="$DOMAIN www.$DOMAIN $STAGING_HOST"   # every name the vhost answers for
CERT_NAME="$STAGING_HOST"                   # certbot's lineage: made for the staging host, expanded in place since
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

# server_name, the same way: the repository decides which names the vhost
# answers for, certbot's file keeps everything else. Both server blocks — the
# https one and certbot's port-80 redirect — get the same list.
sync_server_name() {
  local vhost="$1" names="$2"
  [ -f "$vhost" ] || return 0
  grep -q "server_name $names;" "$vhost" && return 0
  echo "→ updating server_name in $vhost"
  python3 - "$vhost" "$names" <<'PY_SERVER_NAME'
import io, re, sys
p, names = sys.argv[1], sys.argv[2]
s = io.open(p, encoding='utf-8').read()
s2, n = re.subn(r'\bserver_name\s+[^;]*;', 'server_name ' + names + ';', s)
assert n >= 1, 'server_name not found in the live vhost'
io.open(p, 'w', encoding='utf-8').write(s2)
PY_SERVER_NAME
}

# Does the certificate certbot keeps cover every name the vhost answers for?
cert_covers() {
  local cert="/etc/letsencrypt/live/$CERT_NAME/fullchain.pem" text n
  [ -f "$cert" ] || return 1
  text="$(openssl x509 -in "$cert" -noout -text 2>/dev/null || true)"
  for n in $NAMES; do
    grep -q "DNS:$n\([,[:space:]]\|$\)" <<< "$text" || return 1
  done
}

# Every name must resolve to this machine before Let's Encrypt is asked: a
# failed validation counts against its rate limit, so there is no point asking
# early. Says which name is not ready.
names_point_here() {
  local mine n ip
  mine="$(hostname -I 2>/dev/null || true)"
  for n in $NAMES; do
    ip="$(getent ahostsv4 "$n" 2>/dev/null | awk '{ print $1; exit }' || true)"
    [ -n "$ip" ] || { echo "  $n does not resolve yet"; return 1; }
    echo "$mine" | tr ' ' '\n' | grep -qx "$ip" || { echo "  $n points at $ip, not this server"; return 1; }
  done
}

# Expand the certificate to every name, once DNS allows. certbot's nginx
# plugin answers the challenge itself and reloads nginx; the vhost must
# already carry the names (sync_server_name) for it to find the block.
ensure_certificate() {
  cert_covers && return 0
  echo "→ the certificate does not cover $NAMES yet"
  names_point_here || { echo "  skipping certbot until DNS is right; run deploy.sh again later"; return 0; }
  command -v certbot >/dev/null || { echo "  certbot is not installed; skipping"; return 0; }
  local reg=() ds=() n
  [ -n "$(ls -A /etc/letsencrypt/accounts 2>/dev/null || true)" ] || reg=(--register-unsafely-without-email)
  for n in $NAMES; do ds+=(-d "$n"); done
  echo "→ asking Let's Encrypt to cover $NAMES"
  certbot --nginx --expand --cert-name "$CERT_NAME" "${ds[@]}" --non-interactive --agree-tos "${reg[@]+"${reg[@]}"}" \
    || echo "  certbot failed — see /var/log/letsencrypt/letsencrypt.log. The site stays on https://$STAGING_HOST"
}

# The redirects, written only once the certificate covers every name (a
# redirect into a name the certificate does not cover is a browser warning
# where there was a working page). Idempotent: each line is added if absent.
# Returns 0 when it changed the vhost, 1 when there was nothing to do.
ensure_redirects() {
  [ -f "$VHOST" ] || return 1
  python3 - "$VHOST" "$DOMAIN" "$NAMES" <<'PY_REDIRECTS'
import io, re, sys
p, domain, names = sys.argv[1], sys.argv[2], sys.argv[3].split()
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
def body(b): return t[b[0]:b[1]]
site = [b for b in blocks if re.search(r'\broot\s+', body(b))]
http = [b for b in blocks if not re.search(r'\broot\s+', body(b)) and re.search(r'\blisten\s+[^;]*\b80\b', body(b))]
if not site or not http:
    sys.exit(1)          # certbot has not split the vhost yet: nothing to redirect
site, http = site[0], http[0]
edits = []
# certbot's port-80 block: any name without a redirect there goes to the site
missing = [n for n in names if not re.search(r'\$host\s*=\s*' + re.escape(n) + r'\s*\)', body(http))]
if missing:
    at = s.index('\n', http[0]) + 1
    edits.append((at, ''.join(f'    if ($host = {n}) {{ return 301 https://{domain}$request_uri; }}\n' for n in missing)))
# the site's block: every other name it answers for is sent to the site
if not re.search(r'\$host\s*!=\s*' + re.escape(domain) + r'\s*\)', body(site)):
    m = re.compile(r'[ \t]*server_name\b[^;]*;[^\n]*\n').search(s, site[0], site[1])
    assert m, 'no server_name in the site block'
    edits.append((m.end(), f'    if ($host != {domain}) {{ return 301 https://{domain}$request_uri; }}\n'))
if not edits:
    sys.exit(1)
for at, text in sorted(edits, reverse=True):
    s = s[:at] + text + s[at:]
io.open(p, 'w', encoding='utf-8').write(s)
PY_REDIRECTS
}

cd "$REPO_DIR"

echo "→ fetching $BRANCH"
git fetch --quiet origin "$BRANCH"
git reset --hard --quiet "origin/$BRANCH"

echo "→ building"
node build.js

# The audit is the gate, not a report. It exits non-zero on a structural or
# accessibility failure (missing facts are warnings, never failures) — and
# `set -e` means a broken build never reaches the web root.
echo "→ auditing"
node audit.js

echo "→ publishing to $WEB_ROOT"
mkdir -p "$WEB_ROOT"
rsync -a --delete dist/ "$WEB_ROOT/"
chown -R www-data:www-data "$WEB_ROOT"

sync_csp "$REPO_DIR/deploy/nginx.conf" "$VHOST"
sync_server_name "$VHOST" "$NAMES"

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

# The domain. The names are in the vhost by now; the certificate is expanded
# to cover them once DNS points every one of them here, and the redirects —
# www and the staging host to the site, http to https — are written only once
# it does. Until then the site answers on every name it has a certificate
# for, and says so below.
ensure_certificate
if cert_covers; then
  if ensure_redirects; then
    echo "→ redirects written; reloading nginx"
    nginx -t
    systemctl reload nginx
  fi
  echo "  https://$DOMAIN is live; www.$DOMAIN and $STAGING_HOST redirect to it"
else
  echo "  https://$DOMAIN is NOT live yet: the certificate does not cover it. The site stays on https://$STAGING_HOST"
fi

if [ ! -f "$CONTENT_DIR/admin.json" ]; then
  echo
  echo "  The panel has no password yet. Set one with:"
  echo "    sudo -u www-data POOKIE_CONTENT_DIR=$CONTENT_DIR node $REPO_DIR/admin/server.js --set-password"
  echo "  then sign in at https://$DOMAIN/admin/"
fi

echo "deployed $(git rev-parse --short HEAD) → $WEB_ROOT"
