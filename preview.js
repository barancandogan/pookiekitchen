#!/usr/bin/env node
'use strict';

/**
 * Bundles the built site into ONE self-contained HTML file — CSS, JS and the
 * logo inlined, internal links rewired to swap sections in place.
 *
 *   node preview.js
 *
 * Writes both flavours into preview/ — NOT dist/. build() wipes dist/ on
 * every run, including the one `node build.js --serve` does on startup, so a
 * bundle left in dist/ vanished the moment anyone looked at the site.
 *
 *   preview/preview.html        standalone — opens from a file:// URL, or
 *                               sends as an email attachment
 *   preview/preview.body.html   no <html>/<head> wrapper, for hosts that
 *                               supply their own document shell
 *
 * This is a review tool for sending the site to someone before there is
 * anywhere to deploy it. It is NOT the site: real pages, real URLs and the
 * sitemap all come from build.js. Nothing here is deployed.
 */

const fs = require('fs');
const path = require('path');

const D = require('./src/data');
const { build } = require('./build');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(ROOT, 'preview');

/* --------------------------------------------------------------- inputs */

build();

const css = fs.readFileSync(path.join(ROOT, 'assets/css/main.css'), 'utf8')
  // the display font travels inside the bundle too (18.6 kB -> ~25 kB base64)
  .replace('url("/assets/fonts/anton-latin-400-normal.woff2")',
    `url("data:font/woff2;base64,${fs.readFileSync(path.join(ROOT, 'assets/fonts/anton-latin-400-normal.woff2')).toString('base64')}")`);

/**
 * The bundle is one file with no origin to resolve /assets/ against, so every
 * photograph has to travel inside it. Only the narrow variant of each is
 * inlined — the bundle is for review on a screen, not for shipping — and the
 * <picture>/srcset machinery is dropped with it, since there is now exactly
 * one source to choose from.
 */
function inlinePhotos(html) {
  const cache = new Map();
  const dataUri = file => {
    if (!cache.has(file)) {
      const abs = path.join(ROOT, 'assets/img', file);
      cache.set(file, 'data:image/webp;base64,' + fs.readFileSync(abs).toString('base64'));
    }
    return cache.get(file);
  };
  return html.replace(/<picture>[\s\S]*?<\/picture>/g, block => {
    const img = block.match(/<img\b[^>]*>/)[0];
    const m = block.match(/\/assets\/img\/(dish|brand)\/([a-z0-9-]+)-\d+\./) || [];
    const dir = m[1], slug = m[2];
    if (!slug) return block;
    const width = (slug === 'feature-plate' || dir === 'brand') ? 900 : 400;
    return img
      .replace(/\ssrcset="[^"]*"/, '')
      .replace(/\ssizes="[^"]*"/, '')
      // every byte is already in the file, so deferring the decode buys
      // nothing and just leaves a reviewer scrolling past empty boxes
      .replace(/\sloading="lazy"/, '')
      .replace(/\ssrc="[^"]*"/, ` src="${dataUri(`${dir}/${slug}-${width}.webp`)}"`);
  });
}
/**
 * Hero clips travel inside the bundle too, as data URIs. A 720p clip capped at
 * 2.5 Mb/s is ~2 MB, so a handful stays well inside what a page can carry;
 * the size is printed so nobody is surprised.
 */
function inlineClips(html) {
  for (const slug of D.hero.clips) {
    const rel = `/assets/video/${slug}-720.mp4`;
    const abs = path.join(ROOT, 'assets/video', `${slug}-720.mp4`);
    if (!fs.existsSync(abs)) continue;
    const uri = 'data:video/mp4;base64,' + fs.readFileSync(abs).toString('base64');
    html = html.split(rel).join(uri);
  }
  return html;
}

const logo = fs.readFileSync(path.join(ROOT, 'assets/img/logo-mark.svg'), 'utf8')
  .replace(/<\?xml[^>]*\?>\s*/, '');

// Route -> the id its section gets in the bundle.
const ROUTES = [
  { path: '/',         id: 'home',    label: 'Home' },
  { path: '/menu/',    id: 'menu',    label: 'Menu' },
  { path: '/about/',   id: 'about',   label: 'About' },
  { path: '/find-us/', id: 'find-us', label: 'Find us' },
];

function fileFor(routePath) {
  return routePath === '/'
    ? path.join(DIST, 'index.html')
    : path.join(DIST, routePath.replace(/^\/|\/$/g, ''), 'index.html');
}

