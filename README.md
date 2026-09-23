# Pookie Chicken — website

A dependency-free static site for Pookie Chicken, a chicken restaurant at 61
Chapel Market, London. The restaurant opened in September 2026.

```bash
node build.js            # write ./dist
node build.js --serve    # write ./dist and serve it on http://localhost:4173
node audit.js            # structural, accessibility and completeness checks
node preview.js          # bundle the whole site into one shareable HTML file
```

Node 18+ and nothing else. No install step, no dependencies, no lockfile.

---

## What is here

```
src/data.js      all content and every unknown fact — the single source of truth
src/layout.js    document shell: head, JSON-LD, ribbon, header, footer, action bar
src/pages.js     one object per page
build.js         renders src/ → dist/, plus sitemap.xml and robots.txt
audit.js         per-page checks plus a list of what the site still lacks
preview.js       bundles the built site into one self-contained HTML file
.github/         the Deploy workflow: build + audit on every push, shipped to the
                 VPS over SSH once the secrets exist
deploy/          the server side of a deploy — the nginx vhost and remote.sh —
                 kept in the repo so the server is reproducible
deploy.sh        the manual alternative: pull, build, audit and publish, on the server
assets/          css, js, the logo as SVG, dish photography — copied into dist/
dist/            the built site (regenerated every build; safe to delete)
```

Editing copy means editing `src/data.js` and rebuilding. Nothing in `dist/` is
edited by hand.

`preview.js` writes to `preview/`, deliberately outside `dist/` — `build.js` wipes
`dist/` on every run, including the one `--serve` does on startup. It inlines the
CSS, the JS and the logo, and rewires the internal links to swap sections in
place, so all four pages travel as one file you can email or open from a
`file://` URL. It is a review tool, not the site — real pages, real URLs and the
sitemap come from `build.js`, and nothing in the bundle is ever deployed.

---

## The central idea: null is a real value

The site went up before the restaurant had a confirmed address, phone, hours,
delivery links or company number, and some of that is still unknown. It is
built to be genuinely useful while facts are missing, and to fill in **as a
content edit, not a rebuild**.

Every unknown is `null` in `src/data.js`, and every template renders **nothing
at all** rather than a placeholder. There is no "TBC", no greyed-out button, no
`07xxx`. A visitor reads a placeholder as a fact, so the site would rather say
less than say something untrue.

`derive()` at the bottom of `data.js` turns those nulls into the flags the
templates read (`addressKnown`, `hoursKnown`, `deliveryLive` and so on).

There is no pre-opening mode any more. Until the restaurant opened, a
`status` switch held the site in a "not open yet" form — the "Opening soon"
badge, a "We are not open yet" section, "Follow for the opening" on the phone
bar. It was retired when the restaurant opened: the site has one state, and
each fact appears the moment it is filled in. A `content.json` from before
then may still carry a `status` block; it is ignored.

### Filling in the gaps

| Set this in `src/data.js` | And this appears |
|---|---|
| `contact.address` (all of line1, locality, postcode) | Footer address, Find us page, the map block, `Restaurant` JSON-LD instead of `Organization` |
| `contact.hours` (**all seven** days; a closed day is the string `'closed'`) | Footer hours table, Find us hours, `openingHours` in JSON-LD |
| `contact.phone` | Footer link, hero "Call us", Find us button |
| `contact.email` | Footer link |
| `contact.cateringEmail` | `/catering/` becomes buildable |
| `contact.jobsEmail` | Hiring block |
| `delivery[].url` | That platform's order button, and it takes over the mobile action bar (until then the bar offers directions) |
| `company.companyName` + `companyNumber` | The legally required footer line |
| `allergens.statement` or `perItem: true` | Replaces the interim allergen notice |
| `site.url` | Canonicals, `og:url`, and a real `sitemap.xml` |

A partial week of hours renders nothing at all. "Tue: ?" tells a visitor to ring
a number we also do not have, so the whole table waits until every day is decided.

`contact.neighbourhood` sits *beside* this table rather than in it. It is
"Chapel Market, Angel", off the brand's own poster: a district, not an address.
It is not a fallback for `contact.address` and never renders as one — it is the
short human "where" for headings, because the postal
locality is "London", which tells a Londoner precisely nothing. It never
appears inside an `<address>` element or in the JSON-LD.

---

## The address

`61 Chapel Market, London, N1 9ER`.

The door number came from the client. The postcode did not, so it was checked
against three independent public records before being written into `data.js`:
a commercial auction catalogue for 61 Chapel Market, a London restaurant
directory listing a previous tenant at the same number, and a letting listing
for 71 Chapel Market carrying the same code. All three say N1 9ER. If the
client's own paperwork ever disagrees, their paperwork wins.

`contact.geo` is the **centroid of the postcode**, not a survey of the
doorstep — a UK postcode covers a handful of delivery points, so on a short
parade the centroid lands on the right side of the street within a few doors.
That is why `mapView` frames about 410 m by 265 m rather than zooming to a
single rooftop, and why the address in words is always printed beside the map
rather than only inside it.

### The map

Google Maps, at the client's request. It is driven by the **address**, not by
`contact.geo`: handing Google the postal address lets Google geocode it, which
puts the pin on the building rather than on the postcode centroid we hold. So
`contact.geo` is left to do the one job it is right for — the `GeoCoordinates`
node in the schema.

