# Wedding E-Card — Claude Code Brief (Phase 2)
## Mobile First (414px) · Desktop refinement later

---

## Read First: Build Strategy — Work in Batches

```
DO NOT one-shot the entire brief. Quality drops on later
items when too much is attempted at once. Work in 5 BATCHES,
commit after each. Verify on real device before moving on.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BATCH 1 — Foundation (lowest risk, highest impact)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  • Global: Font (TT Interphases everywhere)
  • Global: Language toggle (TH left, EN right)
  • Global: Background continuity
  → Commit & push. These affect every section — fix them
    first. Verify font renders and background is seamless
    before touching anything else.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BATCH 2 — Opening experience (first impression)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  • Section 1: Intro Animation
    (logo size, slider ring, Windows overlap fix)
  • Section 2: Hero (logo + date repositioned)
  → Commit & push. These are the first thing guests see.
    Must feel polished before moving on.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BATCH 3 — Content sections (layout only, no complex logic)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  • Section 3: Name Intro + Countdown (bride feedback)
  • Section 5: Venue + Map
  • Section 6: Program (3 time cards)
  • Section 7: Dress Code + Hashtag
  NOTE: Section 4 (Gallery) is intentionally skipped.
  See Batch 5. Do NOT attempt it here.
  → Commit & push. These are layout changes only — lower risk.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BATCH 4 — Actions (forms, data, integrations)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  • Section 8: RSVP + Footer
    (Google Apps Script integration — test submit carefully)
  • Section 9: Gift / ใส่ซอง
    (envelope animation + dummy QR + scroll trigger from RSVP)
  → Commit & push. Test the full flow end to end:
    RSVP submit → confirmation → smooth scroll → gift section.
  NOTE: Client must deploy the Apps Script before RSVP
  actually saves data. Claude Code generates the script file,
  client deploys it manually.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BATCH 5 — Complex interactive builds (SEPARATE SESSIONS)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Do NOT bundle these two. Each gets its own session.

  SESSION A: Music Player (full redesign + lyrics + petal trail)
    Test: lyrics sync with playback, expand/collapse,
    petal trail draws eye to button, autoplay fallback works.

  SESSION B: Section 4 — Gallery film roll
    This is the riskiest build in the entire brief.
    Drag physics + canister animation + reveal timing +
    horizontal scroll after unroll.
    BUILD ALONE. Test thoroughly at 414px before commit.
    If it feels janky after 2 attempts — STOP and simplify
    to a static gallery rather than shipping broken.

GENERAL RULES:
  • Mobile only (414px) — do not touch desktop styles
  • Commit and push to main directly after each batch
  • After each batch: open weddingv2-six.vercel.app on a real
    phone and verify before starting the next batch
  • If a build looks janky, stop and fix before moving on
  • If Music Player or Gallery cannot be built well — simplify.
    A polished simple version beats a broken complex one.
```


---

## Global: Font — TT Interphases EVERYWHERE — `fonts.css + all section files`

```
CRITICAL: Every text element across the ENTIRE site must use
TT Interphases — both Thai and English. No exceptions.

REPLACE all of these font families wherever they appear:
  • 'Cormorant Garamond' -> TT Interphases
  • 'Jost' -> TT Interphases
  • 'Great Vibes' -> TT Interphases

LOAD the font in src/styles/fonts.css (via @font-face or CDN).

CHECK every single section — this was missed before:
  - Intro Animation
  - Hero
  - Name Intro + Countdown
  - Gallery
  - Venue + Map
  - Program
  - Dress Code + Hashtag
  - RSVP + Footer
  - Music Player
  - Language Toggle

DONE WHEN: every piece of text on every section renders in
TT Interphases. Search the codebase for "Cormorant", "Jost",
"Great Vibes" — zero results should remain.
```

## Global: Language Toggle — `LangToggle.tsx`

```
Swap the order: TH on the left, EN on the right.
Everything else stays the same.

✓ DONE WHEN: TH appears on the left, EN on the right, toggle still works.
```

## Global: Music Player — `MusicPlayer.tsx`

