'use strict';

const D = require('./data');
const { esc, money, when } = require('./layout');

/* ---------------------------------------------------- shared components */

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
function dishPhoto(slug, sizes, widths, cls, alt = '') {
  const dim = D.photoDims[slug] || [400, 400];
  const src = w => `/assets/img/dish/${slug}-${w}`;
  const srcset = ext => widths.map(w => `${src(w)}.${ext} ${w}w`).join(', ');
  return `<picture>
  <source type="image/webp" srcset="${srcset('webp')}" sizes="${sizes}">
  <img class="${cls}" src="${src(widths[0])}.jpg" srcset="${srcset('jpg')}" sizes="${sizes}"
       alt="${esc(alt)}" loading="lazy" decoding="async" width="${dim[0]}" height="${dim[1]}">
</picture>`;
}

/**
 * The three parts of a composed plate, with the weights off the brand's own
 * "All in one" card. The figure leads and the sentence follows it, because the
 * figure is the fact and the sentence is the colour.
 *
 * The four benefit badges beneath render only once copy.claimsVerified is true
 * — see the note in data.js. They are health claims, not facts about a plate,
 * and this site does not publish an unchecked claim.
 */
function balanceBlock() {
  const b = D.copy.balance;
  return `<ul class="balance">
    ${b.parts.map(x => `<li class="balance__item">
      <h3>${esc(x.title)}</h3>
      ${when(x.amount, () => `<p class="balance__amount">${esc(x.amount)}</p>`)}
      <p>${esc(x.body)}</p>
    </li>`).join('')}
  </ul>${when(D.copy.claimsVerified, () => `
  <ul class="claims">${
    b.badges.map(t => `<li>${esc(t)}</li>`).join('')
  }</ul>`)}`;
}

/**
 * Heat, on the brand's own five-chilli scale. Only the dishes whose level is
 * printed on their menu card carry one; the rest say nothing rather than guess,
 * so an absent scale here means "not stated", never "mild".
 */
function heatMeter(level) {
  if (!level) return '';
  const pips = Array.from({ length: 5 }, (_, i) =>
    `<span class="heat__pip${i < level ? ' is-on' : ''}"></span>`).join('');
  return `<span class="heat"><span class="visually-hidden">Heat ${level} out of 5.</span>` +
    `<span class="heat__pips" aria-hidden="true">${pips}</span></span>`;
}

