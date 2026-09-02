# POOKIE CHICKEN — DESIGN SPECIFICATION v1.0

**Status:** approved for build. Every value here is final unless flagged `[CONFIRM]`.
**Build target:** dependency-free static site, Node build script, modelled on `/home/user/regnum-website`.

---

## 1. THE DECISION

**The Sauce Book wins.** It takes the highest aggregate across the three judgments (21.5 / 20.5 / 19), it wins the lens with the hardest constraints — buildability against 15 photographs nobody has opened and a repo with no image pipeline — and it places second on distinctiveness. Most decisively: its menu is the only one of the three that is **photo-count-agnostic**. "A row without a photograph is not a degraded card; it is simply a row." Scroll Until Hungry needs 14 distinct dish subjects with zero slack and states that a hole "reads as a broken site"; Daylight Plate needs four specific overhead compositions for its hero alone. Neither has a degraded mode. Grafting a photo-agnostic menu onto those directions is a rebuild; grafting their best ideas onto a row-based menu is an afternoon.

**Grafted on:**

| From | What | Why |
|---|---|---|
| Daylight Plate | The **Three Thirds glyph** (Chicken / Pasta / Salad), on composed items only | The only device in the set that makes "protein + carb + salad" pre-attentive. Its absence on wings is information too. |
| Daylight Plate | **Regulated claims held behind a null data field** (`proteinG`) | Same null-guard mechanism as the unknown address, applied to a nutrition claim. Now applied to a *third* thing — the sauce provenance claim. |
| Daylight Plate | The **kcal ladder** (filter + sort by calories) | The one feature no competitor has, built from a number we already own. Ships collapsed by default — see §5. |
| Daylight Plate | Video handling verbatim: all clips below the fold, `preload="none"`, poster always | The most conservative treatment proposed. |
| Scroll Until Hungry | The **`--scrim` token and its arithmetic** | Guarantees AA over any photograph sight-unseen. |
| Scroll Until Hungry | **Six dish pages, not thirty** | `audit.js` hard-fails a meta description under 70 chars. 30 pages = ~60 copy artefacts nobody has written. |
| Scroll Until Hungry | The **abundance reframe** — "£12.90, and that's with pasta and a fresh salad" | Sells balance as *more food*, not less. Fixes the winning direction's biggest tonal risk in one sentence. |
| Scroll Until Hungry | **Full-bleed appetite interstitial**; **named, priced dish in the hero**; **sticky mobile action bar** | Appetite counterweights to cream paper and an editorial serif. |
| Commercial judgment | **WhatsApp / mobile capture** alongside email | Email open rates do not fill a UK takeaway on day one. |
| Commercial judgment | **`/hire-us/`** (catering enquiries), gated on an inbox existing | The only thing a not-yet-open kitchen can genuinely sell today. |

**Rejected, with reasons:**

- **Sauce Book's H1** ("A small kitchen that makes its own sauces") — the craft claim is unverified. It cannot be the headline. It becomes a data-gated section instead.
- **Sauce Book's homepage plates-as-text-rows** — replaced with real photographed rows. In this category the photograph is the sales pitch.
- **Sauce Book's gallery band** — cut entirely, to buy photographic slack and page weight. The interstitial does the job with one image.
- **Daylight Plate's "Calories, printed" homepage band** — a whole section devoted to the most appetite-suppressing number on the site, sited mid-scroll. One sentence does the same job at ~1% of the cost.
- **Daylight Plate's green-led palette** — a menu containing mozzarella sticks, Buffalo Fire wings and a £20.90 sirloin filed under salad-bar green loses the indulgence buyer. Green is demoted to a single accent.
- **SUH's autoplay video hero and single-document homepage** — the heaviest above-the-fold asset and the heaviest document in the set, on the device class the brief names.
- **SUH's dish-as-H1** — an H1 of "Sriracha Fire" on the homepage is bad for "Pookie Chicken" and collides with `audit.js`'s exactly-one-`<h1>` rule when the same dish renders as a card below.
- **Countdown, store locator, postcode gate, cookie banner, hamburger nav, booking widget, PDF menu, review stars, loyalty, gift cards, franchise page.** All out.

**Where the judges disagreed, my calls (one line each):**

1. *Menu on homepage (commercial) vs `/menu/` page (buildability)* — **`/menu/` is canonical, but every price on the menu appears on the homepage**, because a shareable menu URL and a light homepage beat a saved tap, and the tap is bought back by the price index.
2. *Daylight Plate (distinctiveness) vs Sauce Book (buildability)* — **Sauce Book**, because the Three Thirds glyph grafts onto a row menu trivially and a row menu does not graft onto a photo-card system at all.
3. *kcal ladder: inert gimmick (commercial) vs non-negotiable (distinctiveness)* — **ship it collapsed by default**: zero appetite cost when ignored, full differentiation when opened.
4. *Dish-as-H1 (commercial) vs SEO/audit risk (buildability)* — **H1 is a composition-and-price sentence; the named priced dish is a captioned feature card beside it.**
5. *Kitchen Notes: best idea (distinctiveness) vs will stall (all three)* — **ship it, capped at three entries, empty array renders nothing, audit warns at 45 days.**
6. *Print kcal at all (commercial cost) vs it's the receipt (distinctiveness)* — **print them.** It is a signed-off commercial cost, not a free trust win. See §7.
7. *Photo budget* — **12 committed, 3 held in reserve.** Zero slack was fatal in SUH; slack is the fix.

---

## 2. BRAND SYSTEM

### 2.1 Colour tokens

Every ratio below was computed, not estimated. Light values are stated against `--paper` unless the row says otherwise. Full light palette is defined on bare `:root`; dark overrides go in **both** `@media (prefers-color-scheme: dark)` (guarded `:root:not([data-theme="light"])`) and `:root[data-theme="dark"]`.

#### Light theme

| Token | Hex | Role | Contrast |
|---|---|---|---|
| `--paper` | `#FBF6EC` | Page ground (warm cream, not white) | — |
| `--paper-sunken` | `#F3EADB` | Tinted bands: lunch deal, sauce index, steak spread | — |
| `--surface` | `#FFFFFF` | Raised cards, photo rows | — |
| `--ink` | `#1A1512` | Headings, dish names, body | **16.81:1** paper · 15.18:1 sunken · 18.10:1 surface |
| `--ink-2` | `#463C32` | Descriptions, standfirsts | **9.98:1** paper · 9.01:1 sunken · 10.75:1 surface |
| `--ink-3` | `#6A5C4E` | kcal, meta, consent notice, eyebrow | **5.99:1** paper · 5.41:1 sunken · 6.45:1 surface |
| `--brand` | `#A32E17` | Primary CTA fill, links, chapter numerals | **6.59:1** paper · 5.95:1 sunken · 7.09:1 surface |
| `--herb` | `#2E6A4A` | Balance signal, badges, "open" ribbon | **5.95:1** paper · 5.37:1 sunken · 6.41:1 surface |
| `--honey` | `#E4A62C` | Pre-opening ribbon **fill only** | ink on honey = **8.44:1** |
| `--honey-text` | `#8A5A0E` | Glaze family as a text label | **5.49:1** paper · 4.96:1 sunken |
| `--ember-text` | `#7A3C1B` | Smoke family as a text label | **7.83:1** paper · 7.07:1 sunken |
| `--line-control` | `#7E6A54` | Borders that *are* the control: inputs, chips, outline buttons, glyph segment edges | **4.78:1** paper · 4.32:1 sunken · 5.15:1 surface (needs 3:1) |
| `--rule` | `#D2C0A2` | Decorative hairlines between menu rows | 1.65:1 — decorative, always accompanied by text, exempt |
| `--focus` | `#B4491F` | 3px `:focus-visible` ring | **4.98:1** paper · 4.50:1 sunken (needs 3:1) |

Fills: white on `--brand` = **7.09:1**; white on `--herb` = **6.41:1**; `--paper` on `--herb` = **5.95:1**; `--ink` on `--honey` = **8.44:1**.

#### Dark theme

| Token | Hex | Contrast |
|---|---|---|
| `--paper` | `#16120E` | warm near-black, never blue-black |
| `--paper-sunken` | `#0F0C09` | — |
| `--surface` | `#221B14` | — |
| `--ink` | `#F6EEE1` | **16.18:1** paper · 16.93:1 sunken · 14.77:1 surface |
| `--ink-2` | `#D5C7B4` | **11.23:1** paper · 10.25:1 surface |
| `--ink-3` | `#A99781` | **6.59:1** paper · 6.90:1 sunken · 6.02:1 surface |
| `--brand` | `#F2795A` | **6.80:1** paper · 6.20:1 surface. As a fill it takes **dark** label `#16120E` at 6.80:1 — never white |
| `--herb` | `#78C79C` | **9.27:1** paper · 8.46:1 surface; dark ink on herb fill = 9.27:1 |
| `--honey` | `#E9B14A` | **9.63:1** paper; dark ink on honey fill = 9.63:1 |
| `--line-control` | `#8A7358` | **4.15:1** paper · 3.78:1 surface (needs 3:1) |
| `--rule` | `#544537` | 2.03:1 — deliberately stronger than light; dark grounds swallow hairlines |
| `--focus` | `#F2795A` | 6.80:1 paper |

