'use strict';

const D = require('./data');
const { esc, money, when } = require('./layout');

/* ---------------------------------------------------- shared components */

function thirdsGlyph(lead) {
  // Never rendered below 24px wide — there is no micro variant. Below that the
  // labels cannot fit and the redundant coding collapses to colour alone.
  return `<div class="thirds${lead ? ' thirds--lead' : ''}" role="img" aria-label="A composed plate: chicken, pasta and salad">
  <span class="thirds__seg"><span class="thirds__bar thirds__bar--chicken"></span><span class="thirds__lb">Chicken</span></span>
  <span class="thirds__seg"><span class="thirds__bar thirds__bar--pasta"></span><span class="thirds__lb">Pasta</span></span>
  <span class="thirds__seg"><span class="thirds__bar thirds__bar--salad"></span><span class="thirds__lb">Salad</span></span>
</div>`;
}

function sauceDot(family) {
  if (!family) return '';
  const label = D.sauceFamilies[family].label;
  return `<span class="dot dot--${family}"></span><span class="visually-hidden">${esc(label)} sauce.</span>`;
}

/**
 * A dish photograph. WebP with a JPEG fallback, two widths, always lazy and
 * always with explicit dimensions so it cannot shift the layout while loading.
 * Alt text is empty on purpose: the dish name sits immediately beside the
 * image, so describing it again is noise in a screen reader.
 */
function dishPhoto(slug, sizes, widths, cls) {
  const dim = D.photoDims[slug] || [400, 400];
  const src = w => `/assets/img/dish/${slug}-${w}`;
  const srcset = ext => widths.map(w => `${src(w)}.${ext} ${w}w`).join(', ');
  return `<picture>
  <source type="image/webp" srcset="${srcset('webp')}" sizes="${sizes}">
  <img class="${cls}" src="${src(widths[0])}.jpg" srcset="${srcset('jpg')}" sizes="${sizes}"
       alt="" loading="lazy" decoding="async" width="${dim[0]}" height="${dim[1]}">
</picture>`;
}

function row(item, opts = {}) {
  // A price whose mapping we could not read is not printed. Ditto a calorie
  // figure. Silence is recoverable; a wrong price on a menu is not.
  const priceOut = item.priceConfirmed === false
    ? `<span class="row__price" aria-label="Price to be confirmed">—</span>`
    : `<span class="row__price">${money(item.price)}</span>`;

  const kcal = (item.kcal && item.kcalConfirmed)
    ? `<span class="row__meta">${item.kcal} kcal</span>`
    : '';

  // Alignment is a property of the CHAPTER, not the row. Where any dish in a
  // chapter has a photograph, the photo-less rows in it reserve the same
  // column so every dish name starts on the same line. Where no dish in a
  // chapter has one, nothing is reserved and the chapter sits flush left.
  // The reserved slot is empty space, never a placeholder image.
  const thumb = item.photo
    ? dishPhoto(item.photo, '(max-width: 640px) 80px, 140px', [400, 800], 'row__thumb')
    : (opts.reserveThumb ? '<span class="row__thumb row__thumb--empty" aria-hidden="true"></span>' : '');

  return `<div class="row${item.photo ? ' row--photo' : ''}">
  ${thumb}
  <div class="row__body">
    <span class="row__name">${sauceDot(item.sauce)}${esc(item.name)}</span>
    ${priceOut}
    ${when(item.desc, () => `<p class="row__desc">${esc(item.desc)}</p>`)}
    ${kcal}
    ${when(item.thirds && opts.showThirds !== false, () => `<div class="row__thirds">${thirdsGlyph()}</div>`)}
  </div>
</div>`;
}