`mapView` in `data.js` picks the endpoint, in this order:

| Field set | Endpoint | Notes |
|---|---|---|
| `apiKey` | `maps/embed/v1/place` | Google's **documented** Maps Embed API. Free with unlimited use, but needs a key from a Google Cloud project. |
| `embedPb` | `maps/embed?pb=…` | The exact iframe Google's own "Share → Embed a map" dialog gives you. Keyless and stable — paste the `pb=` value. |
| neither | `maps.google.com/maps?…&output=embed` | Keyless, works, used by half the web — and **not in Google's documentation**, so it is the one thing here that could stop working without notice. |

The keyless form is the default only so the map works today with nothing to set
up. Move off it when you can: either field above is a one-line edit and nothing
else changes.

#### It loads only after a yes

The site sets no cookies of its own — no analytics, no tracking, no font
host — so "cookie consent" here means consent for the map, which is the one
thing that sets any: Google's embed sends the visitor's IP address to Google
and sets Google's `NID` cookie (about six months). Under PECR regulation 6
consent has to come *before* that, so the iframe is not in the markup. Each
map ships as an **empty figure** with the embed URL in a data attribute, and
`main.js` puts the iframe in after a yes. An empty figure is `display:none`,
so a no — or no JavaScript — leaves a plain find-us block: address, transit
line, "Open in Maps". No placeholder and nothing on the map to press.