#### Cross-theme

`--scrim: linear-gradient(to top, rgba(20,14,9,.86), rgba(20,14,9,.72) 45%, transparent)`.
Composited over the worst possible pixel (a blown white highlight) it yields `#56514E`. On that: **white = 7.83:1**, `--ink` dark `#F6EEE1` = **6.80:1**. Over a bright honey highlight `#F0C070` it yields `#524026`, white = 9.91:1.
**Rule:** text over any photograph is `#FFFFFF` or `#F6EEE1` only. `--honey` on scrim measures 4.05:1 — permitted for large text (≥24px, or ≥18.66px bold) only, never body.

#### Sauce family tokens

| Family | Light | Dark | Contrast (L paper / L surface / D paper) | Sauces |
|---|---|---|---|---|
| `--sauce-glaze` | `#B5751A` | `#E9B14A` | 3.53 / 3.80 / 9.63 | Teriyaki, Sweet Chilli, Hot Honey, Korean BBQ, BBQ |
| `--sauce-smoke` | `#8A4520` | `#D08A55` | 6.60 / 7.11 / 6.61 | Smoky Tomato, Mediterranean, Roasted Pepper |
| `--sauce-chilli` | `#A32E17` | `#F2795A` | 6.59 / 7.09 / 6.80 | Sriracha Fire, Peri Peri Flame, Buffalo Fire, Mango Habanero |
| `--sauce-cream` | `#EFDCBB` | `#EFDCBB` | 1.25 / 1.34 / 13.86 | Creamy Curry, Cheesy Triple Blast |
| `--dot-ring` | `#6A5C4E` | `#A99781` | 5.99 / 6.45 / 6.59 | — |

`--sauce-cream` is functionally invisible on the light ground at 1.25:1. **Every sauce dot therefore carries a 1.5px `--dot-ring` border**, so the dot's boundary always clears 3:1 regardless of fill. Colour is never the sole carrier of meaning: every dot sits beside its sauce name in text, and the heat step is a counted glyph with an `aria-label`, not a hue.

#### Three Thirds glyph segments

| Segment | Light | Dark | Contrast on surface (L / D) |
|---|---|---|---|
| Chicken | `#8F3A18` | `#E97848` | 7.54 / 5.87 |
| Pasta | `#D9A441` | `#F0CE85` | 2.25 / 11.23 |
| Salad | `#2E6A4A` | `#78C79C` | 6.41 / 8.46 |

Pairwise separation in light mode is 1.18:1 (chicken/salad) — **colour is explicitly not the carrying channel.** Each segment is redundantly coded four ways: (1) fill texture — solid / 45° `repeating-linear-gradient` hatch / `radial-gradient` dot field; (2) a 2px gap of card ground between segments so the structure is a *shape*; (3) a 1px `--line-control` edge (5.15:1 on surface) so the pale pasta segment always has a defined boundary — this satisfies 1.4.11 for the graphical object; (4) an in-place text label under each segment: **Chicken / Pasta / Salad**. Never a legend parked elsewhere, never a percentage, never a gram figure.

**Hard constraint:** the glyph is **never rendered below 24px wide**. There is no micro-bar variant, no rail indicator variant. At smaller sizes the labels cannot fit and the redundant coding collapses to colour alone. The sticky chapter rail marks its current chip with `aria-current="true"` plus a filled `--brand` underline, not a glyph.

### 2.2 Typography

**Display — Fraunces** (SIL Open Font License, self-hosted).
One file: `fraunces-600.woff2`, static instance `opsz 72, wght 600, SOFT 0, WONK 0`, subset to Latin + Latin-1 Supplement. **Budget: ≤34KB.** `<link rel="preload" as="font" type="font/woff2" crossorigin>`, `font-display: swap`. Used only at ≥1.25rem: wordmark lockup, H1–H3, dish names, chapter price statements, countdown numerals.

```css
--font-display: "Fraunces", "Fraunces Fallback", Georgia, "Iowan Old Style",
                "Palatino Linotype", Palatino, "Times New Roman", serif;

@font-face {
  font-family: "Fraunces Fallback";
  src: local("Georgia");
  size-adjust: 105%; ascent-override: 92%; descent-override: 24%; line-gap-override: 0%;
}
```
`[CONFIRM]` The four override values are a Georgia-matched starting point. Re-measure against the actual subset before launch and verify CLS = 0 with the font blocked.

**Fallback position:** if Fraunces cannot be licensed and self-hosted cleanly, **delete the webfont and ship the fallback stack alone.** A well-set system serif beats a slow or third-party-hosted face. Do not use `fonts.googleapis.com` — it is a render-blocking third-party request and a privacy cost on a site that otherwise sets nothing and therefore needs no consent banner.

**Text / UI — system stack, zero bytes:**
```css
--font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
             "Helvetica Neue", Arial, sans-serif;
```
Carries all body copy, item descriptions, prices, kcal, nav, buttons, form fields, the consent notice.

**Numerals.** Every price and every kcal figure is set in `--font-sans` with `font-variant-numeric: tabular-nums lining`, right-aligned. £12.90 stacks under £15.90 and 240 stacks under 1150 down all 30 rows. This is the single detail that separates a designed menu from a homemade one, and it is why the menu's most important content renders correctly before any font arrives.

**Scale (fluid, no breakpoint-driven type):**

| Token | Value | Use |
|---|---|---|
| `--t-xs` | `0.8125rem` (13px) | caps chips, heat key |
| `--t-sm` | `0.875rem` (14px) | meta, consent notice — **hard floor for legal text** |
| `--t-base` | `clamp(1rem, 0.96rem + 0.2vw, 1.0625rem)` | body — **16px floor** |
| `--t-md` | `clamp(1.0625rem, 1rem + 0.3vw, 1.1875rem)` | standfirst |
| `--t-lg` | `clamp(1.25rem, 1.14rem + 0.5vw, 1.5rem)` | H3, dish names |
| `--t-xl` | `clamp(1.5rem, 1.3rem + 1vw, 2rem)` | chapter price statement |
| `--t-2xl` | `clamp(1.75rem, 1.4rem + 1.5vw, 2.75rem)` | H2 |
| `--t-3xl` | `clamp(2.25rem, 1.6rem + 3.2vw, 4rem)` | H1 |

Line heights: `--lh-tight 1.1` (display), `--lh-snug 1.25`, `--lh-base 1.6` (body), `--lh-loose 1.7` (long prose). Measure capped at **68ch** for prose, **58ch** for standfirsts.

**Case.** Sentence case for every heading. ALL-CAPS is permitted in exactly four places: the hero eyebrow, chapter kickers, the heat-ladder key, and badge chips — `--t-xs`, `letter-spacing: .08em`, `--ink-3`. Never a sentence, never a heading. Caps headings are the 2015 fast-food signage tic this brand is defecting from, and they degrade screen-reader output.

