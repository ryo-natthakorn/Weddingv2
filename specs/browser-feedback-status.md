# Invitation feedback - 15 September 2026

## Implemented

- Section labels: 30px; Sunday: 30px; venue in the date block: 28px.
- Dress-code subtitle is smaller than its section heading.
- Removed the visible pre-wedding subtitle.
- Gallery entrance now follows scroll position; reduced-motion skips the morph.
- Overview groups use stamp-album pages, chapter labels and preserved photo order.
- Full-colour Google Maps asset; centred car symbol; revised parking/MRT copy.
- Gift description and tap label; revised song dedication and footer quote.
- Song dedication stays on one line on desktop, wraps on mobile for readability.
- Floating music control travels into the song CTA over 1.8 seconds, stretches
  during travel, fades into the CTA, and returns when the CTA leaves the viewport.
  This is a transform-based approximation of liquid merging, not a fluid shader.
- Red YouTube icon; RSVP choices differentiated by icons, colour and selection.
- Guest limit 5; inclusion note moved into the label; Home/End stepper support.

## Awaiting User Assets

- Exact Orbit Flip Slider Ring implementation: the Component.tsx source on
  https://21st.dev/@hyperiux/components/orbit-flip-slider requires sign-in/unlock.
  Current ring remains the custom photo carousel, not the original 3D Ring.
- Real Pantika lyrics with timestamps (.lrc/.srt or text). Removed the previous
  invented English placeholder lyrics; do not ship them as the song's lyrics.

## Verification

- Production build and font regression check pass.
- Visual/interaction tests: 320, 414, 503, 794, 893, 1280, 1920px.
- Non-reduced-motion checks: 414px and 1401px, scroll morph and docking/return.
- Six mocked YouTube playback/lifecycle tests pass; no real RSVP submitted.
- Physical iPhone/Safari testing remains outstanding.