function row(item, opts = {}) {
  // A price whose mapping we could not read is not printed. Ditto a calorie
  // figure. Silence is recoverable; a wrong price on a menu is not.
  const priceOut = item.priceConfirmed === false
    ? `<span class="row__price" aria-label="Price to be confirmed">—</span>`
    : `<span class="row__price">${money(item.price)}</span>`;

  // Calories and heat share one meta line so a dish that has both does not
  // grow a second right-aligned row for the sake of five dots.
  const meta = [
    (item.kcal && item.kcalConfirmed) ? `${item.kcal} kcal` : '',
    heatMeter(item.heat),
  ].filter(Boolean);
  const kcal = meta.length
    ? `<span class="row__meta">${meta.join('<span class="row__meta-sep">·</span>')}</span>`
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
  <div class="hero__actions">
    <a class="btn btn--primary" href="/menu/">See the menu</a>
    <a class="btn btn--ghost" href="${esc(D.site.instagramUrl)}" rel="noopener">@${esc(D.site.instagram)}</a>
  </div>`;

  const src = slug => `/assets/video/${slug}-720.mp4`;

  // WITH CLIPS, THE POSTER IS THE FIRST CLIP'S FIRST FRAME — not a photograph.
  // Whatever is in the poster is what a visitor sees until the browser can
  // start the clip, and then the first decoded frame replaces it in one step
  // with no transition, because that swap is the browser's and not ours. A
  // different picture there is a visible jump between two scenes and reads as
  // a glitch; the same picture simply starts to move. tools/video/poster.py
  // makes the file from the clip, so the two cannot drift apart.
  //
  // Without clips there is no swap to hide, and the studio photograph — the
  // better still — is the hero.
  const clips = D.hero.clips;
  const poster = clips.length
    ? `/assets/video/${clips[0]}-poster.jpg`
    : `/assets/img/dish/${D.hero.poster}-1600.jpg`;
  const dim = clips.length ? [1280, 720] : (D.photoDims[D.hero.poster] || [1600, 765]);
  const w = dim[0], h = dim[1];

  // No clips: the same dark composition over the poster, with no <video> at
  // all — so the page never looks different depending on whether a clip
  // exists, only on whether anything moves.
  if (!D.hero.clips.length) {
    return `<section class="hero hero--video">
  <div class="hero__media" aria-hidden="true">
    <img class="hero__poster" src="${poster}" alt="" width="${w}" height="${h}" decoding="async">
    <div class="hero__scrim"></div>
  </div>
  <div class="hero__text wrap">${inner}
  </div>
</section>`;
  }

  // preload="auto", not "metadata": this clip autoplays, so the browser
  // should be fetching it from the first byte of the page, not deciding to
  // once it has read the headers. Every moment saved there is a moment less
  // of the poster.
  return `<section class="hero hero--video" data-hero-video data-clips="${esc(clips.map(src).join(' '))}">
  <div class="hero__media" aria-hidden="true">
    <img class="hero__poster" src="${poster}" alt="" width="${w}" height="${h}" decoding="async">
    <video class="hero__video is-active" autoplay muted loop playsinline preload="auto" poster="${poster}">
      <source src="${src(clips[0])}" type="video/mp4">
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
 * The menu as words: chapter, dish, price, and nothing else. No photograph,
 * no description, no per-line link — the gallery underneath carries the
 * pictures, and /menu/ carries the detail. A price that is not confirmed
 * prints a dash here exactly as it does on the menu itself.
 */
function menuListing() {
  return D.menu.map(ch => `  <section class="listing__ch">
    <h3>${esc(ch.name)}</h3>
    <ul>
${ch.items.map(it => `      <li><span class="listing__name">${esc(it.name)}</span>${
    it.priceConfirmed === false
      ? '<span class="listing__price" aria-label="Price to be confirmed">—</span>'
      : `<span class="listing__price">${money(it.price)}</span>`
  }</li>`).join('\n')}
    </ul>
  </section>`).join('\n');
}

/**
 * Every dish photograph, once, in menu order. No caption, no price, no link:
 * the pictures are the whole of the block. That makes the alt text the only
 * thing naming each plate, so — unlike every other photograph on the site,
 * where the dish name sits right beside the image and a second reading of it
 * would be noise — these carry the dish name rather than an empty alt.
 */
function galleryPhotos() {
  const seen = new Set();
  const out = [];
  for (const ch of D.menu) {
    for (const it of ch.items) {
      if (!it.photo || seen.has(it.photo)) continue;
      seen.add(it.photo);
      out.push(`    <li>${dishPhoto(it.photo, '(max-width: 600px) 50vw, 280px', [400, 800], 'gallery__img', it.name)}</li>`);
    }
  }
  return out.join('\n');
}

/**
 * The map.
 *
 * Renders nothing at all until there is a real address — a map of a place we
 * cannot name in words is a guess with a pin on it.
 *
 * WHAT SHIPS IN THE HTML IS NOT THE MAP. It is a link to Google Maps, styled
 * as a panel with a button, carrying the embed URL in a data attribute. The
 * iframe is put in by main.js only once the visitor has said yes — on the
 * cookie banner, on /cookies/, or by pressing this panel's own button, which
 * is the same consent given in context. Nothing reaches Google before that:
 * not the frame, not their IP address, not the NID cookie Google's embed
 * sets. PECR regulation 6 wants consent before, never after, and this is the
 * only thing on the site that sets a cookie at all.
 *
 * With JavaScript off the panel is exactly what it looks like — a link that
 * opens the map on Google's site, which is a navigation the visitor chose.
 *
 * The address, the postcode and the maps link sit beside the map in plain
 * text, never inside it. They are the answer; the map is the illustration.
 */
function mapEmbedUrl() {
  const m = D.mapView;
  const a = D.contact.address;
  const q = encodeURIComponent(`${a.line1}, ${a.locality} ${a.postcode}`);
  if (m.apiKey) {
    return `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(m.apiKey)}`
      + `&q=${q}&zoom=${m.zoom}&language=${encodeURIComponent(m.language)}`;
  }
  if (m.embedPb) {
    // Accepts the bare pb value, the full embed URL, or the whole <iframe>
    // snippet Google's Share dialog hands out — whatever was pasted.
    const pb = (String(m.embedPb).match(/pb=([^"'&\s]+)/) || [null, m.embedPb])[1];
    return `https://www.google.com/maps/embed?pb=${pb}`;
  }
  return `https://maps.google.com/maps?q=${q}&z=${m.zoom}&hl=${encodeURIComponent(m.language)}&output=embed`;
}

function mapBlock(d, opts = {}) {
  if (!d.addressKnown) return '';
  const a = D.contact.address;
  const embed = mapEmbedUrl();
  const heading = opts.heading || 'Where to find us';

  return `<section class="sec wrap" aria-labelledby="where-h">
  <p class="sec__kicker">Find us</p>
  <h2 id="where-h">${esc(heading)}</h2>
  <div class="where">
    <div class="where__text">
      <address class="where__address">${esc(a.line1)}<br>${esc(a.locality)}<br>${esc(a.postcode)}</address>
      ${when(D.contact.transit, () => `<p class="where__note">${esc(D.contact.transit)}</p>`)}
      ${when(!d.isOpen, () => `<p class="where__note">The door is not open yet — the date goes up here and on
      Instagram the moment it is fixed.</p>`)}
      <div class="hero__actions">
        ${when(a.mapsUrl, () => `<a class="btn btn--primary" href="${esc(a.mapsUrl)}" rel="noopener">Open in Maps</a>`)}
        ${when(d.phoneKnown, () => `<a class="btn btn--ghost" href="tel:${esc(D.contact.phone)}">${esc(D.contact.phone)}</a>`)}
      </div>
    </div>
    <figure class="map" data-map data-map-embed="${esc(embed)}"
            data-map-title="Map showing ${esc(a.line1)}, ${esc(a.locality)} ${esc(a.postcode)}">
      <a class="map__ask" href="${esc(a.mapsUrl)}" rel="noopener">
        <span class="map__pin" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="28" height="28" focusable="false"><path fill="currentColor"
            d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z"/></svg>
        </span>
        <span class="map__label">Show the map</span>
        <span class="map__note">Loads from Google Maps, which sets cookies</span>
      </a>
    </figure>
  </div>
</section>`;
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
    <p class="sec__kicker">${esc(D.copy.balance.kicker)}</p>
    <h2 class="hx"><span>${esc(D.copy.balance.heading[0])}</span> <em>${esc(D.copy.balance.heading[1])}</em></h2>
    <p class="sec__lede">Every composed plate is protein, carbohydrate and salad on one plate — not a
    portion of meat with sides sold separately.</p>
    ${balanceBlock()}
  </div>
  <!-- 1200 as well as 400/800: this one renders at 520 CSS px, which is 1040
       device pixels on the retina screen most people will read it on. -->
  <div>${dishPhoto('triple-cheese-duo', '(max-width: 900px) 100vw, 520px', [400, 800, 1200], 'split__img')}</div>
</section>

<section class="sec wrap">
  <p class="sec__kicker">The menu</p>
  <h2 class="hx"><span>Everything we cook.</span> <em>Every price we can confirm.</em></h2>
  <div class="listing">
${menuListing()}
  </div>
  <div class="hero__actions hero__actions--after">
    <a class="btn btn--primary" href="/menu/">The menu, with descriptions</a>
  </div>
</section>

<section class="sec wrap" aria-label="The gallery">
  <p class="sec__kicker">The gallery</p>
  <ul class="gallery">
${galleryPhotos()}
  </ul>
</section>

<section class="statement" aria-label="${esc(D.copy.headline2.join(' '))}">
  <p class="wrap"><span>${esc(D.copy.headline2[0])}</span> <em>${esc(D.copy.headline2[1])}</em></p>
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

<section class="sec wrap">
  <p class="sec__kicker">${esc(D.copy.lines.freshDaily)}</p>
  <h2>Made for chicken lovers</h2>
  <div class="sec__lede stack">
    ${D.copy.about.map(p => `<p>${esc(p)}</p>`).join('')}
  </div>
</section>

<section class="sec wrap">
  <p class="sec__kicker">${d.isOpen ? 'Order' : 'Be first to know'}</p>
  <h2>${d.isOpen ? esc(D.copy.lines.tasteTheDifference) : 'We are not open yet.'}</h2>
  <p class="sec__lede">${d.isOpen
    ? 'Come in, or order for delivery.'
    : 'The date is not fixed yet. Instagram is where it will be announced first — no email list, no forms, nothing to unsubscribe from.'}</p>
  ${deliveryButtons(d)}
  <div class="follow">
    <a class="btn ${d.deliveryLive.length ? 'btn--ghost' : 'btn--primary'}" href="${esc(D.site.instagramUrl)}" rel="noopener">Follow @${esc(D.site.instagram)}</a>
    ${when(d.phoneKnown, () => `<a class="btn btn--ghost" href="tel:${esc(D.contact.phone)}">Call us</a>`)}
  </div>
</section>

${mapBlock(d, { heading: D.contact.neighbourhood })}

${bannerBlock()}`;
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

<section class="wrap sec--tail">
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
  <h1>${esc(D.copy.lines.betterYou)}</h1>
</section>

<section class="sec wrap">
  <div class="measure stack">
    ${D.copy.about.map(p => `<p>${esc(p)}</p>`).join('')}
  </div>
</section>

<section class="sec wrap">
  <p class="sec__kicker">What that means on the plate</p>
  <h2>Protein, carbohydrate, salad</h2>
  ${balanceBlock()}
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
    // No address yet. If the brand has named a neighbourhood, say that and be
    // explicit that it is all we have — a visitor who reads "Chapel Market"
    // and turns up looking for a door has been misled, so the page says in as
    // many words that there is not a door to find yet.
    if (!d.addressKnown) {
      const hood = D.isFilled(D.contact.neighbourhood);
      return `
<section class="hero wrap">
  <p class="hero__eyebrow">Find us</p>
  <h1>${hood ? `We are coming to <em>${esc(D.contact.neighbourhood)}</em>.` : 'We do not have a door to point you at yet.'}</h1>
  <p class="hero__lede">${hood
    ? 'That is the whole of what we can tell you today — the neighbourhood, not the number on the door. The street address and the opening date are published here the moment they are fixed, and announced on Instagram the same day.'
    : 'The site is up before the restaurant is. When the address and the opening date are fixed they will be published here first, and announced on Instagram the same day.'}</p>
  <div class="hero__actions">
    <a class="btn btn--primary" href="${esc(D.site.instagramUrl)}" rel="noopener">Follow @${esc(D.site.instagram)}</a>
    <a class="btn btn--ghost" href="/menu/">Read the menu</a>
  </div>
</section>`;
    }

    const a = D.contact.address;
    // The hero says the street; the map block under it repeats the address in
    // full beside the map, so the two are never read apart.
    return `
<section class="hero wrap">
  <p class="hero__eyebrow">Find us</p>
  <h1>${esc(a.line1)}<em>.</em></h1>
  <p class="hero__lede">${esc(D.contact.neighbourhood)}${
    when(D.contact.transit, () => `. ${esc(D.contact.transit)}`)}</p>
</section>

${mapBlock(d, { heading: 'The address' })}

${when(d.hoursKnown, () => `
<section class="sec wrap">
  <p class="sec__kicker">Hours</p>
  <h2>When we are here</h2>
  <dl class="prices prices--after">
    ${require('./layout').DAY_ORDER.map(k => {
      const L = require('./layout');
      const v = D.contact.hours[k];
      return `<div class="prices__cell"><dt>${L.DAY_LABEL[k]}</dt><dd class="prices__big">${
        v === 'closed' ? 'Closed' : `${esc(v[0])}–${esc(v[1])}`}</dd></div>`;
    }).join('')}
  </dl>
</section>`)}`;
  },
};

/* -------------------------------------------------------------- cookies */

/**
 * The cookie notice, and the place to change your mind.
 *
 * Short because there is little to say: the site sets nothing, the map
 * does, and the choice is stored. Written in the second person and in plain
 * words, as PECR asks — "clear and comprehensive information" — and with
 * the controls on the page itself, so withdrawing consent is one click and
 * not a support ticket. The company line and the contact address render only
 * once they exist in data.js, like everywhere else; a notice that named a
 * company we have not confirmed would be a fiction in a legal document.
 */
const cookies = {
  path: '/cookies/',
  title: 'Cookies',
  description: 'What this website stores on your device — which is nothing of its own — and how the Google map asks before it loads.',
  body(d) {
    const a = D.contact.address;
    const P = D.privacy;
    return `
<section class="hero wrap">
  <p class="hero__eyebrow">Cookies</p>
  <h1>We set none of our own.</h1>
  <p class="hero__lede">No analytics, no tracking, no fonts from anyone else’s server. One thing on this
  site does set cookies, and it asks first.</p>
</section>

<section class="sec wrap">
  <div class="measure stack">
    <h2>The map</h2>
    <p>The map on the home page and on <a href="/find-us/">Find us</a> comes from Google Maps. When it
    loads, your browser connects to Google: Google receives your IP address and sets its own cookies
    (its <code>NID</code> cookie, for example, which lasts about six months), under
    <a href="https://policies.google.com/privacy" rel="noopener">Google’s privacy policy</a>. We
    have no access to what Google collects.</p>
    <p>So the map does not load until you say so — on the banner, here, or by pressing
    “Show the map” on the map itself. Rejecting it costs you nothing: the address is written
    beside it, and the “Open in Maps” button takes you to Google in a new page, which is a
    visit you chose to make.</p>

    <h2>Your choice</h2>
    <div class="consent__page" data-consent-page>
      <p class="consent__status" data-consent-status>You have not chosen yet, or your browser does not
      keep the choice.</p>
      <div class="consent__actions">
        <button type="button" class="btn btn--ghost" data-consent="no">Reject the map</button>
        <button type="button" class="btn btn--ghost" data-consent="yes">Allow the map</button>
      </div>
    </div>
    <p>Your answer is kept in your browser’s local storage, under the name <code>${esc(P.storageKey)}</code>. It
    is the only thing this site ever writes to your device, and it is there so that we do not ask you
    on every page. It expires after ${P.consentMonths} months, and then we ask again. Clearing your
    browser’s site data removes it sooner.</p>
    <noscript><p>The buttons above need JavaScript. Without it nothing is stored and no map ever loads:
    the map panel is simply a link to Google Maps.</p></noscript>

    <h2>Server logs</h2>
    <p>Like every web server, ours writes a line to a log for each request: your IP address, the time,
    the page asked for and the name of your browser. We keep those logs to keep the site up and to
    notice abuse — that is our legitimate interest under UK GDPR — and they are deleted
    automatically after ${P.logRetentionDays} days.</p>

    <h2>Who we are</h2>
    <address>${esc(D.site.name)}${when(d.companyKnown, () => ` (${esc(D.company.companyName)}, company number ${esc(D.company.companyNumber)})`)}<br>${esc(a.line1)}<br>${esc(a.locality)} ${esc(a.postcode)}</address>
    ${when(d.emailKnown, () => `<p>Questions about any of this: <a href="mailto:${esc(D.contact.email)}">${esc(D.contact.email)}</a>.</p>`)}
    <p>You can also complain to the UK’s regulator, the
    <a href="https://ico.org.uk/make-a-complaint/" rel="noopener">Information Commissioner’s Office</a>.</p>
  </div>
</section>`;
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
  const pages = [home, menuPage, about, findUs, cookies, notFound];
  return pages;
}

module.exports = { allPages, home, menuPage, about, findUs, cookies, notFound };