**Marginalia** (the owner's asides): `--font-sans` *italic* at `--t-sm` with a 2px `--rule` left border, indented. Explicitly **not** a script or handwriting face — that is the fastest way to make a premium independent look like a market stall and put the £20.90 steak out of reach.

### 2.3 Spacing

8px base, exposed as custom properties.

```
--space-1: 4px    --space-2: 8px    --space-3: 12px   --space-4: 16px
--space-5: 24px   --space-6: 32px   --space-7: 48px   --space-8: 64px
--space-9: 96px   --space-10: 128px
```

- Section rhythm: `padding-block: clamp(48px, 8vw, 96px)`
- Container: `max-width: 1140px; margin-inline: auto; padding-inline: clamp(20px, 5vw, 48px)`
- Narrow prose container: `max-width: 68ch`
- Menu row vertical padding: `--space-4`
- Grid gap default: `--space-5`
- Minimum tap target: **44 × 44px**, enforced with `min-block-size`/`min-inline-size` on every button, chip, checkbox and icon control

### 2.4 Radius and elevation

```
--r-1: 4px     chips, inputs, small controls
--r-2: 8px     buttons, cards
--r-3: 14px    photographs, media, feature cards
--r-full: 999px  sauce dots, heat pips, status chip, saved counter
```

One shadow only, light theme: `--shadow-card: 0 1px 2px rgb(26 21 18 / .06), 0 8px 24px -12px rgb(26 21 18 / .18)`. **Dark theme uses no shadow** — a 1px `--rule` border instead. No shadows on buttons, no glows, no gradients except `--scrim` and the two glyph textures.

---

## 3. SITEMAP

Clean trailing-slash URLs. One canonical URL per thing. No locale prefix. Title pattern: `<Section> — Pookie Chicken`.

| URL | Purpose | Built when |
|---|---|---|
| `/` | Brand, the plate argument, real priced dishes, every category price, capture | always |
| `/menu/` | **The complete menu.** 9 chapters, ~30 items, every price, kcal on every item. The best page on the site and the source of truth. | always |
| `/menu/teriyaki-chicken/` | Dish page — photo, sauce story, heat, kcal, price, composition | always |
| `/menu/smoky-tomato-chicken/` | " | always |
| `/menu/sriracha-fire-chicken/` | " | always |
| `/menu/cheesy-triple-blast-chicken/` | " | always |
| `/menu/sweet-chilli-chicken/` | " | always |
| `/menu/creamy-curry-chicken/` | " | always |
| `/sauces/` | The Sauce Book — 14 sauces, 4 families, heat steps, provenance, cross-linked to every dish | `sauces.some(s => s.house === true)` |
| `/how-we-cook/` | Method in full: overnight marinade, pan-sear, salad included, calorie methodology | always |
| `/kitchen-notes/` | Dated build-log archive | `notes.length > 0` |
| `/allergens/` | Allergen + calorie reference. HTML table, never a PDF. | always |
| `/privacy/` | Full notice: controller, ESP, lawful basis, retention, device storage | always |
| `/404.html`, `/sitemap.xml`, `/robots.txt` | Generated. `robots.txt` = `Allow: /`. **No noindex, no 503 holding page.** | always |
| `/find-us/` | Address, map link, directions, hours | `site.address !== null` |
| `/order/` | Delivery platform links, own-collection route | `site.delivery.length > 0` |
| `/hire-us/` | Catering and private-hire enquiries | `site.enquiryEmail !== null` |

**Only six dish pages are generated** — the £12.90 plates. They are the concept, they are the only items with dedicated photography, and they are individually linkable from an Instagram bio or story sticker. The other ~24 items live as rows on `/menu/`, where their name, price, kcal and description already are. A generated page carrying only a name and a price is duplicate boilerplate that drags the site's quality signal down, and `audit.js` will reject it for a short meta description anyway.

**Deliberately absent:** store locator, postcode gate, About page (it is a section), Events page until there is an inbox, rewards, gift cards, app banner, franchise, press room, careers portal, cookie policy.

**Navigation:** Menu · Sauces · How we cook · Notes. Growing to include Find us and Order. Inline text links to 4 items; at 5+ the nav becomes a horizontally scrolling chip row beneath the wordmark on viewports under 720px. **No hamburger at any width** — it hides the menu link behind an extra tap on a site whose whole job is the menu.

---

## 4. HOMEPAGE

Ordered top to bottom. Editing rule applied throughout: **a section earns its place only if it raises appetite or proves the plate.**

### 4.1 Status ribbon
**Job:** state the phase honestly and convert to a follow. The only place on the entire site permitted to contain the word "soon"; `audit.js` enforces that.
**Content (pre-opening):** "We're not open yet — we're still trialling sauces. Follow along @thepookiechicken." The Instagram handle is a real outbound link.
**Layout:** full-bleed strip above the header, `--honey` ground, `--ink` text (8.44:1 light / 9.63:1 dark), `padding-block: --space-3`, centred, `--t-sm`, single line, wraps to two on 320px.
**At launch:** same component, same slot, `--herb` ground with `--paper` text (5.95:1 light / 9.27:1 dark), reading "Now open · Mon–Sun 12:00–22:00". The colour change is deliberate: it is the first element a returning visitor reads.

### 4.2 Header (sticky)
**Job:** wordmark, four links, theme toggle.
**Layout:** `position: sticky; top: 0`, `--paper` ground with a 1px `--rule` bottom border, `backdrop-filter` not used. Wordmark left (SVG from the vector logo, `height: 32px`). Nav inline centre-right. Theme toggle far right — a 44×44 `<button>` with `aria-pressed` and a visible label for screen readers. `scroll-margin-top` on every anchor target equals header height + rail height.

### 4.3 Hero
**Job:** say what this is, prove it is a whole meal, put a real price on screen, and offer exactly two actions.
**Layout:** two columns 7:5 at ≥900px on `--paper`. **No background image. No overlay. No video. No 100vh.** Total height ~72vh on mobile, ~78vh on desktop so the next section peeks.

*Left column:*
- Eyebrow — `--t-xs`, tracked caps, `--ink-3`: `Opening soon` → escalates by data (§6).
- **H1**, Fraunces 600, `--t-3xl`: **"Seared chicken, pasta and a fresh salad. Every plate, £12.90."** Verifiable from the printed menu today; contains the composition proof, the value anchor and three appetite nouns; uncopyable by a shop that charges £12.90 for chicken alone. The price is a data field derived from the Chicken Plates chapter base price, so a price change regenerates the line.
- The **Three Thirds glyph** at full column width, directly under the H1, labels reading Chicken / Pasta / Salad — echoing the H1's own words. This is the glyph's introduction; everywhere else it appears silently.
- Standfirst, `--font-sans`, `--t-md`, `--ink-2`, ≤58ch: "Chicken thighs marinated overnight, seared in a pan — never a fryer — and finished with a sauce we make here. Thirty dishes. Calories printed on every one."
- Two buttons only. Primary: `--brand` fill, white label (7.09:1), **"See the menu"** → `/menu/`. Secondary: outline in `--line-control`, `--brand` label, **"Follow @thepookiechicken"** → real outbound link, `rel="noopener"`. There is no third button and no empty slot for one to grow into.
- **Proof line** — a hairline row in tabular numerals, `--t-sm`, `--ink-3`, middot-separated: **"30 dishes · 14 sauces · kcal on every item"**. Every number is checkable today. This replaces the fabricated social proof the category reaches for.

*Right column:* one photograph — the strongest overhead full-plate shot where chicken, pasta and salad are all legible in one frame. 4:5, `--r-3`, a 1px `--rule` border and a 12px offset block of `--paper-sunken` behind it (plate-on-a-tablecloth; one shadowless CSS gesture). Beneath it a caption strip in `--paper-sunken`: **dish name (Fraunces) · £12.90 · 780 kcal**. This is the named, priced dish the commercial case demands, without making it the H1.

*Mobile (<900px) order:* eyebrow → H1 → glyph → standfirst → **both buttons** → proof line → photograph. The primary CTA is on screen at 320px without scrolling.

*Motion:* none. The hero paints finished. Restraint is a positioning decision as much as a performance one.

### 4.4 Three things, one pan
**Job:** prove the plate and the method in one section, in the owner's voice.
**Content:** three short first-person paragraphs under Fraunces H3s — "Marinated overnight" / "Seared in a pan, never a fryer" / "Pasta and salad, on every plate — not extra". Then one line of marginalia. Then the abundance sentence set at `--t-xl`: **"£12.90, and that's with pasta and a fresh salad."**
**Layout:** three-column grid at ≥760px (`repeat(auto-fit, minmax(240px, 1fr))`), stacking to one. `--paper-sunken` band. No icons. This deliberately replaces the category's icon-and-badge proof strip and the client's seven-badge wall.

### 4.5 The six plates
**Job:** show the concept, photographed, priced, with real dish names.
**Content:** all six £12.90 chicken plates as **photographed menu rows** — the exact row component used on `/menu/` (§5.3), emitted by the same function. Sauce dot, name, heat pips, one-line description, Three Thirds glyph, kcal, photo. Chapter price stated once above the grid: **"Every plate £12.90 — chicken, pasta, mixed salad."**
**Layout:** `repeat(auto-fit, minmax(300px, 1fr))` on `--surface` cards with `--shadow-card` (light) / `--rule` border (dark). Each card sets `--sauce` as a local custom property; the dot and the name underline recolour from it. One component, six sauces, and a seventh next year is one data line.

### 4.6 Every price on the menu
**Job:** remove the reason to bounce. This is the answer to "the menu is behind a tap."
**Content:** all nine chapters as a compact index — chapter name, item count, price. Nine rows, no photographs, `--t-base`, tabular numerals:
`Starters · 4 items · £4.90` / `Chicken Plates · 6 · £12.90` / `Wings · 5 · £8.90–9.90` / `Boneless Thigh · 3 · £10.90` / `Wraps & Burgers · 3 · £9.90–12.90` / `Duo Plates · 2 · £15.90` / `Sirloin Steak · 2 · £20.90` / `Kids · £8.90, drink included` / `Sides · £3.90`
Then one link: **"The whole menu — 30 dishes, calories on every one →"**.
**Layout:** two-column ruled list at ≥760px, one column below. Each row links to its chapter anchor on `/menu/`. A visitor arriving from Instagram sees every price on this site without leaving the homepage.

### 4.7 Lunch deal band
**Job:** merchandise the deal, not bury it.
**Content:** "Lunch deal · 12:00–17:00 · £12.90 and £15.90". Times stated explicitly. `[CONFIRM]` which items are included and whether it is dine-in only.
**Layout:** full-width `--paper-sunken` band, single line at ≥760px, `--t-xl` Fraunces for the times and prices.

### 4.8 Full-bleed interstitial
**Job:** one photograph doing nothing but being delicious. A palate cleanser between the menu and the reasoning.
**Layout:** edge-to-edge, `aspect-ratio: 16/7` desktop / `4/3` mobile, no text, no scrim, `alt=""` (decorative), `loading="lazy"`.

### 4.9 The Sauce Book *(conditional)*
**Job:** the craft claim, demonstrated in structure rather than asserted in copy.
**Content:** the four families as a two-column ruled index — family name, its colour dot with `--dot-ring`, the sauces in it, a dish count. A heat key above it (0–3, with a text legend). One link: "All fourteen sauces →" `/sauces/`.
**Renders only if** at least one sauce has `house === true`. If the client confirms only some are made in-house, the section names only those and the copy says so. If they cannot confirm, this section and `/sauces/` do not exist and the nav item does not render. **The claim is gated on data exactly like the address is.**

### 4.10 In the pan
**Job:** one short clip of the sear, as evidence.
**Layout:** single video, ≤8s, `muted playsinline loop preload="none"`, poster always set, `--r-3`. **A visible 44×44 pause/play control** (WCAG 2.2.2 — anything auto-playing over 5s needs one). Under `prefers-reduced-motion: reduce` the `<video>` is not rendered at all and the poster `<img>` is served in its place. Never the LCP element.

### 4.11 Kitchen notes *(conditional)*
**Job:** the reason to come back, in place of a countdown and in place of reviews that do not exist.
**Content:** the three most recent dated entries — a date, a one-line title, a short first-person paragraph, optionally one photo. "Sauce trial 4 — the hot honey is too sweet at the back. Again on Thursday." Link to `/kitchen-notes/`.
**Layout:** three ruled entries stacked, `--t-sm` date in `--ink-3`, `--t-base` body. **Renders nothing at all when `notes` is empty** — plan for that as the steady state from about week three.

### 4.12 Follow and Get the invite
**Job:** the only two conversions available today, given equal weight.
**Layout:** two-up grid at ≥760px, stacking below. Both cards `--surface`.

*Left — Follow:* "@thepookiechicken" set large in Fraunces, with a reason: "Build progress, the sauce trials, and the opening date the moment we have one." One outbound button. This is the lower-friction conversion for anyone who will not hand over an address.

*Right — Get the invite:* a specific, deliverable promise — **"An invite to the friends-and-family tasting, and the address the day we sign it."** Carries the saved-items count when non-zero ("3 saved — we'll tell you the day you can order them").
- One `<input type="email" inputmode="email" autocomplete="email" required>` with a visible `<label>`.
- One optional `<input type="tel" inputmode="tel">` for a mobile number, with its **own separate, unticked consent checkbox** — SMS/WhatsApp is what actually fills a UK takeaway on opening day, and it needs its own consent, not a bundled one.
- Two unticked, unbundled checkboxes, each 44×44, each with its own wording: "Email me about Pookie Chicken opening news" / "Text me the day we open".
- A layered notice directly beneath at `--t-sm` (never smaller): controller name, purpose, lawful basis = consent, the ESP named, retention period, the right to withdraw, and a link to `/privacy/`.
- Plain `<form action method="POST">` posting to a hosted ESP endpoint. No JS library.
- **Renders nothing at all when `site.esp === null`.** A form that silently discards input is worse than no form.

### 4.13 We're hiring for opening *(pre-opening only)*
One line, one Instagram DM link. `--paper-sunken`, `--t-base`. Removed when `phase === 'open'`.

### 4.14 Footer
Wordmark, the tagline **"More Than a Meal — A Perfectly Balanced Plate"** as a signature line (not a headline), Instagram, Menu, Allergens & calories, Privacy.
**No address block, no phone, no hours, no delivery logos, no company or VAT line.** Those helpers return `''` including their own labels and wrappers. The footer grows at launch because data arrived, not because a template changed.

### 4.15 Sticky mobile action bar
Below 760px, a bar pinned to the bottom of the viewport: **"See the menu"** while above the price index, swapping to **"Tell me when you open"** past it (one `IntersectionObserver`, class swap, no library). Shows the saved count when non-zero. Height 56px + `env(safe-area-inset-bottom)`. At launch this becomes the order bar; the pattern is already built.

---

## 5. MENU PAGE — `/menu/`

The hardest screen. ~30 items, 9 chapters, a price and a kcal figure on every one, and only ~12 usable photographs. A photo-card grid breaks immediately: half the cards have no image and read as broken. The answer is **a book, not a grid**.

### 5.1 Chapter order and pricing structure

Led by the concept, not by convention:

| # | Chapter | Items | Price | Photographed |
|---|---|---|---|---|
| 1 | Chicken Plates | 6 | **£12.90** flat | 6 (one each) |
| — | *Lunch deal band* | — | £12.90 / £15.90, 12:00–17:00 | — |
| 2 | Wings | 5 | £8.90 / £9.90 | 1 lead |
| 3 | Boneless Thigh | 3 | **£10.90** flat | — |
| 4 | Wraps & Burgers | 3 | £9.90 / £12.90 | 1 lead |
| 5 | Duo Plates | 2 | **£15.90** flat | — |
| 6 | Sirloin Steak | 2 | **£20.90** (150g) | 1 — full spread |
| 7 | Starters | 4 | **£4.90** flat | 1 lead |
| 8 | Sides | `[CONFIRM]` | **£3.90** flat | — |
| 9 | Kids | `[CONFIRM]` | **£8.90**, drink included | — |

**Price is a chapter-level fact.** Seven of nine chapters are single-price. The chapter header carries it as a sentence set in Fraunces at `--t-xl` — "Chicken Plates · £12.90 · every plate served with pasta and mixed salad" — and a row renders a price **only when `item.price !== chapter.basePrice`**. Across the whole menu that is **3 row-level prices instead of 30**. It reads as a designed menu rather than a spreadsheet column, and it makes the pasta-and-salad promise structurally impossible to miss instead of a sentence repeated six times.

Starters and Sides are demoted below the mains — a deliberate departure from the chain convention of opening with starters. You lead with the concept and the best-looking food.

### 5.2 Navigation and scannability on a phone

Four mechanisms, in the order the visitor meets them:

1. **The chapter index.** Directly under the H1, before any dish: a 3×3 grid of tap targets, one per chapter, each 44px+ tall, carrying chapter name, item count and price. On a 375px screen this is a complete map of the menu in one view, one tap from any chapter. It is the single most valuable thing on this screen and it is pure HTML anchors.
2. **The sticky chapter rail.** Nine text chips beneath the header, `overflow-x: auto` with `scroll-snap-type: x proximity`, keyboard-navigable, `aria-current="true"` on the active chip (marked with a filled `--brand` underline, not colour alone). `scroll-margin-top` on every `<section>` equals header + rail height so an anchor never hides a heading. Works as plain anchors with JS off; ~10 lines of `IntersectionObserver` set the current chip.
3. **Refine** — a collapsed `<details>`-pattern disclosure (`<button aria-expanded>`), **closed by default**, injected by JS over `data-kcal`, `data-heat`, `data-family` attributes already present in the static HTML. Opens to: **kcal bands** (Under 600 / 600–900 / 900+), **sauce family** (4 chips), **heat** (0–3). Filtering sets `hidden` on non-matching rows and updates an `aria-live="polite"` count ("14 of 30 dishes shown"); sorting reorders rows within their chapter in one DOM operation. Collapsed by default is the resolution of the judges' disagreement: zero appetite cost for the hungry visitor, full differentiation for the one who wants it. With JS disabled the controls never appear and the menu is complete and correctly ordered.
4. **The sticky bottom bar** carrying the saved count and "Tell me when you open".

### 5.3 The row component

The row is the unit, not the card. A row without a photograph is not a degraded card.

**Mobile (<600px), three lines:**

```
Line 1   Teriyaki Chicken                                  [£12.90 only if it varies]
Line 2   ● Teriyaki  ▮▯▯  [Chicken|Pasta|Salad]  780 kcal            [♡ 44×44]
Line 3   Marinated thigh in a soy-ginger glaze, with pasta and mixed salad.
```

- **Line 1** — `<h3>` dish name, Fraunces 600, `--t-lg`, `--ink`. Flex row; price right-aligned, tabular numerals. Where a dish page exists the name is the link; nothing else in the row navigates (no whole-row link — it causes accidental taps next to the heart).
- **Line 2** — meta row, `--t-sm`, `--ink-3` (5.99:1 light / 6.59:1 dark, comfortably AA as normal text). Sauce dot (10px, `--dot-ring`) + sauce name; heat pips (filled/unfilled marks in `--brand`, `aria-label="Heat 1 of 3"`, never emoji); the Three Thirds glyph **only on composed items**; kcal in tabular numerals. Heart button 44×44 at the right edge.
- **Line 3** — description, `--t-base`, `--ink-2`, ingredient-led concrete nouns, **≤90 characters** so it never exceeds two lines at 320px. No `line-clamp`, no truncation.
- Row: `padding-block: --space-4`, 1px `--rule` bottom border, no card, no shadow.

**Desktop (≥600px)** collapses to two lines: name + meta on one line as a three-column grid (`1fr min-content min-content`), description below. kcal and price form true vertical columns down the entire page.

**Photographed lead rows** promote to a `--surface` card with a 3:2 image at `--r-3`, `--shadow-card`, and a slightly longer description. One per chapter, six for Chicken Plates. `[CONFIRM]` **the client picks the leads**, not the designer — promoting one dish per chapter visibly ranks the menu, and the strongest photograph may not be the item they want to push.

### 5.4 The Three Thirds glyph placement

Rendered **only on genuinely composed items**: the six Chicken Plates, the two Duo Plates, the Kids meal. Not on wings, sides, starters, wraps or the steak. Its absence on a side of fries is as informative as its presence on a plate, and claiming otherwise is exactly the overclaim that would discredit the whole positioning. Minimum rendered width 24px with labels; below that it is not rendered.

### 5.5 The steak spread

Two dressings on one 150g sirloin at £20.90, given a **full-bleed two-column spread** rather than a dense chapter: one photograph, generous whitespace, a short paragraph, the portion weight stated, the two dressings as two lines. A restaurant that sells exactly one steak in two dressings is confident; a restaurant with a "Steaks" section is not. This is where premium is manufactured — by restraint and scale, not by gloss — and it anchors the price ladder so £12.90 reads as obvious value.

### 5.6 Calories and allergens

- kcal on every row, tabular numerals, one type step down, `--ink-3`. Range 240–1150.
- At the foot of the page, in the statutory shape: **"Adults need around 2,000 kcal a day."** Plus a portion reference (sirloin 150g) and a methodology link to `/how-we-cook/`.
- Pookie is well under the 250-employee threshold and is **exempt** from the Calorie Labelling (Out of Home Sector) (England) Regulations 2021. Adopting the regulated presentation voluntarily is the credibility play, and it means the delivery-platform version is correct by construction later. One honest sentence carries it: *"We're a small independent. The calorie rules don't apply to us. We print them anyway."*
- `allergens: null` today, so nothing renders per row. One standing note plus a link to `/allergens/`. **No invented matrix.** When the data exists it becomes a real `<table>` with `scope`'d headers, a `<caption>`, and its own `overflow-x: auto` container — generated from the same data file, never a PDF.

### 5.7 The empty-order-button slot

Where an open restaurant puts "Add to order", this menu puts a **heart** — a client-side saved list, `localStorage` only, no account, no backend, every read and write wrapped in `try/catch` so a private window degrades to nothing. `<button aria-pressed="true|false" aria-label="Save Teriyaki Chicken">`. The count surfaces in the sticky bar and pre-fills the notify form's promise, which makes it the highest-intent entry to the email capture — intent has already been expressed.

**There is no disabled button, no greyed platform logo, and no slot shaped like one.** Dead transactional chrome arrives by drift when a layout has a hole shaped like it; this layout has no such hole. If the heart is not built well, the correct fallback is whitespace.

**At launch** the heart is gated on `phase === 'preopening'` and is replaced by the order affordance. This is the one element whose flip is a component swap rather than a data edit — it is called out here so nobody discovers it on launch day.

### 5.8 Print

`@media print`: the full menu on two clean A4 sheets. Rules kept, photographs dropped, dark mode ignored, link URLs suppressed, sauce families printed as text labels not colour (colour may not survive). Disproportionately valuable for a business with no address — landlords, suppliers, journalists and job applicants all want a menu they can hold — and it costs one CSS block rather than a PDF that will drift out of sync within a month.

---

## 6. PRE-LAUNCH MODE

**Principle: "Opening soon" is a status on a complete site, not a genre of site.** Pookie already owns the single most-wanted asset — a full, priced, calorie-labelled menu — and lacks only operational facts. This ships as a real, indexable, complete restaurant site whose only difference from the launched version is that transactional affordances are replaced by one honest capture and unknown facts are **absent, not faked**. It is not a splash page and it is not a throwaway to be rebuilt under time pressure.

### 6.1 What the site shows while everything is unknown

- **Complete menu**, every price, kcal on every item.
- **Honest time phrase** on an escalation ladder (never a countdown to an unconfirmed date):
  `"Opening soon"` → `"Opening in {area}"` → `"Opening in {area}, {window}"` → `"Opening {weekday} {date}"` → **a real countdown**.
- **Status ribbon** in the owner's voice, `--honey` ground.
- **Kitchen notes** in place of reviews and in place of a clock.
- **Instagram** as a first-class destination sized as a peer of the email form.
- **Email + optional mobile capture** with a specific, deliverable promise.
- **Hiring line.**

### 6.2 What is absent — not disabled, not greyed, not placeholdered

No order button. No Deliveroo / Uber Eats / Just Eat logos in any state. No `href="#"`. No booking widget. No map, and no pin "for illustration". No "Call us". No opening hours. No company or VAT line. No address block, not even an empty one. **No string "TBC", "TBA" or "coming soon" anywhere outside the status component.** No countdown. No review stars, no "as seen in", no follower-count claims we have not checked. No cookie banner.

A site with no address block reads as *not announced yet*. A site with an address block containing "TBC" reads as *broken software*. Same information, opposite credibility.

### 6.3 The data model that makes it mechanical

In `src/data.js`:

```js
site.status = {
  phase: 'preopening',   // 'preopening' | 'open'   ← the single enum
  area: null,            // 'Croydon'
  openingWindow: null,   // 'winter 2026'
  openingDate: null      // '2026-11-13'  ← gates the countdown
};
site.address       = null;   // { street, city, postcode, lat, lng, mapsUrl }
site.phone         = null;
site.phoneHref     = null;
site.email         = null;
site.enquiryEmail  = null;   // gates /hire-us/
site.hours         = [];     // [['Mon – Sun','12:00 – 22:00']]
site.delivery      = [];     // [{ name:'Deliveroo', url:'https://…' }]
site.bookingUrl    = null;
site.company       = null;   // { name, number, vat, registeredAddress }
site.esp           = null;   // { name, action, emailField, phoneField }
site.notes         = [];
menu[i].proteinG   = null;   // gates HIGH IN PROTEIN
menu[i].allergens  = null;   // gates the allergen matrix
sauces[i].house    = null;   // true | false | null — gates the Sauce Book
```

**Every unknown is `null` or `[]`, never a string.** Render helpers return `''` **including their own labels and wrappers** — `addressBlock()` emits nothing, not an empty `<address>`; `deliveryRow()` emits nothing on an empty array. This makes the failure mechanically impossible rather than a matter of anyone's discipline.

The same null-guard mechanism governs three different kinds of unknown: an operational fact (address), a regulated claim (`proteinG` gating HIGH IN PROTEIN), and a brand story (`sauces[].house` gating the Sauce Book). That symmetry is the spine of the whole design.

### 6.4 The exact flip table

| Field becomes non-null / non-empty | What turns on |
|---|---|
| `status.area` | Hero eyebrow and ribbon read "Opening in {area}" |
| `status.openingWindow` | "Opening in {area}, {window}" |
| `status.openingDate` | Countdown component renders — Fraunces numerals, **days and hours only, never seconds**, placed beside the hero not as the hero |
| `address` | `/find-us/` is built; footer address block; nav gains "Find us"; JSON-LD `address` + `geo`; map link |
| `hours.length > 0` | Footer hours; ribbon shows the day's hours; JSON-LD `openingHoursSpecification` |
| `phone` | Footer `tel:` link; "Call" in the sticky mobile bar; JSON-LD `telephone` |
| `delivery.length > 0` | `/order/` is built; the three-across platform button row renders in the hero and the sticky bar; JSON-LD `hasDeliveryMethod` and `potentialAction` |
| `enquiryEmail` | `/hire-us/` is built |
| `company` | Footer legal block |
| `esp` | The notify form renders at all |
| `notes.length > 0` | Kitchen Notes homepage section and `/kitchen-notes/` |
| `menu[].proteinG` | HIGH IN PROTEIN badge — **only on items where protein supplies ≥20% of energy** |
| `menu[].allergens` | The 14-allergen HTML table on `/allergens/` |
| `sauces[].house === true` | `/sauces/`, the nav item, the homepage Sauce Book section |
| **`status.phase = 'open'`** | Ribbon flips `--honey` → `--herb` with new copy; hiring line removed; heart swapped for the order affordance; notify form demoted to the footer |

**Guard:** `phase` may only be `'open'` when `address !== null && hours.length > 0 && (phone !== null || delivery.length > 0)`. `audit.js` fails the build otherwise, so the flip cannot be half-done.

**Launch day is:** edit one enum, fill four data objects, paste three URLs, `npm run build`. No template surgery, no new hand-written pages under pressure, and no dead links — because the things that would have been dead were never rendered.

### 6.5 Indexing and structured data

`robots.txt` is `Allow: /`. Sitemap complete and generated from the manifest. **No `noindex`, no 503 holding page** — that advice targets generic placeholder pages, and the 60–90 day pre-opening indexing runway is the main strategic reason to publish early.

JSON-LD is emitted **by accretion**, using conditional spreads so an absent property is genuinely absent rather than `null`-valued:

- Today: `Restaurant` with `name`, `description`, `servesCuisine`, `image`, `url`, `priceRange`, `sameAs` (Instagram), and the complete `hasMenu → Menu → hasMenuSection → MenuSection → hasMenuItem → MenuItem` graph with `offers: { Offer, price, priceCurrency: "GBP" }` and `nutrition: { NutritionInformation, calories }`. All of it is true right now.
- Added as data lands: `address`, `geo`, `telephone`, `openingHoursSpecification`, `hasDeliveryMethod`, `acceptsReservations`.
- **Never emit a property that cannot be substantiated.** Google will happily surface a wrong address for a business that cannot yet correct it.

### 6.6 Consent

The PECR soft opt-in is **structurally unavailable**: it requires details obtained in the course of a sale or negotiations for a sale, and a business that has never traded has never sold anything — a newsletter signup does not qualify. So every address and every number rests on express, specific, unbundled consent, recorded with timestamp, wording and IP, with double opt-in. Get it right once or the list is unusable at the exact moment it exists to be used. No pre-ticked boxes, no consent bundled into the submit click, no bought-in lists.

---

## 7. CONTENT GAPS

Ordered by what they block. Nothing on this list can be invented.

| # | What we need | Blocks |
|---|---|---|
| 1 | **The 15 photographs and 3 MP4s, delivered as files.** They are not in any repository. | The hero, all six plate rows, four chapter leads, the steak spread, the interstitial, the OG image — i.e. the entire visual argument. |
| 2 | **A photo audit against a written criterion:** does the library contain at least one — ideally four — overhead full-plate shots where chicken, pasta and salad are all legible in one frame? | Whether the hero exists at all. A half-day window-lit reshoot on white ceramic is the highest-leverage spend on this project. Run this **before a line of CSS**. |
| 3 | **kcal per item, all ~30.** The brief states a 240–1150 range; we do not have the per-item figures. | Every menu row, the kcal ladder, the JSON-LD `NutritionInformation`, `/allergens/`. The menu cannot ship without this. |
| 4 | **The vector logo PDF.** | The wordmark lockup, the favicon, and the display-typeface lock — if the wordmark is a heavy geometric or condensed sans, Fraunces will fight the one fixed brand asset. Cheapest check, highest cost if skipped. |
| 5 | **Are the sauces made in-house?** A true/false per sauce, all 14. | `/sauces/`, the homepage Sauce Book section, the nav item, and the "14 house sauces" half of the hero proof line. If several are bought-in bases finished on site, the honest version names only the ones that are. |
| 6 | **Heat level 0–3 per sauce.** | The heat ladder, the heat filter, and the mild-to-hot ordering within chapters. Working assumption below — must be confirmed by the kitchen. |
| 7 | **Sides item names, and the Kids meal item(s) + which drinks.** | Two of nine chapters are currently empty. |
| 8 | **Which wings are £8.90 and which £9.90**; which wraps/burgers are £9.90 vs £12.90 (Steak Royale assumed £12.90). | The three row-level price renders — the only prices in the whole menu that vary. |
| 9 | **~30 one-line dish descriptions** (≤90 chars, concrete nouns) **plus 6 real paragraphs for the plate dish pages**, each with a unique title ≤65 chars and a meta description of 70–320 chars. | Every menu row, all six dish pages. `audit.js` hard-fails on a short meta description — these are not free output of a data file. |
| 10 | **An ESP account and its form action URL.** | The only owned-channel conversion on the site. Without it the notify section does not render and Instagram — rented reach — is the sole channel into opening day. **Buy this before any CSS is written.** |
| 11 | **The domain name.** | Canonical URLs, sitemap, JSON-LD `url`, OG tags, the ESP double-opt-in email. |
| 12 | **Protein grams per item.** | The HIGH IN PROTEIN and BALANCED CARBS & PROTEIN badges, which are held back until then. gov.uk's free MenuCal covers this alongside allergens. |
| 13 | **The 14-allergen matrix.** | The `/allergens/` table. Until it exists the page carries an honest standing statement only. |
| 14 | **Lunch deal terms:** which items, dine-in only or also collection, and whether it changes at weekends. | The lunch deal band copy on both the homepage and `/menu/`. |
| 15 | **What the sirloin is served with**, and confirmation of the 150g portion. | The steak spread. |
| 16 | **Address, opening hours, phone, email, delivery links, company/VAT details, opening date or window, and the area.** | Launch mode, `/find-us/`, `/order/`, the footer legal block, local SEO, the Google Business Profile claim. |
| 17 | **A decision from the client:** do they accept that HIGH IN PROTEIN is withheld until protein grams exist, that the seven-badge wall is cut to two badges per item in one colour, and that the tagline becomes a footer signature rather than the H1? | The whole tone of the site. This must be a conversation, not a discovery at review. |
| 18 | **Whether anyone will write Kitchen Notes** — 2–4 short entries a month. | If the answer is no, ship with `notes: []` and the section never renders. That is a supported state. |

**Working assumptions, all `[CONFIRM]`:**
- Sauce families: Glazed & Sweet (Teriyaki, Sweet Chilli, Hot Honey, Korean BBQ, BBQ) · Smoke & Char (Smoky Tomato, Mediterranean, Roasted Pepper) · Chilli Heat (Sriracha Fire, Peri Peri Flame, Buffalo Fire, Mango Habanero) · Cream & Cheese (Creamy Curry, Cheesy Triple Blast).
- Heat: **0** Teriyaki, Korean BBQ, BBQ, Cheesy Triple Blast, Mediterranean, Roasted Pepper · **1** Sweet Chilli, Smoky Tomato, Creamy Curry, Hot Honey · **2** Peri Peri Flame, Buffalo Fire · **3** Sriracha Fire, Mango Habanero.
- Golden Mango Habanero and Crispy Peri Peri map to the Mango Habanero and Peri Peri Flame sauce records.
- Item count is treated as 30 for the proof line; correct it to the real figure once Sides and Kids are known.

**One honest commercial note for sign-off:** printing 1,150 kcal beside the £20.90 sirloin and the £15.90 duos is a documented suppressor of order intent on the highest-margin items. Pookie is legally exempt. We are printing them anyway because they are the receipt for the entire positioning — but this is a price being paid deliberately, not a free trust win, and the client should sign it off knowing that.

---

## 8. ACCESSIBILITY AND PERFORMANCE

### 8.1 Contrast — AA in both themes

Every token pair in §2.1 was computed. The two places this category reliably fails are handled by measurement, not by eye:

- **kcal figures and meta text** — `--ink-3` at 5.99:1 (light) and 6.59:1 (dark) on the page ground, 5.41:1 on the tinted band, 6.02:1 on cards. All clear AA as **normal** text, so there is no minimum-size caveat.
- **The consent notice** — same token, `--t-sm` (14px) hard floor, never smaller.
- **Text over photography** — only over `--scrim`, which floors white at 7.83:1 over the worst possible pixel.
- **Non-text UI (1.4.11)** — `--line-control` at 4.78:1 / 4.15:1 carries every control border and every glyph segment edge; `--dot-ring` at 5.99:1 / 6.59:1 carries every sauce-dot boundary; the focus ring is 4.98:1 / 6.80:1. All exceed 3:1.
- **1.4.1 Use of Colour** — no meaning is ever carried by hue alone. Sauce family = dot + written name. Heat = counted pips + `aria-label`. Composition = texture + gap + edge + text label. Active chapter chip = `aria-current` + underline. Filter state = `aria-pressed` + a filled dot.
- Body text 16px floor; `--rule` hairlines are decorative and always accompanied by text, therefore exempt.

### 8.2 Keyboard and focus

- Skip link to `#main`, visible on focus, first in DOM.
- `:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; border-radius: inherit; }` on every interactive element. `outline: none` is never used without a replacement.
- Focus order equals DOM order. No positive `tabindex`. No focus traps other than a deliberate one — and there are no modals, so there are none.
- The chapter rail is a `<nav>` of anchors — natively focusable, arrow-key scrollable, and `scroll-margin-top` prevents an anchored heading from hiding under the sticky chrome.
- Refine chips are `<button aria-pressed>`; the disclosure is `<button aria-expanded aria-controls>`; the sort is a `<select>` with a visible `<label>`.
- Heart is `<button aria-pressed aria-label="Save Teriyaki Chicken">`.
- `aria-live="polite"` regions announce the filter count and the saved count.
- Theme toggle is a `<button>` with a visible accessible name; the pre-paint inline script reads `localStorage` in `try/catch` and falls back to `prefers-color-scheme`.
- Every target ≥44×44px. Every `target="_blank"` carries `rel="noopener"` (audited).
- Minimum one `<h1>` per page, exactly; no heading-level jumps (audited). Chapter headings are `<h2>`, dish names `<h3>`.

### 8.3 Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
  html { scroll-behavior: auto; }
}
```
Under reduced motion the `<video>` elements are **not rendered at all** — the poster `<img>` is emitted server-side in their place. No parallax, no scroll-jacking, no carousels, no counting numbers, no intro animation, no custom cursor. Card hover/focus is a 150ms `transform: translateY(-2px)` and a shadow step, nothing more. Every auto-playing clip carries a visible 44×44 pause control (WCAG 2.2.2).

### 8.4 Image and video loading — 15 photographs, 3 videos

**Allocation (12 committed, 3 in reserve):** 1 hero · 6 chicken plates (reused across the homepage rows, `/menu/` and the six dish pages — one file each, not three) · 1 sirloin · 1 wings lead · 1 wraps lead · 1 starters lead · 1 full-bleed interstitial. **Reserve of 3** covers a weak frame, the 1200×630 OG image, and `/sauces/` or `/how-we-cook/`. Zero slack was the fatal flaw in one of the losing directions; this fixes it.

**Format and delivery.** Every photograph ships as AVIF + WebP + JPEG at **480 / 800 / 1200 / 1600w**, served via `<picture>` with `srcset` and a per-context `sizes`. Explicit `width` and `height` on every `<img>` plus `aspect-ratio` in CSS, so CLS is zero. The hero is `fetchpriority="high"`, `decoding="async"`, eager, and `<link rel="preload" as="image">`ed with its `imagesrcset`. Everything else is `loading="lazy" decoding="async"`.

**Alt text describes the dish, not the brand:** "Teriyaki chicken thighs with pasta and mixed salad, shot from above." The interstitial takes `alt=""`.

**Video:** all three MP4s below the fold, `preload="none"`, `muted playsinline loop`, poster always set, never the LCP element, hard-capped at **8 seconds and 1.5MB** each. Never the only way to see the food.

**No stock imagery. No AI-generated interiors.** There is no fit-out to photograph; inventing one fabricates a record of a place that does not exist. If an interior section feels missing, the honest substitute is build-progress content on Instagram.

### 8.5 Page-weight budget — enforced, not aspirational

| Asset | Budget |
|---|---|
| `main.css` (one file, one request) | **≤14KB gzipped** |
| `main.js` (deferred, zero dependencies) | **≤6KB gzipped** |
| `fraunces-600.woff2` | **≤34KB** |
| Hero image (AVIF @800w) | **≤90KB** |
| Any other photograph (AVIF @800w) | **≤70KB** |
| Homepage HTML | **≤45KB gzipped** |
| `/menu/` HTML | **≤60KB gzipped** |
| **Homepage, first viewport, mobile 390px** | **≤550KB transferred** |
| **Homepage, fully loaded** | **≤900KB** |
| **`/menu/`, fully loaded** (11 photographs) | **≤1.1MB** |
| Third-party requests | **zero** |

**Targets on a mid-range Android (Moto G-class) over throttled 4G: LCP ≤ 1.8s, CLS ≤ 0.02, INP ≤ 150ms.**

Zero third-party requests means no analytics, no `fonts.googleapis.com`, no CMP — and therefore **no cookie banner**, which is a real UX win the chains cannot have. `localStorage` is used for exactly two things (theme preference, saved dishes), both set only in direct response to a user action, both disclosed in `/privacy/` under "Storage on your device". No consent theatre for storage we set only when asked.

`build.js` **fails** if any referenced image variant is missing or any asset exceeds its budget. The budget is a build gate, not a promise.

---

## 9. BUILD NOTES

A **new repository**, modelled directly on `/home/user/regnum-website` — same generator pattern, same audit discipline, same zero-dependency constraint (`package.json` has no `dependencies` block; `node build.js`, `node build.js --serve`, `node audit.js`).

### 9.1 File map

```
build.js                 page manifest, build loop, sitemap, robots, asset assertions
audit.js                 structural / a11y / SEO / launch gate
src/
  data.js                site, status, copy blocks, kitchen notes  ← SINGLE SOURCE OF TRUTH
  menu.js                ~30 items
  sauces.js              14 sauces, 4 families
  layout.js              document shell, header, footer, status ribbon, JSON-LD assembly
  partials.js            menuRow(), chapterHeader(), thirdsGlyph(), heatLadder(),
                         sauceDot(), addressBlock(), deliveryRow(), contactLine(),
                         notifyForm(), countdown(), picture()
  pages.js               one function per page, composing partials
