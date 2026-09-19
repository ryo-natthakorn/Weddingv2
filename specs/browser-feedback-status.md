# Invitation feedback - 16 September 2026

## Implemented

- Section labels: 30px; Sunday: 30px; venue in the date block: 28px.
- Dress-code subtitle is smaller than its section heading.
- Removed the visible pre-wedding subtitle.
- One normal-scroll gallery: stamp stack unfolds once at 60% visibility over
  1.8 seconds, then rotates at 3 degrees/second. No book, categories or pinning.
- Three.js perspective projection drives upright DOM photo buttons via Motion
  Values. Front photos stay larger; the back of the ring may be obscured.
- The whole ring is visible again. It is sized from the ring's own on-screen
  width, which is affordable only because the camera sits close at 1.8 radii:
  strong perspective shrinks the far side hard, narrowing the ring and leaving
  the near print room to stay reasonably large. At 414px the front print is
  124px and the stage 242px tall. `?ring=clipped` still shows the previous
  arrangement, where only the front print had to fit and the ring ran past the
  stage edges at 248px; remove that override once the look is settled.
- Prints are spaced 1.25 print widths apart, not 1.06. The old value was the
  least that keeps two prints clear at the symmetric position, where they
  straddle the front at equal depth and a z-order tie would pop; it never kept
  them apart at rest, where neighbours overlapped the front print by about 14px.
  That occlusion is correct, but two sheets of the same warm-white paper with
  the same perforated edge gave the eye nothing to read it by, so the three
  front prints merged into one mass. A soft halo around each print was tried as
  the alternative and rejected: real spacing reads cleaner.
- The far side rides above the near one, so the blurred back row stays visible
  instead of hiding behind the front print.
- The print casts its shadow on the page instead of wearing one around its
  outline. The old drop-shadow filter traced the perforated silhouette but was
  re-derived on every scale change, once a frame per print, and cost roughly a
  quarter of the frame budget. Replacing it with a box-shadow was cheap but
  wrong: a box-shadow traces the border box, so a straight-edged band sat around
  a notched stamp and read as a second rectangular layer under it, which is what
  Ryo spotted on the phone. A soft ellipse cast under the print cannot disagree
  with the silhouette, because it never follows it, and needs no filter.
  Measured at 414px under 6x CPU throttling, over repeated 3s runs: about 170
  frames with no filter against about 130 with it, on prints three times the
  former area. Run-to-run spread is around a dozen frames and drifts with
  machine load, so compare interleaved runs only; on that basis the cast shadow
  is free, and the new ring and the old smaller one are indistinguishable.
- Perforation mask ramp widened from 0.35px to 0.9px. A gradient mask is sampled
  per pixel with no anti-aliasing, so the old ramp fell under one device pixel
  even at dpr 3 and the notch arcs stair-stepped into cream specks along the
  edge. The drop-shadow used to blur that away. No measurable frame cost.
- Autorotation also pauses while the page is scrolling, and a mostly vertical
  drag is handed back to the page scroller instead of turning the ring.
- The ?gallery=webgl prototype, GalleryWebGL.tsx and the three dependency are
  removed; the DOM ring is the only renderer.
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
- The staff of notes has depth: three tiers of size and weight, a soft warm
  shadow under each note, a shallow tilt, and scroll parallax so the nearer
  notes travel further. The notes hop outward from the middle when the orb
  lands, a small note leaves the player on every lyric line while the song
  plays, and touching a note plucks it (bounce + ripple).

## Verification

- Production build clean.
- New `specs/one-line-copy-check.mjs`: 320/360/375/390/412/414/430/540/600/768/
  820/1000px in Thai and English, idle, RSVP form, confirmation and open
  envelope — every fitted block renders the line count it claims, nothing
  overflows, nothing falls under 13px, and the date block stays under the names.
  No RSVP leaves the browser (https aborted plus a cross-origin fetch stub).
- `specs/motion-feedback-check.mjs` (414 and 1401px, motion on): the flight is
  visible rather than a cut, the orb lands inside the section, the card opens in
  the slot and pushes the page down, nothing in the player is blurred, and the
  orb returns to the corner when the slot leaves the viewport.
- `specs/invitation-visual-check.mjs` and `specs/music-player-check.mjs` pass
  unchanged in substance; gallery, intro, captions and regression specs pass.
