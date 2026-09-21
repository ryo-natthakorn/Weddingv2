import { useLayoutEffect, useRef, useState } from "react";
import { COLORS } from "./shared";

const MAX_SIZE = "clamp(1rem, 2.5vw, 1.2rem)";

// Fit both complete sentences as one group: always two lines, always one size.
export function FooterQuote({ lines }: { lines: [string, string] }) {
  const host = useRef<HTMLDivElement>(null);
  const probes = useRef<(HTMLSpanElement | null)[]>([]);
  const cap = useRef<HTMLSpanElement>(null);
  const [size, setSize] = useState<number>();

  useLayoutEffect(() => {
    const measure = () => {
      if (!host.current || !cap.current) return;
      const available = host.current.clientWidth;
      const widest = Math.max(...probes.current.map(node => node?.getBoundingClientRect().width ?? 0));
      if (!available || !widest) return;
      const maximum = parseFloat(getComputedStyle(cap.current).fontSize);
      // Probes use 100px. Leave a small rounding margin to avoid clipped glyphs.
      setSize(Math.min(maximum, Math.floor(available / widest * 100 * 0.995 * 100) / 100));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(host.current!);
    probes.current.forEach(node => node && observer.observe(node));
    window.addEventListener("resize", measure);
    return () => { observer.disconnect(); window.removeEventListener("resize", measure); };
  }, [lines[0], lines[1]]);

  return (
    <div ref={host} style={{ position: "relative", fontFamily: "'TT Interphases', 'Noto Sans Thai', sans-serif", color: COLORS.midBrown }}>
      {lines.map((line, i) => (
        <p key={i} data-wedding-quote="" style={{ fontSize: size ?? MAX_SIZE, whiteSpace: "nowrap", lineHeight: 1.8, marginBottom: i === 0 ? 6 : 16 }}>{line}</p>
      ))}
      <div aria-hidden="true" style={{ position: "absolute", width: 0, height: 0, overflow: "hidden", visibility: "hidden", pointerEvents: "none" }}>
        <span ref={cap} style={{ fontSize: MAX_SIZE }} />
        {lines.map((line, i) => <span key={i} ref={node => { probes.current[i] = node; }} style={{ display: "inline-block", fontSize: 100, whiteSpace: "nowrap" }}>{line}</span>)}
      </div>
    </div>
  );
}
