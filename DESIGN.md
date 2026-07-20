---
name: Pantika & Natthakorn Wedding E-Card
description: A hand-made digital invitation — one warm scroll from hello to RSVP.
colors:
  monogram-gold: "#8A7030"
  gold-light: "#C4A840"
  card-teal: "#1B4A5C"
  teal-light: "#2A6A80"
  teal-deep: "#0F3040"
  peach-cream: "#F8F1E6"
  warm-ivory: "#F2E8D2"
  cream-deep: "#DBC59A"
  warm-white: "#FFF8F0"
  ink-brown: "#2A1A0A"
  mid-brown: "#5A3E25"
  light-brown: "#7A5A38"
  sage: "#6B8A5A"
  blush: "#E8C09A"
  paper-shadow: "#D4B896"
  film-brown: "#3A1A00"
typography:
  display:
    fontFamily: "'TT Interphases', sans-serif"
    fontSize: "clamp(1.7rem, 7vw, 3rem)"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "0.01em"
  headline:
    fontFamily: "'TT Interphases', sans-serif"
    fontSize: "clamp(2rem, 5vw, 3rem)"
    fontWeight: 500
    lineHeight: 1.2
  title:
    fontFamily: "'TT Interphases', sans-serif"
    fontSize: "1.05rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "'TT Interphases', sans-serif"
    fontSize: "0.9rem"
    fontWeight: 300
    lineHeight: 1.8
  label:
    fontFamily: "'TT Interphases', sans-serif"
    fontSize: "1.1rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "0.28em"
rounded:
  card: "12px"
  panel: "16px"
  sheet: "20px"
  pill: "100px"
spacing:
  gap-sm: "10px"
  gap-md: "16px"
  gap-lg: "24px"
  section-x: "24px"
  section-y: "96px"
components:
  button-primary:
    backgroundColor: "{colors.card-teal}"
    textColor: "{colors.warm-white}"
    rounded: "{rounded.pill}"
    padding: "16px 40px"
  button-gold:
    backgroundColor: "{colors.monogram-gold}"
    textColor: "{colors.warm-white}"
    rounded: "{rounded.pill}"
    padding: "14px 32px"
  input:
    backgroundColor: "#FFFFFFB3"
    textColor: "{colors.ink-brown}"
    rounded: "{rounded.card}"
    padding: "14px 18px"
  card-program:
    backgroundColor: "#FFF8F099"
    textColor: "{colors.ink-brown}"
    rounded: "{rounded.panel}"
    padding: "36px 24px"
  badge-pill:
    backgroundColor: "{colors.monogram-gold}"
    textColor: "{colors.warm-white}"
    rounded: "{rounded.pill}"
    padding: "7px 16px"
---

# Design System: Pantika & Natthakorn Wedding E-Card

## 1. Overview

**Creative North Star: "The Garden House Welcome"**

Every screen is arriving at SailomSangdad Homey Studio at golden hour: warm light, foliage at
the edges, and hosts who made everything themselves. The system is warm, handcrafted, and
personal — paper grain on the background, hand-drawn wavy dividers instead of ruled lines,
film rolls you physically pull open, an envelope you tap to unseal. Color and ornament support
the story; they never substitute for it.

The system explicitly rejects corporate event-page energy (agendas, registration UX), generic
wedding-template clichés (stock florals, script fonts, pastel washes), and minimal-to-a-fault
restraint that reads cold. Richness is welcome when it stays personal: delight is discovered,
not announced.

