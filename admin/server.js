#!/usr/bin/env node
'use strict';

/**
 * The panel. One file, no dependencies — Node 18+ and nothing else, like the
 * build it drives.
 *
 *   node admin/server.js                 serve the panel on 127.0.0.1:8787
 *   node admin/server.js --set-password  set (or reset) the owner's password
 *
 * What it is: a small HTTP service behind nginx at /admin/ that lets the
 * restaurant's owner edit the content of the site — the menu, the photographs,
 * the hours, the opening date, the contact details — and publish it. It does
 * not edit code and it does not touch the repository. It reads and writes one
 * file, content.json, in a directory of its own (POOKIE_CONTENT_DIR), keeps a
 * copy of every version, and on Publish runs the same build.js and audit.js a
 * developer would run, into a directory of its own, and copies the result to
 * the web root only if the audit passes. The audit is the gate for the owner
 * exactly as it is for the developer: a broken build never reaches the site.
 *
 * Security, in order of what matters:
 *   - bound to 127.0.0.1; only nginx reaches it, over TLS
 *   - one password, scrypt-hashed in admin.json; eight failures in fifteen
 *     minutes locks that address out for fifteen minutes
 *   - the session is an HttpOnly, SameSite=Strict cookie (Secure behind TLS)
 *   - every write needs the X-Requested-With header, which a cross-site form
 *     cannot send, so SameSite has a belt to its braces
 *   - everything the owner types is validated by shape here and again by the
 *     audit; slugs and filenames match a fixed pattern before they touch disk
 *   - uploads are checked by their first bytes, not their name, and capped
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');

const ROOT = path.join(__dirname, '..');
const CONTENT_DIR = path.resolve(process.env.POOKIE_CONTENT_DIR || path.join(ROOT, 'content'));
const WEB_ROOT = process.env.POOKIE_WEB_ROOT ? path.resolve(process.env.POOKIE_WEB_ROOT) : null;
const DIST = path.join(CONTENT_DIR, 'build');
const PORT = Number(process.env.POOKIE_ADMIN_PORT) || 8787;
const BIND = process.env.POOKIE_ADMIN_BIND || '127.0.0.1';
const SECURE = process.env.POOKIE_ADMIN_SECURE === '1';

const AUTH_FILE = path.join(CONTENT_DIR, 'admin.json');
const CONTENT_FILE = path.join(CONTENT_DIR, 'content.json');
const STATE_FILE = path.join(CONTENT_DIR, 'state.json');
const PHOTOS = path.join(CONTENT_DIR, 'photos');
const VERSIONS = path.join(CONTENT_DIR, 'versions');
const KEEP_VERSIONS = 60;

const SESSION_TTL = 12 * 3600 * 1000;
const LOGIN_WINDOW = 15 * 60 * 1000;
const LOGIN_MAX = 8;
const JSON_LIMIT = 1 << 20;          // 1 MB of content
const PHOTO_LIMIT = 3 << 20;         // 3 MB per file
const SLUG = /^[a-z0-9][a-z0-9-]{1,40}$/;
const SIZES = ['400', '800', '1200'];
const EXTS = ['webp', 'jpg'];

/* ------------------------------------------------------------------ fs */

function ensureDirs() {
  for (const d of [CONTENT_DIR, PHOTOS, VERSIONS]) fs.mkdirSync(d, { recursive: true });
}
function readJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return fallback; }
}
function writeJSON(file, obj) {
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2) + '\n');
  fs.renameSync(tmp, file);                                      // atomic on the same filesystem
}

/* ------------------------------------------------------------ password */

