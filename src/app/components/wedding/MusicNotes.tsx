import { useEffect, useRef, type RefObject } from "react";
import type { MotionValue } from "motion/react";

// One persistent set of notes: orbit -> staff -> orbit, using the player's clock.
export function MusicNotes({ dockTarget, orbRef, progress, playing, expanded, reduceMotion }: {
  dockTarget?: HTMLElement | null;
  orbRef: RefObject<HTMLDivElement>;
  progress: MotionValue<number>;
  playing: boolean;
  expanded: boolean;
  reduceMotion: boolean;
}) {
  const notes = useRef<(SVGGElement | null)[]>([]);
  const phase = useRef(0);
  const positions = useRef<{ x: number; y: number }[]>([]);
  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    const targets = Array.from(dockTarget?.closest("section")?.querySelectorAll<SVGCircleElement>("[data-music-note-target]") ?? []);
    const draw = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (playing && !reduceMotion) phase.current += dt * 0.38;
      const p = progress.get();
      // Read all geometry before writing SVG transforms to avoid layout thrashing.
      const orb = orbRef.current?.getBoundingClientRect();
      const rects = targets.map(target => target.getBoundingClientRect());
      notes.current.forEach((node, i) => {
        if (!node) return;
        const angle = phase.current + i * Math.PI * 2 / 5;
        const x = (orb ? orb.left + orb.width / 2 : window.innerWidth - 60) + Math.cos(angle) * 42;
        const y = (orb ? orb.top + orb.height / 2 : window.innerHeight - 60) + Math.sin(angle) * 42;
        const rect = rects[i];
        const destX = rect ? rect.left + rect.width / 2 : x;
        const destY = rect ? rect.top + rect.height / 2 : y;
        const desired = { x: x + (destX - x) * p, y: y + (destY - y) * p - Math.sin(p * Math.PI) * 24 };
        const old = positions.current[i] ?? desired;
        const blend = reduceMotion ? 1 : 1 - Math.exp(-dt * 14);
        const pos = { x: old.x + (desired.x - old.x) * blend, y: old.y + (desired.y - old.y) * blend };
        positions.current[i] = pos;
        const scale = 0.55 + p * 0.45;
        node.setAttribute("transform", `translate(${pos.x} ${pos.y}) scale(${scale})`);
        node.style.opacity = expanded || !playing ? "0" : "0.8";
      });
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [dockTarget, orbRef, progress, playing, expanded, reduceMotion]);

  return <svg aria-hidden="true" data-music-notes="" style={{ position: "fixed", inset: 0, width: "100%", height: "100%", overflow: "hidden", pointerEvents: "none", zIndex: 999 }}>
    {Array.from({ length: 5 }, (_, i) => <g key={i} ref={node => { notes.current[i] = node; }} data-music-note={i} style={{ opacity: 0 }}>
      <path d="M7.2 -1 L7.6 -29" stroke="#8A7030" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <ellipse rx="8" ry="5.6" fill="#8A7030" transform="rotate(-22)" />
    </g>)}
  </svg>;
}