function chapter(ch) {
  const reserveThumb = ch.items.some(i => i.photo);

  // h2: a chapter is a top-level division of the menu page, not a subsection.
  return `<section class="menu__chapter" aria-labelledby="ch-${ch.id}">
  <div class="menu__head">
    <h2 id="ch-${ch.id}">${esc(ch.name)}</h2>
    ${when(ch.priceStatement, () => `<span class="menu__price-statement">${esc(ch.priceStatement)}</span>`)}
  </div>
  ${when(ch.lede, () => `<p class="menu__lede">${esc(ch.lede)}</p>`)}
  ${ch.items.map(i => row(i, { reserveThumb })).join('\n')}
  ${when(ch.extras && ch.extras.length, () => `<div class="menu__extras"><ul>${
    ch.extras.map(e => `<li>${esc(e.name)} — ${
      e.priceConfirmed === false ? 'price to confirm' : money(e.price)
    }</li>`).join('')
  }</ul></div>`)}
</section>`;
}

function allergenNotice(d) {
  // The site refuses to present a menu as complete without discharging the
  // allergen duty. While nothing can be said, it says that plainly.
  if (D.allergens.perItem) return '';
  if (D.allergens.statement) {
    return `<div class="notice"><strong>Allergens.</strong> ${esc(D.allergens.statement)}</div>`;
  }
  return `<div class="notice"><strong>Allergens.</strong> Full allergen information for every
dish will be published here before we open, and will be available in the restaurant.
If you have an allergy, please ask a member of the team before ordering.</div>`;
}

function deliveryButtons(d) {
  if (!d.deliveryLive.length) return '';
  return `<div class="follow">${
    d.deliveryLive.map(x =>
      `<a class="btn btn--primary" href="${esc(x.url)}" rel="noopener">Order on ${esc(x.name)}</a>`
    ).join('')
  }</div>`;
}

/* ----------------------------------------------------------------- hero */

/**
 * The home hero. With no clips it is the static block it always was. With
 * clips it becomes a full-bleed video with the same words over it: a poster
 * image, two <video> elements that alternate so a crossfade is a real overlap
 * rather than a cut, and the --scrim gradient so the text clears AA over any
 * frame, sight unseen (white on the worst-case composite is 7.83:1).
 *
 * The first <video> carries autoplay muted loop playsinline. With JavaScript
 * off that is the whole behaviour — one clip, looping — and it is a real hero,
 * not a broken one. main.js removes `loop` and takes over the rotation.
 */
function heroBlock(d) {
  const inner = `
  <p class="hero__eyebrow">${d.isOpen ? 'Open now' : 'Opening soon'}</p>
  <h1>A whole meal for <em>${money(D.menu.find(c => c.id === 'plates').items[0].price)}</em>.</h1>
  <p class="hero__lede">${esc(D.copy.heroLede)}</p>
  <div class="hero__actions">
    <a class="btn btn--primary" href="/menu/">See the menu</a>
    <a class="btn btn--ghost" href="${esc(D.site.instagramUrl)}" rel="noopener">@${esc(D.site.instagram)}</a>
  </div>`;

  const poster = `/assets/img/dish/${D.hero.poster}-1600.jpg`;
  const src = slug => `/assets/video/${slug}-720.mp4`;
  const dim = D.photoDims[D.hero.poster] || [1600, 765];
  const h = Math.round(dim[1] * 1600 / dim[0]);

  // No clips: the same dark composition over the poster, with no <video> at
  // all — so the page never looks different depending on whether a clip
  // exists, only on whether anything moves.
  if (!D.hero.clips.length) {
    return `<section class="hero hero--video">
  <div class="hero__media" aria-hidden="true">
    <img class="hero__poster" src="${poster}" alt="" width="1600" height="${h}" decoding="async">
    <div class="hero__scrim"></div>
  </div>
  <div class="hero__text wrap">${inner}
  </div>
</section>`;
  }

  return `<section class="hero hero--video" data-hero-video data-clips="${esc(D.hero.clips.map(src).join(' '))}">
  <div class="hero__media" aria-hidden="true">
    <img class="hero__poster" src="${poster}" alt="" width="1600" height="${h}" decoding="async">
    <video class="hero__video is-active" autoplay muted loop playsinline preload="metadata" poster="${poster}">
      <source src="${src(D.hero.clips[0])}" type="video/mp4">
    </video>
    <video class="hero__video" muted playsinline preload="none"></video>
    <div class="hero__scrim"></div>
  </div>
  <div class="hero__text wrap">${inner}
  </div>
</section>`;
}

