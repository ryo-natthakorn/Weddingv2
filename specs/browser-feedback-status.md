# Invitation feedback - 16 September 2026

## Implemented

- Section labels: 30px; Sunday: 30px; venue in the date block: 28px.
- Dress-code subtitle is smaller than its section heading.
- Removed the visible pre-wedding subtitle.
- One normal-scroll gallery: stamp stack unfolds once at 60% visibility over
  1.8 seconds, then rotates at 3 degrees/second. No book, categories or pinning.
- Three.js perspective projection drives upright DOM photo buttons via Motion
  Values. Front photos stay larger; the back of the ring may be obscured.
- Ring geometry is derived from the front print rather than fitted to the
  viewport: neighbours meet edge to edge, the ring runs past the stage edges and
  the stage clips it. Phone prints are about three times their former area and
  no longer pile up half-overlapped. The far side rides above the near one, so
  the blurred back row stays visible instead of hiding behind the front print.
- The print's shadow is a static box-shadow, not a drop-shadow filter over the
  perforated mask; the filter was re-derived on every scale change and cost
  roughly a quarter of the frame budget. Measured at 414px under 6x CPU
  throttling, over repeated 3s runs: about 170 frames with the filter gone
  against about 130 with it, on prints three times the former area. Run-to-run
  spread is around a dozen frames, so only that 40-frame gap is meaningful; the
  new ring and the old smaller one are indistinguishable from each other.
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
