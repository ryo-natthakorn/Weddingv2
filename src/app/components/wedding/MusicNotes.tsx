import { useLayoutEffect, useRef, type RefObject } from "react";
import type { MotionValue } from "motion/react";

const COUNT = 5;
/* How long the notes take to fade once parked. The orbit lerps its own fade by
   hand at about the same rate, because there it already has a frame clock. */
const FADE_MS = 250;
/* Room around the staff for the part of a note that sticks out of it: the stem
   reaches ~29px above the note's origin, and the top staff line is nearer the
   top of the box than that. Without this the host would clip its own stems. */
const MARGIN = 48;

/* One persistent set of notes: orbit -> staff -> orbit, using the player's clock.

   The host anchors in the same two kinds the ring's layer does, and for the same
   reason — see the long comment above `place()` in MusicPlayer.tsx:

   - **At rest on the staff** (`docked`) the host is `position: absolute` over
     the staff, in DOCUMENT coordinates. Each note's transform is written once,
     on arrival, and the loop is cancelled: the compositor scrolls them with the
     page and JS does nothing. The host is anchored to the STAFF and not to the
     document — it only has to be scroll-invariant, and a document-sized layer
     (measured here at 414x6942, ~100 megapixels at 3x) is one a phone will
     refuse to rasterize.
   - **Travelling** — orbiting the ring, flying to the staff or flying back — it
     is `position: fixed` with the loop running, and the code below is exactly
     what it has always been. The notes are moving anyway, and the corner their
     orbit follows genuinely is viewport-fixed.

   It used to be `fixed` always, with all five transforms rewritten from the
   staff circles' live viewport rects on EVERY frame, forever. That is the ring's
   bug exactly, and the one Ryo reported here: iOS Safari always scrolls on the
   compositor thread, as do trackpad and touch momentum on desktop, so the staff
   moves at once while the notes are placed from a main-thread read that lands a
   frame or more later. They shear against the lines they are sitting on. */
