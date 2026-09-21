# Handoff: Wedding E-Card (Pantika & Natthakorn, 22·11·2026)

## Overview
A single-page bilingual (TH/EN) wedding e-invitation, mobile-first. The guest opens an intro
"unlock" screen, slides a ring to enter, then scrolls one continuous page: hero + monogram,
names + live countdown, photo gallery (3D orbit of stamp-edged prints), venue + directions,
program, dress code + hashtag, RSVP form, gift envelope with PromptPay QR, and the couple's song
(YouTube audio). A language switcher and a floating music player sit above everything.

## About the Design Files
`Wedding E-Card.dc.html` in this bundle is a **design reference written in HTML** — a working
prototype of the intended look, motion, and behavior. It is not production code to paste in.
The task is to **recreate it in the target codebase's environment** (React/Next, Vue, etc.)
using that project's routing, component, and styling conventions. If no codebase exists yet,
pick a suitable stack (a static React/Next or Astro site is plenty — there is no backend beyond
the RSVP submission) and implement the design there.

`wedding-ecard-standalone.html` is the same design compiled into one self-contained file with all
images and fonts embedded — open it in any browser (including a phone) to see the real thing.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, copy (TH + EN), and interactions. Recreate
the UI closely; exact values are listed below and in the source.

## Screens / Views

### 1. Intro (unlock) — full-viewport overlay
- **Purpose**: a ceremonial gate; slide the ring to open the invitation.
- **Layout**: fixed overlay, `z-index` above the card, flex column, `justify-content: space-between`,
  centered horizontally. Falling gold petals (7 absolutely positioned divs, randomized
  left/delay/duration), a soft radial glow `min(500px, 90vw)` circle at center, and 4 leaf corner
  ornaments (SVG, rotated per corner, opacity ~0.35).
- **Center block**: `src/imports/Logo.svg` PN monogram, `width: min(200px, 42vh, 50vw)`;
  below it "22 · 11 · 26" at `clamp(1.3rem, 4.5vw, 2rem)`, `letter-spacing: 0.25em`, color `#8A7030`;
  then "SailomSangdad · Bangkok" 0.8rem, `letter-spacing: 0.2em`, `rgba(27,74,92,0.72)`, uppercase.
  Vertical rhythm uses `clamp()` so the block never collides with the slider on short screens
  (this was a real bug below ~676px viewport height — keep the flex-column + clamp approach).
- **Slider**: track `width: min(300px, 80vw)`, `height: 72px`, `border-radius: 100px`,
  background `rgba(255,255,255,0.55)`, `1px solid rgba(138,112,48,0.25)`, `backdrop-filter: blur(8px)`.
  Knob is `src/imports/Ring.svg` at 80×80 with a pulsing ring behind it; a gold fill grows behind
  the knob as it travels. Hint text "Slide to open" fades in after 1.8s, italic,
  `clamp(0.9rem, 2.5vw, 1.1rem)`, `rgba(27,74,92,0.78)`.
- **Behavior**: drag (pointer events) or keyboard — `role="slider"` with `aria-valuenow`; Arrow keys
  step, Enter/End unlock. Past ~85% it snaps open; below that it springs back. On unlock the overlay
  scales/fades away and page scroll unlocks (`html/body overflow hidden` while the intro is up).

### 2. Hero
- Full-bleed photo `src/imports/Hero.jpg`, `height: 100svh`, `min-height: 620px`,
  `object-position: center 62%`, with a bottom gradient to `#F8F1E6` over the lower 20%.
- Monogram mark absolutely positioned at `top: calc(50% - 140px)`, centered, `pointer-events: none`:
  Logo.svg at `min(200px, 50vw)` plus "22 · 11 · 26" at `clamp(1.4rem, 4vw, 2rem)`,
  `letter-spacing: 0.38em`, `#8A7030`, weight 500.
- 14 floating dust particles (absolute divs, 2–5px, 7–13s drift).
- Scroll cue at the bottom: 26×42 rounded outline with a 3.5×7 dot, `rgba(27,74,92,0.4)`.
- ≥900px: `height: 94svh`, `min-height: 560px`, background `#F8F6EC`.

### 3. Names & countdown
- Centered, `max-width: 720px`, padding `56px 24px 40px`.
- Countdown: 4-column grid, `gap: clamp(6px, 2vw, 12px)`, `max-width: 420px`. Each cell:
  background `rgba(255,248,240,0.55)`, `1px solid rgba(138,112,48,0.25)`, `border-radius: 12px`,
  padding `clamp(10px,3vw,14px) clamp(6px,2vw,16px)`; the number sits in a `1em` tall
  `overflow: hidden` slot so it can roll. Labels below in TH/EN.
- Names, "&", date line, and `src/imports/Ring.svg` at `min(120px, 28vw)` with a soft drop shadow.

### 4. Gallery — 3D photo orbit (the signature element)
- **Structure**: `.pw-orbit` stage, `height: min(560px, 70svh)`, `touch-action: pan-y`; 11 `<button>`
  cards absolutely positioned at `left/top: 50%`, each holding a `.pw-stamp` frame around the image.