function mainOf(html) {
  const m = html.match(/<main id="main">([\s\S]*?)<\/main>/);
  if (!m) throw new Error('no <main> in built page');
  return m[1];
}

function chromeOf(html, tag) {
  const m = html.match(new RegExp(`<${tag}[^>]*>[\\s\\S]*?</${tag}>`));
  return m ? m[0] : '';
}

/* -------------------------------------------------------------- assemble */

const first = fs.readFileSync(fileFor('/'), 'utf8');
const ribbon = (first.match(/<div class="ribbon[^"]*">[\s\S]*?<\/div>/) || [''])[0];
const footer = chromeOf(first, 'footer');
const actionbar = (first.match(/<div class="actionbar">[\s\S]*?<\/div>\s*<\/div>/) || [''])[0];

const sections = ROUTES.map(r => {
  const html = fs.readFileSync(fileFor(r.path), 'utf8');
  return `<main id="main" class="pv-page" data-page="${r.id}"${
    r.id === 'home' ? '' : ' hidden'}>${inlineClips(inlinePhotos(mainOf(html)))}</main>`;
}).join('\n');

const nav = ROUTES.map(r =>
  `<a href="#${r.id}" data-nav="${r.id}">${r.label}</a>`
).join('\n      ');

const header = `<header class="head">
  <div class="wrap head__in">
    <a class="brandmark" href="#home" data-nav="home">
      <span class="brandmark__logo" aria-hidden="true">${logo}</span>
      <span class="brandmark__name">Pookie <span>Chicken</span></span>
    </a>
    <nav class="nav" aria-label="Main">
      ${nav}
    </nav>
  </div>
</header>`;

const extraCss = `
/* preview-only: the bundle swaps sections rather than loading pages */
.brandmark__logo { display:block; width:40px; height:40px; }
.brandmark__logo svg { width:100%; height:100%; display:block; }
.pv-banner {
  background: var(--sunken); border-bottom: 1px solid var(--rule);
  color: var(--ink-3); font-size: var(--t-xs); text-align: center;
  padding: 6px var(--s4);
}
@media (max-width: 640px) { .brandmark__logo { width:32px; height:32px; } }
`;

const js = `
(function () {
  var pages = [].slice.call(document.querySelectorAll('.pv-page'));
  var navs  = [].slice.call(document.querySelectorAll('[data-nav]'));
  function show(id){
    var found = false;
    pages.forEach(function(p){
      var on = p.getAttribute('data-page') === id;
      p.hidden = !on;
      if (on) found = true;
    });
    if (!found) { show('home'); return; }
    navs.forEach(function(a){
      if (a.getAttribute('data-nav') === id) a.setAttribute('aria-current','page');
      else a.removeAttribute('aria-current');
    });
    window.scrollTo(0, 0);
  }
  function fromHash(){ return (location.hash || '#home').slice(1); }
  window.addEventListener('hashchange', function(){ show(fromHash()); });
  show(fromHash());

  /* Links the real site would navigate with become section swaps here. */
  document.addEventListener('click', function (ev) {
    var a = ev.target.closest && ev.target.closest('a[href^="/"]');
    if (!a) return;
    var map = { '/': 'home', '/menu/': 'menu', '/about/': 'about', '/find-us/': 'find-us' };
    var id = map[a.getAttribute('href')];
    if (!id) return;
    ev.preventDefault();
    location.hash = '#' + id;
  });
})();
`;

const banner = `<div class="pv-banner">Preview bundle — all four pages in one file. `
  + `The live site is four separate pages at real URLs.</div>`;

const bodyContent = `<style>
${css}
${extraCss}
</style>
${banner}
${ribbon}
${header}
${sections}
${footer}
${actionbar}
<script>
${js}
</script>`;

/* ----------------------------------------------------------------- write */

fs.mkdirSync(OUT, { recursive: true });
const bodyOut = path.join(OUT, 'preview.body.html');
fs.writeFileSync(bodyOut, `<title>Pookie Chicken</title>\n${bodyContent}\n`);

{
  const out = path.join(OUT, 'preview.html');
  fs.writeFileSync(out, `<!doctype html>
<html lang="${D.site.locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Pookie Chicken</title>
</head>
<body>
${bodyContent}
</body>
</html>
`);
  const kb = n => (fs.statSync(n).size / 1024).toFixed(1);
  console.log(`\n  preview → ${path.relative(ROOT, out)} (${kb(out)} kB, self-contained)`);
  console.log(`  preview → ${path.relative(ROOT, bodyOut)} (${kb(bodyOut)} kB, body only)`);
}