// N=2^14, r=8: 16 MB per hash, comfortably under Node's default maxmem and
// still ~50 ms of work per guess, which for one password behind a rate limit
// is plenty. maxmem is stated so a future Node default cannot break sign-in.
const SCRYPT = { N: 1 << 14, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
function hashPassword(password, salt = crypto.randomBytes(16)) {
  const hash = crypto.scryptSync(password, salt, 64, SCRYPT);
  return { salt: salt.toString('hex'), hash: hash.toString('hex') };
}
function checkPassword(password) {
  const a = readJSON(AUTH_FILE, null);
  if (!a || !a.salt || !a.hash) return false;
  const want = Buffer.from(a.hash, 'hex');
  const got = crypto.scryptSync(password, Buffer.from(a.salt, 'hex'), want.length, SCRYPT);
  return want.length === got.length && crypto.timingSafeEqual(want, got);
}
function setPassword(password) {
  if (typeof password !== 'string' || password.length < 10) {
    throw new Error('the password must be at least 10 characters');
  }
  ensureDirs();
  writeJSON(AUTH_FILE, { ...hashPassword(password), set: new Date().toISOString() });
}

/* ------------------------------------------------------------ sessions */

const sessions = new Map();          // token -> { at }
const failures = new Map();          // ip -> { n, since }

function newSession() {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, { at: Date.now() });
  return token;
}
function sessionOf(req) {
  const m = /(?:^|;\s*)pookie_admin=([0-9a-f]{64})/.exec(req.headers.cookie || '');
  if (!m) return null;
  const s = sessions.get(m[1]);
  if (!s) return null;
  if (Date.now() - s.at > SESSION_TTL) { sessions.delete(m[1]); return null; }
  s.at = Date.now();
  return m[1];
}
function cookie(token, drop) {
  return `pookie_admin=${drop ? '' : token}; Path=/admin; HttpOnly; SameSite=Strict; Max-Age=${drop ? 0 : SESSION_TTL / 1000}${SECURE ? '; Secure' : ''}`;
}
function ipOf(req) {
  const xf = req.headers['x-forwarded-for'];
  return (xf ? String(xf).split(',')[0].trim() : req.socket.remoteAddress) || 'unknown';
}
function lockedOut(ip) {
  const f = failures.get(ip);
  if (!f) return false;
  if (Date.now() - f.since > LOGIN_WINDOW) { failures.delete(ip); return false; }
  return f.n >= LOGIN_MAX;
}
function noteFailure(ip) {
  const f = failures.get(ip);
  if (!f || Date.now() - f.since > LOGIN_WINDOW) failures.set(ip, { n: 1, since: Date.now() });
  else f.n++;
}

/* ------------------------------------------------------------- content */

// The seed: the repository's own data.js, which is the schema and the first
// draft. Loaded fresh in a child so that a stale module cache can never hand
// the panel yesterday's values.
function seedContent() {
  const D = require(path.join(ROOT, 'src', 'data.js'));
  const c = D.contact;
  return {
    announcement: D.site.announcement,
    contact: {
      phone: c.phone, email: c.email, cateringEmail: c.cateringEmail, jobsEmail: c.jobsEmail,
      address: { ...c.address }, hours: { ...c.hours }, lunchDeal: { ...c.lunchDeal },
    },
    delivery: D.delivery.map(x => ({ id: x.id, name: x.name, url: x.url })),
    company: { ...D.company },
    menu: D.menu.map(ch => ({ ...ch, items: ch.items.map(i => ({ ...i })) })),
    lunchDeal: { ...D.lunchDeal },
    allergens: { perItem: D.allergens.perItem, statement: D.allergens.statement },
    photos: {},
  };
}
function loadContent() {
  let c = readJSON(CONTENT_FILE, null);
  if (!c) { c = seedContent(); writeJSON(CONTENT_FILE, c); snapshot(c, 'seeded'); }
  return c;
}
function snapshot(content, note) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  writeJSON(path.join(VERSIONS, `${stamp}-${note}.json`), content);
  const all = fs.readdirSync(VERSIONS).filter(f => f.endsWith('.json')).sort();
  for (const old of all.slice(0, Math.max(0, all.length - KEEP_VERSIONS))) {
    fs.unlinkSync(path.join(VERSIONS, old));
  }
}
function listVersions() {
  return fs.readdirSync(VERSIONS).filter(f => f.endsWith('.json')).sort().reverse().map(f => {
    const m = /^(.+?)-([a-z]+)\.json$/.exec(f);
    return { id: f, at: m ? m[1].replace(/T(\d\d)-(\d\d)-(\d\d)-\d+Z$/, 'T$1:$2:$3Z') : f, note: m ? m[2] : '' };
  });
}