- **Stamp frame**: postage-stamp notched edge built with CSS (`--stamp-pitch: 12px`,
  `--stamp-notch: 3.4px`) — see the `.pw-stamp` rule in the source and copy it verbatim.
- **Geometry** (`geometryFor(width, height)`):
  - `card = min(target, (height-32)*0.48, width-32)` where
    `target = width < 600 ? clamp(140,180, width*0.46) : clamp(220,280, width*0.3)`
  - `radius = max(12, (width - 32 - card*0.8) * 0.425)`, `distance = radius * 3.4`
  - `lift = clamp(0, radius*1.2, height/2 - card*2/3 - 20) * (distance-radius)/distance`
- **Per-frame layout** (`layoutOrbit()`, driven by `requestAnimationFrame`):
  angle `a = (i*360/total + rotation)`; `z = cos(a)*radius`; perspective `k = d/(d-z)`;
  `x = sin(a)*radius*k*p`, `y = cos(a)*lift*k*p`, `scale = 1 + ((d-radius)/(d-z) - 1)*p`;
  `zIndex = round(1000 + z)`; where `p` is the 1.8s cubic-out "unfold" progress that fans the
  prints from a stacked pile into the ring when the section scrolls into view.
- **Depth of field**: `near = (z+radius)/(2*radius)`, `focus = p*near + (1-p)`, then
  `blur((1-focus)*2.6px) brightness(0.84+focus*0.16) saturate(0.78+focus*0.22)` plus a
  focus-scaled drop shadow, and `opacity = 0.5 + focus*0.5`.
- **Motion**: idle auto-rotate `0.003 deg/ms`, paused while unfolding, off-screen, hovered,
  zoomed, or tab-hidden. Drag to spin (`rotation = r0 + dx/width*150`), release throws momentum
  (`inertia` clamped ±6, decay `*0.94` per frame). A drag over 8px suppresses the click.
- **Zoom**: clicking a print opens a full-screen lightbox; the orbit behind it blurs 7px and scales
  to 0.93; the lightbox scales in with `perspective: 1200px`.
- **Known problems — read `KNOWN-ISSUES.md` before touching this.** Four issues are open
  (stamp-edge pop when neighbours swap depth, back prints being clickable, no affordance hint on
  mobile, awkward on desktop). One rejected fix is documented there with the reason.

### 5. Venue & directions
- Card `border-radius: 20px`, `overflow: hidden`, shadow `0 16px 50px rgba(27,74,92,0.12)`,
  background `rgba(255,248,240,0.55)`, `1px solid rgba(138,107,75,0.18)`.
- Photo `src/imports/venue.jpg`, `height: clamp(280px, 58vw, 440px)`, with a bottom-up dark
  gradient and the venue name overlaid.
- Address block, then a Google Maps button (white pill, `src/imports/google-maps.png` 28×28) linking
  to `https://maps.google.com/?q=SailomSangdad+Homey+Studio+Bangkok`.
- Three direction rows (car / MRT / Grab) each with a logo icon and instructions.

### 6. Program
- Heading 30px/600 `#1B4A5C` uppercase with the gold flourish rule under it (see Components).
- `grid-template-columns: repeat(auto-fit, minmax(220px, 1fr))`, `gap: 20px`. Each card:
  `rgba(255,248,240,0.6)`, `1px solid rgba(138,107,75,0.15)`, `border-top: 3px solid #8A7030`,
  `border-radius: 16px`, padding `36px 24px`, 56×56 icon (ring / camera / glasses PNGs).

### 7. Dress code & hashtag
- Three rows of color swatches, `gap: clamp(12px, 3vw, 28px)`; palettes
  `[#3d2500, #7a6200, #9f6816]`, `[#cca300, #ffd21f, #ffeb99]`, `[#28564b, #7c8745, #2e6417]`.
- Hashtag `#PNEST221126` plus a one-line prompt to tag photos.

### 8. RSVP
- `max-width: 560px`. Name text field, Yes/No attendance toggle, guest stepper (1–5, shown only
  when attending), submit. Validation: attendance must be chosen (inline `role="alert"` message),
  name must be non-empty. On submit the form swaps for a thank-you panel (♥ for yes, ✦ for no)
  with a reset link. No backend is wired — POST it to whatever the codebase uses.

### 9. Gift envelope
- A closed envelope that opens on tap: the flap rotates, the body slides up, and the PromptPay QR
  (`src/imports/promptpay-qr.jpg`, `min(250px, 64vw)`) rises out of the pocket.
- The "Tap to give a gift" hint cross-fades into a "Save QR" download button
  (`<a download>` to the QR file) plus a line telling the guest to scan it from their photo album.

### 10. Our song + footer
- Song title "Pantika", dedication text, and a YouTube link button (`youtube-icon.png`).
- Audio itself plays through a hidden YouTube IFrame Player (`videoId: p8iVeHphD3c`) driven by the
  floating player below — **requires an internet connection**.