/* ----------------------------------------------------------------- home */

/**
 * The brand's own banner artwork, full width. It carries its tagline as
 * baked-in text, so the alt repeats it.
 */
function bannerBlock() {
  const b = D.copy.banner;
  const p = w => `/assets/img/brand/${b.file}-${w}`;
  return `<section class="artwork" aria-label="${esc(b.alt)}">
  <picture>
    <source type="image/webp" srcset="${p(900)}.webp 900w, ${p(1600)}.webp 1600w" sizes="100vw">
    <img class="artwork__img" src="${p(900)}.jpg" srcset="${p(900)}.jpg 900w, ${p(1600)}.jpg 1600w" sizes="100vw"
         alt="${esc(b.alt)}" loading="lazy" decoding="async" width="1600" height="601">
  </picture>
</section>`;
}

/**
 * Six dishes as cards. Each links to its chapter on the menu — there is no
 * ordering channel yet, so there is no "Order" button to promise one.
 */
function teaserCards() {
  const wanted = D.copy.teaser;
  const found = [];
  for (const ch of D.menu) for (const it of ch.items) {
    if (it.photo && wanted.includes(it.photo)) found.push({ ch, it });
  }
  found.sort((a, b) => wanted.indexOf(a.it.photo) - wanted.indexOf(b.it.photo));
  return found.map(({ ch, it }) => `<article class="card">
  <div class="card__media">${dishPhoto(it.photo, '(max-width: 640px) 100vw, 320px', [400, 800], 'card__img')}</div>
  <div class="card__body">
    ${it.thirds ? '<span class="pill pill--herb">Complete plate</span>' : ''}
    <h3 class="card__name">${esc(it.name)}</h3>
    ${when(it.desc, () => `<p class="card__desc">${esc(it.desc)}</p>`)}
    <div class="card__row">
      <span class="card__price">${it.priceConfirmed === false ? '—' : money(it.price)}</span>
      <a class="card__link" href="/menu/#ch-${ch.id}">See on the menu →</a>
    </div>
  </div>
</article>`).join('\n');
}

const home = {
  path: '/',
  title: 'Home',
  description: 'Marinated chicken thigh, pan-seared to order and served with pasta, a fresh salad and our own sauces. A whole meal, not a portion of meat.',
  body(d) {
    return `
${heroBlock(d)}

<section class="sec wrap split">
  <div>
    <p class="sec__kicker">Three things, one pan</p>
    <h2 class="hx"><span>${esc(D.copy.headline2[0])}</span> <em>${esc(D.copy.headline2[1])}</em></h2>
    <p class="sec__lede">Every composed plate is protein, carbohydrate and salad — not a portion of meat with
    sides sold separately. The glyph marks every plate on the menu that arrives this way.</p>
    <div style="margin-top:var(--s5)">${thirdsGlyph(true)}</div>
    <div class="balance">
      ${D.copy.balance.map(b =>
        `<div class="balance__item"><h3>${esc(b.title)}</h3><p>${esc(b.body)}</p></div>`
      ).join('')}
    </div>
  </div>
  <div>${dishPhoto('boneless-bbq', '(max-width: 900px) 100vw, 520px', [400, 800], 'split__img')}</div>
</section>

${bannerBlock()}

<section class="sec wrap">
  <p class="sec__kicker">From the menu</p>
  <h2 class="hx"><span>Six from the menu.</span> <em>Every price shown.</em></h2>
  <div class="cards">
${teaserCards()}
  </div>
  <dl class="prices">
    ${D.menu.filter(c => c.priceStatement).map(c => {
      const p = c.items.find(i => i.priceConfirmed !== false);
      return p ? `<div class="prices__cell"><dt>${esc(c.name)}</dt><dd>${money(p.price)}</dd></div>` : '';
    }).join('')}
  </dl>
  <div class="hero__actions" style="margin-top:var(--s6)">
    <a class="btn btn--primary" href="/menu/">The whole menu</a>
  </div>
</section>

<section class="band">
  <div class="wrap">
    <p class="sec__kicker">${esc(D.lunchDeal.from)}–${esc(D.lunchDeal.to)}</p>
    <h2>${esc(D.lunchDeal.name)} — ${esc(D.lunchDeal.claim)}</h2>
    <p class="band__prices">${
      D.lunchDeal.priceConfirmed
        ? D.lunchDeal.prices.map(money).join(' · ')
        : 'Lunch pricing to be confirmed'
    }</p>
  </div>
</section>

<section class="cta-band" aria-labelledby="cta-h">
  <div class="wrap">
    <p class="cta-band__wm" aria-hidden="true">Pookie</p>
    <h2 id="cta-h" class="cta-band__h">${esc(D.copy.cta.headline)}</h2>
    <p class="cta-band__p">${esc(D.copy.cta.body)}</p>
    <a class="btn btn--dark" href="/menu/">See the full menu</a>
  </div>
</section>

<section class="sec wrap">
  <p class="sec__kicker">About us</p>
  <h2>Freshly prepared daily, made for chicken lovers</h2>
  <div class="sec__lede" style="display:flex;flex-direction:column;gap:var(--s4)">
    ${D.copy.about.map(p => `<p>${esc(p)}</p>`).join('')}
  </div>
</section>

<section class="sec wrap">
  <p class="sec__kicker">${d.isOpen ? 'Order' : 'Be first to know'}</p>
  <h2>${d.isOpen ? 'Hungry now?' : 'We are not open yet.'}</h2>
  <p class="sec__lede">${d.isOpen
    ? 'Come in, or order for delivery.'
    : 'The date is not fixed yet. Instagram is where it will be announced first — no email list, no forms, nothing to unsubscribe from.'}</p>
  ${deliveryButtons(d)}
  <div class="follow">
    <a class="btn ${d.deliveryLive.length ? 'btn--ghost' : 'btn--primary'}" href="${esc(D.site.instagramUrl)}" rel="noopener">Follow @${esc(D.site.instagram)}</a>
    ${when(d.phoneKnown, () => `<a class="btn btn--ghost" href="tel:${esc(D.contact.phone)}">Call us</a>`)}
  </div>
</section>`;
  },
};