- Screenshots at 320/390/414/768px in both languages reviewed by hand.
- Docking, plucking and the per-lyric notes checked at 414px with reduced motion
  both off and on; the lyric notes were driven with the mocked player, since
  YouTube is unreachable from this environment.
- Physical iPhone 13 / iPhone 11 testing remains outstanding (CLAUDE.md rule).

# Ring motion and the notes - 19 September 2026

## Implemented

- The floating player's pseudo-3D is gone. The orb no longer lifts off the page
  during its flight, no longer squashes on landing, and its shadow no longer
  swells in the air: one warm shadow, `0 8px 24px rgba(138,112,48,0.35)`, at
  rest, in flight and after landing. The gold ripple on arrival stays — it is
  ink, not physics.
- The flight is 1.1 seconds, not 0.62. At the old speed it was over before the
  eye found it, and the lift-and-squash was covering for that. It is still a
  tween rather than a spring, because the guest is mid-scroll throughout and a
  spring's overshoot on top of the page's own movement reads as a yank.
- What replaces the lift is a flat arc: the orb bows 28px off the straight line
  between the corner and the slot, peaking at mid-flight and exactly zero at
  both ends, so the FLIP still lands on the pixel. It curves across the page
  instead of hopping above it.
- The card and the orb trade places over 0.3s rather than 0.18s, with the card's
  spring softened to 190/24 and its exit at 0.34s. Nothing about the player now
  moves too fast to watch.
- A dock decision taken while the card is open still closes the card first, but
  the flight now starts 140ms after the card has finished folding rather than in
  the same frame. Closing and launching together read as one violent event, as
  if scrolling had broken something; separated, it reads as two.
- The nine gold petals drifting into the button are now nine gold music notes,
  and they no longer land on it. Each one has its own angle and comes to rest on
  a circle of radius 76px around the orb — fading out as it arrives — so the
  nearest point of any note stays at least 40px from the orb's centre, i.e.
  clear of the 56px disc, its 2.6s glow and its pulse ring. They used to animate
  to x:0, y:0, which is the button's own centre.
  This departs from the "Petal Trail" named in CLAUDE.md, at Ryo's request: the
  notes are the same notes that settle on the staff below, and reading as one
  object across the two sections is the point of the change.
- "Our Song" starts with an empty staff. The five notes printed on it from the
  start are gone, and so is the depth they were given last week — three size and
  opacity tiers, a soft shadow under each note, scroll parallax, and the pluck.
  That was decoration standing in for a story.
- Instead the staff is filled by the player: when the orb docks into the slot,
  five notes rise from where it is standing and settle onto the lines, 110ms
  apart, with a 3px settle and nothing else. Scrolling back up lifts them off
  again from the outside in, so they leave with the orb. The shallow 8-degree
  tilt of the staff itself stays — that is depth of field, not the 3D that was
  cut. The per-lyric note that leaves the player while the song plays stays too;
  it is the section's only sign that the song is running.
- `MusicNote` lives in `shared.tsx` now, so the trail, the staff and the lyric
  notes are literally the same drawing.

## Verification

- Production build clean.
- `specs/motion-feedback-check.mjs` at 414 and 1401px, motion on, extended: the
  orb's computed box-shadow is identical across 24 samples in flight and at
  rest; its transform carries no vertical scale; the path bows off the straight
  line between departure and arrival; across 60 sampled frames no note in the
  trail comes within 40px of the orb's centre; and the staff carries no notes
  before docking, five after, and none again once the slot leaves the viewport.
  The floor on the trip's duration is now 700ms, where it was 150ms.
- New `specs/music-docking-check.mjs` at 414px, with reduced motion both off and
  on — the moving house, in all four combinations: down and back up, with the
  card closed and with the card open. It asserts the card folds rather than
  travelling, the orb lands inside the slot, the return puts it back within 60px
  of the corner, and six fast flicks through the section leave exactly one orb
  and no card behind.
- `specs/music-player-check.mjs`, `invitation-visual-check`, `one-line-copy-check`,
  `circular-gallery-check`, `captions-check`, `intro-layout-check` and
  `refine-regression-check` all pass unchanged.
- Screenshots at 414px reviewed by hand: a trail note close up at dpr 3, the orb
  mid-flight bowed off its line, and the five notes at rest on the staff.
- Physical iPhone 13 / iPhone 11 testing remains outstanding (CLAUDE.md rule) —
  the flight's new length is the thing to judge there.