### Floating controls
- **Language switcher**: fixed `top: 24px; right: 24px`, pill, `rgba(253,250,245,0.85)`,
  `backdrop-filter: blur(12px)`, TH / EN buttons; the active one is filled gold.
- **Music player**: fixed `bottom: 24px; right: 24px`. Collapsed = 56px gold gradient circle
  (`linear-gradient(135deg, #8A7030, #6B5520)`) with a radial glow and a pulse ring while playing.
  Expanded = `width: min(300px, calc(100vw - 32px))` card with thumbnail, title, progress, prev/
  play/next, and the YouTube link. Both are ≥44px hit targets.

## Interactions & Behavior
- **Reveal on scroll**: every `[data-reveal]` element starts `opacity: 0; translateY(36px)` and
  animates in via IntersectionObserver (`rootMargin: -40px`); elements already in view on load are
  revealed immediately with no animation.
- **Countdown**: `setInterval` every 1s to the target date (22 Nov 2026); numbers roll in a clipped
  1em slot.
- **Language**: switching TH/EN swaps every string from one dictionary; layout must tolerate Thai
  line-breaking and longer strings (Thai copy is authoritative — do not re-translate).
- **Scroll lock** while the intro overlay is up.
- **Responsive**: tested 360px and up; ≥900px the hero shortens and the page centers within
  `max-width` containers (gallery 1000px, program 920px, venue 760px).
- **Reduced motion**: not yet handled — worth adding (`prefers-reduced-motion` should stop the
  orbit auto-rotate, petals, and particles).

## State Management
Single component state: `lang`, countdown `{days,hours,minutes,seconds}`, `zoom` (lightbox index)
and `zoomShown`, RSVP (`name`, `attending`, `guests`, `rsvpStatus`, `attendHint`, `focused`),
`giftOpen`, player (`expanded`, `playing`, `ready`, `buffering`), intro (`introActive`, `introPos`,
`introUnlocked`, `introLeaving`, `introHint`). Orbit `rotation`, `inertia`, `unfold`, `hover`, and
`spin` are kept **outside** React state and written straight to DOM styles each frame — keep that
split, per-frame `setState` would be far too slow.

Data fetching: none. Only the YouTube IFrame API is external.

## Design Tokens
- **Gold** `#8A7030` (deep `#6B5520`), **Navy** `#1B4A5C`, **Ink** `#2A1A0A`
- Browns for body/secondary text: `#3A2C18`, `#7A5A38`
- Creams / surfaces: `#F8F6EC`, `#FDFAF5`, `#FFF8F0`, `#F8F1E6`, `rgba(255,248,240,0.55–0.6)`
- Hairlines: `rgba(138,112,48,0.25)`, `rgba(138,107,75,0.15–0.18)`
- Shadows: `0 7px 8px rgba(61,34,21,.2)` (prints), `0 10px 30px rgba(61,34,21,.08)` (cards),
  `0 16px 50px rgba(27,74,92,0.12)` (venue), `0 16px 50px rgba(61,34,21,0.18)` (player)
- Radii: 12 (countdown), 16 (program), 20 (venue/player), 100px (pills), 50% (circles)
- Type: **TT Interphases Pro** (Light/Regular/Medium/DemiBold/Italic) + **Noto Sans Thai Variable**;
  section headings 30px/600 navy uppercase; body `0.95–1.1rem`, `line-height 1.6–1.8`;
  display sizes use `clamp()` throughout.
- Section heading flourish: two 60×8 wavy SVG rules flanking a 14×14 four-point sparkle,
  stroke/fill `#8A7030` at 0.5–0.6 opacity, `gap: 12px`.

## Assets
All in `src/imports/` (copied into this bundle):
- `Hero.jpg`, `venue.jpg`, `Logo.svg` (PN monogram), `Ring.svg`, `promptpay-qr.jpg`
- `pre-wedding/01…11` — the 11 gallery prints (order matters: ring box, rings, Saphan Phut ×4,
  Suan Ben ×5)
- `memories/` — 4 extra photos, currently unused
- Icons: `ring-icon.png`, `camera-icon.png`, `glasses-icon.png`, `car-icon.svg`, `grab-icon.png`,
  `MRT_(Bangkok)_Pink_logo_with_name.svg` (+ `mrt-logo-name.svg`, same file renamed),
  `mrt-icon.svg`, `google-maps.png`, `youtube-icon.png`
- Fonts: `fonts/TTInterphasesPro-*.ttf`, `fonts/NotoSansThai-Variable.woff2`
- The MRT logo is a third-party mark; check usage rights before shipping publicly.

## Files
- `Wedding E-Card.dc.html` — the design (markup + styles + logic in one file)
- `wedding-ecard-standalone.html` — self-contained build, open directly in any browser
- `support.js` — runtime the prototype needs to render; not part of the design
- `KNOWN-ISSUES.md` — open problems, causes, and one rejected fix. Read it first.
- `src/imports/**` — all assets