assets/
  css/main.css           one stylesheet, all tokens on :root
  js/main.js             theme toggle, chapter rail, refine controls, heart, sticky bar
  fonts/fraunces-600.woff2
  img/…                  pre-exported variants, committed
  video/…
```

### 9.2 What lives in the data files

**`src/data.js`** — `site` (name, tagline, url, instagram, status object, address, phone, email, hours, delivery, company, esp, enquiryEmail), the seven badge strings defined **once** so no surface can drift, and `notes[]`.

**`src/menu.js`** — one array, one shape:
```js
{ id, slug, chapter, name, description, price, currency:'GBP', kcal,
  sauce, heat, composed, badges:[], image, proteinG:null,
  allergens:null, orderUrl:null }
```

**`src/sauces.js`**:
```js
{ id, name, family, heat, provenance, house:null, dishes:[…ids] }
```

**Chapters** are declared with `{ id, name, basePrice, blurb, leadItemId }` so the price-once rule and the lead-photo promotion are both data decisions.

### 9.3 What the build script generates

From `menu.js` + `sauces.js` + `data.js`, with **no second source of truth for any price**:

1. `/menu/` — all 9 chapters, all rows, the chapter index, the rail, the filter attributes, the lunch band, the steak spread, the statutory kcal footer.
2. The homepage's six plate rows and its nine-row price index — **emitted by the same `menuRow()` and `chapterHeader()` functions**, so price and kcal cannot drift between surfaces.
3. Six dish pages, generated **only where `item.description` and `item.longCopy` both exist** and the title/description pass the audit's length rules.
4. `/sauces/`, gated on `sauces.some(s => s.house === true)`.
5. `/allergens/` — the kcal table today, the 14-allergen matrix the moment `allergens` is non-null.
6. All JSON-LD, by conditional spread.
7. `sitemap.xml` and `robots.txt` from the same `PAGES` manifest — so a page that is not built cannot appear in the sitemap, and link integrity is free.
8. `_redirects` (once the domain and any prior URLs exist).

**Conditional pages** are entries in the manifest guarded by their data and filtered out:
```js
const PAGES = [ …always,
  site.address        ? { path:'/find-us/', … } : null,
  site.delivery.length? { path:'/order/',   … } : null,
  site.enquiryEmail   ? { path:'/hire-us/', … } : null,
  site.notes.length   ? { path:'/kitchen-notes/', … } : null,
  hasHouseSauces      ? { path:'/sauces/', … } : null,
].filter(Boolean);
```
**A page that is not built cannot be linked to**, because the audit's internal-link check resolves every `href` against `dist/`.

### 9.4 What is hand-written

`layout.js`, `partials.js`, `pages.js`, `main.css`, `main.js`, all prose copy, the print stylesheet, and the pre-exported image variants. Roughly 60 copy artefacts in total (30 descriptions, 6 dish pages × 2, plus page titles and meta descriptions) — budget for them explicitly; they are not free output of a data file.

### 9.5 Changes to inherit-and-fix from the Regnum scaffolding

1. **Delete the Google Fonts block** in `src/layout.js` (the `preconnect` pair and the `<link rel="stylesheet" href="https://fonts.googleapis.com/…">` around lines 383–385). Replace with the self-hosted `@font-face` and a single font `preload`.
2. **Replace `--font-display` / `--font-sans`** in `assets/css/main.css` and the whole `:root` token block with §2.
3. **Add dark-theme redefinitions in both** `@media (prefers-color-scheme: dark)` (guarded `:root:not([data-theme="light"])`) and `:root[data-theme="dark"]`, with the complete light palette on bare `:root` so no colour has its only definition inside a media query.
4. Keep the existing **pre-paint theme script** pattern (rename the storage key to `pookie-theme`), the `skip` link, the `<main id="main">` landmark, and the `page()` shell contract — the audit depends on all of them.
5. Update `theme-color` metas to `#FBF6EC` (light) and `#16120E` (dark).

