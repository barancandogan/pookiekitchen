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
  // This is the staging host; change it when the real domain is bought, and
  // nothing else needs touching.
  url: 'https://pookie.nileapps.co.uk',

  // Whether search engines may index this host.
  //
  // FALSE while the site lives on a staging subdomain of somebody else's
  // domain. If Google indexes pookie.nileapps.co.uk now, that URL is what
  // ranks for "pookie chicken" — and when the real domain is bought the two
  // compete, splitting the signal and leaving a stale staging copy in the
  // results. Nothing about the site is hidden by this; it is a link away as
  // always. Flip to true on the day the real domain goes live.
  indexable: false,

  locale: 'en-GB',
  currency: 'GBP',
  currencySymbol: '£',

  /**
   * The share card: what WhatsApp, Instagram, Facebook and iMessage show when
   * somebody sends this link to somebody else.
   *
   * It is the brand's own poster, which is exactly the job a poster is good
   * at — it carries the logo, the dishes, the address and "come and taste the
   * difference", and it never has to sit next to the site's own typography, so
   * it cannot clash with it. Square, because the audience shares on WhatsApp
   * and Instagram where square is native; the width and height below are
   * declared so a scraper does not have to fetch the file to lay out the card.
   *
   * absolute: og:image must be an absolute URL. It is built from site.url, so
   * when the real domain is bought this follows it with nothing to change.
   */
  socialImage: {
    path: '/assets/img/brand/social-1200.jpg',
    width: 1200,
    height: 1200,
    alt: 'Pookie Chicken — marinated chicken plates with pasta and fresh salad. Find us at Chapel Market, Angel.',
  },

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
  // Street address. All three parts must be present for the address to render
  // at all — a half address is worse than none.
  //
  // The door number came from the client. The postcode did not, so it was
  // checked against three independent public records before being written
  // here: an Acuitus commercial auction catalogue for 61 Chapel Market, a
  // London restaurant directory listing a previous tenant at the same number,
  // and a letting listing for 71 Chapel Market carrying the same code. All
  // three say N1 9ER. If the client's own paperwork ever disagrees, their
  // paperwork wins and this changes.
  address: {
    line1: '61 Chapel Market',
    locality: 'London',       // the POST TOWN, which for N1 is London. Islington
                              // is the borough and belongs in prose, not here.
    postcode: 'N1 9ER',
    country: 'GB',
    // The documented Google Maps URL scheme, by query rather than by place ID:
    // a place ID would have to be looked up and could go stale, the query
    // cannot. Replace it with the real place link once the business is on the
    // map under its own name.
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=61%20Chapel%20Market%2C%20London%20N1%209ER',
  },

  // The informal area name, off the brand's own poster ("FIND US AT CHAPEL
  // MARKET, ANGEL"). This is NOT a substitute for the address above and is
  // never rendered as one; it is what goes in the ribbon, where the postal
  // locality — "London" — would tell a Londoner precisely nothing.
  neighbourhood: 'Chapel Market, Angel',

  // Where to centre the map, and the geo node in the Restaurant schema.
  //
  // This is the CENTROID OF THE POSTCODE, not a survey of the doorstep. A UK
  // postcode covers a handful of delivery points, so on a short parade like
  // this one the centroid lands on the right side of the street within a few
  // doors — close enough to walk to, not close enough to claim as the exact
  // spot. That is why the map is framed around the block rather than zoomed
  // to a single pin, and why the address in words is always shown beside it.
  geo: { lat: 51.533386, lon: -0.108736 },

  // Verified alongside the postcode: Angel is the nearest Underground station,
  // about 400 m away. Rendered as prose, so it stays a sentence and not a
  // claim the schema has to carry.
  transit: 'Angel station is about a five-minute walk.',

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
  text:   '#B45100',          // --brand: the most orange ramp step that
                              // clears AA on white (5.10) and on the
                              // --sunken band (4.79) alike
  display: '#E06E00',         // --display-orange: large text only (3.28:1)
  paper:  '#FFFFFF',
  paperDark: '#16120E',       // kept for the dark palette in README.md

  // Set to true only once fraunces-600.woff2 exists in assets/fonts/ and is
  // licensed for self-hosting. While false the site ships the system serif
  // fallback stack alone — which is the spec's stated fallback position, not
  // a degraded mode.
  webfont: false,
};

/* --------------------------------------------------------- photo sizes */