**Collapsed state** (always visible, bottom-right corner)
- Single circular floating button, `56px` diameter
- Gold gradient background matching site palette
- Play/Pause icon centered in white
- Subtle pulse ring animation when playing
- No text, no label, nothing else visible

**Expanded state** (slides up as a card when button is tapped)
- Card anchors to bottom-right, `width: 300px`, slides up with spring animation
- Close X in top-right corner collapses back to button

**Card layout:**
```
┌─────────────────────────────┐
│ 🖼  Pantika           ╳    │
│  Written for her, on the    │
│    day I asked forever      │
│                             │
│   " current lyric line "   │
│                             │
│   ▬▬▬●──────── 1:23/3:45  │
│      ⏪   ▶   ⏩   ↗ YT   │
└─────────────────────────────┘
```

**Specifications:**
- **Collapsed** — 56px gold circle · ▶/❚❚ icon · pulse ring when playing · no text
- **Thumbnail** — img.youtube.com/vi/VIDEO_ID/0.jpg
- **Title** — Pantika
- **Subtitle** — Written for her, on the day I asked forever — small, italic, warm brown
- **Lyrics** — CC captions via YouTube Data API v3 · one line at a time · gold #8A7030 · fades between lines
- **Progress** — 4px height · draggable · gold fill
- **Controls** — Back 10s · Play/Pause · Forward 10s · YouTube link — NO track switching
- **Animation** — Spring slide-up from button on expand · ✕ collapses back

**Guest Discovery — Confirmed:**

**Primary (H — Petal Trail):** Floating gold particles in the Hero section drift toward the music button, drawing the eye naturally. Button has a subtle warm glow. No sound, no popups, no text.

**Fallback (Autoplay on Entry):** If H is removed, music starts softly as invitation fades in after sliding open. Player shows pause icon. No toast, no popup. Subtitle line does all the communication.

## Global: Background Continuity — CRITICAL — `WeddingInvitation.tsx + all section files`

```
PROBLEM: Every section currently has its own individual background 
color/gradient. This creates harsh visual breaks between sections 
that feel like separate pages, not one flowing invitation.

FIX: Remove ALL individual section background properties entirely.
Apply ONE single gradient to the page wrapper div that runs 
top-to-bottom across the entire post-hero content:

  background: linear-gradient(180deg,
    #F8F1E6 0%,    ← just after hero
    #F2E8D2 20%,
    #EBDDc4 50%,
    #E3D2B0 75%,
    #DBC59A 100%   ← footer
  );

Sections become transparent windows into this single background.
WatercolorWash, PaperTexture decorations can stay — they layer 
on top without breaking continuity.

Files to strip background from:
  • NameIntroWithCountdown (both sub-sections)
  • StorySection / Gallery
  • HashtagSection
  • Venue section
  • ProgramSection
  • DressCode section  
  • MapSection
  • RSVPSection
  • Footer

✓ DONE WHEN: Scrolling from hero to footer shows NO hard color
breaks between sections — one smooth continuous gradient.
```


---

## Section 1: Intro Animation — PN Logo — `IntroAnimation.tsx`

```
• Increase size to min(200px, 50vw)
• Center horizontally within viewport
• Push up 60px from vertical center
  → top: calc(50% - 60px)
```

## Section 1: Intro Animation — Slider Ring — `IntroAnimation.tsx`

```
Increase the size of the ring SVG icon inside the slider only.
Do not change the slider track width, height, or any other element.
Target the <img src={ringImg}> inside the draggable thumb div.
Current size: 56px → New size: 80px
```

## Section 1: Intro Animation — Windows Overlap Fix — `IntroAnimation.tsx`

```
Problem: On desktop/Windows, date text, "Slide to open"
label and slider component are overlapping each other.

Fix: Restructure bottom area using flexbox with vertical
stacking and minimum 24px gap between elements:
  1. "Slide to open" hint text
  2. Slider component

Test at: 1280×896px (desktop) and 414px width (mobile)
```


---

## Section 2: Hero — PN Logo + Date Block — `WeddingInvitation.tsx`

```
• Increase logo size to min(200px, 50vw)
• Push entire block up ~90px from vertical center
  → top: calc(50% - 90px)
• Date font size: clamp(1.4rem, 4vw, 2rem)
• Date letter spacing: 0.38em
```