### 9.6 audit.js extensions — the launch gate

Keep everything the existing audit does (lang, title ≤65, description 70–320, canonical, landmarks, skip link, exactly one `<h1>`, no heading jumps, duplicate ids, `aria-controls`/`aria-describedby`/`label for` resolution, img alt, accessible names on links and buttons, `noopener`, internal-link resolution, stray `undefined`/`NaN`, unescaped `&`, JSON-LD parses). Add:

```
FAIL if status.phase === 'open' && (!address || !hours.length || (!phone && !delivery.length))
FAIL if any rendered page contains /\bTBC\b|\bTBA\b|lorem/i
FAIL if /\bsoon\b/i appears outside the element with class "status-ribbon"
FAIL if any href is "#" or empty
FAIL if any referenced /assets/img variant is missing, or exceeds its byte budget
FAIL if main.css > 14KB gz, main.js > 6KB gz, or any HTML page > its budget
FAIL if any <img> lacks width and height
FAIL if a JSON-LD Restaurant node contains address, telephone or openingHoursSpecification
       while the corresponding data field is null
FAIL if a MenuItem is emitted without offers.price or nutrition.calories
FAIL if a HIGH IN PROTEIN badge is rendered on an item whose proteinG is null
WARN if notes.length > 0 and the newest note is older than 45 days
```

