'use strict';

const D = require('./data');

/* ------------------------------------------------------------- helpers */

// Escapes text for HTML bodies and double-quoted attributes. Ampersand first.
function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function money(n) {
  return D.site.currencySymbol + n.toFixed(2);
}

// Renders `parts` only if every one of them is present. This is the single
// mechanism behind "unknown fields render nothing" — call it, do not hand-roll
// a ternary that can emit an empty tag.
function when(cond, fn) {
  return cond ? fn() : '';
}

/* ---------------------------------------------------------------- head */

function head(page, d) {
  const canonical = D.site.url ? `${D.site.url}${page.path}` : null;
  const title = page.path === '/'
    ? `${D.site.name} — ${D.site.tagline}`
    : `${page.title} — ${D.site.name}`;

  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(page.description)}">
${when(canonical, () => `<link rel="canonical" href="${esc(canonical)}">`)}
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(D.site.name)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(page.description)}">
${when(canonical, () => `<meta property="og:url" content="${esc(canonical)}">`)}
<meta name="theme-color" content="${D.brand.paper}">
${when(!D.site.indexable, () => `<meta name="robots" content="noindex, nofollow">`)}
<link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
<link rel="preload" href="/assets/fonts/anton-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/css/main.css">
${jsonLd(d)}`;
}

/* ------------------------------------------------------------- JSON-LD */

/**
 * A Restaurant node is only emitted once there is an address to put in it.
 * Publishing a Restaurant without a location is how a business ends up in
 * search results pointing nowhere.
 */
function jsonLd(d) {
  if (!d.addressKnown) {
    const org = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: D.site.name,
      description: D.site.tagline,
      sameAs: [D.site.instagramUrl],
    };
    if (D.site.url) org.url = D.site.url;
    return `<script type="application/ld+json">${JSON.stringify(org)}</script>`;
  }

  const a = D.contact.address;
  const node = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: D.site.name,
    servesCuisine: 'Chicken',
    address: {
      '@type': 'PostalAddress',
      streetAddress: a.line1,
      addressLocality: a.locality,
      postalCode: a.postcode,
      addressCountry: a.country,
    },
    sameAs: [D.site.instagramUrl],
  };
  if (D.site.url) node.url = D.site.url;
  if (d.phoneKnown) node.telephone = D.contact.phone;
  if (d.hoursKnown) node.openingHours = hoursToSchema();
  return `<script type="application/ld+json">${JSON.stringify(node)}</script>`;
}

const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_LABEL = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };

function hoursToSchema() {
  return DAY_ORDER
    .filter(k => D.contact.hours[k] !== 'closed')
    .map(k => `${DAY_LABEL[k]} ${D.contact.hours[k][0]}-${D.contact.hours[k][1]}`);
}

/* -------------------------------------------------------------- ribbon */

function ribbon(d) {
  if (d.isOpen) {
    return `<div class="ribbon ribbon--open">Open today${
      when(d.addressKnown, () => ` · ${esc(D.contact.address.locality)}`)}</div>`;
  }
  // Pre-opening. Says only what is true: we are not open yet. A date appears
  // only once there is one.
  const date = d.dateKnown
    ? ` — opening ${esc(formatDate(D.status.openingDate))}`
    : '';
  return `<div class="ribbon">Not open yet${date}. Follow along for the opening date.</div>`;
}

function formatDate(iso) {
  const [y, m, day] = iso.split('-').map(Number);
  const months = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];
  return `${day} ${months[m - 1]} ${y}`;
}

/* -------------------------------------------------------------- header */

function header(page) {
  const link = (href, label, secondary) =>
    `<a href="${href}"${page.path === href ? ' aria-current="page"' : ''}${
      secondary ? ' class="nav__link--secondary"' : ''}>${esc(label)}</a>`;

  return `<header class="head">
  <div class="wrap head__in">
    <a class="brandmark" href="/">
      <img src="/assets/img/logo-mark.svg" alt="" width="40" height="40">
      <span class="brandmark__name">Pookie <span>Chicken</span></span>
    </a>
    <nav class="nav" aria-label="Main">
      ${link('/menu/', 'Menu')}
      ${link('/about/', 'About', true)}
      ${link('/find-us/', 'Find us')}
      <a class="btn btn--primary nav__cta" href="/menu/">See the menu</a>
    </nav>
  </div>