---

## Section 3: Name Intro + Countdown — Bride Feedback — `WeddingInvitation.tsx`

```
LAYOUT — New vertical order top to bottom:
  1. Countdown timer  ← MOVED TO TOP
     Add one small line directly under it:
     "until we say I do"
     — so guests know what the countdown is for
       before they reach the date at the bottom.
  2. Parents line — LEFT/RIGHT column layout
     Left:  Mr. Winai & Mrs. Anong
     Right: Mr. Natthawut & Mrs. Ratchatana
  3. Invite line (centered)
  4. Bride name — LARGE (full width, centered)
  5. Ring SVG — min(120px, 28vw), centered focal point
  6. Groom name — LARGE (full width, centered)
  7. Sunday / 22 November 2026
  8. Venue name: SailomSangdad Homey Studio ← ADD THIS

COUNTDOWN COLOR (Bride feedback C):
  Change numbers from navy #1B4A5C → gold #8A7030
  Labels (DAYS, HOURS, MIN, SEC) stay light brown

RING SIZE (Bride feedback B):
  Increase to min(120px, 28vw) — must be a focal point

CLEANUP: Delete orphaned src/.../wedding/NameIntroSection.tsx
if it still exists (replaced by NameIntroWithCountdown).

✓ DONE WHEN: countdown is at top (gold, not blue), parents are
side by side, ring is visibly large between stacked names, venue
name appears under the date.
```


---

## Section 4: Gallery — Film Roll Mechanic — `StorySection.tsx`

```
FULL REDESIGN — Replace entire existing StorySection mechanic.

TWO FILM ROLLS stacked vertically, each full screen width.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ROLL 1 — Our Memories (personal photos)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Canister fixed at LEFT edge
• Pull tab starts right next to canister
• Guest drags tab RIGHTWARD
• Film strip physically unrolls from canister as they drag
• Photos revealed one by one as strip extends
• Strip stops when tab reaches right edge of screen
• Guest then swipes/scrolls horizontally to browse all photos
• Section label above: "Our Memories" (TH: ความทรงจำของเรา)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ROLL 2 — Pre-Wedding (professional shoot)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Canister fixed at RIGHT edge
• Pull tab starts right next to canister
• Guest drags tab LEFTWARD — mirrors Roll 1
• Same mechanic, opposite direction
• Section label above: "Pre-Wedding" (TH: พรีเวดดิ้ง)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FILM STRIP STYLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Dark brown background (#3A1A00)
• Sprocket holes top and bottom (white/cream, evenly spaced)
• Photos sit in rectangular frames on the strip
• Unrevealed portion: dark unexposed film texture
• Pull tab: small labeled tag "Pull me" attached at canister end
• Canister: visible, gold/orange kodak style fixed at edge

PHOTOS:
• Dynamic — works with however many images are provided
• Roll 1 uses STORY_IMAGES (personal photos array)
• Roll 2 uses PRE_WEDDING_IMAGES (new array — client to add photos)
• Each image fills one film frame

INTERACTION:
• Supports touch drag (mobile swipe) and mouse drag (desktop)
• Smooth continuous reveal tied directly to drag position
• After full unroll: horizontal scroll to browse

✓ DONE WHEN: dragging the tab unrolls film smoothly from the
canister, photos reveal one by one, strip stops at screen edge,
then horizontal swipe browses all photos. Test at 414px.
```


---

## Section 5: Venue + Map — `WeddingInvitation.tsx`

```
REMOVE the Google Maps iframe embed — too heavy, looks bad on mobile.
Replace with 3 clean blocks, no clutter:

BLOCK 1 — Full-width venue photo
  • Venue photo fills full width
  • Venue name overlaid on photo, bottom-left
  • Gold pill badge "Venue" top-left corner
  • Subtle dark gradient overlay at bottom for text legibility

BLOCK 2 — Address + CTA
  • One line: Ram Intra 40, Bangkok
  • One button: "Open in Google Maps" → links to Google Maps URL
  • No iframe, no embedded map

BLOCK 3 — Directions (3 items, icon + text)
  • 🚗 By Car — 25 min from Siam, free parking on site
  • 🚇 By BTS/MRT — Take BTS to On Nut, then 10 min by taxi
  • 🛺 By Grab — Search 'SailomSangdad Homey Studio'
  Each item: icon in gold circle + one short line of text

Stacks vertically on mobile, clean and fast to load.

✓ DONE WHEN: no iframe present, photo has name overlay, Maps
button works, 3 direction items show with icons.
```


