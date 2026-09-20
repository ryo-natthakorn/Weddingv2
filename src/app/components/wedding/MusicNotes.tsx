import { useLayoutEffect, useRef, type RefObject } from "react";
import type { MotionValue } from "motion/react";

const COUNT = 5;
/* How long the notes take to fade in or out once they are parked. The
   travelling branch below lerps the same fade by hand, at a rate that works out
   about the same, because there it already has a frame clock in its hand. */
const FADE_MS = 250;

/* One persistent set of notes: orbit -> staff -> orbit, using the player's clock.

   The host anchors in the same two kinds the ring's layer does, and for the same
   reason — see the long comment above `place()` in MusicPlayer.tsx:

   - **At rest on the staff** (`docked`) the host is `position: absolute` at the
     document origin, so SVG user space IS document space. Each note's transform
     is written once, on arrival, and the loop is cancelled. The compositor
     scrolls them with the page and JS does nothing at all.
   - **Travelling** — orbiting the ring, flying to the staff or flying back — it
     stays `position: fixed` with the loop running. The notes are moving anyway,
     and the corner their orbit follows genuinely is viewport-fixed.

   It used to be `fixed` always, with all five transforms rewritten from the
   staff circles' live viewport rects on EVERY frame, forever. That is the ring's
   bug exactly, and the one Ryo reported here: iOS Safari always scrolls on the
   compositor thread, as do trackpad and touch momentum on desktop, so the staff
   moves at once while the notes are placed from a main-thread read that lands a
   frame or more later. They shear against the lines they are sitting on. */
export function MusicNotes({ dockTarget, orbRef, progress, playing, expanded, reduceMotion, docked }: {
  dockTarget?: HTMLElement | null;
  orbRef: RefObject<HTMLDivElement>;
  progress: MotionValue<number>;
  playing: boolean;
  expanded: boolean;
  reduceMotion: boolean;
  docked: boolean;
}) {
  const notes = useRef<(SVGGElement | null)[]>([]);
  const phase = useRef(0);
  const positions = useRef<{ x: number; y: number }[]>([]);
  const opacity = useRef(0);
  const lastOrb = useRef<{ x: number; y: number } | null>(null);

  /* Opacity is written only when the value actually changes. Parked, that is
     what makes "scrolling does no work" true: assigning the same opacity still
     mutates the style attribute, and the guard counts mutations, not values. */
  const shown = useRef<number | null>(null);
  const paint = (value: number) => {
    if (shown.current === value) return;
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
     coordinates written into a document-space host throws the notes off screen. */
  useLayoutEffect(() => {
    if (!docked) return;

    const place = () => {
      const targets = findTargets();
      notes.current.forEach((node, i) => {
        const rect = targets[i]?.getBoundingClientRect();
        if (!node || !rect) return;
        /* Document coordinates. Scroll is added in once, here, and then never
           consulted again — which is the whole point: the note's transform is
           scroll-invariant, so the browser can carry it without asking JS. */
        const x = rect.left + rect.width / 2 + window.scrollX;
        const y = rect.top + rect.height / 2 + window.scrollY;
        node.setAttribute("transform", `translate(${x} ${y}) scale(1)`);
      });
    };
    place();

    /* Parked, a note is only in the wrong place if the page relayouts under it:
       the staff moving or resizing, or the viewport changing. Scroll is
       deliberately NOT one of those — reacting to scroll is the bug. */
    const relayout = new ResizeObserver(place);
    const staff = dockTarget?.closest("section");
    if (staff) relayout.observe(staff);
    relayout.observe(document.body);
    window.addEventListener("resize", place);

    return () => {
      relayout.disconnect();
      window.removeEventListener("resize", place);
      /* Hand the orbit back its starting point in the coordinates it thinks in.
         getScreenCTM reads the note's real position on the glass whichever
         space it was last written in, so this survives the anchor swap. */
      notes.current.forEach((node, i) => {
        const matrix = node?.getScreenCTM();
        if (matrix) positions.current[i] = { x: matrix.e, y: matrix.f };
      });
    };
  }, [docked, dockTarget]);

  /* Parked, the fade is a CSS transition and one write per change rather than a
     value rewritten every frame. `docked` means the flight is over and the ring
     is at full opacity, so the per-frame getComputedStyle poll that the orbit
     needs — to fade the notes together with a ring that is itself fading — has
     nothing to say here. */
  useLayoutEffect(() => {
    if (!docked) return;
    const target = !expanded && playing ? 0.8 : 0;
    opacity.current = target;
    paint(target);
  }, [docked, expanded, playing]);

  /* ── Orbiting the ring, and in flight ── */
  useLayoutEffect(() => {
    if (docked) return;
    let frame = 0;
    let last = performance.now();
    const targets = findTargets();
    const draw = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (playing && !reduceMotion) phase.current += dt * 0.38;
      const p = progress.get();
      // Read all geometry before writing SVG transforms to avoid layout thrashing.
      const orb = orbRef.current?.getBoundingClientRect();
      if (orb && orb.width > 0) lastOrb.current = { x: orb.left + orb.width / 2, y: orb.top + orb.height / 2 };
      const ringVisible = orbRef.current ? Number(getComputedStyle(orbRef.current).opacity) > 0.9 : false;
      const targetOpacity = !expanded && playing && ringVisible ? 0.8 : 0;
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
      });
      paint(opacity.current);
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [docked, dockTarget, orbRef, progress, playing, expanded, reduceMotion]);

  /* The anchor is a render decision, so React has already applied it by the time
     the effects above run — no imperative style juggling, and no frame where the
     host is positioned one way and its children written the other. */
  const anchor = docked
    ? { position: "absolute", left: 0, top: 0, width: 0, height: 0, overflow: "visible" } as const
    : { position: "fixed", inset: 0, width: "100%", height: "100%", overflow: "hidden" } as const;

  return <svg aria-hidden="true" data-music-notes="" data-music-notes-parked={docked}
    style={{ ...anchor, pointerEvents: "none", zIndex: 999 }}>
    {Array.from({ length: COUNT }, (_, i) => <g key={i} ref={node => { notes.current[i] = node; }} data-music-note={i}
      style={{ opacity: 0, transition: docked ? `opacity ${reduceMotion ? 0 : FADE_MS}ms linear` : "none" }}>
      <path d="M7.2 -1 L7.6 -29" stroke="#8A7030" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <ellipse rx="8" ry="5.6" fill="#8A7030" transform="rotate(-22)" />
    </g>)}
  </svg>;
}