// Photograph slugs the repository ships, so an upload cannot shadow one.
function repoSlugs() {
  const dir = path.join(ROOT, 'assets', 'img', 'dish');
  const out = new Set();
  for (const f of fs.readdirSync(dir)) { const m = /^(.+)-400\.webp$/.exec(f); if (m) out.add(m[1]); }
  return [...out].sort();
}
function uploadedPhotos(content) {
  const out = {};
  for (const f of fs.existsSync(PHOTOS) ? fs.readdirSync(PHOTOS) : []) {
    const m = /^([a-z0-9][a-z0-9-]{1,40})-(400|800|1200)\.(webp|jpg)$/.exec(f);
    if (!m) continue;
    (out[m[1]] = out[m[1]] || { slug: m[1], files: [] }).files.push(`${m[2]}.${m[3]}`);
  }
  for (const p of Object.values(out)) {
    p.complete = SIZES.every(s => EXTS.every(e => p.files.includes(`${s}.${e}`)));
    const reg = (content.photos || {})[p.slug];
    p.width = reg ? reg.width : null; p.height = reg ? reg.height : null;
  }
  return Object.values(out).sort((a, b) => a.slug.localeCompare(b.slug));
}

/* ---------------------------------------------------------- validation */

const S = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '') || null;
const B = v => v === true;
const N = v => (v === null || v === undefined || v === '' ? null : (Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : NaN));
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

