# Pookie Chicken — website

A dependency-free static site for a UK chicken restaurant that has not opened yet.

```bash
node build.js            # write ./dist
node build.js --serve    # write ./dist and serve it on http://localhost:4173
node audit.js            # structural, accessibility and launch-readiness checks
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
audit.js         per-page checks plus the launch gate
preview.js       bundles the built site into one self-contained HTML file
assets/          css, js, the logo as SVG, dish photography — copied into dist/
dist/            the built site (regenerated every build; safe to delete)
```

Editing copy means editing `src/data.js` and rebuilding. Nothing in `dist/` is
edited by hand.

`preview.js` exists because there is nowhere to deploy this yet. It inlines the
CSS, the JS and the logo, and rewires the internal links to swap sections in
place, so all four pages travel as one file you can email or open from a
`file://` URL. It is a review tool, not the site — real pages, real URLs and the
sitemap come from `build.js`, and nothing in the bundle is ever deployed.

---

## The central idea: null is a real value

The restaurant has no confirmed address, phone, opening date, hours, delivery
links or company number. The site is built to be genuinely useful while all of
that is unknown, and to become a full restaurant site **as a content edit, not
a rebuild**.

Every unknown is `null` in `src/data.js`, and every template renders **nothing
at all** rather than a placeholder. There is no "TBC", no greyed-out button, no
`07xxx`. A visitor reads a placeholder as a fact, so the site would rather say
less than say something untrue.

`derive()` at the bottom of `data.js` turns those nulls into the flags the
templates read. The one that matters:

```js
const isOpen = status.announcedOpen && addressKnown && hoursKnown;
```

Open is not a mood. You are open when a stranger can find you and knows when to
turn up. Setting `announcedOpen: true` without an address and a full week of
hours does not open the site — it fails the audit instead.

### Launch day

| Set this in `src/data.js` | And this appears |
|---|---|
| `contact.address` (all of line1, locality, postcode) | Footer address, Find us page, `Restaurant` JSON-LD instead of `Organization` |
| `contact.hours` (**all seven** days; a closed day is the string `'closed'`) | Footer hours table, Find us hours, `openingHours` in JSON-LD |
| `contact.phone` | Footer link, hero "Call us", Find us button |
| `contact.email` | Footer link |
| `contact.cateringEmail` | `/catering/` becomes buildable |
| `contact.jobsEmail` | Hiring block |
| `status.openingDate` | The date in the pre-opening ribbon |
| `status.announcedOpen: true` | Green "Open today" ribbon, order-led copy — **but only with address and hours** |
| `delivery[].url` | That platform's order button, and it takes over the mobile action bar |
| `company.companyName` + `companyNumber` | The legally required footer line |
| `allergens.statement` or `perItem: true` | Replaces the interim allergen notice |
| `site.url` | Canonicals, `og:url`, and a real `sitemap.xml` |

A partial week of hours renders nothing at all. "Tue: ?" tells a visitor to ring
a number we also do not have, so the whole table waits until every day is decided.

---

## Photography

Twelve of the fifteen photographs in the brand's Drive folder are wired in; the
remaining three are marketing graphics (a banner, a price-tag advert, a neon
sign mockup) rather than dishes.

The sources are studio plates on a white backdrop, 1024–1472px, named
`image (4).png` … `image (64).png`. Each was cropped to the plate itself — the
white backdrop around it carries no information and only shrinks the dish in
the thumbnail — then encoded at two widths in WebP with a JPEG fallback:

```
assets/img/dish/<slug>-400.webp   <slug>-400.jpg      row thumbnails
assets/img/dish/<slug>-800.webp   <slug>-800.jpg      2× displays
assets/img/dish/feature-plate-900|1600.webp|jpg       the full-bleed band
```

Cropping to the plate leaves aspect ratios between 1.00 (a round plate of
wings) and 2.93 (a long oval). The thumbnail box is therefore a fixed
140×105 with `object-fit: contain` and a `--surface` background — the same
white the photographs were shot on, so the letterboxing is invisible and no
plate is ever sliced. True intrinsic dimensions live in `photoDims` in
`data.js` so the markup carries real `width`/`height`.

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

## Colour

The palette comes from the firm's own logo — the values were read out of
`pookie LOGO.pdf`, not sampled by eye:

| | Hex | Where it is in the logo |
|---|---|---|
| red | `#E12F1C` | the comb, and the word "Pookie" |
| orange | `#FD8105` | the body gradient, and the word "Chicken" |
| amber | `#FDAA04` | the chicken's body |

Measured against the `#FBF6EC` page ground, none of them can carry body text:
red is 4.22:1, orange 2.34:1, amber 1.78:1. WCAG AA needs 4.5:1.

Rejecting the palette is not an option — it is the brand. So it is layered:

1. **`--logo-*`** — untouched. The logo and decorative fills only. Logos are
   exempt from contrast requirements (WCAG 1.4.3), so the mark is never altered.
2. **`--display-red`** — `#E12F1C` at 24px and above only, where 4.22:1 clears
   the 3:1 large-text threshold. The wordmark and the price in the `<h1>`.
3. **`--brand`** — `#A32E17`, 6.59:1. Body copy, links, small UI. Every other
   use of red on the site.

Amber is a **fill only**; `--ink` on amber is 9.70:1.

The differentiation therefore does not come from the palette — it comes from how
it is used: a warm paper ground, an editorial serif, generous space, and the hot
colours spent as accents rather than grounds.

### One theme, for now

The site ships **light only**. Every colour is still a token on `:root` and
nothing anywhere reads a literal, so restoring dark mode means adding two blocks
to `main.css` and changing nothing else:

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
| `--third-*` | `#E97848` / `#F0CE85` / `#78C79C` | chicken / pasta / salad |

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

## The Three Thirds glyph

`thirds: true` on a menu item marks a composed plate — chicken, pasta and salad
— and is the only thing that renders the glyph. Its absence on the wings is
information, not an omission.

In light mode the three segments are separated by only 1.18:1, so **colour is
explicitly not the carrying channel**. The meaning is coded four ways: fill
texture (solid / 45° hatch / dot field), a gap of card ground between segments,
a 1px edge, and a written label under each segment.

The glyph is never rendered below 24px wide. Below that the labels cannot fit
and the redundant coding collapses to colour alone, so there is no micro variant.

---

## Unconfirmed figures are not printed

The menu was transcribed from a PDF whose text order was scrambled. Two things
could not be read reliably:

- **Wing prices.** They are £8.90 or £9.90, but the per-item mapping was not
  legible. Every wing carries `priceConfirmed: false`, the row renders an em
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

Globally: the launch gate above — warnings while pre-opening, **errors** the
moment the site claims to be open — plus a check that the brand hex values in
`assets/css/main.css` still match `src/data.js`.

---

## Before this goes live

- [ ] **Allergen information.** Legally required, and the hardest to retrofit.
- [ ] Street address, and the opening date
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
