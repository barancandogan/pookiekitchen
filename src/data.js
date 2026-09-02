'use strict';

/**
 * Pookie Chicken — single source of truth.
 *
 * Everything the site renders comes from this file. Nothing in dist/ is written
 * by hand. See README.md "Launch day" for the exact fields that flip the site
 * from pre-opening to open.
 *
 * NULL IS A FIRST-CLASS VALUE HERE. A null field means "we do not know this
 * yet", and every template is required to render nothing at all rather than a
 * placeholder. Never write "TBC", "Coming soon" or "07xxx" into these fields —
 * a visitor reads a placeholder as a fact.
 */

/* ------------------------------------------------------------------ site */

const site = {
  name: 'Pookie Chicken',
  tagline: 'More than a meal — a perfectly balanced plate',

  // The production hostname. Feeds canonicals, Open Graph and the sitemap.
  // Until this is set the build emits relative canonicals and omits og:url.
  url: null,                                    // e.g. 'https://pookiechicken.co.uk'

  locale: 'en-GB',
  currency: 'GBP',
  currencySymbol: '£',

  instagram: 'thepookiechicken',
  instagramUrl: 'https://instagram.com/thepookiechicken',
};

/* ---------------------------------------------------------------- status */

/**
 * The single switch that drives pre-opening vs open.
 *
 * `openingState` is DERIVED, never hand-set — see derive() at the bottom. The
 * site is "open" only when it can actually answer the questions an open
 * restaurant must answer: where are you, and when are you there.
 */
const status = {
  openingDate: null,          // ISO date, e.g. '2026-10-14'. null = date unannounced.
  announcedOpen: false,       // set true on the morning you actually open.
};

/* --------------------------------------------------------------- contact */

const contact = {
  // Street address. All five parts must be present for the address to render
  // at all — a half address is worse than none.
  address: {
    line1: null,              // e.g. 'Unit 4, 120 Kingsland Road'
    locality: null,           // e.g. 'London'
    postcode: null,           // e.g. 'E2 8DP'
    country: 'GB',
    mapsUrl: null,            // Google Maps place link
  },

  phone: null,                // E.164 preferred, e.g. '+442071234567'
  email: null,                // general enquiries
  cateringEmail: null,        // gates /catering/ — omit and the page is not built
  jobsEmail: null,            // gates the hiring block

  // Opening hours. Each day is [openHHMM, closeHHMM] or null for closed.
  // The whole table is ignored until every key is filled — a partial week
  // renders nothing, because "Tue: ?" tells a visitor to phone a number we
  // also do not have.
  hours: {
    mon: null, tue: null, wed: null, thu: null,
    fri: null, sat: null, sun: null,
  },

  // Lunch deal window. This one IS known — it is printed on the menu.
  lunchDeal: { from: '12:00', to: '17:00' },
};

/* ------------------------------------------------------------- delivery */

// Each entry renders a button only when its url is non-null.
const delivery = [
  { id: 'deliveroo', name: 'Deliveroo', url: null },
  { id: 'ubereats',  name: 'Uber Eats', url: null },
  { id: 'justeat',   name: 'Just Eat',  url: null },
];

/* -------------------------------------------------------------- company */

// Required in the footer for a UK limited company. The footer renders a
// legal line only when companyName and companyNumber are both present.
const company = {
  companyName: null,          // e.g. 'Pookie Chicken Ltd'
  companyNumber: null,        // Companies House number
  vatNumber: null,            // optional — omitted if null
  registeredOffice: null,     // if different from the restaurant address
};

/* --------------------------------------------------------------- brand */

/**
 * Colour is defined in assets/css/main.css as custom properties. These values
 * are duplicated here ONLY for the build to emit theme-color meta tags and to
 * let audit.js verify the two stay in step.
 *
 * The three-layer rule (see README "Colour"):
 *   logo.*   — the untouched logo values. Logo and decorative fills only.
 *   display  — logoRed at >=24px only (4.22:1 on paper, clears 3:1 large-text).
 *   text     — darkened. Body copy, links, small UI. 6.59:1 on paper.
 */
const brand = {
  logo: {
    red:    '#E12F1C',        // comb, "Pookie"
    orange: '#FD8105',        // body gradient
    orangeDark: '#FC6604',    // drip, "Chicken"
    amber:  '#FDAA04',        // body
  },
  text:   '#A32E17',          // --brand, light theme
  textDark: '#F2795A',        // --brand, dark theme
  paper:  '#FBF6EC',
  paperDark: '#16120E',

  // Set to true only once fraunces-600.woff2 exists in assets/fonts/ and is
  // licensed for self-hosting. While false the site ships the system serif
  // fallback stack alone — which is the spec's stated fallback position, not
  // a degraded mode.
  webfont: false,
};

/* --------------------------------------------------------------- sauces */