/**
 * Intrinsic pixel dimensions of each photograph, so the markup can carry true
 * width/height attributes.
 *
 * Every dish photograph is now ONE norm: the plate cut out of its studio shot
 * (the original backdrops were near-white but not white, and each carried its
 * own shadow) and set on the same warm light-grey ground (--photo-ground in
 * the CSS), centred on a 3:2 canvas with the same soft shadow under every
 * plate. So all of them are 1200 × 800 at the largest width, and a thumbnail
 * box of the same proportion shows the whole plate with no letterboxing
 * whatever the plate's shape. Only the hero poster keeps its own crop.
 *
 * Regenerate these alongside the files themselves; audit.js checks that every
 * referenced photo exists in both formats and every width.
 */
const photoDims = {
  'boneless-bbq': [1200, 800],
  'boneless-mango-habanero': [1200, 800],
  'boneless-peri-peri': [1200, 800],
  'buffalo-wings': [1200, 800],
  'cheesy-triple-blast': [1200, 800],
  'creamy-curry': [1200, 800],
  'feature-plate': [1472, 704],
  'korean-bbq-wings': [1200, 800],
  'mediterranean-sirloin': [1200, 800],
  'peri-peri-wings': [1200, 800],
  'roasted-pepper-sirloin': [1200, 800],
  'sweet-chilli': [1200, 800],
  'teriyaki': [1200, 800],
  // Not on a menu item — the home page's feature slot names it directly. See
  // the note beside Triple Cheese Grilled Chicken Duo.
  'triple-cheese-duo': [1200, 800],
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
 * `photo` names a file in assets/img/dish/ — <slug>-400 and -800, each as
 * .webp and .jpg. A row without a photo is not a degraded card; it is simply a
 * row, so adding or removing one is a one-word edit.
 *
 * `photoConfirmed` says whether the photograph is definitely THIS dish. The
 * source files were named image (4).png … image (64).png, so most matches were
 * inferred from what is on the plate. Two are unambiguous — the hummus under
 * the Mediterranean sirloin and the red pepper sauce on the Roasted Pepper one.
 * The rest are best guesses and audit.js lists them until the kitchen confirms.
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
        desc: 'Breaded jalapeños, fried golden, sweet chilli to dip.' },
      { name: 'Chicken Nuggets', price: 4.90, sauce: null, kcal: 240, kcalConfirmed: false,
        desc: 'Bite-sized chicken, crisp golden crust, mayo to dip.' },
      { name: 'Mozzarella Sticks', price: 4.90, sauce: 'cream', kcal: 380, kcalConfirmed: false,
        desc: 'Crisp on the outside, molten mozzarella in, ketchup to dip.' },
      { name: 'Chicken Poppers', price: 4.90, sauce: 'chilli', kcal: 420, kcalConfirmed: false,
        desc: 'Breast pieces, golden breadcrumb crust, sweet chilli to dip.' },
    ],
  },

  {
    id: 'plates',
    name: 'Chicken plates',
    priceStatement: 'Every plate £12.90 — and that is with pasta and a fresh salad',
    lede: 'Marinated thigh, pan-seared to order. Never fried, never held.',
    items: [
      { name: 'Teriyaki Chicken', price: 12.90, photo: 'teriyaki', photoConfirmed: false, sauce: 'glaze', kcal: 860, kcalConfirmed: false,
        desc: 'Marinated fillet, teriyaki glaze, toasted sesame, basil pesto pasta, mixed salad.' },
      { name: 'Smoky Tomato Chicken', price: 12.90, sauce: 'smoke', kcal: 980, kcalConfirmed: false,
        desc: 'Marinated fillet, roasted pepper and tomato sauce, pesto pasta, mixed salad.' },
      { name: 'Sriracha Fire Chicken', price: 12.90, sauce: 'chilli', kcal: 820, kcalConfirmed: false,
        desc: 'Marinated fillet, our own hot sauce, pasta, mixed salad.' },
      { name: 'Cheesy Triple Blast Chicken', price: 12.90, photo: 'cheesy-triple-blast', photoConfirmed: false, sauce: 'cream', kcal: 920, kcalConfirmed: false,
        desc: 'Pan-seared fillet, homemade cheese sauce, potato wedges, mixed salad.' },
      { name: 'Sweet Chilli Chicken', price: 12.90, photo: 'sweet-chilli', photoConfirmed: false, sauce: 'glaze', kcal: 890, kcalConfirmed: false,
        desc: 'Fillet, sweet chilli glaze, toasted sesame, pasta, mixed salad.' },
      { name: 'Creamy Curry Chicken', price: 12.90, photo: 'creamy-curry', photoConfirmed: false, sauce: 'cream', kcal: 840, kcalConfirmed: false,
        desc: 'Fillet, aromatic curry sauce, pasta, mixed salad.' },
    ],
  },

  {
    id: 'duos',
    name: 'Duo plates',
    priceStatement: 'Both £15.90 — two thighs, pasta, fries and salad',
    items: [
      { name: 'Spicy Grilled Chicken Duo', price: 15.90, sauce: 'chilli', kcal: 1050, kcalConfirmed: true,
        desc: 'Two grilled thighs, spicy glaze, pasta, fries, mixed salad.' },
      // No `photo` on purpose, though triple-cheese-duo is this dish: its source
      // file is cropped, so it is composed to fill its frame (see sources.json)
      // while every gallery plate floats whole on the ground. One filled cell in
      // a grid of floating plates reads as a mistake, so it sits in the home
      // page's feature slot instead, where a close crop is the point.
      { name: 'Triple Cheese Grilled Chicken Duo', price: 15.90, sauce: 'cream', kcal: 1150, kcalConfirmed: true,
        desc: 'Two grilled thighs, triple cheese sauce, pasta, fries, mixed salad.' },
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
        heat: 3,
        desc: 'Crispy wings, hot honey and sriracha.' },
      { name: 'Mango Habanero Wings', price: 9.90, priceConfirmed: false, sauce: 'chilli', kcal: 740, kcalConfirmed: true,
        desc: 'Crispy wings, mango habanero glaze. Sweet first, fiery after.' },
      { name: 'Peri Peri Flame Wings', price: 8.90, photo: 'peri-peri-wings', photoConfirmed: false, priceConfirmed: false, sauce: 'chilli', kcal: 720, kcalConfirmed: false,
        desc: 'Crispy wings, peri peri glaze.' },
      { name: 'Buffalo Fire Wings', price: 8.90, photo: 'buffalo-wings', photoConfirmed: false, priceConfirmed: false, sauce: 'chilli', kcal: 810, kcalConfirmed: true,
        desc: 'Golden wings tossed in buffalo sauce.' },
      { name: 'Korean BBQ Wings', price: 8.90, photo: 'korean-bbq-wings', photoConfirmed: false, priceConfirmed: false, sauce: 'glaze', kcal: 740, kcalConfirmed: false,
        desc: 'Eight crispy wings, smoky Korean BBQ, salad.' },
    ],
  },

  {
    id: 'boneless',
    name: 'Boneless thigh',
    priceStatement: 'Everything here is £10.90',
    items: [
      { name: 'Golden Mango Habanero Boneless', price: 10.90, photo: 'boneless-mango-habanero', photoConfirmed: false, sauce: 'chilli', kcal: 860, kcalConfirmed: true,
        desc: 'Boneless thigh, light crisp batter, fried golden.' },
      { name: 'Crispy Peri Peri Boneless Thigh', price: 10.90, photo: 'boneless-peri-peri', photoConfirmed: false, sauce: 'chilli', kcal: 740, kcalConfirmed: true,
        desc: 'Boneless thigh, light crisp batter, crunchy outside and tender in.' },
      { name: 'BBQ Boneless Thigh', price: 10.90, photo: 'boneless-bbq', photoConfirmed: false, sauce: 'glaze', kcal: 810, kcalConfirmed: true,
        desc: 'Crispy boneless thigh, Korean BBQ. Smoky and sweet.' },
    ],
  },

  {
    id: 'wraps',
    name: 'Wraps and burgers',
    priceStatement: null,
    items: [
      { name: 'Grilled Chicken Wrap', price: 9.90, sauce: 'cream', kcal: 860, kcalConfirmed: true,
        desc: 'Grilled fillet, tomato, red pepper, onion, lettuce, cheese sauce, soft tortilla.' },
      { name: 'Peri Peri Flame Burger', price: 9.90, sauce: 'chilli', kcal: null, kcalConfirmed: false,
        desc: 'Grilled fillet, peri peri sauce, soft bun.' },
      { name: 'Steak Royale Wrap', price: 12.90, sauce: 'cream', kcal: 840, kcalConfirmed: false,
        desc: 'Grilled sirloin, tomato, red onion, cheese sauce, soft tortilla.' },
    ],
  },

  {
    id: 'steaks',
    name: 'Sirloin steak',
    priceStatement: 'Both £20.90 — 150g sirloin, fries and salad',
    items: [
      { name: 'Mediterranean Sirloin', price: 20.90, photo: 'mediterranean-sirloin', photoConfirmed: true, sauce: 'cream', kcal: null, kcalConfirmed: false,
        desc: '150g sirloin, creamy hummus, fries, mixed salad.' },
      { name: 'Roasted Pepper Sirloin', price: 20.90, photo: 'roasted-pepper-sirloin', photoConfirmed: true, sauce: 'smoke', kcal: null, kcalConfirmed: false,
        desc: '150g sirloin, roasted pepper and tomato sauce, fries, mixed salad.' },
    ],
  },

  {
    id: 'kids',
    name: 'For children',
    priceStatement: 'Both £8.90, soft drink included',
    items: [
      { name: 'Chicken and Fries', price: 8.90, sauce: null, kcal: null, kcalConfirmed: false,
        desc: 'Crispy chicken, golden fries, any soft drink.' },
      { name: 'Chicken Thigh and Fries', price: 8.90, sauce: null, kcal: null, kcalConfirmed: false,
        desc: 'Grilled thigh, crisp fries. Portioned for children.' },
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
        desc: 'Penne, basil pesto.' },
      { name: 'Marinated Pan-Fried Chicken', price: 3.90, sauce: null, kcal: null, kcalConfirmed: false,
        desc: 'The chicken from the plates, on its own.' },
    ],
    extras: [
      { name: 'Cheese, on the chicken or the fries', price: 1.50 },
      { name: 'Extra 100g chicken', price: 1.90, priceConfirmed: false },
    ],
  },

  {
    id: 'drinks',
    // The brand's menu card lists these two and prints no price beside either,
    // so neither does the site. The chapter still earns its place: "do they do
    // drinks" is a question a menu should answer, and now it does.
    name: 'Drinks',
    priceStatement: null,
    items: [
      { name: 'Cola', price: null, priceConfirmed: false, sauce: null, kcal: null, kcalConfirmed: false, desc: null },
      { name: 'Orange Juice', price: null, priceConfirmed: false, sauce: null, kcal: null, kcalConfirmed: false, desc: null },
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

  // The three parts of a composed plate, with the weights the brand prints on
  // its own "All in one" card. `amount` is rendered large and `body` small, so
  // the figure is the thing the eye lands on — it is the one hard fact here
  // and the reason this block is worth a visitor's time.
  //
  // Weights are for the £12.90 composed plate. A null amount renders the row
  // without a figure rather than inventing one.
  balance: {
    kicker: 'All in one',
    heading: ['Real ingredients.', 'Real balance.'],
    parts: [
      { title: 'Chicken', amount: '250g',
        body: 'Thigh, marinated in our own blend and seared in a pan to order. Not fried, not held under a lamp.' },
      { title: 'Pasta', amount: '180g',
        body: 'Cooked weight. Tossed in homemade basil pesto, or swapped for wedges or fries depending on the plate.' },
      { title: 'Salad', amount: 'Fresh mix',
        body: 'A fresh mixed salad on every composed plate. Included, not an upsell.' },
    ],

    // The four badges on the brand's card: "supports muscle growth", "keeps
    // you energised", "nutritious & balanced", "a happier you". Gated behind
    // copy.claimsVerified — see the note there.
    badges: ['Supports muscle growth', 'Keeps you energised', 'Nutritious and balanced', 'A happier you'],
  },

  /**
   * ONE SWITCH FOR EVERY REGULATED CLAIM ON THE SITE.
   *
   * The brand's marketing carries lines like "supports muscle growth", "high
   * protein" and "healthy choice". Under the retained EU Nutrition and Health
   * Claims Regulation (1924/2006) those are not adjectives, they are claims:
   * a health claim may only be made in an authorised form, "high in protein"
   * is permitted only where protein supplies at least 20% of the food's
   * energy, and a general wellbeing claim like "a healthier you" is allowed
   * only alongside a specific authorised one.
   *
   * Every one of them is written into this file, and none of them renders
   * until this is true. Facts about a plate — 250 g of chicken, homemade
   * sauces, chicken that is marinated — are not claims and are not gated.
   *
   * Set this to true once somebody has checked the gated lines against the GB
   * nutrition and health claims register. It is one word, and everything
   * waiting on it appears at once.
   */
  claimsVerified: false,

  // The brand's own lines, verbatim from its posters and menu card. Used where
  // a line of theirs says a thing better than a line of mine would.
  lines: {
    brighterDays: 'Good food, brighter days.',
    betterYou: 'More than chicken \u2014 it\u2019s a better you.',
    tasteTheDifference: 'Come and taste the difference.',
    freshDaily: 'Fresh homemade fried chicken daily.',
  },

  // Home page, redesigned after the client's builder mock-up. The lines below
  // are the brand's own words where they exist — "Deep marination. Juicy
  // perfection." is printed on their neon-sign artwork — and plain statements
  // of fact where they do not. Nothing here claims an address, hours, an
  // ordering channel or a popularity we cannot stand behind.
  headline2: ['Deep marination.', 'Juicy perfection.'],
  banner: { file: 'banner', alt: 'Where every bite is a hug — Pookie Chicken' },

  // Gated: this claim is unverified, so the section does not render until
  // someone at the kitchen signs it off and flips the flag.
  sauceStory: { verified: false, body: null },
};

/* ------------------------------------------------------------------ map */

/**
 * The embedded map. Google Maps, at the client's request.
 *
 * The map is driven by the ADDRESS, not by contact.geo: handing Google the
 * postal address lets Google geocode it, which puts the pin on the building
 * rather than on the postcode centroid we hold. So the pin here is as good as
 * Google's own, and contact.geo is left to do the one job it is right for —
 * the GeoCoordinates node in the schema.
 *
 * WHICH ENDPOINT, in order of preference:
 *
 *   apiKey set    https://www.google.com/maps/embed/v1/place — Google's
 *                 documented Maps Embed API. Supported, versioned, and free
 *                 with unlimited use, but it needs a key from a Google Cloud
 *                 project. Set apiKey below and this is used automatically;
 *                 nothing else has to change.
 *
 *   embedPb set   https://www.google.com/maps/embed?pb=… — the exact iframe
 *                 Google's own "Share → Embed a map" dialog hands you. Keyless
 *                 and stable. Paste the value of its pb= parameter here and it
 *                 wins over the fallback below.
 *
 *   neither       https://maps.google.com/maps?…&output=embed — the keyless
 *                 form. It works and half the web uses it, but it is NOT in
 *                 Google's documentation, so it is the one thing here that
 *                 could stop working without notice. It is the default only so
 *                 that the map works today with nothing to set up. Move off it
 *                 when you can: either field above is a one-line edit.
 *
 * IT IS NOT LOADED UNTIL A VISITOR ASKS FOR IT, and with Google that matters
 * more than it did with OpenStreetMap, not less. Google's embed sets cookies.
 * This site has no cookie banner and nowhere to record a choice, and it
 * otherwise makes exactly zero third-party requests — every font, script,
 * style and photograph comes from our own host. An iframe sitting in the
 * markup would hand a visitor's IP address, and a cookie, to Google on every
 * page view, including for the great majority who never look at the map. So
 * the map sits behind one click, the button says where it will load from
 * before it loads, and the address and the maps link are plain text beside it
 * either way. See main.js. To make it load automatically instead, delete the
 * upgrade block in main.js — but read the note there first.
 */
const mapView = {
  apiKey: null,               // Maps Embed API key → the documented endpoint
  embedPb: null,              // the pb= value from Google's Share → Embed dialog
  zoom: 17,                   // street level: the parade, and both ends of it
  language: 'en-GB',
};

/* ----------------------------------------------------------------- hero */

/**
 * Looping video behind the home-page hero. An empty `clips` array means the
 * static hero, exactly as before — so this is a content edit, like everything
 * else here.
 *
 * Each clip is assets/video/<slug>-720.mp4: 16:9, H.264, muted, ~5 seconds,
 * hashless name so treat a replaced clip as a renamed clip. `poster` is a dish
 * slug from assets/img/dish/ at 1600 wide. It is what everyone sees before the
 * first frame decodes, and ALL that is seen by anyone who asked for reduced
 * motion, is on a data-saver connection, or whose browser refuses autoplay.
 * The video is an enhancement; the poster is the page.
 */
const hero = {
  poster: 'feature-plate',
  // The brand's own footage, both 8.2 s at 720p. They rotate: main.js crossfades
  // each into the next a moment before it ends. Order matters only in that the
  // first one is the one a visitor always sees, so it leads with the plate.
  clips: [
    'brand-5',   // pan, plate, fork, cut
    'brand-7',   // the fryer, the sauce poured, the pan, the finished wings
  ],
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
  sauceFamilies, menu, lunchDeal, allergens, copy, photoDims, hero, mapView,
  derive, isFilled,
};