---

## Section 6: Program — `WeddingInvitation.tsx`

```
REMOVE the current timeline layout — too corporate, too busy.
Replace with 3 large centered time cards.

LAYOUT — 3 cards in a row on desktop, stacked on mobile:

  ┌──────────┐  ┌──────────┐  ┌──────────┐
  │  16:09   │  │  17:00   │  │  17:30   │
  │Engagement│  │  Photos  │  │  Dinner  │
  │ Ceremony │  │ & Drinks │  │& Dancing │
  └──────────┘  └──────────┘  └──────────┘

Each card contains:
  • Large time — TT Interphases, prominent (no exceptions — global font rule applies here too)
  • Event name — bold, one line
  • One short description line — light weight
  • Subtle gold top border accent

Card style:
  • Soft cream background, rounded corners
  • No connecting lines or dots between cards
  • Warm shadow, hover lifts slightly
  • On mobile: full width, stacked with generous spacing

Section label above: "Program of Events"

✓ DONE WHEN: 3 clean time cards show (no connecting lines),
stack to single column on mobile.
```


---

## Section 7: Dress Code + Hashtag — `WeddingInvitation.tsx`

```
Keep existing dress code layout and color swatches.

CHANGES:
1. Hashtag — change text from "#PNEst221126" to "#PNEST221126"
   (all caps, consistent)

2. Hashtag MOVES — place directly under the dress code 
   color swatch rows, before RSVP section.
   Remove HashtagSection from its current standalone position.

HASHTAG DISPLAY:
  • Large gold text: #PNEST221126
  • Subtitle: "Share your memories with us"
  • Instagram + Facebook icons above the hashtag
  • Typewriter animation on the hashtag text (keep existing)

✓ DONE WHEN: hashtag reads #PNEST221126, sits under the color
swatches, no longer appears as a standalone section.
```


---

## Section 8: RSVP + Footer — `RSVPSection.tsx`

```
RSVP FORM:
  - Keep the styled form on the card (do not redirect away)
  - Fields: Name / Attending (Yes/No) / Number of Guests
  - REMOVE the "Dietary Preferences / Notes" field entirely
  - Yes/No buttons keep warm labels:
      "Joyfully Accept" / "Regretfully Decline"
  - Show a warm confirmation message after submit
  - Reply-by date: "Kindly reply by October 1, 2026"

SUBMISSION METHOD — Google Sheets via Apps Script (CONFIRMED)
  Data flows: Card form → Google Apps Script → Google Sheet
  No redirect, guest stays on the card throughout.

  HOW TO IMPLEMENT:
  1. Create a Google Apps Script web app that accepts POST
     requests and writes to a Google Sheet.
  2. The script URL goes in .env as VITE_GOOGLE_SCRIPT_URL
  3. On submit, POST { name, attending, guests } as JSON
  4. On success:
     a. Show warm confirmation message briefly (2-3 seconds)
     b. Smoothly scroll the page down to the Gift Section
        (do NOT redirect or reload — keep card experience intact)
        Use: document.getElementById("gift-section").scrollIntoView({behavior: "smooth"})
     c. Gift Section must have id="gift-section" on its wrapper
  5. On failure: show error + ask guest to try again

  CLIENT SETUP STEPS (done by client, not Claude Code):
  a. Go to script.google.com → New project
  b. Paste the Apps Script code (Claude Code will provide this)
  c. Deploy as Web App → Anyone can access
  d. Copy the deployment URL → add to .env

  Claude Code must also generate the Apps Script code
  and include it as a separate file: google-apps-script.gs

FOOTER:
  - Keep the quote (Andre Maurois)
  - PN logo + date (22 / 11 / 2026)
  - Venue line: SailomSangdad Homey Studio
  - Closing line: "With love and gratitude"
  - Keep minimal — last thing guests see

DONE WHEN: form has 3 fields (no dietary), warm button labels,
data POSTs to Apps Script URL, confirmation shows briefly then
page smoothly scrolls to Gift Section, google-apps-script.gs
file is generated and documented.
```