Launch becomes a gate the build enforces, not a checklist someone remembers under pressure.

### 9.7 Image pipeline — the highest-probability schedule failure, named

There is no `sharp` and there will be none. Variants are pre-exported **offline** with `avifenc` / `cwebp` / ImageMagick and **committed**, under a fixed naming convention:

```
assets/img/dish/teriyaki-chicken-800.avif   (…-480, -800, -1200, -1600 × .avif/.webp/.jpg)
```

`picture()` in `partials.js` derives every `srcset` entry from the item's `image` stem, and `build.js` asserts each derived file exists and is within budget before writing the page. That turns ~120 hand-made files from a discipline problem into a build failure. Budget this export as a real task with a real owner — it is the single most likely thing to be skipped under time pressure, and skipping it loses the mobile-speed constraint everything else was designed around.

### 9.8 Order slot — one component, three states

`orderSlot()` reads `site.delivery` and `site.status.phase`:
- **`preopening`** → renders the notify capture (or nothing, if `esp === null`).
- **`open` with empty `delivery`** → renders the collection/enquiry route from `phone` / `address`.
- **`open` with `delivery.length > 0`** → renders a three-across button row, platform names as **text** until brand-asset permission exists, `rel="noopener"`.

The markup for state three exists in code and never in the DOM until the array is populated. There is no redesign at launch.