</header>`;
}

/* -------------------------------------------------------------- footer */

function footer(d) {
  const addr = when(d.addressKnown, () => {
    const a = D.contact.address;
    const inner = `${esc(a.line1)}<br>${esc(a.locality)}<br>${esc(a.postcode)}`;
    return `<div><h2>Where</h2><address style="font-style:normal">${
      a.mapsUrl ? `<a href="${esc(a.mapsUrl)}" rel="noopener">${inner}</a>` : inner
    }</address></div>`;
  });

  const hours = when(d.hoursKnown, () =>
    `<div><h2>Hours</h2><dl style="display:grid;grid-template-columns:auto 1fr;gap:2px 12px;margin:0">${
      DAY_ORDER.map(k => `<dt>${DAY_LABEL[k]}</dt><dd style="margin:0;font-variant-numeric:tabular-nums">${
        D.contact.hours[k] === 'closed' ? 'Closed'
          : `${esc(D.contact.hours[k][0])}–${esc(D.contact.hours[k][1])}`
      }</dd>`).join('')
    }</dl></div>`);

  const reach = when(d.phoneKnown || d.emailKnown, () =>
    `<div><h2>Reach us</h2>${
      when(d.phoneKnown, () => `<p><a href="tel:${esc(D.contact.phone)}">${esc(D.contact.phone)}</a></p>`)
    }${
      when(d.emailKnown, () => `<p><a href="mailto:${esc(D.contact.email)}">${esc(D.contact.email)}</a></p>`)
    }</div>`);

  const legal = when(d.companyKnown, () =>
    `<p>${esc(D.company.companyName)} is a company registered in England and Wales, number ${
      esc(D.company.companyNumber)}.${
      when(D.isFilled(D.company.vatNumber), () => ` VAT ${esc(D.company.vatNumber)}.`)}</p>`);

  return `<footer class="foot">
  <div class="wrap">
    <div class="foot__grid">
      ${addr}
      ${hours}
      ${reach}
      <div>
        <h2>Follow</h2>
        <p><a href="${esc(D.site.instagramUrl)}" rel="noopener">@${esc(D.site.instagram)}</a></p>
      </div>
    </div>
    <div class="foot__legal">
      ${legal}
      <p>© ${new Date().getFullYear()} ${esc(D.site.name)}.</p>
    </div>
  </div>
</footer>`;
}

/* --------------------------------------------------------- action bar */

function actionBar(d) {
  const primary = d.deliveryLive.length
    ? `<a class="btn btn--primary" href="${esc(d.deliveryLive[0].url)}" rel="noopener">Order on ${esc(d.deliveryLive[0].name)}</a>`
    : `<a class="btn btn--primary" href="${esc(D.site.instagramUrl)}" rel="noopener">Follow for the opening</a>`;
  return `<div class="actionbar"><div class="wrap">
    <a class="btn btn--ghost" href="/menu/">Menu</a>
    ${primary}
  </div></div>`;
}

/* ---------------------------------------------------------------- page */

function document_(page) {
  const d = D.derive();
  return `<!doctype html>
<html lang="${D.site.locale}">
<head>
${head(page, d)}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
${ribbon(d)}
${header(page)}
<main id="main">
${page.body(d)}
</main>
${footer(d)}
${actionBar(d)}
<script src="/assets/js/main.js" defer></script>
</body>
</html>
`;
}

module.exports = { document_, esc, money, when, formatDate, DAY_ORDER, DAY_LABEL };