---

## Section 9: ใส่ซอง — Gift Section — `new file: GiftSection.tsx`

```
NEW SECTION — Place immediately after RSVP, before Footer.
Create as a new component: src/app/components/wedding/GiftSection.tsx

HEADING:
  TH: "ของขวัญสำหรับการเดินทางครั้งใหม่ของเรา"
  EN: "A gift for our new journey"
  Style: same as other section labels — small, centered, understated

INTERACTION — Envelope tap to reveal QR:
  BEFORE TAP:
    • Animated envelope illustration (SVG — hand-drawn style)
    • Envelope has a small heart seal
    • Gentle floating/pulse animation — feels alive, not urgent
    • No label text on the envelope itself
    • Small tap hint below envelope:
        TH: "แตะเพื่อใส่ซอง"
        EN: "Tap to give a gift"
      (small, light weight, not bold — whisper, not instruction)

  ON TAP:
    • Envelope flap lifts open with smooth animation
    • QR code is revealed INSIDE the envelope body itself
      (not below — it sits within the envelope as if it were
      a card tucked inside)
    • QR appears with gentle fade-in as flap opens
    • Account name below QR inside the envelope
    • "PromptPay" label below account name

  QR CODE — PLACEHOLDER FOR NOW:
    • Generate a dummy QR code as an SVG placeholder
    • Add clearly visible label: "[ Replace with PromptPay QR ]"
    • Sized correctly so client can swap PNG in later
    • Store QR image reference in: src/imports/promptpay-qr.png
      (client drops their real QR file here to replace)

  DESIGN RULES:
    • Do NOT show any amount or suggested amount
    • Do NOT use bold or prominent styling — must feel optional
    • Muted gold tones, not attention-grabbing
    • QR code: medium size, centered, white background inside envelope

CLOSING LINE (always visible, below envelope):
  TH: "ของขวัญที่ดีที่สุดคือการมาร่วมแสดงความยินดี"
  EN: "Your presence is the greatest gift of all"
  Style: italic, warm brown, small — this line does the softening

CLIENT TO PROVIDE LATER:
  • Real PromptPay QR code image → drop into src/imports/promptpay-qr.png
  • Account holder name to display below QR

DONE WHEN: envelope animates gently, tapping opens flap to reveal
QR INSIDE envelope body, dummy QR placeholder visible with swap
label, no amount shown, closing line always visible below.
Section wrapper has id="gift-section" for scroll target.
```


---

## Config: Environment Variables — `.env`

```
VITE_YOUTUBE_API_KEY=your_api_key_here
VITE_YOUTUBE_VIDEO_ID=p8iVeHphD3c
VITE_GOOGLE_SCRIPT_URL=your_apps_script_url_here

⚠ OPEN ITEMS — client to provide:
• YouTube CC lyrics API is untested — verify it returns captions
  before relying on it. Hardcode lyrics as fallback if it fails.
• PRE_WEDDING_IMAGES array is empty — Roll 2 needs photos.
  Gallery Roll 2 will be blank until provided.
```

## Config: Files to Modify

```
MODIFY:
  src/styles/fonts.css
  src/app/components/wedding/LangToggle.tsx
  src/app/components/wedding/MusicPlayer.tsx
  src/app/components/wedding/IntroAnimation.tsx
  src/app/components/wedding/StorySection.tsx
  src/app/components/wedding/RSVPSection.tsx
  src/app/components/wedding/GiftSection.tsx (NEW)
  src/app/components/WeddingInvitation.tsx
  src/app/components/wedding/wedding-context.tsx

DELETE if orphaned (no longer imported):
  src/app/components/wedding/NameIntroSection.tsx
  src/app/components/wedding/MapSection.tsx (if merged into Venue)
  src/app/components/wedding/HashtagSection.tsx (if merged into Dress Code)

Check imports before deleting — remove dead imports too.
```