/**
 * Sauce families. The dot beside a dish name is this family's colour, always
 * inside a 1.5px ring so its boundary clears 3:1 whatever the fill. Colour is
 * never the only carrier — the family name is written beside every dot.
 */
const sauceFamilies = {
  chilli: { label: 'Chilli',  note: 'Hot, direct heat' },
  glaze:  { label: 'Glaze',   note: 'Sweet, sticky, sesame' },
  smoke:  { label: 'Smoke',   note: 'Roasted pepper and tomato' },
  cream:  { label: 'Cream',   note: 'Rich, mild, no heat' },
};

/* ----------------------------------------------------------------- menu */

/**
 * `thirds: true` marks a composed plate — protein + carbohydrate + salad —
 * and is the ONLY thing that renders the Three Thirds glyph. Its absence on
 * wings and sides is information, not an omission.
 *
 * `kcal` values are transcribed from the printed menu PDF. The PDF's text
 * order was scrambled, so the figure-to-dish mapping in the composed-plate
 * and starter blocks is NOT confirmed. Every unconfirmed figure carries
 * kcalConfirmed:false and the build REFUSES to print it. Confirm against the
 * kitchen's own figures, flip the flag, and the numbers appear.
 */
const menu = [
  {
    id: 'starters',
    name: 'Starters',
    priceStatement: 'Everything here is £4.90',
    items: [
      { name: 'Jalapeño Poppers', price: 4.90, sauce: 'chilli', kcal: 250, kcalConfirmed: false,
        desc: 'Crispy breaded jalapeño peppers, fried until golden and served with sweet chilli sauce.' },
      { name: 'Chicken Nuggets', price: 4.90, sauce: null, kcal: 240, kcalConfirmed: false,
        desc: 'Bite-sized tender chicken in a crisp golden crust, served with mayo.' },
      { name: 'Mozzarella Sticks', price: 4.90, sauce: 'cream', kcal: 380, kcalConfirmed: false,
        desc: 'Golden-fried mozzarella with a crisp coating and a molten centre, served with ketchup.' },
      { name: 'Chicken Poppers', price: 4.90, sauce: 'chilli', kcal: 420, kcalConfirmed: false,
        desc: 'Chicken breast pieces in a crisp golden breadcrumb crust, served with sweet chilli sauce.' },
    ],
  },

  {
    id: 'plates',
    name: 'Chicken plates',
    priceStatement: 'Every plate £12.90 — and that is with pasta and a fresh salad',
    lede: 'Marinated thigh, pan-seared to order. Never fried, never held.',
    items: [
      { name: 'Teriyaki Chicken', price: 12.90, sauce: 'glaze', thirds: true, kcal: 860, kcalConfirmed: false,
        desc: 'Marinated fillet glazed in teriyaki and finished with toasted sesame, with homemade basil pesto pasta and a fresh mixed salad.' },
      { name: 'Smoky Tomato Chicken', price: 12.90, sauce: 'smoke', thirds: true, kcal: 980, kcalConfirmed: false,
        desc: 'Marinated fillet in a rich roasted pepper and tomato sauce, with pesto pasta and a fresh mixed salad.' },
      { name: 'Sriracha Fire Chicken', price: 12.90, sauce: 'chilli', thirds: true, kcal: 820, kcalConfirmed: false,
        desc: 'Marinated fillet glazed with our homemade hot sauce, with pasta and a fresh mixed salad.' },
      { name: 'Cheesy Triple Blast Chicken', price: 12.90, sauce: 'cream', thirds: true, kcal: 920, kcalConfirmed: false,
        desc: 'Pan-seared fillet under a rich homemade cheese sauce, with crisp potato wedges and a fresh mixed salad.' },
      { name: 'Sweet Chilli Chicken', price: 12.90, sauce: 'glaze', thirds: true, kcal: 890, kcalConfirmed: false,
        desc: 'Fillet in a sweet chilli glaze finished with toasted sesame, with pasta and a fresh mixed salad.' },
      { name: 'Creamy Curry Chicken', price: 12.90, sauce: 'cream', thirds: true, kcal: 840, kcalConfirmed: false,
        desc: 'Fillet in a rich, aromatic curry sauce, with pasta and a fresh mixed salad.' },
    ],
  },

  {
    id: 'duos',
    name: 'Duo plates',
    priceStatement: 'Both £15.90 — two thighs, pasta, fries and salad',
    items: [
      { name: 'Spicy Grilled Chicken Duo', price: 15.90, sauce: 'chilli', thirds: true, kcal: 1050, kcalConfirmed: true,
        desc: 'Two grilled chicken thighs glazed in a spicy sauce, with pasta, crisp fries and a fresh mixed salad.' },
      { name: 'Triple Cheese Grilled Chicken Duo', price: 15.90, sauce: 'cream', thirds: true, kcal: 1150, kcalConfirmed: true,
        desc: 'Two grilled chicken thighs under a homemade triple cheese sauce, with pasta, crisp fries and a fresh mixed salad.' },
    ],
  },

  {
    id: 'wings',
    name: 'Wings',
    // Prices are known to be £8.90 or £9.90 but the per-item mapping was not
    // legible in the source PDF. priceConfirmed:false suppresses the figure.
    priceStatement: null,
    items: [
      { name: 'Hot Honey Wings', price: 9.90, priceConfirmed: false, sauce: 'glaze', kcal: 720, kcalConfirmed: true,
        desc: 'Crispy fried wings glazed in sweet hot honey and sriracha.' },
      { name: 'Mango Habanero Wings', price: 9.90, priceConfirmed: false, sauce: 'chilli', kcal: 740, kcalConfirmed: true,
        desc: 'Crispy fried wings in a bold mango habanero glaze — tropical sweetness with a fiery finish.' },
      { name: 'Peri Peri Flame Wings', price: 8.90, priceConfirmed: false, sauce: 'chilli', kcal: 720, kcalConfirmed: false,
        desc: 'Crispy wings glazed in peri peri.' },
      { name: 'Buffalo Fire Wings', price: 8.90, priceConfirmed: false, sauce: 'chilli', kcal: 810, kcalConfirmed: true,
        desc: 'Golden crispy wings tossed in a rich buffalo sauce.' },
      { name: 'Korean BBQ Wings', price: 8.90, priceConfirmed: false, sauce: 'glaze', kcal: 740, kcalConfirmed: false,
        desc: 'Eight pieces of crispy fried chicken tossed in smoky Korean BBQ sauce, served with salad.' },
    ],
  },

  {
    id: 'boneless',
    name: 'Boneless thigh',
    priceStatement: 'Everything here is £10.90',
    items: [
      { name: 'Golden Mango Habanero Boneless', price: 10.90, sauce: 'chilli', kcal: 860, kcalConfirmed: true,
        desc: 'Boneless peri peri marinated thigh pieces in a light crisp batter, fried golden.' },
      { name: 'Crispy Peri Peri Boneless Thigh', price: 10.90, sauce: 'chilli', kcal: 740, kcalConfirmed: true,
        desc: 'Boneless thigh pieces in a light crisp batter, fried golden for a tender, crunchy bite.' },
      { name: 'BBQ Boneless Thigh', price: 10.90, sauce: 'glaze', kcal: 810, kcalConfirmed: true,
        desc: 'Crispy boneless thigh tossed in rich Korean BBQ sauce — smoky, sweet and savoury.' },
    ],
  },

  {
    id: 'wraps',
    name: 'Wraps and burgers',
    priceStatement: null,
    items: [
      { name: 'Grilled Chicken Wrap', price: 9.90, sauce: 'cream', kcal: 860, kcalConfirmed: true,
        desc: 'Grilled chicken fillet, tomato, red pepper, onion, crisp lettuce and a creamy cheese sauce in a soft tortilla.' },
      { name: 'Peri Peri Flame Burger', price: 9.90, sauce: 'chilli', kcal: null, kcalConfirmed: false,
        desc: 'Grilled chicken fillet in a bold peri peri sauce, in a soft bun.' },
      { name: 'Steak Royale Wrap', price: 12.90, sauce: 'cream', kcal: 840, kcalConfirmed: false,
        desc: 'Grilled sirloin, tomato, red onion and homemade cheese sauce in a soft tortilla.' },
    ],
  },

  {
    id: 'steaks',
    name: 'Sirloin steak',
    priceStatement: 'Both £20.90 — 150g sirloin, fries and salad',
    items: [
      { name: 'Mediterranean Sirloin', price: 20.90, sauce: 'cream', kcal: null, kcalConfirmed: false,
        desc: 'Grilled 150g sirloin over a creamy hummus blend, with fries and a fresh mixed salad.' },
      { name: 'Roasted Pepper Sirloin', price: 20.90, sauce: 'smoke', kcal: null, kcalConfirmed: false,
        desc: 'Grilled 150g sirloin with a rich roasted pepper and tomato sauce, with crisp fries and a fresh mixed salad.' },
    ],
  },

  {
    id: 'kids',
    name: 'For children',
    priceStatement: 'Both £8.90, soft drink included',
    items: [
      { name: 'Chicken and Fries', price: 8.90, sauce: null, kcal: null, kcalConfirmed: false,
        desc: 'Crispy chicken with golden fries and any soft drink.' },
      { name: 'Chicken Thigh and Fries', price: 8.90, sauce: null, kcal: null, kcalConfirmed: false,
        desc: 'Grilled chicken thigh with crisp fries. Portioned for children.' },
    ],
  },

  {
    id: 'sides',
    name: 'Sides',
    priceStatement: 'Everything here is £3.90',
    items: [
      { name: 'French Fries', price: 3.90, sauce: null, kcal: null, kcalConfirmed: false, desc: null },
      { name: 'Potato Wedges', price: 3.90, sauce: null, kcal: null, kcalConfirmed: false, desc: null },
      { name: 'Mixed Salad', price: 3.90, sauce: null, kcal: null, kcalConfirmed: false, desc: null },
      { name: 'Pesto Penne', price: 3.90, sauce: 'cream', kcal: null, kcalConfirmed: false,
        desc: 'Penne tossed in a rich basil pesto.' },
      { name: 'Marinated Pan-Fried Chicken', price: 3.90, sauce: null, kcal: null, kcalConfirmed: false,
        desc: 'A side portion of the chicken from the plates.' },
    ],
    extras: [
      { name: 'Cheese, on the chicken or the fries', price: 1.50 },
      { name: 'Extra 100g chicken', price: 1.90, priceConfirmed: false },
    ],
  },
];

