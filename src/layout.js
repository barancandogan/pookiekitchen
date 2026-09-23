'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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

/* ------------------------------------------------------------- versions */

/**
 * ?v=<content hash> on the stylesheet and the script.
 *
 * Their filenames carry no hash, and nginx caches /assets/ hard — which it
 * must, or every page view re-fetches them. The cost of that without this
 * was real and was seen on the live site: a visitor's browser kept an old
 * main.js against new HTML for up to seven days, so a script a deploy had
 * added simply did not exist for them. The hash is of the file's bytes, so
 * an unchanged file keeps its URL across deploys and a changed one cannot.
 */
function version(rel) {
  const file = path.join(__dirname, '..', rel);
  const h = crypto.createHash('sha1').update(fs.readFileSync(file)).digest('hex').slice(0, 10);
  return `/${rel}?v=${h}`;
}
const CSS_URL = version('assets/css/main.css');
const JS_URL = version('assets/js/main.js');

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
${ogImage()}
<meta name="theme-color" content="${D.brand.paper}">
${when(!D.site.indexable, () => `<meta name="robots" content="noindex, nofollow">`)}
<link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
<link rel="preload" href="/assets/fonts/anton-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${CSS_URL}">
${jsonLd(d)}`;
}

/**
 * The share card.
 *
 * Emitted only when site.url is set, because og:image must be an ABSOLUTE URL
 * — a relative one is silently ignored by most scrapers, which is worse than
 * none at all since it looks correct in the markup. Width and height are
 * declared so a scraper can lay the card out without fetching the file, and
 * the alt is there for the platforms that read it.
 *
 * twitter:card is summary_large_image so the picture leads rather than sitting
 * as a thumbnail beside the text.
 */
function ogImage() {
  const img = D.site.socialImage;
  if (!img || !D.site.url) return '';
  const url = `${D.site.url}${img.path}`;
  return `<meta property="og:image" content="${esc(url)}">
<meta property="og:image:width" content="${img.width}">
<meta property="og:image:height" content="${img.height}">
<meta property="og:image:alt" content="${esc(img.alt)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${esc(url)}">`;
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
  // Coordinates are the postcode centroid, which is what a geo node is for:
  // "this is where the place is", accurate to the parade rather than the
  // doorstep. Emitted only alongside a full postal address, never instead of
  // one — a lat/long with no street is how a listing ends up pinned in a road.
  if (D.contact.geo) {
    node.geo = {
      '@type': 'GeoCoordinates',
      latitude: D.contact.geo.lat,
      longitude: D.contact.geo.lon,
    };
  }
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
  // The strip across the top of every page belongs to the owner. It shows the
  // one line they set in the panel ("Closed 25 December") and nothing else:
  // the site no longer writes a status line of its own there — neither the
  // pre-opening "Not open yet" nor an automatic "Open today" — at the owner's
  // request. With no announcement set there is no strip at all.
  if (!D.isFilled(D.site.announcement)) return '';
  return `<div class="ribbon${d.isOpen ? ' ribbon--open' : ''}">${esc(D.site.announcement)}</div>`;
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

  // id + tabindex: the target of the "Back to top" link at the foot of the
  // page. tabindex="-1" makes it focusable without putting it in the tab
  // order, which is the standard skip-link-target technique — so following
  // the link moves the keyboard's place to the top, not just the scrollbar's.
  return `<header class="head" id="top" tabindex="-1">
  <div class="wrap head__in">
    <a class="brandmark" href="/">
      <img src="/assets/img/logo-lockup.svg" alt="Pookie Chicken" width="145" height="52">
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
  // A full address renders as an address. Should one ever be removed from
  // data.js, the neighbourhood alone renders as a plain sentence in an
  // ordinary <p> — never in an <address> element and never in the Restaurant
  // schema, because a district is a hint and not a place you can post a letter
  // to, and the markup must not claim otherwise.
  const addr = d.addressKnown
    ? (() => {
        const a = D.contact.address;
        const inner = `${esc(a.line1)}<br>${esc(a.locality)}<br>${esc(a.postcode)}`;
        return `<div><h2>Where</h2><address>${
          a.mapsUrl ? `<a href="${esc(a.mapsUrl)}" rel="noopener">${inner}</a>` : inner
        }</address></div>`;
      })()
    : when(D.isFilled(D.contact.neighbourhood), () =>
        `<div><h2>Where</h2><p>${esc(D.contact.neighbourhood)}</p>
        <p class="foot__note">The full address goes here the day it is fixed.</p></div>`);

  const hours = when(d.hoursKnown, () =>
    `<div><h2>Hours</h2><dl class="foot__hours">${
      DAY_ORDER.map(k => `<dt>${DAY_LABEL[k]}</dt><dd>${
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
      <p>© ${new Date().getFullYear()} ${esc(D.site.name)}. ${esc(D.copy.lines.brighterDays)}
        <span class="foot__sep" aria-hidden="true">·</span> <a href="/cookies/">Cookies</a></p>
      <!-- A plain in-page link, which is all it is without JavaScript: the last
           line of the footer, and it works. main.js lifts it out of the flow
           and turns it into the floating button that appears once you are a
           screen or so down the page. -->
      <a class="totop" href="#top">
        <svg class="totop__arrow" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"
          ><path fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
             d="M12 19V5m0 0-7 7m7-7 7 7"/></svg>
        <span class="totop__label">Back to top</span>
      </a>
    </div>
  </div>
</footer>`;
}

/* ------------------------------------------------------------ consent */

/**
 * The cookie banner. In every page's markup, hidden, and shown by main.js on
 * arrival while no valid choice is stored — the conventional bar along the
 * bottom that every visitor recognises, asked once, on whichever page they
 * land on. It is not a modal and takes no focus: the page behind it works,
 * and the map simply waits for the answer. Accept and Reject are the same
 * button in the same place — the ICO's line is that rejecting must be as
 * easy as accepting, and here it is the same gesture.
 *
 * With JavaScript off it stays hidden, because without JavaScript nothing
 * could load a map anyway and there would be nothing to consent to.
 */
function consentBanner() {
  const P = D.privacy;
  return `<div class="consent" hidden role="region" aria-label="Cookies"
     data-consent-key="${esc(P.storageKey)}" data-consent-months="${P.consentMonths}">
  <div class="wrap consent__in">
    <p class="consent__text"><strong>Cookies.</strong> We use cookies only to show the Google map of where
    we are. Nothing is stored until you choose. <a href="/cookies/">Cookie policy</a></p>
    <div class="consent__actions">
      <button type="button" class="btn btn--ghost" data-consent="no">Reject</button>
      <button type="button" class="btn btn--ghost" data-consent="yes">Accept</button>
    </div>
  </div>
</div>`;
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
${consentBanner()}
${actionBar(d)}
<script src="${JS_URL}" defer></script>
</body>
</html>
`;
}

module.exports = { document_, esc, money, when, formatDate, DAY_ORDER, DAY_LABEL };