export function MusicNotes({ dockTarget, orbRef, progress, active, expanded, reduceMotion, docked }: {
  dockTarget?: HTMLElement | null;
  orbRef: RefObject<HTMLDivElement>;
  progress: MotionValue<number>;
  active: boolean;
  expanded: boolean;
  reduceMotion: boolean;
  docked: boolean;
}) {
  const host = useRef<SVGSVGElement>(null);
  const notes = useRef<(SVGGElement | null)[]>([]);
  const phase = useRef(0);
  const positions = useRef<{ x: number; y: number }[]>([]);
  const opacity = useRef(0);
  const lastOrb = useRef<{ x: number; y: number } | null>(null);

  /* The opacity currently on the notes. Parked, it is written once per change
     rather than every frame, because a write — even of the same value — is
     work on a scroll. It is a cache of the DOM, so the ref callback below
     re-applies it whenever React hands back a node: a cache that is never
     re-validated is how the notes went invisible everywhere once already. */
  // Visual discovery stays visible even when YouTube playback is paused or blocked.
  const shown = useRef(0);
  const paint = (value: number) => {
    shown.current = value;
    notes.current.forEach(node => { if (node) node.style.opacity = String(value); });
  };

  const findTargets = () => Array.from(
    dockTarget?.closest("section")?.querySelectorAll<SVGCircleElement>("[data-music-note-target]") ?? [],
  );

  /* ── At rest on the staff ──
     Layout effects, not passive ones, so that this and the loop below hand over
     inside a single commit: React runs every cleanup before every setup within
     the phase, so the loop is always cancelled before the anchor changes under
     it. As passive effects they could interleave, and one frame of viewport
     coordinates written into a staff-space host throws the notes off screen. */
  useLayoutEffect(() => {
    if (!docked) return;

    const set = (svg: SVGSVGElement, prop: "left" | "top" | "width" | "height", px: number) => {
      const value = `${px}px`;
      if (svg.style[prop] !== value) svg.style[prop] = value;
    };

    const place = () => {
      const svg = host.current;
      const anchor = document.getElementById("song-staff") ?? dockTarget?.closest("section");
      if (!svg || !anchor) return;
      const box = anchor.getBoundingClientRect();
      /* The staff's box in document coordinates. Scroll is added in once, here,
         and then never consulted again — which is the whole point: everything
         below is scroll-invariant, so the browser carries it without asking JS.
         Written only when it changes, since this also runs from a
         ResizeObserver and an unconditional write would feed itself. */
      const originX = box.left + window.scrollX - MARGIN;
      const originY = box.top + window.scrollY - MARGIN;
      set(svg, "left", originX);
      set(svg, "top", originY);
      set(svg, "width", box.width + MARGIN * 2);
      set(svg, "height", box.height + MARGIN * 2);
      const targets = findTargets();
      notes.current.forEach((node, i) => {
        const rect = targets[i]?.getBoundingClientRect();
        if (!node || !rect) return;
        node.setAttribute("transform", `translate(${rect.left + rect.width / 2 + window.scrollX - originX} ${
          rect.top + rect.height / 2 + window.scrollY - originY}) scale(1)`);
      });
    };
    place();

    /* Parked, a note is only in the wrong place if the page relayouts under it:
       the staff moving or resizing, or the viewport changing. Scroll is
       deliberately NOT one of those — reacting to scroll is the bug. */
    const relayout = new ResizeObserver(place);
    const section = dockTarget?.closest("section");
    if (section) relayout.observe(section);
    relayout.observe(document.body);
    window.addEventListener("resize", place);

    return () => {
      relayout.disconnect();
      window.removeEventListener("resize", place);
      /* Hand the box back, or the viewport-fixed branch inherits a staff-sized
         host sitting at the staff's document position. */
      const svg = host.current;
      if (svg) { svg.style.left = ""; svg.style.top = ""; svg.style.width = ""; svg.style.height = ""; }
      /* Hand the orbit back its starting point in the coordinates it thinks in.
         getScreenCTM reads the note's real position on the glass whichever
         space it was last written in, so this survives the anchor swap. */
      notes.current.forEach((node, i) => {
        const matrix = node?.getScreenCTM();
        if (matrix) positions.current[i] = { x: matrix.e, y: matrix.f };
      });
    };
  }, [docked, dockTarget]);

  /* Parked, the fade is a CSS transition and one write per change. `docked`
     means the flight is over and the ring is at full opacity, so the per-frame
     getComputedStyle poll the orbit needs — to fade the notes together with a
     ring that is itself fading — has nothing to say here. */
  useLayoutEffect(() => {
    if (!docked) return;
    const target = !expanded && active ? 0.8 : 0;
    opacity.current = target;
    paint(target);
  }, [docked, expanded, active]);

  /* ── Orbiting the ring, and in flight ──
     Unchanged, deliberately: this path was working, and every frame writing its
     own opacity is what makes it heal itself no matter what React does to the
     nodes underneath. */
  useLayoutEffect(() => {
    if (docked) return;
    let frame = 0;
    let last = performance.now();
    const targets = findTargets();
    const draw = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (active && !reduceMotion) phase.current += dt * 0.38;
      const p = progress.get();
      // Read all geometry before writing SVG transforms to avoid layout thrashing.
      const orb = orbRef.current?.getBoundingClientRect();
      if (orb && orb.width > 0) lastOrb.current = { x: orb.left + orb.width / 2, y: orb.top + orb.height / 2 };
      const ringVisible = orbRef.current ? Number(getComputedStyle(orbRef.current).opacity) > 0.9 : false;
      const targetOpacity = !expanded && active && ringVisible ? 0.8 : 0;
      opacity.current = reduceMotion ? targetOpacity : opacity.current + Math.max(-dt * 4, Math.min(dt * 4, targetOpacity - opacity.current));
      const rects = targets.map(target => target.getBoundingClientRect());
      notes.current.forEach((node, i) => {
        if (!node) return;
        const angle = phase.current + i * Math.PI * 2 / COUNT;
        const x = (lastOrb.current?.x ?? 0) + Math.cos(angle) * 42;
        const y = (lastOrb.current?.y ?? 0) + Math.sin(angle) * 42;
        const rect = rects[i];
        const destX = rect ? rect.left + rect.width / 2 : x;
        const destY = rect ? rect.top + rect.height / 2 : y;
        const desired = { x: x + (destX - x) * p, y: y + (destY - y) * p - Math.sin(p * Math.PI) * 24 };
        const old = positions.current[i] ?? desired;
        const blend = reduceMotion || p >= 0.999 || opacity.current === 0 ? 1 : 1 - Math.exp(-dt * 14);
        const pos = { x: old.x + (desired.x - old.x) * blend, y: old.y + (desired.y - old.y) * blend };
        positions.current[i] = pos;
        const scale = 0.55 + p * 0.45;
        node.setAttribute("transform", `translate(${pos.x} ${pos.y}) scale(${scale})`);
        node.style.opacity = String(opacity.current);
      });
      shown.current = opacity.current;
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [docked, dockTarget, orbRef, progress, active, expanded, reduceMotion]);

  /* The anchor is a render decision, so React has already applied it by the time
     the effects above run — no imperative style juggling, and no frame where the
     host is positioned one way and its children written the other. Parked,
     left/top/width/height are owned by place(), which runs before paint. */
  const anchor = docked
    ? { position: "absolute", overflow: "visible" } as const
    : { position: "fixed", inset: 0, width: "100%", height: "100%", overflow: "hidden" } as const;

  return <svg ref={host} aria-hidden="true" data-music-notes="" data-music-notes-parked={docked}
    style={{ ...anchor, pointerEvents: "none", zIndex: 999 }}>
    {Array.from({ length: COUNT }, (_, i) => <g key={i} data-music-note={i}
      /* Re-apply the opacity React just reset to 0 with this style prop. The
         node is new to React on every attach, and it must not come back
         invisible while something else believes it is showing. */
      ref={node => { notes.current[i] = node; if (node) node.style.opacity = String(shown.current); }}
      style={{ opacity: 0, transition: docked ? `opacity ${reduceMotion ? 0 : FADE_MS}ms linear` : "none" }}>
      <path d="M7.2 -1 L7.6 -29" stroke="#8A7030" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <ellipse rx="8" ry="5.6" fill="#8A7030" transform="rotate(-22)" />
    </g>)}
  </svg>;
}
