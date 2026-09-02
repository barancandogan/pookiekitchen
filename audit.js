#!/usr/bin/env node
'use strict';

/**
 * Structural, accessibility and launch-readiness checks over ./dist.
 *
 *   node audit.js
 *
 * Exit 1 on any ERROR. WARNs are printed and do not fail the build — they are
 * the things that must be true before launch but need not be true today.
 */

const fs = require('fs');
const path = require('path');
const D = require('./src/data');

const DIST = path.join(__dirname, 'dist');
const errors = [];
const warns = [];

function err(file, msg) { errors.push(`${file}: ${msg}`); }
function warn(file, msg) { warns.push(`${file}: ${msg}`); }

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const files = walk(DIST);
const rel = f => path.relative(DIST, f);

// preview.js writes bundles into dist/ that are deliberately not pages: they
// carry all four pages at once, so four <h1>s and no per-page metadata is
// correct for them. They are never deployed, so they are not audited.
const isPreviewBundle = f => path.basename(f).startsWith('preview.');
const htmlFiles = files.filter(f => f.endsWith('.html') && !isPreviewBundle(f));

if (!htmlFiles.length) {
  console.error('No HTML in dist/. Run `node build.js` first.');
  process.exit(1);
}

/* ------------------------------------------------------- per-file checks */

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  const name = rel(file);

  // --- exactly one h1
  const h1s = html.match(/<h1[\s>]/g) || [];
  if (h1s.length !== 1) err(name, `expected exactly one <h1>, found ${h1s.length}`);

  // --- heading levels do not jump
  const levels = [...html.matchAll(/<h([1-4])[\s>]/g)].map(m => Number(m[1]));
  for (let i = 1; i < levels.length; i++) {
    if (levels[i] - levels[i - 1] > 1) {
      err(name, `heading jumps from h${levels[i - 1]} to h${levels[i]}`);
      break;
    }
  }

  // --- title and meta description lengths
  const title = (html.match(/<title>([\s\S]*?)<\/title>/) || [])[1];
  if (!title) err(name, 'no <title>');
  else if (title.length > 65) warn(name, `title is ${title.length} chars (>65)`);

  const desc = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1];
  if (!desc) err(name, 'no meta description');
  else if (desc.length < 70) err(name, `meta description is ${desc.length} chars (<70)`);
  else if (desc.length > 165) warn(name, `meta description is ${desc.length} chars (>165)`);

  // --- lang
  if (!/<html lang="[a-z]{2}(-[A-Z]{2})?"/.test(html)) err(name, 'no lang on <html>');

  // --- every external link is rel="noopener"
  for (const m of html.matchAll(/<a\s[^>]*href="https?:\/\/[^"]*"[^>]*>/g)) {
    if (!/rel="[^"]*noopener/.test(m[0])) err(name, `external link without rel="noopener": ${m[0].slice(0, 80)}`);
  }

  // --- links and buttons have an accessible name
  for (const m of html.matchAll(/<a\s[^>]*>([\s\S]*?)<\/a>/g)) {
    const inner = m[1].replace(/<[^>]*>/g, '').trim();
    const hasAria = /aria-label="[^"]+"/.test(m[0]);
    if (!inner && !hasAria) err(name, `link with no accessible name: ${m[0].slice(0, 80)}`);
  }
  for (const m of html.matchAll(/<button\s[^>]*>([\s\S]*?)<\/button>/g)) {
    const inner = m[1].replace(/<[^>]*>/g, '').trim();
    if (!inner && !/aria-label="[^"]+"/.test(m[0])) err(name, 'button with no accessible name');
  }

  // --- images carry alt (empty alt is valid for decorative)
  for (const m of html.matchAll(/<img\s[^>]*>/g)) {
    if (!/\salt=/.test(m[0])) err(name, `img without alt: ${m[0].slice(0, 80)}`);
  }

  // --- bare ampersands
  const bare = html.match(/&(?!(amp|lt|gt|quot|#\d+|#x[0-9a-fA-F]+);)/g);
  if (bare) err(name, `${bare.length} unescaped ampersand(s)`);

  // --- JSON-LD parses
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(m[1]); }
    catch (e) { err(name, `invalid JSON-LD: ${e.message}`); }
  }

  // --- internal links and asset references resolve
  for (const m of html.matchAll(/(?:href|src)="(\/[^"#?]*)"/g)) {
    const target = m[1];
    const candidates = target.endsWith('/')
      ? [path.join(DIST, target, 'index.html')]
      : [path.join(DIST, target), path.join(DIST, target, 'index.html')];
    if (!candidates.some(fs.existsSync)) err(name, `broken internal reference: ${target}`);
  }

  // --- no placeholder text ever reaches a page
  for (const bad of ['TBC', 'Lorem ipsum', 'XXX', 'PLACEHOLDER', 'undefined', 'null,', '[object Object]']) {
    if (html.includes(bad)) err(name, `placeholder or leaked value in output: "${bad}"`);
  }
}

/* ------------------------------------------------------- global checks */

const d = D.derive();

// The launch gate. These are warnings while the site is pre-opening and
// become errors the moment it claims to be open.
const gate = [
  [d.addressKnown, 'street address'],
  [d.hoursKnown, 'opening hours'],
  [d.phoneKnown || d.emailKnown, 'a phone number or an email address'],
  [d.companyKnown, 'company name and number (legally required in the footer)'],
  [d.allergensPublishable, 'allergen information (legally required)'],
  [Boolean(D.site.url), 'site.url (canonicals, Open Graph, sitemap)'],
];

for (const [ok, what] of gate) {
  if (ok) continue;
  if (d.isOpen) err('launch gate', `site is in OPEN mode without ${what}`);
  else warn('launch gate', `missing before launch: ${what}`);
}

// Unconfirmed figures are fine to carry, but not silently — they must be
// visible to whoever is getting them confirmed.
const unconfirmedPrices = [];
const unconfirmedKcal = [];
for (const ch of D.menu) {
  for (const it of ch.items) {
    if (it.priceConfirmed === false) unconfirmedPrices.push(`${ch.name}/${it.name}`);
    if (it.kcal && !it.kcalConfirmed) unconfirmedKcal.push(`${ch.name}/${it.name}`);
  }
}
if (unconfirmedPrices.length) warn('menu', `${unconfirmedPrices.length} unconfirmed price(s), suppressed in output: ${unconfirmedPrices.join(', ')}`);
if (unconfirmedKcal.length) warn('menu', `${unconfirmedKcal.length} unconfirmed calorie figure(s), suppressed in output`);

// Photographs are shown even when the match is a best guess — an unlabelled
// plate of wings is still a plate of wings, so the cost of being wrong is low
// and the appetite value is high. But it is never silent.
const unconfirmedPhotos = [];
for (const ch of D.menu) {
  for (const it of ch.items) {
    if (it.photo && it.photoConfirmed === false) unconfirmedPhotos.push(`${ch.name}/${it.name}`);
  }
}
if (unconfirmedPhotos.length) {
  warn('photos', `${unconfirmedPhotos.length} photo(s) matched to a dish by eye, shown but unconfirmed: ${unconfirmedPhotos.join(', ')}`);
}

// Every photo referenced must actually exist, in both formats and both widths.
for (const ch of D.menu) {
  for (const it of ch.items) {
    if (!it.photo) continue;
    for (const w of [400, 800]) {
      for (const ext of ['webp', 'jpg']) {
        const f = path.join(DIST, 'assets/img/dish', `${it.photo}-${w}.${ext}`);
        if (!fs.existsSync(f)) err('photos', `missing ${it.photo}-${w}.${ext} for ${it.name}`);
      }
    }
  }
}

// If per-item allergens are switched on, every item must carry them.
if (D.allergens.perItem) {
  for (const ch of D.menu) {
    for (const it of ch.items) {
      if (!Array.isArray(it.allergens)) {
        err('allergens', `perItem is on but ${ch.name}/${it.name} has no allergens array`);
      }
    }
  }
}

// Every hero clip referenced must exist, and so must the poster it falls back to.
for (const slug of D.hero.clips) {
  const f = path.join(DIST, 'assets/video', `${slug}-720.mp4`);
  if (!fs.existsSync(f)) err('hero', `missing assets/video/${slug}-720.mp4`);
}
if (D.hero.clips.length) {
  const poster = path.join(DIST, 'assets/img/dish', `${D.hero.poster}-1600.jpg`);
  if (!fs.existsSync(poster)) err('hero', `missing poster ${D.hero.poster}-1600.jpg`);
}

// The CSS and data.js must agree on the brand values.
const css = fs.readFileSync(path.join(__dirname, 'assets/css/main.css'), 'utf8');
for (const [token, value] of [
  ['--logo-red', D.brand.logo.red],
  ['--logo-amber', D.brand.logo.amber],
  ['--paper', D.brand.paper],
]) {
  const m = css.match(new RegExp(`${token}:\\s*(#[0-9A-Fa-f]{6})`));
  if (!m) err('main.css', `token ${token} not found`);
  else if (m[1].toUpperCase() !== value.toUpperCase()) {
    err('main.css', `${token} is ${m[1]} in CSS but ${value} in data.js`);
  }
}

/* -------------------------------------------------------------- report */

console.log(`\n  audited ${htmlFiles.length} pages\n`);
for (const w of warns) console.log(`  WARN   ${w}`);
if (warns.length) console.log('');
for (const e of errors) console.log(`  ERROR  ${e}`);

if (errors.length) {
  console.log(`\n  ${errors.length} error(s), ${warns.length} warning(s)\n`);
  process.exit(1);
}
console.log(`  no errors, ${warns.length} warning(s)\n`);
