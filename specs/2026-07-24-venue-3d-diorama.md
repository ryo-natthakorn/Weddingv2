# Spec: Venue 3D Diorama (Three.js)

**Date:** 2026-07-24
**Status:** Approved (implementation in progress — batch 1/5 shipped)
**Type:** Feature

## Problem
The Venue section currently shows a static photo card with an "Open in Google Maps" button. Ryo wants guests to be able to explore the venue, car parking, and the nearest MRT Pink Line station in a 3D view — without Google Maps Platform, which would require a billing account, an API key, and carries WebGL/coverage risk in the LINE in-app browser on iOS.

## Project constraints that apply
- Preserve the watercolor/handmade cream-peach-teal-gold-sage aesthetic ("homey," not formal).
- Primary target is iOS Safari and LINE's in-app WebKit browser — anything WebGL-based must be tested there before shipping.
- `motion` package is imported as `motion/react`, not `framer-motion`.
- Don't touch the Hero section — treat as locked.
- No new paid/billed external services (explicit request: avoid Google Cloud entirely).
- `overflow: hidden` on zero-width absolute containers is unreliable on iOS Safari — use `clipPath: "inset(0)"` instead if this pattern comes up.
- Tailwind's `bg-background` shorthand resets `background-image` — avoid it if a texture layer is needed in this component.
- IntersectionObserver refs must sit on the specific target container, not the enclosing section.
- Follow the existing planning-first process: implement in small batches, verify on Ryo's phone (Safari + LINE) between batches.

## Assumptions
- Nearest MRT: Ram Inthra Kor Mor 6 station (PK22), near Nuan Chan Intersection — confirmed by Ryo.
- Venue and parking layout will be stylized/relative (venue block, parking area, road, MRT marker), not GPS-accurate — Ryo should sanity-check relative direction/distance against a real map before this ships.
- New self-contained component (`VenueDiorama.tsx`) added alongside the existing photo card; the card and "Open in Google Maps" button stay as-is for guests who want real directions.
- Interaction: drag-to-rotate, pinch/scroll-to-zoom, camera constrained so guests can't get lost in the scene.
- Library: plain `three` (no `@react-three/fiber`) to keep the bundle smaller.
- Building geometry should resemble the real SailomSangdad silhouette (confirmed with Ryo during planning), not a generic stand-in — see Batch 2.

## Proposed change
Add a low-poly, stylized 3D diorama built with `three`, rendered in a `<canvas>` in a new component in the Venue section:
- Simplified house/venue block matching the reference photo's silhouette, in the site's palette.
- Parking area with a few simple car shapes.
- Road connecting the venue to an MRT marker labeled "Ram Inthra Kor Mor 6" (Pink Line).
- Soft/flat lighting, no photoreal textures — optionally a subtle grain/paper overlay to tie it to the rest of the site.
- No external tile service or network requests at runtime — everything is authored geometry.
- Robustness spine (added during planning, non-negotiable for the LINE/iOS target): lazy-load the three.js chunk so it never touches the initial bundle; feature-detect WebGL before mounting; wrap in a React error boundary so a runtime failure falls back silently to the existing photo card.

## Out of scope
- Hero section (locked).
- Real-world GPS accuracy / satellite imagery.
- Replacing the existing "Open in Google Maps" button.
- Gift section overlap fix, RSVP backend, spacing normalization — separate open items.
- `@react-three/fiber` / `drei` (deliberately avoided to keep the bundle small).

## Batches
Batch 1: Install `three`, scaffold `VenueDiorama.tsx` with a lazy-loaded, WebGL-detected, error-bounded canvas (camera/lights/ground plane/OrbitControls); confirm it mounts and renders on desktop and on Ryo's phone in Safari + LINE. **This is the go/no-go gate** — if janky/crashes on LINE/iOS, stop and fall back rather than continue.
Batch 2: Build the venue house block (matching the real SailomSangdad silhouette — gabled terracotta roof, round gable window, sage accent panel, gold arched door, lower right wing) + ground plane in the site's palette; check proportions against the reference photo.
Batch 3: Add parking area, cars, road, and MRT marker with label; verify layout and drag/zoom feel.
Batch 4: Style pass — lighting, texture/grain, mobile sizing, loading state.
Batch 5: Integrate into the Venue section layout next to the existing photo card; check full section spacing.

## Verification
- `npm run build` passes with zero errors after each batch.
- Manual test on Ryo's phone in Safari and in LINE's in-app browser after Batches 1, 3, and 5 at minimum — smooth rotate/zoom, no WebGL crash, acceptable load time.
- Initial-bundle check: three.js must not appear in the initial chunk (only loads once the venue scrolls into view).
- Palette check: diorama doesn't clash with the photo card above/below it.
- Reduced-motion check: idle auto-rotate stops with "reduce motion" enabled; drag still works.
- Confirm "Ram Inthra Kor Mor 6" label and relative position read sensibly against a real map before calling this done.

## Progress log
- **Batch 1 (shipped, commit dd7dfbe):** `three` installed; `VenueDiorama.tsx` scaffolded with lazy-load (verified as a separate ~531kB chunk, main bundle unchanged), WebGL feature-detect (`hasWebGL`) and `ErrorBoundary` added to `shared.tsx`, ground plane + warm lights + clamped/damped OrbitControls with reduced-motion-aware auto-rotate, off-screen render pause, and iOS WebGL context-loss recovery. Mounted in the Venue section between the photo card and the directions list. `npm run build` passes. **Awaiting Ryo's phone verification (Safari + LINE) before Batch 2 starts.**
