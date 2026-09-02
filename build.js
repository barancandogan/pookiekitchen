#!/usr/bin/env node
'use strict';

/**
 * Renders src/ into dist/. No dependencies — Node 18+ and nothing else.
 *
 *   node build.js            write ./dist
 *   node build.js --serve    write ./dist and serve it on :4173
 */

const fs = require('fs');
const path = require('path');

const D = require('./src/data');
const { document_ } = require('./src/layout');
const { allPages } = require('./src/pages');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');

/* ----------------------------------------------------------------- fs */

function rmrf(p) { fs.rmSync(p, { recursive: true, force: true }); }
function mkdirp(p) { fs.mkdirSync(p, { recursive: true }); }

function copyDir(from, to) {
  if (!fs.existsSync(from)) return 0;
  let n = 0;
  mkdirp(to);
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dst = path.join(to, entry.name);
    if (entry.isDirectory()) n += copyDir(src, dst);
    else { fs.copyFileSync(src, dst); n++; }
  }
  return n;
}

/**
 * '/menu/'     -> dist/menu/index.html
 * '/'          -> dist/index.html
 * '/404.html'  -> dist/404.html
 */
function outPathFor(routePath) {
  if (routePath === '/') return path.join(DIST, 'index.html');
  if (routePath.endsWith('.html')) return path.join(DIST, routePath.slice(1));
  return path.join(DIST, routePath.replace(/^\/|\/$/g, ''), 'index.html');
}

/* -------------------------------------------------------------- build */

function build() {
  const d = D.derive();
  rmrf(DIST);
  mkdirp(DIST);

  const pages = allPages();
  for (const page of pages) {
    const html = document_(page);
    const out = outPathFor(page.path);
    mkdirp(path.dirname(out));
    fs.writeFileSync(out, html);
  }

  const assets = copyDir(path.join(ROOT, 'assets'), path.join(DIST, 'assets'));

  writeSitemap(pages, d);
  writeRobots(d);

  return { pages, assets, d };
}

function writeSitemap(pages, d) {
  // Without a hostname a sitemap cannot carry absolute URLs, and a sitemap of
  // relative paths is invalid. Skip it rather than emit something broken.
  if (!D.site.url) {
    fs.writeFileSync(path.join(DIST, 'sitemap.xml'),
      '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>\n');
    return false;
  }
  const urls = pages
    .filter(p => !p.path.endsWith('404.html'))
    .map(p => `  <url><loc>${D.site.url}${p.path}</loc></url>`)
    .join('\n');
  fs.writeFileSync(path.join(DIST, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
  return true;
}

function writeRobots(d) {
  const lines = ['User-agent: *', 'Allow: /'];
  if (D.site.url) lines.push('', `Sitemap: ${D.site.url}/sitemap.xml`);
  fs.writeFileSync(path.join(DIST, 'robots.txt'), lines.join('\n') + '\n');
}

/* -------------------------------------------------------------- serve */

function serve(port = 4173) {
  const http = require('http');
  const TYPES = {
    '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
    '.mp4': 'video/mp4', '.woff2': 'font/woff2', '.xml': 'application/xml',
    '.txt': 'text/plain; charset=utf-8',
  };

  http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    let file = path.join(DIST, url);
    if (url.endsWith('/')) file = path.join(file, 'index.html');

    // Contain the resolved path inside dist/ before touching the filesystem.
    const resolved = path.resolve(file);
    if (resolved !== DIST && !resolved.startsWith(DIST + path.sep)) {
      res.writeHead(403).end('Forbidden');
      return;
    }

    fs.readFile(resolved, (err, buf) => {
      if (err) {
        const nf = path.join(DIST, '404.html');
        fs.readFile(nf, (e2, b2) => {
          res.writeHead(404, { 'content-type': TYPES['.html'] }).end(e2 ? 'Not found' : b2);
        });
        return;
      }
      res.writeHead(200, { 'content-type': TYPES[path.extname(resolved)] || 'application/octet-stream' });
      res.end(buf);
    });
  }).listen(port, () => {
    console.log(`  serving  http://localhost:${port}`);
  });
}

/* --------------------------------------------------------------- main */

if (require.main === module) {
  const t0 = Date.now();
  const { pages, assets, d } = build();
  const ms = Date.now() - t0;

  console.log(`\n  Pookie Chicken — built in ${ms}ms`);
  console.log(`  ${pages.length} pages, ${assets} assets → dist/`);
  console.log(`  mode: ${d.isOpen ? 'OPEN' : 'PRE-OPENING'}`);

  const unknown = [];
  if (!d.addressKnown) unknown.push('address');
  if (!d.hoursKnown) unknown.push('hours');
  if (!d.phoneKnown) unknown.push('phone');
  if (!d.emailKnown) unknown.push('email');
  if (!d.dateKnown) unknown.push('opening date');
  if (!d.companyKnown) unknown.push('company details');
  if (!d.deliveryLive.length) unknown.push('delivery links');
  if (!D.site.url) unknown.push('site.url');
  if (unknown.length) console.log(`  not yet known: ${unknown.join(', ')}`);

  if (process.argv.includes('--serve')) serve();
}

module.exports = { build, outPathFor };