/* ----------------------------------------------------------------- menu */

const menuPage = {
  path: '/menu/',
  title: 'Menu',
  description: 'The full Pookie Chicken menu — chicken plates at £12.90 with pasta and salad, wings, boneless thigh, wraps, sirloin steak and a children’s menu.',
  body(d) {
    return `
<section class="hero wrap">
  <p class="hero__eyebrow">Menu</p>
  <h1>Everything we cook.</h1>
  <p class="hero__lede">Chicken thigh, marinated in our own blend and seared to order. The plates
  arrive complete — chicken, pasta and a fresh salad on one plate for ${money(12.90)}.</p>
</section>

<section class="interstitial" aria-label="A composed plate">
  ${dishPhoto('feature-plate', '100vw', [900, 1600], 'interstitial__img')}
</section>

<section class="wrap" style="padding-bottom:clamp(40px,6vw,72px)">
  <div class="menu">
    ${D.menu.map(chapter).join('\n')}
  </div>
  ${allergenNotice(d)}
  ${when(!D.menu.every(c => c.items.every(i => i.priceConfirmed !== false)), () =>
    `<div class="notice"><strong>A note on the wings.</strong> The wing prices sit between
    ${money(8.90)} and ${money(9.90)} and the per-item mapping is being confirmed with the
    kitchen. Rather than print a price that might be wrong, we have left it out until it is checked.</div>`)}
  ${deliveryButtons(d)}
</section>`;
  },
};

/* ---------------------------------------------------------------- about */

