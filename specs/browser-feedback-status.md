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

# The ring's journey, and a sealed envelope - 19 September 2026

## Implemented

- The wedding ring is now the thing that carries the invitation. One ring makes
  one trip: the slider thumb the guest drags to open the card, then the focal
  point between the bride's and the groom's names, then the music control in the
  bottom-right corner, then docked into "Our Song" and back. It is the same
  element throughout — the intro hands over the thumb's last box on screen and
  the ring picks the journey up from exactly there.
- Between the names it is NOT a control. No button, no play glyph, no tap
  target, no shake, no label, and the card cannot be opened by tap, by keyboard
  or through the player's public `open()` handle. It is a wedding ring sitting
  in a wedding invitation. The player's behaviour switches on only at the corner.
- The names slot keeps its room whether the ring is home or away, so the two
  names never move.
- Every leg is one gentle tween, 1.2s, ease [0.22, 1, 0.36, 1], with a 20px bow
  off the straight line so it curves rather than slides. **No rotation on any
  leg, in any state** — the "ควงสว่าน" is gone and the spec asserts its absence
  numerically. Size changes between the resting sizes (80px on the slider, up to
  120 between the names, 72 in the corner) ride the same tween as a transform,
  so nothing reflows mid-flight.
- The dock machinery was generalised rather than duplicated: the old boolean
  dock became a four-anchor home, and the FLIP, the scroll correction and the
  "never move house while the card is open" rule now run per leg. Only the
  corner <-> song legs can have a card open to defer.
- The corner ring is 72px, not the 56 the gold disc used. The artwork is a slim
  knot ring inside a landscape frame, so `object-fit: contain` in a square box
  leaves the ring about two thirds of the box wide; at 56 it read as a speck.
  The song section's dock slot grew from 56 to 72 to match.
- No play glyph on the ring. A white triangle over pale metal was invisible, and
  giving it a disc to sit on is exactly the solid gold circle that was cut.
  "play me" carries the idle state, the pulse ring carries playback, and
  buffering keeps a small dark spinner because silence after a tap needs an
  answer. Tapping opens the card, which has a full play/pause.