---

### Sign-off

Two things gate the start of build and neither is a design decision:
1. **Open the logo PDF** and confirm the wordmark does not fight a warm editorial serif.
2. **Open the 15 photographs** and count how many are overhead full-plate shots where chicken, pasta and salad are all legible in one frame.

If (2) returns zero, the hero as specified cannot be built and the correct response is a half-day window-lit reshoot on white ceramic — not a substitution. Everything else in this document is buildable from the data we have plus the copy on the gaps list.
---

# EK A — LOGO RENKLERİYLE UZLAŞTIRMA (spesifikasyon yazıldıktan sonra eklendi)

Spesifikasyon yazılırken gerçek logo dosyası henüz açılmamıştı. Açıldı; renkler
`pookie LOGO.pdf` içindeki renk operatörlerinden birebir çıkarıldı. Ölçüm sonucu:

| Logo rengi | Hex | `--paper` (#FBF6EC) üstünde | Gövde metni (4.5:1) | Büyük metin (3:1) |
|---|---|---|---|---|
| Kırmızı (ibik, "Pookie") | `#E12F1C` | 4.22:1 | KALIR | GEÇER |
| Koyu turuncu ("Chicken", damla) | `#FC6604` | 2.77:1 | KALIR | KALIR |
| Turuncu (gövde gradyanı) | `#FD8105` | 2.34:1 | KALIR | KALIR |
| Amber (tavuk gövdesi) | `#FDAA04` | 1.78:1 | KALIR | KALIR |

Dolgu olarak kullanıldığında koyu mürekkep (`#16120E`) üstlerinde çalışıyor:
amber 9.70:1, turuncu 7.38:1, koyu turuncu 6.25:1. Kırmızı dolgu üstünde
beyaz 4.54:1 — sadece büyük metin.

## Karar: üç katmanlı renk sistemi

1. **Saf marka katmanı — logo renkleri, değiştirilmeden.**
   Sadece logonun kendisinde ve büyük dekoratif dolgularda. WCAG logoları
   kontrast kuralından muaf tutar (1.4.3), dolayısıyla logo dokunulmaz kalır.
   `--logo-red: #E12F1C` · `--logo-orange: #FD8105` · `--logo-amber: #FDAA04`

2. **Büyük gösterim katmanı — `#E12F1C` 24px+ başlıklarda kullanılabilir** (4.22:1 > 3:1).
   Marka kırmızısı ekranda gerçekten görünsün diye; sadece H1/H2 ölçeğinde.

3. **Metin katmanı — spesifikasyondaki koyultulmuş değerler.**
   `--brand: #A32E17` (6.59:1) gövde metni, bağlantılar, küçük UI için ZORUNLU.
   Logo kırmızısı bu boyutta AA'yı geçmiyor; koyultma tercih değil gereklilik.

Amber (`--honey`) zaten spesifikasyonda doğru kullanılmış: sadece dolgu,
üstünde koyu mürekkep. Logo amberi `#FDAA04` ile spesifikasyonun `#E4A62C`
değeri arasındaki farkı kapatmak için **logo amberi kullanılmalı** — dolgu
olarak zaten güvenli (ink 9.70:1) ve markaya sadık.

## Tipografi teyidi
Spesifikasyon bağımsız olarak **Fraunces** seçmiş. Logonun gerçek yazı tipi
Verona Bold; Fraunces'in SOFT/WONK eksenleri bu sıcak, top terminalli serif
karakterini yakalayan en iyi açık lisanslı eşleşme. Seçim doğrulandı.

---

# EK B — ARAŞTIRMA KISITI (dürüstlük notu)

Kullanıcının verdiği iki referans sitenin **hiçbiri açılamadı**. Ortamın ağ
politikası her ikisini de CONNECT aşamasında 403 ile reddetti:
- `tavukdunyasi.com`, `www.`, `onlinesiparis.`, `kurumsal.` — hepsi 403
- `peckpeck.co.uk` — 403

Proxy README'si 403'lerde yeniden denemeyi ve etrafından dolaşmayı açıkça
yasaklıyor, o yüzden denenmedi. Sonuç: iki referansın da rengi, tipografisi,
yerleşimi, menü sunumu ve mobil davranışı GÖRÜLMEDİ. Teardown'lardaki bilgiler
arama motoru meta verisi ve kamuya açık kaynaklardan; tasarım gözlemi değil.

Bu spesifikasyon dolayısıyla referans sitelerin taklidi değil, kategori bilgisi
ve markanın kendi içeriği üzerine kurulu. Referansların görsel dilini almak
istenirse ekran görüntüsü paylaşılmalı.

## Yine de çıkan en değerli bulgu
Tavuk Dünyası'nın konsepti — 12-14 saat marine tavuk, tek tavada pişirme,
49cm tabakta makarna + salata ile servis, dönüşümlü sos yelpazesi — Pookie
Chicken'ın tarif ettiği modelin neredeyse birebir aynısı. 330+ şube, 59 il,
14 yıllık kanıtlanmış format (yurtdışında "Gagawa" adıyla).

İki sonucu var:
1. Format riskli değil; kanıtlanmış.
2. Pookie'nin savunulabilir farkı "makarna+salatalı tavuk" DEĞİL — onu Tavuk
   Dünyası çoktan sahiplenmiş. Fark **beslenme çerçevesi**: yüksek protein,
   dengeli makro, basılı kalori. Tavuk Dünyası bunun üzerine oynamıyor;
   onların hikâyesi bolluk ve çeşitlilik.
