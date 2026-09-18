# Invitation feedback - 16 September 2026

## Implemented

- Section labels: 30px; Sunday: 30px; venue in the date block: 28px.
- Dress-code subtitle is smaller than its section heading.
- Removed the visible pre-wedding subtitle.
- One normal-scroll gallery: stamp stack unfolds once at 60% visibility over
  1.8 seconds, then rotates at 3 degrees/second. No book, categories or pinning.
- Three.js perspective projection drives upright DOM photo buttons via Motion
  Values. Front photos stay larger; the back of the ring may be obscured.
- ResizeObserver sizes the ring within 70svh, including short landscape screens.
  Hover, focus, touch, viewer, offscreen and hidden-tab states pause rotation;
  reduced motion immediately presents a static ring. Lightbox restores focus.
- Requested parent/caption/invitation/deadline typography, white Maps button,
  revised dress heading, conversational gift description and tighter tap hint.
- Larger desktop hero logo/date, reduced space above the envelope, revised RSVP copy.
- Full-colour Google Maps asset; centred car symbol; revised parking/MRT copy.
- Gift description and tap label; revised song dedication and footer quote.
- Song dedication stays on one line on desktop, wraps on mobile for readability.
- Floating music control travels into the song CTA over 1.9 seconds, stretches
  during travel, fades into the CTA, and returns when the CTA leaves the viewport.
  This is a transform-based approximation of liquid merging, not a fluid shader.
- Red YouTube icon; RSVP choices differentiated by icons, colour and selection.
- Guest limit 5; inclusion note moved into the label; Home/End stepper support.

- Imported 49 original timed cues from the supplied captions (1).sbv. Both
  start/end boundaries are respected, including instrumental gaps and seeking.
- Mobile copy sizes corrected; mother's name corrected to Ratchatana's supplied
  Thai spelling; Maps casing, dedication line break and Thai player subtitle.

## Verification

- Production build and font regression check pass.
- Visual/interaction tests: 320, 414, 503, 794, 893, 1280, 1920px.
- Non-reduced-motion checks: 414px and 1401px, unfolding and docking/return.
- Nine mocked YouTube playback/lifecycle/lyrics tests pass, including 12-second
  load/start timeouts and retry. No synthetic song clock; no real RSVP submitted.
- Real-network Chromium playback verified: first two SBV cues, forward/back seek
  and an instrumental gap. Some analytics requests abort, but playback succeeds.
  This does not establish playback on every device/network or physical audio output.
- Circular gallery checked at 320, 366, 413, 681, 1049, 1401px and 844x390.
- Physical iPhone/Safari testing remains outstanding.

# One-line copy and player docking - 18 September 2026

## Implemented

- FitLine (`shared.tsx`): any sentence that must hold one line is now measured
  against its container and scaled to fit, floor 13px, instead of being set at a
  fixed px size. A hidden 100px copy of the same text is observed by a
  ResizeObserver, so the webfont swap is caught — the failure mode of the two
  earlier JS-measuring attempts.
- Where 13px would still not fit, the sentence folds at a break point authored
  in the copy (dress code, gift line 2, RSVP importance, both quote lines, the
  English confirmation lines), never wherever the browser would choose.
- Applied across the name/countdown block, venue and directions, program,
  dress code and hashtag, RSVP, gift, song dedication and footer quote, in Thai
  and English.
- The closing date block (Sunday / date / venue) is capped at 80% of the names'
  own size formula, so it can no longer out-scale them; the `.invitation-date`
  30px override that caused that has been deleted.
- Directions stack as centred columns below 600px; the RSVP Yes/No buttons stack
  full width below 480px (was 360px); the confirmation card's padding is
  40px/20px so the Thai thank-you keeps one line.
- Copy: new Thai footer quote, RSVP title, hashtag subtitle and dress-code
  sentence; gift description is two fixed lines; the song dedication is the new
  two-line wording (one line from 768px up).
- The song section starts empty: the "Pantika" heading and the "ฟังเพลง" button
  are gone, and a 56px slot sits under the dedication. When that slot rises into
  view the floating orb flies into it and becomes part of the page; tapping it
  there opens the card in place and starts the song. Scrolling the slot away
  collapses the card and flies the orb back to the corner.
- The flight is a FLIP with a spring, a shadow that lifts and settles, a small
  squash and one gold ripple on landing. The stretch, the fade into the old CTA
  and the card's 16px backdrop blur are gone.