**Key Characteristics:**
- One continuous warm gradient page (#F8F1E6 → #DBC59A) — sections are transparent windows, never blocks.
- Two-voice palette: olive Monogram Gold for warmth and ornament, Card Teal for words that matter.
- A single typeface (TT Interphases, 300–600 + true italics) carrying both Thai and English equally.
- Physical metaphors everywhere: film canisters, pull tabs, envelopes, paper shadows.
- Motion eases out on [0.22, 1, 0.36, 1]; every animation has a reduced-motion fallback.

## 2. Colors

The palette is lifted directly from the couple's printed invitation card — the screen matches the paper.

### Primary
- **Monogram Gold** (#8A7030): the PN monogram's olive gold. Ornament, countdown numbers, dividers, badges, the music button, the hashtag. It is the color of warmth and craft — decorative confidence, never body text on cream (fails contrast).
- **Gold Light** (#C4A840): sparkle tier of the gold — particle accents, small highlights only.

### Secondary
- **Card Teal** (#1B4A5C): the printed card's name-text teal. Names, dates, headings, and the primary RSVP button. When words must be believed, they are teal. **Teal Light** (#2A6A80) for gradients/hover; **Teal Deep** (#0F3040) for rare dark surfaces.

### Tertiary
- **Sage** (#6B8A5A) and **Blush** (#E8C09A): foliage and golden-hour skin tones — decorative SVG leaves, corner flourishes, hero glow. Never functional UI.
- **Film Brown** (#3A1A00): the gallery's unexposed-film dark. Owned by the film-roll mechanic; do not reuse elsewhere.

### Neutral
- **Ink Brown** (#2A1A0A): body text. Warm near-black, ≥4.5:1 on every cream in the ramp.
- **Mid Brown** (#5A3E25): secondary prose; **Light Brown** (#7A5A38): labels and captions (large/spaced text only).
- **Peach Cream** (#F8F1E6) → **Warm Ivory** (#F2E8D2) → **Cream Deep** (#DBC59A): the page gradient ramp, top to bottom. **Warm White** (#FFF8F0): text on teal/gold, translucent card fills. **Paper Shadow** (#D4B896): paper-edge tone.

### Named Rules
**The Printed-Card Rule.** Any new color must exist on the physical invitation card or be a tint/shade of one that does. No new hues.
**The Two-Voices Rule.** Gold decorates, teal speaks. If text carries information a guest must act on, it is teal or ink brown — never gold below headline size.

## 3. Typography

**Display Font:** TT Interphases (with sans-serif fallback)
**Body Font:** TT Interphases — one family, five weights (300/400/500/600 + 300–500 italics)
**Label/Mono Font:** none — the single family is the system.

**Character:** One warm grotesk carrying both scripts: Thai and English set in the same family at the same hierarchy, so neither language feels translated. Weight and letter-spacing do all the differentiating; there is no second typeface to lean on.

### Hierarchy
- **Display** (600, clamp(1.7rem, 7vw, 3rem), 1.15): the couple's names, the hashtag. Teal or gold.
- **Headline** (500, clamp(2rem, 5vw, 3rem), 1.2): section titles ("Will You Join Us?").
- **Title** (600, 1.05rem, 1.3): card titles inside program/venue blocks.
- **Body** (300, 0.85–0.9rem, 1.7–1.9): prose. Ink or mid brown; max measure ~65ch.
- **Label** (400, letter-spacing 0.2–0.28em, UPPERCASE): section kickers (1.1rem — the name/divider heading above each section: Gallery, Venue, Program of Events, Dress Code, RSVP, gift heading), countdown labels and footer meta (0.58–0.72rem, smaller and more incidental). Light brown. Always compensate trailing tracking with a negative margin on centered text.

### Named Rules
**The One-Family Rule.** TT Interphases everywhere, both languages, no exceptions. Cormorant Garamond, Jost, and Great Vibes are banned by name.
**The Elder-Size Floor.** Form inputs never below 1rem (16px — iOS zoom threshold); body prose never below 0.85rem.

## 4. Elevation

Depth is candlelight, not chrome. Shadows are large, diffuse, and always warm-tinted — brown-based rgba like `rgba(61,34,21,0.28)` or gold-based `rgba(138,112,48,0.4)` — never neutral gray or black. They create ambience around lifted paper objects (cards, the film strip, the envelope, the music card); they never signal hierarchy or interactivity on their own.

### Shadow Vocabulary
- **Card ambient** (`box-shadow: 0 10px 30px rgba(61,34,21,0.1)`): program/venue cards at rest.
- **Deep ambient** (`box-shadow: 0 16px 50px rgba(61,34,21,0.22)`): floating surfaces — music card, venue photo.
- **Gold glow** (`box-shadow: 0 8px 24px rgba(138,112,48,0.4)`): gold CTAs and the music button — warmth radiating, not elevation.
- **Film weight** (`box-shadow: 0 16px 42px rgba(61,34,21,0.28)`): the unrolled film strip; casts away from the canister only.

### Named Rules
**The No-Gray-Shadow Rule.** Every shadow is tinted brown or gold. A neutral gray/black shadow is a defect. If it looks like a Material Design card, the shadow is too dark and too tight.

## 5. Components

Handmade & tactile: things you can pull, tap, and open. Controls use physical metaphors and imperfect, hand-drawn edges; nothing looks stamped from a UI kit.

### Buttons
- **Shape:** full pill (100px radius), generous padding (16px 40px).
- **Primary (RSVP):** teal gradient (135deg, #1B4A5C → #2A6A80), warm-white uppercase label, 0.2em tracking, teal-tinted glow shadow.
- **Gold (Maps CTA, YouTube pill):** gold gradient (135deg, #8A7030 → #6B5520) filled, or 1px gold outline ghost with gold text.
- **Hover / Focus:** lift −2px + scale 1.02–1.04 (motion spring); tap scales to 0.97. Disabled drops to 0.7 opacity, never gray.

### Chips
- **Style:** gold pill badge — gold gradient fill, warm-white 0.6rem uppercase label, 0.2em tracking (e.g. the "Venue" badge overlaid on photos).

### Cards / Containers
- **Corner Style:** 16px (panels), 20px (large sheets), 12px (small).
- **Background:** translucent warm fills — `rgba(255,248,240,0.55–0.6)` over the page gradient; the gradient must show through.
- **Shadow Strategy:** card ambient (see Elevation); gold 3px top border marks program cards.
- **Border:** 1px `rgba(138,107,75,0.15–0.18)` warm hairline.
- **Internal Padding:** 28–36px.

### Inputs / Fields
- **Style:** `rgba(255,255,255,0.7)` fill, 12px radius, 14px 18px padding, 1rem light text, warm hairline border.
- **Focus:** border turns Card Teal, fill goes near-opaque white, soft teal ring `0 0 0 3px rgba(27,42,74,0.08)`.
- **Labels:** uppercase 0.68rem tracked labels above, always with `htmlFor`.

### Navigation
- No nav — the card is one scroll. The only persistent chrome: the TH/EN language toggle (top) and the 56px gold music button (bottom-right, pulse ring when playing).

### Signature Components
- **Hand-Drawn Divider:** two wavy SVG strokes drawing outward from a gold four-point sparkle — replaces every ruled line. Section rhythm = kicker label → divider → content.
- **Film Roll:** gold Kodak-style canister fixed at the screen edge, dark film leader tab the guest drags to physically unroll a photo strip (sprocket holes, sepia frames), then swipes to browse.
- **Envelope (ใส่ซอง):** cream envelope with gold heart seal; tap lifts the flap to reveal the PromptPay QR tucked inside. Gentle idle float, whisper-weight tap hint below.

## 6. Do's and Don'ts

### Do:
- **Do** keep the single page gradient continuous — new sections are transparent; the background is never restated per-section.
- **Do** use warm-tinted shadows only (brown/gold rgba); keep them large and diffuse.
- **Do** give every gesture (drag, pull, tap) a keyboard path and a reduced-motion fallback — "comfortable for elders" is the accessibility bar.
- **Do** write Thai as a first-class voice: same family, same hierarchy, checked in every reveal animation (clip-wipes must not clip Thai ascenders/diacritics).
- **Do** ease out on `cubic-bezier(0.22, 1, 0.36, 1)`; reveals trigger per-block via `useReveal`, once, near the viewport.

### Don't:
- **Don't** build corporate event-page patterns — agenda tables, timeline connectors, registration-form UX, badge language. (PRODUCT.md anti-reference, verbatim.)
- **Don't** reach for generic wedding-template clichés — stock florals, script fonts, pastel washes. (PRODUCT.md anti-reference.)
- **Don't** strip warmth in the name of minimalism — bare, cold restraint is a failure state here. (PRODUCT.md anti-reference.)
- **Don't** introduce hues that aren't on the printed card (The Printed-Card Rule).
- **Don't** set gold text below headline size for functional copy (The Two-Voices Rule), and never use light brown labels below 0.58rem.
- **Don't** use gray/black shadows, side-stripe borders, gradient text, or glassmorphism-as-default.
- **Don't** ship an animation without a `prefers-reduced-motion` alternative, or a form input under 16px.