const about = {
  path: '/about/',
  title: 'About',
  description: 'Pookie Chicken prepares chicken fresh every day with its own marinades and homemade sauces, and serves it as a complete, balanced plate.',
  body(d) {
    return `
<section class="hero wrap">
  <p class="hero__eyebrow">About</p>
  <h1>A complete plate, made fresh every day.</h1>
</section>

<section class="sec wrap">
  <div class="measure" style="display:flex;flex-direction:column;gap:var(--s4)">
    ${D.copy.about.map(p => `<p>${esc(p)}</p>`).join('')}
  </div>
</section>

<section class="sec wrap">
  <p class="sec__kicker">What that means on the plate</p>
  <h2>Protein, carbohydrate, salad</h2>
  <div style="margin-top:var(--s5)">${thirdsGlyph(true)}</div>
  <div class="balance">
    ${D.copy.balance.map(b =>
      `<div class="balance__item"><h3>${esc(b.title)}</h3><p>${esc(b.body)}</p></div>`
    ).join('')}
  </div>
</section>

${when(D.copy.sauceStory.verified, () => `
<section class="sec wrap">
  <p class="sec__kicker">The sauces</p>
  <h2>Made here</h2>
  <p class="sec__lede">${esc(D.copy.sauceStory.body || '')}</p>
</section>`)}`;
  },
};

/* -------------------------------------------------------------- find us */

const findUs = {
  path: '/find-us/',
  title: 'Find us',
  description: 'Where to find Pookie Chicken, the hours we are open, and how to reach the restaurant by phone or email once we have opened our doors.',
  body(d) {
    if (!d.addressKnown) {
      return `
<section class="hero wrap">
  <p class="hero__eyebrow">Find us</p>
  <h1>We do not have a door to point you at yet.</h1>
  <p class="hero__lede">The site is up before the restaurant is. When the address and the
  opening date are fixed they will be published here first, and announced on Instagram
  the same day.</p>
  <div class="hero__actions">
    <a class="btn btn--primary" href="${esc(D.site.instagramUrl)}" rel="noopener">Follow @${esc(D.site.instagram)}</a>
    <a class="btn btn--ghost" href="/menu/">Read the menu</a>
  </div>
</section>`;
    }

    const a = D.contact.address;
    return `
<section class="hero wrap">
  <p class="hero__eyebrow">Find us</p>
  <h1>${esc(a.locality)}</h1>
  <address class="hero__lede" style="font-style:normal">
    ${esc(a.line1)}<br>${esc(a.locality)}<br>${esc(a.postcode)}
  </address>
  <div class="hero__actions">
    ${when(a.mapsUrl, () => `<a class="btn btn--primary" href="${esc(a.mapsUrl)}" rel="noopener">Open in Maps</a>`)}
    ${when(d.phoneKnown, () => `<a class="btn btn--ghost" href="tel:${esc(D.contact.phone)}">${esc(D.contact.phone)}</a>`)}
  </div>
</section>

${when(d.hoursKnown, () => `
<section class="sec wrap">
  <p class="sec__kicker">Hours</p>
  <h2>When we are here</h2>
  <dl class="prices" style="margin-top:var(--s5)">
    ${require('./layout').DAY_ORDER.map(k => {
      const L = require('./layout');
      const v = D.contact.hours[k];
      return `<div class="prices__cell"><dt>${L.DAY_LABEL[k]}</dt><dd style="font-size:var(--t-lg)">${
        v === 'closed' ? 'Closed' : `${esc(v[0])}–${esc(v[1])}`}</dd></div>`;
    }).join('')}
  </dl>
</section>`)}`;
  },
};

/* ------------------------------------------------------------------ 404 */

const notFound = {
  path: '/404.html',
  title: 'Page not found',
  description: 'That page does not exist on the Pookie Chicken site. The menu, with every plate and every price, is probably what you were looking for.',
  body() {
    return `
<section class="hero wrap">
  <p class="hero__eyebrow">404</p>
  <h1>That page is not on the menu.</h1>
  <p class="hero__lede">Whatever you were looking for has moved or never existed.
  The menu is the best place to start.</p>
  <div class="hero__actions">
    <a class="btn btn--primary" href="/menu/">See the menu</a>
    <a class="btn btn--ghost" href="/">Home</a>
  </div>
</section>`;
  },
};

/* ---------------------------------------------------------------------- */

// /catering/ is gated: without an inbox to send an enquiry to, the page would
// be a dead end. It appears in this list only once cateringEmail is set.
function allPages() {
  const pages = [home, menuPage, about, findUs, notFound];
  return pages;
}

module.exports = { allPages, home, menuPage, about, findUs, notFound };