/* -------------------------------------------------------------- lunch */

const lunchDeal = {
  name: 'Grilled Chicken Duo',
  claim: 'One plate, all you crave',
  from: '12:00',
  to: '17:00',
  prices: [12.90, 15.90],
  // The source PDF carried both $13/$15 and £12.90/£15.90. Sterling is
  // assumed; confirm before launch.
  priceConfirmed: false,
};

/* ------------------------------------------------------------ allergens */

/**
 * UK law. Under Natasha's Law and the FIC Regulations a food business must be
 * able to give allergen information for every item it sells. This site will
 * not publish a menu without discharging that.
 *
 * `statement` is the honest interim: it tells a visitor how to get the
 * information from a human. Once `perItem` is true the build requires an
 * `allergens` array on every menu item and fails the audit without it.
 */
const allergens = {
  perItem: false,
  statement: null,            // set once there is a phone number or an email to route to
  reviewedOn: null,           // ISO date the kitchen last signed off the allergen matrix
};

/* ---------------------------------------------------------------- copy */

const copy = {
  // From the brand's own materials, verbatim.
  about: [
    'At Pookie Chicken we are passionate about serving fresh, flavourful chicken dishes made with quality ingredients and care. Every day we prepare our chicken fresh with our own marinades, creating tender, juicy flavours in every bite. From our signature homemade sauces to our carefully prepared sides and complete chicken meals, every plate is made to deliver taste, quality and value.',
    'We believe the best chicken comes from freshness, attention to detail, and recipes made with care. Freshly prepared daily, and made for chicken lovers.',
  ],

  heroLede: 'Marinated chicken thigh, pan-seared fresh to order, and served with pasta, a fresh salad and our own sauces. High-quality protein and balanced carbohydrates — a whole meal, not a portion of meat.',

  balance: [
    { title: 'Chicken', body: 'Thigh, marinated in our own blend and seared in a pan to order. Not fried, not held under a lamp.' },
    { title: 'Pasta', body: 'Tossed in homemade basil pesto, or swapped for wedges or fries depending on the plate.' },
    { title: 'Salad', body: 'A fresh mixed salad on every composed plate. Included, not an upsell.' },
  ],

  // Gated: this claim is unverified, so the section does not render until
  // someone at the kitchen signs it off and flips the flag.
  sauceStory: { verified: false, body: null },
};