The yes comes from the **banner**, the conventional bar along the bottom that
a visitor meets on arrival, on whichever page they land, while no valid
choice is stored — or later from **/cookies/**, which explains all of this and
carries the same two buttons, so withdrawing consent is a click and not a
support ticket. Accept and Reject are the same button twice, side by side —
the ICO's line is that rejecting must be as easy as accepting, and giving the
two nothing to differ by is the cheapest way to be sure of it.

The choice is stored in `localStorage` under `privacy.storageKey`, with a
timestamp, and treated as expired after `privacy.consentMonths` (six — the
ICO's own worked example). Storing the choice is exempt from consent because
it *is* the record of consent, and it is the only thing this site ever writes
to a visitor's browser. With JavaScript off nothing is stored, no banner
appears and no map ever loads.

`/cookies/` also covers the nginx access logs — IP, time, page, browser, kept
`privacy.logRetentionDays` days — which are personal data under UK GDPR
whether or not anyone thinks of them as cookies. Confirm the figure against
`/etc/logrotate.d/nginx` on the server; Ubuntu's stock rotation keeps 14. The
notice names the company and a contact address only once `company.*` and
`contact.email` exist in `data.js` — and a privacy notice legally needs a
contact route, so `contact.email` is now on the launch list twice over.

---

## Back to top

A floating button, bottom right, once the visitor is about a screen and a bit
down the page. Before that there is nothing above them to go back to and the
button would be clutter.

Like the scroll reveal, it is built the same way round as everything else here:
what ships in the HTML is an **ordinary in-page link on the last line of the
footer**, and `main.js` lifts it out of the flow into the corner. Both the
arming class and the shown state come from the script, so with JavaScript off,
blocked, or still parsing, the CSS never matches and the footer link is exactly
what it appears to be. Nothing is hidden by a transition that never ran.

Three details that are easy to get wrong and are not:

- **`visibility`, not just `opacity`.** A button faded to zero is still in the
  tab order — a keyboard user would hit a control they cannot see. It is
  `visibility: hidden` until it is wanted.
- **Focus follows the scroll.** The click is intercepted only to make the
  scroll smooth, so everything the browser would have done for a plain `#top`
  link is then done by hand: focus moves to the header, which carries
  `tabindex="-1"` for the purpose. Without that the button moves the view and
  abandons the keyboard in the footer, which is worse than not having it.
- **Paper, not `--dark` and not `--brand`.** It floats over two grounds: the
  white page for most of the scroll and the dark footer at the end, which is
  exactly where someone reaches for it. A dark button vanished into that
  footer. `--brand` would have worked on both, but it is the colour of the
  action-bar button directly below it on a phone, and two orange pills stacked
  read as one.

On a phone it sits above the sticky action bar, clearing a height the script
**measures** rather than guesses, and re-measures on resize.

---

## Photography

Twelve of the fifteen photographs in the brand's Drive folder are wired in; the
remaining three are marketing graphics (a banner, a price-tag advert, a neon
sign mockup) rather than dishes. A thirteenth plate came later, direct from the
client, and is the exception described under **Two fits** below.

The sources are studio plates on a near-white backdrop, 1024–1472px, named
`image (4).png` … `image (64).png`. "Near-white" is the problem: each backdrop
is a slightly different grey, with its own vignette and its own shadow, and
inside a white thumbnail box that grey read as a leftover background. So every
dish photograph is now brought to **one norm**:

1. The food is segmented with ISNet (the `isnet-general-use` model, run
   locally with onnxruntime — no credits, no upload). A generic cut-out stops
   here, and it removed most of the plates: white china on a white backdrop
   is invisible to a colour-based key and to the model alike.
2. The plate's silhouette is therefore found spatially, not by colour: the
   convex hull of the sharp edges in the shot (the rim, and everything on the
   plate). The natural shadow is soft and has no sharp edge, so it stays
   outside. A dip bowl beside a plate of wings is found by its sauce — a
   compact, smooth, saturated disc with a bright, food-free ring round it —
   and gets a hull of its own, so the two are not bridged.
3. Inside the silhouette, backdrop-coloured pixels go to pure white (the
   plate's own colour); the rim shading and the food keep their values. The
   result is centred on a 3:2 canvas filled with the same warm light grey
   (`--photo-ground`, `#F2EDE6`) so a white plate reads as a plate, with one
   synthetic soft shadow under every dish, and is encoded at three widths in
   WebP with a JPEG fallback:

```
assets/img/dish/<slug>-400.webp   <slug>-400.jpg      row thumbnails
assets/img/dish/<slug>-800.webp   <slug>-800.jpg      2× thumbnails, cards
assets/img/dish/<slug>-1200.webp  <slug>-1200.jpg     cards on 2× displays
assets/img/dish/feature-plate-900|1600.webp|jpg       the hero poster (own crop)
```

Because every canvas is 3:2, the thumbnail box is 180×120 (96×64 on narrow
screens) and the card media block is `aspect-ratio: 3 / 2`, both on
`--photo-ground` — nothing is letterboxed and no plate is ever sliced. `object-fit:
contain` stays on as a guard for any future photo in another proportion.
`photoDims` in `data.js` carries the 1200×800 intrinsic size so the markup has
real `width`/`height`. The pipeline is `tools/photos/cut.py` (masks) and
`tools/photos/plate.py` (silhouette, ground and composition); re-run both to
regenerate every file. The ISNet model (178 MB) is fetched by `cut.py` on
first use and is not committed.

**Two fits, chosen per source.** `sources.json` maps a slug to a filename, or
to `{ "file", "fit", "note" }` when it needs more. `fit: "float"` is the norm
above. `fit: "fill"` exists for one source and should stay rare: the client's
own file for `triple-cheese-duo` is **cropped** — 1284 × 1549, with the plate
running off both vertical edges, the pasta cut on the left and the fries on the
right, and only 538 of its rows carrying plate edge to edge. Floated on the
ground, those two straight edges read exactly as what they are: a sliced plate.
Filled, they fall outside the canvas and the picture reads as the close crop it
honestly is, with all the food whole inside it.

Nothing is painted back in. Extending pasta and fries that were never
photographed would be inventing a portion, and portion size is a claim this
site makes in grams two sections above. The fix is a crop, not a retouch — and
the real fix is the uncropped original, which is what to ask the client for.

The consequence: a filled photograph is edge to edge in its box while every
other one floats, so it does **not** go in the gallery, where one filled cell
among twelve floating plates reads as a mistake. It has the home page's feature
slot instead, where a close crop is the point. That is why Triple Cheese Grilled
Chicken Duo carries no `photo` even though its photograph exists.

**Alignment is a chapter-level property.** Where any dish in a chapter has a
photograph, the photo-less rows in that chapter reserve the same column, so
every dish name in the chapter starts on the same line. Where no dish in a
chapter has one — Starters, Sides, Kids — nothing is reserved and the chapter
sits flush left. The reserved slot is empty space, never a placeholder image.

**Ten of the twelve matches are inferred.** The source filenames carry no dish
names, so most were matched by what is on the plate. Two are unambiguous: the
hummus under the Mediterranean sirloin and the red pepper sauce on the Roasted
Pepper one. The rest carry `photoConfirmed: false` and `audit.js` lists them on
every run. Unlike a price, a wrong photo is cheap to be wrong about — an
unlabelled plate of wings is still a plate of wings — so they are shown rather
than suppressed, but never silently.

Adding a photograph is one word in `data.js`; removing one is deleting that
word. Neither changes any template.

---

## Video hero

The home page can carry a looping video behind the hero. It is off until
`hero.clips` in `src/data.js` lists at least one slug, so turning it on is a
content edit:

```js
const hero = {
  poster: 'feature-plate',                       // assets/img/dish/feature-plate-1600.jpg — used only with NO clips
  clips: ['sweet-chilli', 'buffalo-wings'],      // assets/video/<slug>-720.mp4
};
```

Clips are 16:9 H.264 MP4, muted, about five seconds, 720p. The name carries the
variant so a replaced clip is a renamed clip, and nginx caches them hard.

**With clips, the poster is the first clip's first frame**, not a photograph:
`assets/video/<slug>-poster.jpg`, made from the clip by

```bash
python3 tools/video/poster.py assets/video/brand-5-720.mp4
```

Whatever is in the poster is what a visitor sees until the browser can start
the clip — a moment on fibre, seconds on a phone — and then the first decoded
frame replaces it in one step with no transition, because that swap is the
browser's and not ours. A different picture there is a visible jump from one
scene to another and reads as a glitch; the same picture simply starts to
move. Re-run the script whenever the clip changes, and `audit.js` fails the
build if the file is missing. The first `<video>` carries `preload="auto"` for
the same reason: it autoplays, so it should be fetching from the first byte of
the page. `hero.poster` — the studio photograph — is the hero only when there
are no clips, where there is no swap to hide.

**The poster is the page; the video is an enhancement.** The markup's first
`<video>` has `autoplay muted loop playsinline`, so with JavaScript off one
clip loops — a complete hero, not a broken one. `assets/js/main.js` removes
`loop` and rotates the clips instead, crossfading each into the next across
two alternating `<video>` elements so the fade is a real overlap rather than a
cut.

The script stands down, leaving the poster alone, whenever motion is unwanted
or costly: `prefers-reduced-motion` (the CSS also hides the video outright),
a data-saver connection, autoplay refused by the browser, the tab hidden, or
the hero scrolled out of view.

Text over the video clears AA over any frame, sight unseen, because it sits on
the `--scrim` gradient: white on the worst-case composite is 7.83:1, and the
amber h1 accent is 4.03:1, permitted for large text only. `audit.js` fails the
build if a listed clip or the poster is missing.

---

## Home page (v2) and the display face

The home page follows the client's own builder mock-up: a dark hero with a
huge uppercase headline and an orange badge, a two-line "Deep marination.
Juicy perfection." section (their words, from the neon-sign artwork), the menu
and the photographs, and the "Where every bite is a hug" banner — their artwork,
edge to edge with nothing over it — closing the page against the dark footer.
Buttons are pills.

What the mock-up contained and this site does **not**: a street address, opening
hours, an "Order now" button and menu items that are not on the real menu. Those
were template filler. The redesign takes the visual language and keeps every
rule above — unknown facts render nothing, and there is no ordering button
because there is no ordering channel.

The display face is **Anton** (SIL OFL, self-hosted at
`assets/fonts/anton-latin-400-normal.woff2`, 18.6 kB, one weight), preloaded
and `font-display: swap`, with Impact and a condensed system stack behind it.
Headings, chapter names and prices are set in it, uppercase, as are the dish
names that rise over the gallery photographs; the dish names in the listings
and all body copy stay on the system sans. Nothing typesets the brand name: the header carries the logo artwork
itself, the lockup from the brand's own PDF — the rooster mark, then "Pookie"
over "Chicken" — as a single SVG at a fixed height, with the brand name as its
alt text. The `--dark`
ground is `#141110`: white on it is 18.4:1 and the logo's own orange is 7.1:1,
so on dark surfaces the untouched logo orange is text-safe.

The middle of the page is two blocks rather than a row of cards. First the
**whole menu as words** — chapter, dish, price, nothing else — in a grid that
takes as many columns as the width allows. Then a **gallery of the
photographs**, with no price or link on any of them. The split is the
point: one block to read, one to look at, neither repeating the other.

Each gallery photograph names its dish in a figcaption that rises on a white
band on hover, or on a tap where nothing can hover (main.js). The name is in
the markup either way, so the image's alt stays empty, as on every other
photograph on the site.

Unconfirmed prices print a dash in the listing exactly as they do on the menu
page.

The gallery carries no headline of its own: the pictures are the block, so the
section is named for screen readers with `aria-label` rather than a heading
nobody needs to read.

### The menu page

`/menu/` is built from the same two devices, so it reads as the same hand as
the home page — it was chosen from three mocks (the sources are in
`design/pookie-menu-mocks/` on the development branch). Under the heading, the
kicker and one plate, a **chapter bar** sticks under the header: plain links,
the chapter being read marked in `--brand` by main.js, a strip that scrolls
sideways on a phone. Each chapter opens with **one row of the home gallery's
tiles** for the dishes that have photographs, then the **whole chapter as the
home listing's lines** in two columns: the sans name, the Anton price in
`--brand`, the description beneath with any confirmed kcal and heat, a hairline
under each. A dish without a photograph is simply a line — there is never an
empty image slot. The allergen notice and the wings note close the page.

Tiles take as many columns as the chapter has photographs, up to four; five or
more wrap into rows of four. A chapter the owner empties in the panel drops
out of the page and the bar. Printed, the page is the words only.

---

## Colour

The palette comes from the firm's own logo — the values were read out of
`pookie LOGO.pdf`, not sampled by eye:

| | Hex | Where it is in the logo |
|---|---|---|
| red | `#E12F1C` | the comb, and the word "Pookie" |
| orange | `#FD8105` | the body gradient, and the word "Chicken" |
| amber | `#FDAA04` | the chicken's body |

The page ground is **white** and the accent is **orange**, both at the client's
request. Measured on white, none of the logo values can carry body text: orange
is 2.52:1, red 4.54:1, amber 1.92:1, against the 4.5:1 AA threshold.

Rejecting the palette is not an option — it is the brand. So it is layered, and
each step is the most orange value that clears its own threshold:

1. **`--logo-*`** — untouched. The logo, and fills that carry *dark* text
   (`--ink` on `--logo-orange` is 7.17:1). Logos are exempt from contrast
   requirements (WCAG 1.4.3), so the mark is never altered.
2. **`--display-orange`** — `#E06E00`, 3.28:1. Headings of 28px and up, where
   the large-text threshold is 3:1. `h1` and section `h2`s.
3. **`--brand`** — `#B45100`. Everything else: links, small UI, button fills
   under white text, and the 20–24px headings that sit
   too near the large-text boundary to gamble on.

`--brand` is `#B45100` rather than a brighter `#B85400` for one reason: some
brand text sits on `--sunken` (the lunch band's kicker, the claim chips), and on
that tint the brighter value measures
**4.48:1** — under AA by two hundredths. Every colour here is checked against
*both* grounds, not just the page.

### What is orange and what is not

The display face carries the brand colour; the body face stays `--ink`.
Headings and prices are orange; dish names and descriptions are dark. Two deliberate
exceptions:

- **Dish names in the listings are `--ink`**, in the sans face, so the eye
  finds the price: the price is the orange thing on each line, set in Anton
  and `--brand` (5.10:1), on the home listing and the menu page alike.
- **The wordmark is the logo artwork**, so it keeps the logo's own
  red-and-orange pairing. It is the lockup, not a heading, and it is never
  recoloured.

Amber is a **fill only**; `--ink` on amber is 9.42:1.

### One theme, for now

The site ships **light only**. Every colour is still a token on `:root` and
nothing anywhere reads a literal, so restoring dark mode means adding two blocks
to `main.css` and changing nothing else. Note that the dark values below were
measured against the *earlier* cream-and-red palette; the orange ramp would need
re-deriving for a dark ground before it could be used.

```css
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { … } }
:root[data-theme="dark"] { … }
```

The dark values were measured for this palette before the theme was dropped, so
they do not have to be derived again:

| Token | Dark | Against dark paper |
|---|---|---|
| `--paper` / `--sunken` / `--surface` | `#16120E` / `#0F0C09` / `#221B14` | — |
| `--ink` / `--ink-2` / `--ink-3` | `#F6EEE1` / `#D5C7B4` / `#A99781` | 16.18 / 11.23 / 6.59 |
| `--brand` | `#F2795A` | 6.80 — takes a **dark** label on a fill, never white |
| `--herb` / `--honey` | `#78C79C` / `#E9B14A` | 9.27 / 9.63 |
| `--line` / `--rule` | `#8A7358` / `#544537` | 4.15 / 2.03 |

`assets/js/main.js` is deliberately empty now that the toggle is gone — every
page is complete server-side, so there is nothing to enhance. It stays because
it is already wired up and deferred for whenever something does need scripting.

---

## Type

**Fraunces** for display, the system sans for everything else.

The logo is set in Verona Bold — a warm, round, ball-terminal serif with no web
equivalent. Fraunces' `SOFT` and `WONK` axes are the closest open-licensed match.

`brand.webfont` is currently `false`, so the site ships the system serif fallback
stack alone. That is the deliberate fallback position, not a degraded mode: a
well-set system serif beats a slow or third-party-hosted face. To turn the
webfont on, drop a subset `fraunces-600.woff2` into `assets/fonts/`, add the
`@font-face` and preload, and flip the flag.

Google Fonts is deliberately not used — it is a render-blocking third-party
request and a privacy cost on a site that otherwise sets no cookies and
therefore needs no consent banner.

Every price and calorie figure is set with `font-variant-numeric: tabular-nums
lining` and right-aligned, so £12.90 stacks under £15.90 down all thirty rows.

---

## Unconfirmed figures are not printed

The menu was transcribed from a PDF whose text order was scrambled. Two things
could not be read reliably:

- **Wing prices.** They are £8.90 or £9.90, but the per-item mapping was not
  legible. Every wing carries `priceConfirmed: false`, the line renders an em
  dash, and the menu page explains why in one sentence.
- **Calorie figures.** The composed-plate block has eight numbers for six
  dishes. Those carry `kcalConfirmed: false` and are suppressed entirely.

`audit.js` lists every suppressed figure on each run, so they stay visible to
whoever is getting them confirmed. Confirm a value, flip its flag, and it
appears. Silence is recoverable; a wrong price on a menu is not.

---

## Allergens

UK law — the FIC Regulations and Natasha's Law — requires a food business to be
able to give allergen information for everything it sells. The site will not
present a menu as complete without discharging that.

While `allergens.statement` is null and `perItem` is false, the menu carries an
honest interim notice telling a visitor to ask before ordering. Setting
`perItem: true` requires an `allergens` array on **every** menu item, and
`audit.js` fails the build for any item that lacks one.

---

## What `audit.js` checks

Per page: exactly one `<h1>`, no heading-level jumps, `lang` on `<html>`, title
and meta-description lengths, `rel="noopener"` on every external link,
accessible names on links and buttons, `alt` on every image, correctly escaped
ampersands, valid JSON-LD, no broken internal links or missing assets, and no
placeholder or leaked value (`TBC`, `undefined`, `[object Object]`) reaching the
output.

Globally: a warning for each fact the site still lacks — opening hours, a
phone number or email, the company line and allergen information, the last two
legally required — plus a check that the brand hex values in
`assets/css/main.css` still match `src/data.js`. These are warnings, not
errors: the restaurant is open, and refusing to publish would not supply a
missing fact, only freeze the site as it is. The panel shows them after every
publish.

---

## Still to do

- [ ] **Allergen information.** Legally required, and the hardest to retrofit.
- [ ] Full week of opening hours
- [ ] Phone number and enquiries email
- [ ] Limited company name and number for the footer; VAT number if registered
- [ ] `site.url` — canonicals, Open Graph and the sitemap all read from it
- [ ] Confirm the wing prices and the calorie-to-dish mapping
- [ ] Confirm the lunch deal currency (the source PDF carried both `$13/$15`
      and `£12.90/£15.90`)
- [ ] Delivery platform links, if there will be any
- [ ] Food photography — 15 stills and 3 short videos exist and are not yet
      wired in; the layout is deliberately photo-count-agnostic, so they can
      land in any order
- [ ] Confirm the firm holds usage rights to the photography

---

## The panel

`/admin/` is the owner's panel: sign in, edit, publish. It is `admin/server.js`,
one Node file with no dependencies, behind nginx on `127.0.0.1:8787`, and
`admin/ui/`, one page of vanilla JavaScript set in the site's own stylesheet.
It edits **content, never code**: the menu, the photographs, the hours, the
contact details, delivery links, the company line, the allergen statement,
and one announcement line — the only thing that ever shows in the strip
across the top of every page.

**Where the edits live.** Not in the repository. `content.json` sits in
`POOKIE_CONTENT_DIR` — `/srv/pookie-content` on the server, `./content`
locally (gitignored) — beside `photos/`, `versions/` and the password file.
`src/data.js` is the schema and the seed: when `content.json` exists its keys
replace the values in `data.js`; when it does not, the site builds from
`data.js` exactly as before, so the repository stands on its own. The panel
seeds `content.json` from `data.js` the first time it runs, and a code deploy's
`git reset --hard` cannot touch it. `EDITABLE` in `data.js` lists what the
panel may override; everything else is code.

**Publish is the same gate as a deploy.** It runs `build.js` and `audit.js
--json` into a build directory of its own (`POOKIE_DIST_DIR`), and copies the
result to the web root only if the audit has no errors. The audit's warnings
— the launch list, unconfirmed prices — come back to the panel and show on
the Overview, so the owner sees the same "before you can say open" list a
developer would. A refused publish leaves the live site untouched and says
why.

**Photographs** are sized in the owner's browser, not on the server: a 3:2
canvas on `--photo-ground`, the picture fitted inside with a margin, exported
at 1200/800/400 in WebP and JPEG — the same six files the site's own
photographs ship in — and uploaded one at a time, each checked by its first
bytes and capped at 3 MB. Nothing to install on the server. The studio
cut-out treatment in `tools/photos/` remains the better result for a plain
backdrop shot; run it by hand when a batch of studio photographs arrives.

**Every save and every publish is a version** (`versions/`, the last sixty).
History lists them; Restore brings one back as the draft; Publish puts it on
the site.

**Security.** Bound to localhost, so only nginx reaches it, over TLS. One
password, scrypt-hashed in `admin.json`; eight failures in fifteen minutes
lock that address out for fifteen. The session is an HttpOnly,
SameSite=Strict, Secure cookie; every write also needs the
`X-Requested-With` header, which a cross-site form cannot send. Everything
typed is validated by shape on the server and again by the audit; slugs and
filenames match a fixed pattern before they touch disk. The systemd unit runs
it as `www-data` with `ProtectSystem=strict` and write access to the content
directory and the web root only.

**Setting it up** is part of `deploy.sh`: it creates the content directory,
installs the nginx location (one `include` line inserted into certbot's
vhost, once), installs and restarts the systemd unit, and — until a password
exists — prints the command to set one:

```bash
sudo -u www-data POOKIE_CONTENT_DIR=/srv/pookie-content node /srv/pookiekitchen/admin/server.js --set-password
```

Locally: `node admin/server.js --set-password`, then `node admin/server.js`,
and open http://127.0.0.1:8787/admin/. Without `POOKIE_WEB_ROOT` a publish
builds and audits but copies nowhere.

---

## Deployment

The site is served from a VPS as plain static files behind nginx, alongside the
other sites on that host.

| | |
|---|---|
| URL | `https://pookiechicken.com` — `www.pookiechicken.com` and the staging host `pookie.nileapps.co.uk` redirect to it |
| DNS | GoDaddy: `A @ → 187.127.84.93`, `CNAME www → @`. No AAAA — the server has no IPv6 |
| Host | `187.127.84.93` (Hostinger, Ubuntu 24.04 — the box that serves regnum.nileapps.co.uk) |
| Web root | `/var/www/pookie` |
| nginx vhost | `/etc/nginx/sites-available/pookie` (from `deploy/nginx.conf`) |
| TLS | Let's Encrypt via certbot, auto-renewed |

### The domain

The site is `pookiechicken.com`. nginx answers for three names — that one,
`www.pookiechicken.com`, and `pookie.nileapps.co.uk`, the staging host the
site lived on first — and sends the other two to the site with a 301. One
certificate covers all three; it is the lineage certbot first made for the
staging host, expanded in place, which is why it is still called
`pookie.nileapps.co.uk` under `/etc/letsencrypt/live/`.

`deploy.sh` keeps all of that, and does it in an order that cannot leave a
broken state behind:

1. the `server_name` line from `deploy/nginx.conf` is copied into both
   server blocks of the live vhost, so nginx answers for every name;
2. if the certificate does not yet cover every name, and every name resolves
   to this machine, certbot is asked to expand it — and not before, because a
   failed validation counts against Let's Encrypt's rate limit;
3. only once the certificate covers every name are the redirects written:
   `if ($host != pookiechicken.com)` in the https block, and one
   `if ($host = …)` per name in certbot's port-80 block, each to
   `https://pookiechicken.com`. A redirect into a name the certificate does
   not cover would be a browser warning where there was a working page.

So the order for a new name is: DNS first, then a deploy; if DNS has not
propagated, the deploy says which name is not ready and the site stays where
it was. `curl -sI https://www.pookiechicken.com/ | head -3` shows the 301 once
it is done.

### Two things the live server learned the hard way

**CSS and JS URLs carry a content hash** — `/assets/js/main.js?v=3f2a…` —
appended by `src/layout.js` from the file's bytes. nginx caches `/assets/` for
a year as `immutable`, which it must or every page view re-fetches them; the
hash is what makes that safe. Without it a visitor's browser kept an old
`main.js` against new HTML for up to seven days, so a script a deploy had
added did not exist for them: the back-to-top button rendered as its no-JS
footer link on the live site while the build said it worked.

**The CSP in the live vhost is kept in step by the deploy scripts.** The vhost
is installed once from `deploy/nginx.conf` and certbot then rewrites it in
place with the TLS block, so it can never be overwritten wholesale again. Both
`deploy.sh` and `deploy/remote.sh` therefore copy exactly one directive across
on every deploy — the `Content-Security-Policy` line — whenever the
repository's differs from the server's, with `nginx -t` as the guard. Changing
the policy in `deploy/nginx.conf` is changing it on the server. This mattered:
the policy had no `frame-src`, so `default-src 'self'` silently blocked the
Google Maps iframe and the map was an empty box on the live site — that, not
the map endpoint, was why it could not be seen. It also has `style-src 'self'`
with no `'unsafe-inline'`, which is correct, and which is why no template
carries a `style=""` attribute: an inline style is dropped on the live site
and only there.

### Deploys run from GitHub Actions

`.github/workflows/deploy.yml` runs on every push to `main`, and by hand from
the Actions tab (Deploy → Run workflow). It builds, **runs the audit as a
gate**, then ships `dist/` and `deploy/` to the server over SSH and runs
`deploy/remote.sh` there. The server needs no GitHub access, no Node and no
clone of this repository — it only ever receives a finished, audited build.

`remote.sh` is idempotent and does the one-time setup itself: it installs the
nginx vhost from `deploy/nginx.conf` if it is missing, publishes the build,
reloads nginx only after `nginx -t` passes, and asks certbot for a certificate
once — and only when the domain already resolves to that machine, because a
failed validation counts against Let's Encrypt's rate limit.

Once the owner's panel is installed on the server (README → The panel), a
build made on GitHub knows nothing of the owner's edits and photographs, so
`remote.sh` no longer publishes it: it hands over to `/srv/pookiekitchen/deploy.sh`,
which fetches the same commit, builds with the owner's content, audits and
publishes. The Actions run still builds and audits the repository first, so a
broken commit is caught before the server is touched at all.

Without the secrets below the workflow is a plain CI check: build and audit
run on every push, the deploy job is skipped, and the run carries a warning
saying so.

**One-time setup: repository secrets** (Settings → Secrets and variables →
Actions → New repository secret):

| Secret | Value |
|---|---|
| `VPS_SSH_KEY` | a private key whose public half is in `/root/.ssh/authorized_keys` on the server (hPanel → VPS → Settings → SSH keys adds it without a terminal) |
| `VPS_PASSWORD` | the root password, if you would rather not use a key. It works; the key is better |
| `PAWCAL_DEPLOY` | accepted as the credential too, so a key already in the repository under that name needs no second copy. The workflow decides whether the value is a key or a password by reading it, not by its name |
| `VPS_HOST` | optional, defaults to `187.127.84.93`. Not secret, so a repository Variable does |
| `VPS_USER` | optional, default `root`. `remote.sh` needs root |
| `VPS_HOST_KEY` | optional: a `known_hosts` line to pin the server (`ssh-keyscan -H 187.127.84.93`). Without it the first connection trusts whatever answers |

Only a credential is strictly required. A **repository** secret, not an environment
secret, and on the Actions tab rather than Codespaces or Dependabot — a secret
in any of those other places is invisible to this workflow, and the run's summary
prints which names it could actually see.

The first thing the deploy job does is log in and run `hostname`. A credential
that belongs to another host, or a GitHub deploy key (which authenticates to
GitHub, not to a server), fails there with a message saying so rather than
halfway through copying files.

A key pair for this, made on your own machine:

```bash
ssh-keygen -t ed25519 -C pookie-actions -f pookie-actions -N ""
# pookie-actions.pub  -> the server (authorized_keys, or hPanel → SSH keys)
# pookie-actions      -> the VPS_SSH_KEY secret, the whole file including
#                        the BEGIN/END lines
```

Then run the workflow by hand: Actions → Deploy → Run workflow.

**A push does not deploy on its own until you say so.** Every deploy is a login
to the VPS, and a credential the server rejects is a failed root login; repeated
on every push, fail2ban bans the runner. So the push path builds and audits
only, and deploying is a deliberate act. Once a run has gone green, set the
repository **Variable** `AUTO_DEPLOY` to `true` and every push to `main`
deploys again.

The run's summary shows the HTTP status the server answered with.

### Deploying from the server instead

`deploy.sh` is the manual path and does the same job from the other side: it
needs a clone of this repository on the server, which — the repository being
private — needs its own read-only deploy key. Once that exists, deploying is
one command **on the server**:

```bash
/srv/pookiekitchen/deploy.sh
```

It fetches `main`, rebuilds, **runs the audit as a gate**, rsyncs `dist/` into
the web root and reloads nginx. `set -e` plus a non-zero audit means a broken
build never reaches the web root. `dist/` is not committed — the server builds
its own copy.

### Deploying from the browser terminal

`deploy/bootstrap.sh` is the whole server side in one idempotent script, meant
for hPanel's browser terminal when SSH from elsewhere is not available. It
installs what is missing (git, rsync, nginx, certbot, openssh-client, Node 20),
creates the server's own read-only deploy key, clones the repository, installs
the nginx vhost, builds, publishes, and asks certbot for a certificate — each
step only if it has not been done already, so running it again is simply a
deploy.

The repository is private, so the key has to be authorised once. That is why
the script runs in two passes: the first prints the key and stops, and the
second does the work.

```bash
# 1. as root, make the key and print it
apt-get update -qq && apt-get install -y -qq git openssh-client
K=/root/.ssh/pookie_deploy
[ -f $K ] || ssh-keygen -t ed25519 -C pookie-deploy -f $K -N ""
grep -q '^Host github-pookie$' /root/.ssh/config 2>/dev/null || printf '\nHost github-pookie\n  HostName github.com\n  User git\n  IdentityFile %s\n  IdentitiesOnly yes\n' $K >> /root/.ssh/config
ssh-keyscan github.com >> /root/.ssh/known_hosts 2>/dev/null
cat $K.pub

# 2. add that line at github.com/barancandogan/pookiekitchen/settings/keys/new
#    read-only — do NOT tick "Allow write access"

# 3. clone and run the rest
git clone git@github-pookie:barancandogan/pookiekitchen.git /srv/pookiekitchen
bash /srv/pookiekitchen/deploy/bootstrap.sh
```

After that, every later deploy is one command:

```bash
/srv/pookiekitchen/deploy.sh
```

### One-time server setup, step by step

The same thing spelled out, if you would rather do it by hand than run the
script above.

```bash
# 1. DNS: point pookiechicken.com (A record) and www (CNAME to @) at this
#    server first. Everything below fails until they resolve.

# 2. Deploy key, on the server
ssh-keygen -t ed25519 -C "pookie-deploy" -f /root/.ssh/pookie_deploy -N ""
cat /root/.ssh/pookie_deploy.pub
#    Add that key at:
#    github.com/barancandogan/pookiekitchen/settings/keys → Add deploy key
#    Read-only. Do NOT tick "Allow write access".

cat >> /root/.ssh/config <<'EOF'
Host github-pookie
  HostName github.com
  User git
  IdentityFile /root/.ssh/pookie_deploy
  IdentitiesOnly yes
EOF

# 3. Clone
git clone git@github-pookie:barancandogan/pookiekitchen.git /srv/pookiekitchen
chmod +x /srv/pookiekitchen/deploy.sh

# 4. nginx. The vhost is HTTP-only on purpose — see the comment at the top
#    of deploy/nginx.conf. Never reload without nginx -t passing first:
#    other sites share this server and a broken config takes them down too.
cp /srv/pookiekitchen/deploy/nginx.conf /etc/nginx/sites-available/pookie
ln -s /etc/nginx/sites-available/pookie /etc/nginx/sites-enabled/pookie
mkdir -p /var/www/pookie
nginx -t && systemctl reload nginx

# 5. TLS. certbot rewrites the vhost in place: it adds listen 443 ssl, the
#    certificate paths and the SSL includes to the block from step 4, and
#    writes a separate port-80 server that redirects to https. So it must
#    run after step 4, and every directive in the vhost is carried over
#    without being written twice. The lineage name matches CERT_NAME in
#    deploy.sh, which expands it whenever the names change.
certbot --nginx --cert-name pookie.nileapps.co.uk \
  -d pookiechicken.com -d www.pookiechicken.com -d pookie.nileapps.co.uk

# 6. First deploy
/srv/pookiekitchen/deploy.sh
```

Node 18+ must be on the server. The Regnum site on the same host already
needs it, so it is almost certainly there — `node --version` to confirm.

### Before the vhost exists

A name that resolves to the server but has no matching `server_name` falls
through to whatever nginx has as its default server — on this box, some other
site entirely. Seeing an unrelated app at `pookiechicken.com` before step 4 is
therefore the **correct** behaviour and confirms DNS is working; it is not a
sign that anything is broken.

This vhost carries no `default_server` on either listen line, so it answers
for its own name only and cannot capture traffic meant for the other sites.

### Indexing

`site.indexable` is `true` in `src/data.js`: pages carry no robots meta,
`robots.txt` allows everything and points at the sitemap, and every canonical
is on `https://pookiechicken.com`.

It was `false` while the site lived only on `pookie.nileapps.co.uk`, a staging
subdomain of somebody else's domain: had that been indexed, it is what would
have ranked for the brand, and once the real domain arrived the two would
have competed, leaving a stale copy in the results. The staging host now
redirects to the site, so there is nothing stale left to index. Setting the
flag back to `false` restores `noindex, nofollow` on every page, a
disallow-all `robots.txt` and an empty sitemap.

On the day the real domain goes live, change `site.url` to it and flip
`site.indexable` to `true`. Nothing else needs touching — canonicals, Open
Graph, `robots.txt` and the sitemap all read from those two fields.
