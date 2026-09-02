# Pookie Chicken — website

A dependency-free static site for a UK chicken restaurant that has not opened yet.

```bash
node build.js            # write ./dist
node build.js --serve    # write ./dist and serve it on http://localhost:4173
node audit.js            # structural, accessibility and launch-readiness checks
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
assets/          css, js, the logo as SVG — copied verbatim into dist/
dist/            the built site (regenerated every build; safe to delete)
```

Editing copy means editing `src/data.js` and rebuilding. Nothing in `dist/` is
edited by hand.

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

Every colour is a token on `:root`. Dark mode redefines tokens only, once under
`prefers-color-scheme` (guarded with `:root:not([data-theme="light"])`) and once
under `[data-theme="dark"]`, so the header toggle wins in both directions. The
choice persists in `localStorage` and is applied by an inline script in `<head>`,
before first paint, so there is no flash.

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