/* ------------------------------------------------------------- derived */

function isFilled(v) {
  return v !== null && v !== undefined && v !== '';
}

function hasAddress(a) {
  return isFilled(a.line1) && isFilled(a.locality) && isFilled(a.postcode);
}

function hasHours(h) {
  // A partial week renders nothing. Every key must be decided — a closed day
  // is the string 'closed', which is a decision; null is not.
  return Object.values(h).every(v => v === 'closed' || (Array.isArray(v) && v.length === 2));
}

function derive() {
  const addressKnown = hasAddress(contact.address);
  const hoursKnown = hasHours(contact.hours);

  // "Open" is not a mood. You are open when a stranger can find you and knows
  // when to turn up.
  const isOpen = status.announcedOpen && addressKnown && hoursKnown;

  return {
    isOpen,
    isPreOpening: !isOpen,
    addressKnown,
    hoursKnown,
    phoneKnown: isFilled(contact.phone),
    emailKnown: isFilled(contact.email),
    dateKnown: isFilled(status.openingDate),
    companyKnown: isFilled(company.companyName) && isFilled(company.companyNumber),
    deliveryLive: delivery.filter(d => isFilled(d.url)),
    allergensPublishable: allergens.perItem || isFilled(allergens.statement),
    canonicalHost: site.url,
  };
}

module.exports = {
  site, status, contact, delivery, company, brand,
  sauceFamilies, menu, lunchDeal, allergens, copy,
  derive, isFilled,
};