function validate(c, families, knownPhotos) {
  const bad = msg => { throw new Error(msg); };
  if (!c || typeof c !== 'object') bad('content must be an object');

  // A `status` block (opening date, "we are open") from before the restaurant
  // opened is dropped here rather than refused, so older versions restore.
  const out = {};
  out.announcement = S(c.announcement, 140);

  const ct = c.contact || {};
  const a = ct.address || {};
  const hours = {};
  for (const day of ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']) {
    const v = (ct.hours || {})[day];
    if (v === 'closed' || v === null || v === undefined) hours[day] = v === 'closed' ? 'closed' : null;
    else if (Array.isArray(v) && v.length === 2 && TIME.test(v[0]) && TIME.test(v[1])) hours[day] = [v[0], v[1]];
    else bad(`hours for ${day} must be two HH:MM times, "closed", or empty`);
  }
  const ld = ct.lunchDeal || {};
  out.contact = {
    phone: S(ct.phone, 30), email: S(ct.email, 120), cateringEmail: S(ct.cateringEmail, 120), jobsEmail: S(ct.jobsEmail, 120),
    address: { line1: S(a.line1, 120), locality: S(a.locality, 80), postcode: S(a.postcode, 12), country: 'GB', mapsUrl: S(a.mapsUrl, 600) },
    hours,
    lunchDeal: { from: TIME.test(ld.from || '') ? ld.from : '12:00', to: TIME.test(ld.to || '') ? ld.to : '17:00' },
  };
  for (const k of ['email', 'cateringEmail', 'jobsEmail']) {
    if (out.contact[k] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.contact[k])) bad(`${k} does not look like an email address`);
  }
  if (out.contact.address.mapsUrl && !/^https:\/\//.test(out.contact.address.mapsUrl)) bad('the maps link must start with https://');

  out.delivery = ['deliveroo', 'ubereats', 'justeat'].map(id => {
    const d = (c.delivery || []).find(x => x && x.id === id) || {};
    const url = S(d.url, 400);
    if (url && !/^https:\/\//.test(url)) bad(`the ${id} link must start with https://`);
    return { id, url };
  });

  const co = c.company || {};
  out.company = { companyName: S(co.companyName, 120), companyNumber: S(co.companyNumber, 20), vatNumber: S(co.vatNumber, 20), registeredOffice: S(co.registeredOffice, 200) };

  const l = c.lunchDeal || {};
  const prices = Array.isArray(l.prices) ? l.prices.map(N).filter(x => x !== null) : [];
  if (prices.some(Number.isNaN)) bad('lunch prices must be numbers');
  out.lunchDeal = { name: S(l.name, 80) || 'Grilled Chicken Duo', claim: S(l.claim, 120) || '', from: out.contact.lunchDeal.from, to: out.contact.lunchDeal.to, prices, priceConfirmed: B(l.priceConfirmed) };

  const al = c.allergens || {};
  out.allergens = { perItem: false, statement: S(al.statement, 600) };

  if (!Array.isArray(c.menu)) bad('menu must be a list of chapters');
  const ids = new Set();
  out.menu = c.menu.map((ch, ci) => {
    if (!ch || typeof ch !== 'object') bad(`chapter ${ci + 1} is not an object`);
    const id = S(ch.id, 40);
    if (!id || !SLUG.test(id)) bad(`chapter ${ci + 1} needs an id of letters, digits and dashes`);
    if (ids.has(id)) bad(`two chapters share the id "${id}"`); ids.add(id);
    const name = S(ch.name, 60); if (!name) bad(`chapter "${id}" needs a name`);
    if (!Array.isArray(ch.items)) bad(`chapter "${name}" needs a list of items`);
    const items = ch.items.map((it, ii) => {
      if (!it || typeof it !== 'object') bad(`item ${ii + 1} in "${name}" is not an object`);
      const iname = S(it.name, 80); if (!iname) bad(`an item in "${name}" has no name`);
      const price = N(it.price); if (Number.isNaN(price)) bad(`"${iname}": the price must be a number`);
      const kcal = N(it.kcal); if (Number.isNaN(kcal)) bad(`"${iname}": calories must be a number`);
      const sauce = it.sauce ? (families.includes(it.sauce) ? it.sauce : bad(`"${iname}": unknown sauce family "${it.sauce}"`)) : null;
      const photo = it.photo ? (knownPhotos.has(it.photo) ? it.photo : bad(`"${iname}": no photograph called "${it.photo}"`)) : null;
      const heat = it.heat ? Math.min(5, Math.max(1, Math.round(Number(it.heat)) || 1)) : null;
      const o = { name: iname, price, priceConfirmed: it.priceConfirmed !== false, sauce, kcal, kcalConfirmed: kcal !== null && it.kcalConfirmed !== false, desc: S(it.desc, 400), hidden: B(it.hidden) };
      if (photo) { o.photo = photo; o.photoConfirmed = it.photoConfirmed !== false; }
      if (heat) o.heat = heat;
      if (price === null) o.priceConfirmed = false;
      return o;
    });
    const o = { id, name, priceStatement: S(ch.priceStatement, 120), items };
    if (ch.lede) o.lede = S(ch.lede, 300);
    if (Array.isArray(ch.extras) && ch.extras.length) {
      o.extras = ch.extras.map(e => {
        const en = S(e && e.name, 80); const ep = N(e && e.price);
        if (!en || Number.isNaN(ep)) bad(`an extra in "${name}" needs a name and a numeric price`);
        return { name: en, price: ep, priceConfirmed: ep !== null && (e.priceConfirmed !== false) };
      });
    }
    return o;
  });

  out.photos = {};
  for (const [slug, ph] of Object.entries(c.photos || {})) {
    if (SLUG.test(slug) && ph && Number.isInteger(ph.width) && Number.isInteger(ph.height)) out.photos[slug] = { width: ph.width, height: ph.height };
  }
  return out;
}

/* --------------------------------------------------------------- build */

let busy = false;
function run(cmd, args, env) {
  return new Promise((resolve) => {
    execFile(cmd, args, { cwd: ROOT, env: { ...process.env, ...env }, maxBuffer: 8 << 20, timeout: 120000 },
      (error, stdout, stderr) => resolve({ code: error ? (error.code || 1) : 0, stdout: String(stdout), stderr: String(stderr) }));
  });
}
async function buildAndAudit() {
  const env = { POOKIE_CONTENT_DIR: CONTENT_DIR, POOKIE_DIST_DIR: DIST };
  const b = await run(process.execPath, [path.join(ROOT, 'build.js')], env);
  if (b.code !== 0) return { ok: false, errors: [`build failed: ${(b.stderr || b.stdout).trim().split('\n').slice(-3).join(' ')}`], warnings: [] };
  const a = await run(process.execPath, [path.join(ROOT, 'audit.js'), '--json'], env);
  let verdict;
  try { verdict = JSON.parse(a.stdout.trim().split('\n').pop()); }
  catch (e) { return { ok: false, errors: [`audit did not answer: ${(a.stderr || a.stdout).trim().slice(-300)}`], warnings: [] }; }
  return { ok: a.code === 0 && verdict.errors.length === 0, errors: verdict.errors, warnings: verdict.warnings };
}
async function publishToWebRoot() {
  if (!WEB_ROOT) return { ok: true, note: 'no POOKIE_WEB_ROOT set; built only' };
  fs.mkdirSync(WEB_ROOT, { recursive: true });
  const r = await run('rsync', ['-a', '--delete', DIST + '/', WEB_ROOT + '/'], {});
  if (r.code === 0) return { ok: true };
  // no rsync: copy over the top (stale files are not removed, which the audit
  // does not care about and the site does not notice)
  try { fs.cpSync(DIST, WEB_ROOT, { recursive: true }); return { ok: true, note: 'copied without rsync' }; }
  catch (e) { return { ok: false, error: `could not copy to the web root: ${e.message}` }; }
}

/* ---------------------------------------------------------------- http */

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.json': 'application/json' };

function send(res, code, body, headers = {}) {
  const isObj = body !== null && typeof body === 'object' && !Buffer.isBuffer(body);
  res.writeHead(code, { 'content-type': isObj ? 'application/json; charset=utf-8' : (headers['content-type'] || 'text/plain; charset=utf-8'),
    'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...headers });
  res.end(isObj ? JSON.stringify(body) : body);
}
function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = []; let n = 0;
    req.on('data', c => { n += c.length; if (n > limit) { reject(new Error('too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
async function readJSONBody(req) {
  const buf = await readBody(req, JSON_LIMIT);
  try { return JSON.parse(buf.toString('utf8') || '{}'); } catch (e) { throw new Error('body is not JSON'); }
}
function serveFile(res, file, cache) {
  const resolved = path.resolve(file);
  fs.readFile(resolved, (err, buf) => {
    if (err) return send(res, 404, 'Not found');
    send(res, 200, buf, { 'content-type': TYPES[path.extname(resolved)] || 'application/octet-stream', 'cache-control': cache || 'no-store' });
  });
}
function isImage(buf, ext) {
  if (ext === 'jpg') return buf.length > 3 && buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF;
  if (ext === 'webp') return buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP';
  return false;
}

async function handle(req, res) {
  const url = new URL(req.url, 'http://x');
  let p = url.pathname;
  const method = req.method;
  if (p === '/admin') { res.writeHead(302, { location: '/admin/' }); return res.end(); }
  // The panel's stylesheet is the site's own, and it names fonts and images
  // by their site paths. In production nginx serves those from the web root
  // and never routes them here; this is for running the panel on its own.
  if (method === 'GET' && p.startsWith('/assets/')) {
    const base = path.join(ROOT, 'assets');
    const file = path.resolve(base, p.slice('/assets/'.length));
    if (!file.startsWith(base + path.sep)) return send(res, 404, 'Not found');
    return serveFile(res, file, 'public, max-age=86400');
  }
  if (!p.startsWith('/admin/')) return send(res, 404, 'Not found');
  p = p.slice('/admin'.length);

  // ---- static: the panel itself, no login needed to see the login screen
  if (method === 'GET' && p === '/') return serveFile(res, path.join(__dirname, 'ui', 'index.html'));
  if (method === 'GET' && p === '/ui/main.css') return serveFile(res, path.join(ROOT, 'assets', 'css', 'main.css'));
  if (method === 'GET' && p === '/ui/logo.svg') return serveFile(res, path.join(ROOT, 'assets', 'img', 'logo-lockup.svg'));
  if (method === 'GET' && p === '/ui/favicon.svg') return serveFile(res, path.join(ROOT, 'assets', 'img', 'favicon.svg'), 'public, max-age=86400');
  if (method === 'GET' && /^\/ui\/[a-z-]+\.(css|js)$/.test(p)) return serveFile(res, path.join(__dirname, 'ui', path.basename(p)));
  if (method === 'GET' && /^\/ui\/fonts\/[a-z0-9-]+\.woff2$/.test(p)) return serveFile(res, path.join(ROOT, 'assets', 'fonts', path.basename(p)), 'public, max-age=31536000');

  // ---- login / logout
  const ip = ipOf(req);
  if (method === 'POST' && p === '/api/login') {
    if (lockedOut(ip)) return send(res, 429, { error: 'Too many attempts. Try again in fifteen minutes.' });
    const body = await readJSONBody(req);
    if (!fs.existsSync(AUTH_FILE)) return send(res, 503, { error: 'No password has been set yet. See the README: node admin/server.js --set-password' });
    if (typeof body.password !== 'string' || !checkPassword(body.password)) { noteFailure(ip); return send(res, 401, { error: 'Wrong password.' }); }
    failures.delete(ip);
    return send(res, 200, { ok: true }, { 'set-cookie': cookie(newSession()) });
  }

  const token = sessionOf(req);
  if (!token) return send(res, 401, { error: 'Please sign in.' });
  if (method !== 'GET' && req.headers['x-requested-with'] !== 'pookie-admin') return send(res, 403, { error: 'Missing request header.' });

  if (method === 'POST' && p === '/api/logout') { sessions.delete(token); return send(res, 200, { ok: true }, { 'set-cookie': cookie('', true) }); }

  // ---- photographs, for the panel's previews: the owner's uploads, and the
  // repository's own so the panel does not depend on the live site for them
  if (method === 'GET' && /^\/photos\/[a-z0-9-]+-(400|800|1200)\.(webp|jpg)$/.test(p)) {
    return serveFile(res, path.join(PHOTOS, path.basename(p)));
  }
  if (method === 'GET' && /^\/repo-photos\/[a-z0-9-]+-(400|800|1200)\.(webp|jpg)$/.test(p)) {
    return serveFile(res, path.join(ROOT, 'assets', 'img', 'dish', path.basename(p)), 'public, max-age=86400');
  }

  const D = () => require(path.join(ROOT, 'src', 'data.js'));   // static tables only: sauce families
  const families = Object.keys(D().sauceFamilies);

  if (method === 'GET' && p === '/api/me') {
    const st = readJSON(STATE_FILE, {});
    return send(res, 200, { ok: true, lastPublished: st.lastPublished || null, lastResult: st.lastResult || null, webRoot: !!WEB_ROOT, families: D().sauceFamilies });
  }
  if (method === 'GET' && p === '/api/content') {
    const content = loadContent();
    return send(res, 200, { content, repoPhotos: repoSlugs(), uploaded: uploadedPhotos(content), versions: listVersions().slice(0, 30) });
  }
  if (method === 'PUT' && p === '/api/content') {
    let body;
    try { body = await readJSONBody(req); } catch (e) { return send(res, 400, { error: e.message }); }
    const current = loadContent();
    const known = new Set([...repoSlugs(), ...uploadedPhotos(current).filter(x => x.complete).map(x => x.slug)]);
    let clean;
    try { clean = validate(body, families, known); } catch (e) { return send(res, 400, { error: e.message }); }
    // photographs are registered by the upload route, not by the editor
    clean.photos = current.photos || {};
    snapshot(current, 'saved');
    writeJSON(CONTENT_FILE, clean);
    return send(res, 200, { ok: true, content: clean });
  }

  if (method === 'GET' && p === '/api/versions') return send(res, 200, { versions: listVersions() });
  const rv = /^\/api\/versions\/([0-9TZ-]+-[a-z]+\.json)\/restore$/.exec(p);
  if (method === 'POST' && rv) {
    const file = path.join(VERSIONS, rv[1]);
    const v = readJSON(file, null);
    if (!v) return send(res, 404, { error: 'No such version.' });
    const current = loadContent();
    snapshot(current, 'beforerestore');
    v.photos = current.photos || {};                             // files on disk are the truth for photos
    writeJSON(CONTENT_FILE, v);
    return send(res, 200, { ok: true, content: v });
  }

  // ---- photographs
  const up = /^\/api\/photos\/([a-z0-9][a-z0-9-]{1,40})\/(400|800|1200)\.(webp|jpg)$/.exec(p);
  if (method === 'PUT' && up) {
    const [, slug, size, ext] = up;
    if (repoSlugs().includes(slug)) return send(res, 409, { error: `"${slug}" is one of the site's own photographs; choose another name.` });
    let buf;
    try { buf = await readBody(req, PHOTO_LIMIT); } catch (e) { return send(res, 413, { error: 'That file is too large (3 MB per size).' }); }
    if (!isImage(buf, ext)) return send(res, 415, { error: `That is not a ${ext} file.` });
    fs.writeFileSync(path.join(PHOTOS, `${slug}-${size}.${ext}`), buf);
    return send(res, 200, { ok: true });
  }
  const reg = /^\/api\/photos\/([a-z0-9][a-z0-9-]{1,40})$/.exec(p);
  if (method === 'POST' && reg) {
    const slug = reg[1];
    const body = await readJSONBody(req).catch(() => ({}));
    const content = loadContent();
    const have = uploadedPhotos(content).find(x => x.slug === slug);
    if (!have || !have.complete) return send(res, 400, { error: 'Not every size has been uploaded yet.' });
    content.photos = content.photos || {};
    content.photos[slug] = { width: Number.isInteger(body.width) ? body.width : 1200, height: Number.isInteger(body.height) ? body.height : 800 };
    writeJSON(CONTENT_FILE, content);
    return send(res, 200, { ok: true, uploaded: uploadedPhotos(content) });
  }
  if (method === 'DELETE' && reg) {
    const slug = reg[1];
    const content = loadContent();
    for (const s of SIZES) for (const e of EXTS) { try { fs.unlinkSync(path.join(PHOTOS, `${slug}-${s}.${e}`)); } catch (err) {} }
    if (content.photos) delete content.photos[slug];
    for (const ch of content.menu) for (const it of ch.items) if (it.photo === slug) { delete it.photo; delete it.photoConfirmed; }
    snapshot(content, 'photoremoved');
    writeJSON(CONTENT_FILE, content);
    return send(res, 200, { ok: true, content, uploaded: uploadedPhotos(content) });
  }

  // ---- publish
  if (method === 'POST' && p === '/api/publish') {
    if (busy) return send(res, 409, { error: 'A publish is already running.' });
    busy = true;
    try {
      const content = loadContent();
      const verdict = await buildAndAudit();
      const state = readJSON(STATE_FILE, {});
      if (!verdict.ok) {
        state.lastResult = { at: new Date().toISOString(), ok: false, errors: verdict.errors, warnings: verdict.warnings };
        writeJSON(STATE_FILE, state);
        return send(res, 200, { ok: false, errors: verdict.errors, warnings: verdict.warnings });
      }
      const pub = await publishToWebRoot();
      if (!pub.ok) return send(res, 500, { ok: false, errors: [pub.error], warnings: verdict.warnings });
      snapshot(content, 'published');
      state.lastPublished = new Date().toISOString();
      state.lastResult = { at: state.lastPublished, ok: true, errors: [], warnings: verdict.warnings, note: pub.note || null };
      writeJSON(STATE_FILE, state);
      return send(res, 200, { ok: true, publishedAt: state.lastPublished, warnings: verdict.warnings, note: pub.note || null });
    } finally { busy = false; }
  }

  // ---- password
  if (method === 'POST' && p === '/api/password') {
    const body = await readJSONBody(req).catch(() => ({}));
    if (typeof body.current !== 'string' || !checkPassword(body.current)) return send(res, 401, { error: 'The current password is wrong.' });
    try { setPassword(body.next); } catch (e) { return send(res, 400, { error: e.message }); }
    return send(res, 200, { ok: true });
  }

  return send(res, 404, { error: 'No such route.' });
}

/* ---------------------------------------------------------------- main */

function main() {
  if (process.argv.includes('--set-password')) {
    const fromEnv = process.env.POOKIE_ADMIN_PASSWORD;
    const finish = pw => { try { setPassword(pw); console.log(`password set; stored in ${AUTH_FILE}`); } catch (e) { console.error(e.message); process.exit(1); } };
    if (fromEnv) return finish(fromEnv);
    const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout });
    rl.question('New panel password (10+ characters): ', pw => { rl.close(); finish(pw); });
    return;
  }
  ensureDirs();
  loadContent();
  http.createServer((req, res) => {
    handle(req, res).catch(err => {
      console.error(new Date().toISOString(), req.method, req.url, err.message);
      if (!res.headersSent) send(res, 500, { error: 'Something went wrong on the server.' });
    });
  }).listen(PORT, BIND, () => {
    console.log(`pookie admin on http://${BIND}:${PORT}/admin/  content: ${CONTENT_DIR}  web root: ${WEB_ROOT || '(none — build only)'}`);
  });
}

if (require.main === module) main();
module.exports = { validate, seedContent };