- The petal/note trail that drew the eye to the player is deleted outright. Its
  job passes to the ring itself: a nudge (±5 degrees and a few px, 0.7s, every
  2.5s — deliberately stronger than the envelope's) with "play me" above it, at
  the corner only, retiring after 30 seconds or on first engagement. This
  departs from the "Petal Trail" named in CLAUDE.md, at Ryo's request.
- The intro's own falling petals are untouched: they are weather on the cover,
  not the attention cue that was cut.
- Music notes now belong to the song. Three drift off the ring on the press that
  starts playback, and the staff in "Our Song" fills only while the song is
  playing — not merely on arrival. Pause, or scroll the ring away, and the notes
  leave with it.
- Envelope: the seal is sealing-wax red with a white heart, where it was gold
  with cream. It nudges once a second (0.75s of movement, 0.25s still) instead
  of once every 3.35. And it reads as closed: the flap is a triangle with zero
  height at its left and right edges and the pocket's V only starts 12% down, so
  a band of the near-white body showed between them and read as lining. A front
  face in the flap's own tone now covers the whole body while closed, and fades
  as the flap lifts.

## Verification

- Production build clean.
- `specs/motion-feedback-check.mjs` at 414 and 1401px, motion on, with playback
  mocked (the staff follows the song now, and YouTube is unreachable here): the
  ring is not a button between the names and is one at the corner; across 30
  samples in flight its transform carries no rotation and no squash and its
  shadow never swells; the path bows off the straight line; each leg takes at
  least 700ms; and the staff holds 0 notes before playback, 5 during, 0 after a
  pause.
- `specs/music-docking-check.mjs`, rewritten as the whole journey, at 414px with
  reduced motion off and on: the hand-over from the slider, the rest between the
  names, the move to the corner, docking and the return — with the card open on
  both legs where a card can exist. It also proves that tapping or Entering the
  ring between the names opens nothing and moves nothing, that the names' gap is
  the same size whether the ring is home or away, and that six fast flicks leave
  exactly one ring and no orphaned card.
- `specs/music-player-check.mjs` (10 tests) passes; its "open the card" helper
  now takes the ring to the corner first, since it is not a button before that.
  The same applies to the invitation-visual, one-line-copy and circular-gallery
  specs, which used that button as their "the invitation is open" probe and now
  wait for the hand-over instead.
- `captions`, `intro-layout` and `refine-regression` pass unchanged.
- Reviewed by hand at 414px, dpr 3: the ring at rest between the names, the ring
  at the corner with "play me", and the envelope closed, mid-nudge and open.
- Physical iPhone 13 / iPhone 11 testing remains outstanding (CLAUDE.md rule).
  The three legs and the strength of the nudge are judged there, not here.

# The ring's stutter under the names - 20 September 2026

## The finding

Ryo: scrolling down, the ring resting between the names stutters where it
should sit still, on desktop and phone alike.

Two hypotheses were measured before anything was changed, and **both of the
obvious ones were wrong**, which is why they were measured rather than assumed:

- *Render cost.* `Ring.svg` is 463 KB and carries a `drop-shadow`, and this repo
  has been bitten by exactly that before (the gallery prints, 16 September).
  Measured with the ring parked at the names and the page scrolled back and
  forth so it never flies: under 6x CPU throttling, 32 frames over 24ms as
  shipped, 31 with the filter forced off, 27 with the ring hidden altogether.
  The ring is close to free and the filter makes no measurable difference.
- *Drift at rest.* At the names anchor the ring's offset from its slot is 0,0
  and its scale constant, unchanged for a whole scroll. It does not move.

The cause was **leg one**. The hand-over fired the instant the intro finished
and sent the ring toward a slot still a screenful below, over a 3-second
travel. Any guest who starts scrolling as the invitation opens — most of them,
since the flight is still running — was watching a ring travel down the
viewport while the page travelled up, then turn back. Measured at 414px before
the fix: 429px of downward drift, worst single step 43px.

Underneath it sat a real bug. The flight's scroll correction chose its
direction from the DESTINATION alone (`home === "corner" ? -1 : 1`), but the
correction depends on both ends: only the corner is viewport-fixed, so
corner→slot is +1, slot→corner is −1, and **slot→slot is 0**, because two
things that move together never change their separation. That third case had no
representation, so the hand-over was given a corner departure's +1 and had its
start point dragged down the page. `names→song` and `song→names` carried the
same latent error.

## Implemented

- The scroll correction is derived from both ends of the trip; a `fromRef`
  records the departure and the zero case is handled.
- A `hero` waypoint was added here and **removed again the same day** — see the
  next entry. It held the ring in viewport-fixed coordinates, which made it ride
  along with the guest instead of travelling with the page.
- Measured after the fix, 414px and 1280px: worst downward step 0px, the ring
  lands on its slot exactly, and it then holds 0px of offset across twelve
  further scroll steps.

Not changed: `FLIGHT.duration` stays at the 3s chosen on 20 September. Making
it follow the distance was tried and reverted — `music-handoff-check` requires
a leg to still be in the air 1.6s after it starts, which is how "slow enough to
watch" is pinned down, and a short hop under that rule undercut it. The cost is
that the hero→names hop takes the full 3s for ~60px, so the ring eases in
rather than arriving briskly.

## Verification

- `specs/motion-feedback-check.mjs` gains the regression guard: once landed,
  twelve scroll steps must not move the ring one pixel relative to its slot. It
  also asserts the ring holds in the hero rather than diving.
- `specs/music-docking-check.mjs` covers the hand-over's two beats;
  `specs/music-player-check.mjs` walks the ring to the corner before expecting a
  control, since it is not one before that.
- Green: motion-feedback (414/1401), music-docking (motion on and off),
  music-handoff, music-player (10), one-line-copy (24), intro-layout, captions,
  refine-regression.
- **Already red on `main` before this change, and still red:**
  `invitation-visual-check` ("the floating player docks into the song section")
  and `circular-gallery-check` ("autorotation"). Both were verified failing at
  `8931e12` with this change stashed, so they belong to the ring-layer rework,
  not to this fix. They need their own pass.
- Physical iPhone testing still outstanding — this was reported on a real
  device, so that is where it has to be confirmed.

# The ring floats down, it does not ride along - 20 September 2026

## The finding

Ryo, on the waypoint added earlier today: the ring should not stop dead after
unlock and sit in the hero. It should float down and wait at the names. Holding
it in the hero pinned it to the glass, so it followed the guest down the page —
"เลื่อนตามไปแปะตามคนใช้".

He is right, and the waypoint was the wrong mechanism for the right bug. The
actual fault was only ever the scroll correction, which took its direction from
the destination alone when it depends on both ends: the corner is the only
viewport-fixed anchor, so corner->slot is +1, slot->corner is -1, and slot->slot
is 0, because two things that ride with the page never change their separation.
The hand-over is slot->slot — the box the slider reports is a position on the
page, the overlay having unmounted with the page back at the top — and giving it
a corner departure's +1 dragged its start point down the screen. That is what
made the ring descend, reverse and come back.

## Implemented

- The `hero` waypoint is gone. The hand-over flies straight to the names again,
  as originally asked for: the ring leaves the slider, descends through the
  document while the guest scrolls, and settles between the names to wait.
- The both-ends correction stays; `intro` is deliberately not counted as
  viewport-fixed, which is what makes the hand-over the zero case.
- Measured scrolling steadily from the moment the invitation opens, 414px and
  1280px: the gap between ring and slot closes from -761px to 0 with **zero sign
  flips and zero steps where the gap grew**. It never backs off and never
  overshoots.

## Verification

- `specs/motion-feedback-check.mjs` now asserts the shape of the fix rather than
  a waypoint: across 60 scroll steps the gap may only shrink, the ring may never
  cross past its slot, and a scroll must change its screen position — that last
  one is the guard against pinning it to the viewport again. The stillness check
  once landed stays.
- `specs/music-docking-check.mjs` back to a single hand-over beat.
- Green: motion-feedback (414/1401), music-docking (motion on and off),
  music-handoff, music-player (10), one-line-copy (24), intro-layout, captions,
  refine-regression.
- **Still red on `main` from before any of this**, verified at `8931e12` with
  these changes stashed: `invitation-visual-check` ("the floating player docks
  into the song section") and `circular-gallery-check` ("autorotation"). They
  belong to the ring-layer rework and need their own pass.
