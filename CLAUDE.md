# Wedding E-Card — Claude Code Brief
## Phase 1: Mobile First (iPhone XR 414px) · Desktop refinement later

---

## Global

### Font
- Replace all font families site-wide with **TT Interphases**
- Update `src/styles/fonts.css` to load TT Interphases
- Set **TH as default language** in `wedding-context.tsx` — change initial `useState` to `"TH"`

### Background Continuity
- After the Hero, all sections share **one continuous warm cream background** — no visible hard edges or color jumps between sections
- Remove individual section background gradients that conflict
- Use a single site-wide gradient running top-to-bottom: `#F8F1E6 → #EBDDc4 → #E3D2B0`
- Sections should feel like panels on one scroll, not separate cards

### Section Order
```
1. Hero
2. Name Intro + Countdown
3. Gallery  ← renamed from Story
4. Venue + Map  ← merged
5. Program
6. Dress Code
7. RSVP → Footer  ← Hashtag moved into Footer area
```

- **Remove** the Date Card section entirely — delete the full Date Card `<section>` block from `WeddingInvitation.tsx`
- **Remove** standalone `MapSection` import — map content merged into Venue (see Section 4)

---

## 1. Intro Animation — `IntroAnimation.tsx`

**PN Logo**
- Increase size from `min(160px, 38vw)` → `min(220px, 55vw)`
- Center **both vertically and horizontally** within the viewport
- Anchor: `position: absolute, top: 50%, left: 50%, transform: translate(-50%, -50%)`

**Date + Venue text block** (`22 · 11 · 26` and `SAILOMSANGDAD · BANGKOK`)
- Switch font to TT Interphases
- Date font size: `clamp(1.4rem, 4.5vw, 2rem)`
- Venue line font size: `0.8rem`
- Gap between logo bottom and date: `32–40px` — not too tight, not too loose

**Divider line (desktop bug fix)**
- The line below "Slide to open" renders as a flat underline on desktop
- Fix: `display: block, width: 80px, height: 1px, margin: 0 auto` — must render as a short centered decorative bar on both mobile and desktop

---

## 2. Hero Section — `WeddingInvitation.tsx`

**PN Logo + Date block** (inside the main Hero, not the intro animation)
- Move logo + date (`22 · 11 · 26`) from `top: 28px` to **true center** of the hero viewport
- Anchor: `position: absolute, top: 50%, left: 50%, transform: translate(-50%, -50%)`
- Increase logo size: `min(80px, 20vw)` → `min(140px, 35vw)`
- Increase date font size: `clamp(0.85rem, 2.4vw, 1.1rem)` → `clamp(1.2rem, 4vw, 1.8rem)`
- Increase letter spacing on the date slightly for breathing room

---

## 3. Name Intro + Countdown — `NameIntroWithCountdown` in `WeddingInvitation.tsx`

**Remove**
- Delete the PN logo image at the top of this section — it is redundant

**Layout — switch to horizontal three-column**

Replace the current vertical stacked layout with a **left / center / right** row:

| Left | Center | Right |
|------|--------|-------|
| Bride block | Ring SVG | Groom block |
| Title: `Flt. Lt.` | `ringImg` | Title: `Mr.` |
| Name: `Pantika Setboonsrang` | (vertically centered) | Name: `Natthakorn Suppasuesanguan` |

- On mobile: names use `clamp` sizing, allow text to wrap within each column
- Parents line and invite line stay **above** the three-column row, centered as before
- Ring stays vertically centered between the two names

**Countdown placement**
- Countdown timer sits **directly below** the three-column name row
- Date line (Sunday, 22 November 2026) closes the section at the bottom

---

## 4. Gallery — `StorySection.tsx` (full redesign)

**Remove entirely**
- Delete the polaroid camera SVG (`WatercolorCamera` component)
- Delete the "Take a Photo" / "Reset Photos" button
- Delete the existing polaroid photo ejection mechanic

**New mechanic — two horizontal film rolls**

Each film roll is a horizontal strip in its own row. Two rows total.

### Film Roll 1 — Our Memories
- Strip sits on the **left**, film end tab labeled `"Pull me"` on the **right**
- User drags tab **rightward** → photo reveals progressively, like pulling film from a canister
- Reveal is smooth and continuous — tied directly to drag position, not a snap or fade
- Photos: first 2 images from the existing `STORY_IMAGES` array
- Section label: `"Our Memories"` (Thai: `"ความทรงจำของเรา"`)

### Film Roll 2 — Pre-Wedding
- Strip sits on the **right**, film end tab labeled `"Pull me"` on the **left**
- User drags tab **leftward** → photo reveals progressively
- Photos: last 2 images from `STORY_IMAGES` — client to swap with actual pre-wedding photos later
- Section label: `"Pre-Wedding"` (Thai: `"พรีเวดดิ้ง"`)

### Film Strip Style
- Dark brown/black edges with sprocket holes top and bottom
- Warm sepia-toned center where photo reveals
- Unrevealed portion: dark unexposed film texture
- Supports touch drag (mobile) and mouse drag (desktop)
- Generous vertical spacing between the two rolls

---

## 5. Venue + Map — merged single section

**Combine** the map content from `MapSection.tsx` directly into the Venue block in `WeddingInvitation.tsx`

**Delete** `MapSection.tsx` after merging and remove its import

### Layout (mobile — stacked vertically)

**Top — Venue info**
- Venue photo (`FLORAL_IMAGE`)
- Gold vertical bar + venue name + description
- Keep existing typography and styling

**Bottom — Map + Directions** (no section break between venue and map)
- Google Maps iframe embedded directly below venue info
- Directions panel (Car / BTS / Grab) below the map
- "Open in Google Maps" CTA button at the bottom
- Remove the standalone `<div id="map">` wrapper

---

## 6. Program — no structural changes yet
- Font update to TT Interphases applies
- Background continuity applies

## 7. Dress Code — no structural changes yet
- Font update to TT Interphases applies
- Background continuity applies

---

## 8. RSVP + Footer

- Hashtag section (`HashtagSection.tsx`) moves **into the Footer area** — render it just above the existing footer quote/logo block
- Font update to TT Interphases applies
- Background continuity applies

---

## Files to Delete After Refactor
- `src/app/components/wedding/StorySection.tsx` — replaced by new Gallery component
- `src/app/components/wedding/MapSection.tsx` — merged into Venue section
- `src/app/components/wedding/NameIntroSection.tsx` — replaced by `NameIntroWithCountdown`

---

## Notes for Client
- Swap `STORY_IMAGES[2]` and `STORY_IMAGES[3]` with actual pre-wedding photos when available
- TT Interphases licence: confirm web font usage rights before deploying to production
