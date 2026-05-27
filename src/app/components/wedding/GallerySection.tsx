import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useTransform } from "motion/react";
import { useLang } from "./wedding-context";
import {
  useReveal,
  Divider,
  COLORS,
  WatercolorWash,
  PaperTexture,
  WatercolorFlower,
} from "./shared";

const STORY_IMAGES = [
  "https://images.unsplash.com/photo-1502389498275-fe50566c4c5a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3VwbGUlMjBwb3J0cmFpdCUyMHN1bnNldCUyMGdvbGRlbiUyMGhvdXIlMjBsb3ZlfGVufDF8fHx8MTc3ODQ2OTIxMHww&ixlib=rb-4.1.0&q=80&w=1080",
  "https://images.unsplash.com/photo-1776957389179-b2388f2653ed?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3VwbGUlMjB3YWxraW5nJTIwaGFuZCUyMGluJTIwaGFuZCUyMG5hdHVyZSUyMHBhdGh8ZW58MXx8fHwxNzc4NDY5MjExfDA&ixlib=rb-4.1.0&q=80&w=1080",
  "https://images.unsplash.com/photo-1768561715378-2de6d0fe4fb3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3VwbGUlMjBwcm9wb3NhbCUyMHJpbmclMjByb21hbnRpYyUyMG91dGRvb3J8ZW58MXx8fHwxNzc4NDY5MjExfDA&ixlib=rb-4.1.0&q=80&w=1080",
  "https://images.unsplash.com/photo-1775441522523-317359de673f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3VwbGUlMjBsYXVnaGluZyUyMGhhcHB5JTIwcGljbmljJTIwb3V0ZG9vcnxlbnwxfHx8fDE3Nzg0NjkyMTR8MA&ixlib=rb-4.1.0&q=80&w=1080",
];

const STRIP_HEIGHT = 200;
const SPROCKET = 22; // height of perforated edge band

/* Dark perforated film edge (top/bottom) */
function Sprockets() {
  return (
    <div
      style={{
        height: SPROCKET,
        background: "#1c130c",
        backgroundImage:
          "repeating-linear-gradient(to right, transparent 0 9px, rgba(248,241,230,0.85) 9px 19px, transparent 19px 28px)",
        backgroundSize: "28px 8px",
        backgroundPosition: "center",
        backgroundRepeat: "repeat-x",
        flexShrink: 0,
      }}
    />
  );
}

function FilmRoll({
  images,
  label,
  tabLabel,
  direction,
}: {
  images: string[];
  label: string;
  tabLabel: string;
  direction: "right" | "left";
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [frameW, setFrameW] = useState(300);
  const x = useMotionValue(0);

  useEffect(() => {
    const measure = () => {
      if (frameRef.current) setFrameW(frameRef.current.offsetWidth);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Revealed amount (0..frameW) derived continuously from drag position.
  const revealed = useTransform(x, (v) =>
    direction === "right"
      ? Math.min(frameW, Math.max(0, v))
      : Math.min(frameW, Math.max(0, -v)),
  );
  // Opaque "unexposed film" cover width = the not-yet-pulled portion.
  const coverW = useTransform(revealed, (r) => frameW - r);

  const isRight = direction === "right";

  return (
    <div style={{ width: "100%" }}>
      {/* Label */}
      <p
        style={{
          fontFamily: "'TT Interphases', sans-serif",
          fontSize: "0.7rem",
          letterSpacing: "0.28em",
          color: COLORS.lightBrown,
          textTransform: "uppercase",
          textAlign: isRight ? "left" : "right",
          marginBottom: 12,
        }}
      >
        {label}
      </p>

      {/* Film strip */}
      <div
        ref={frameRef}
        style={{
          position: "relative",
          width: "100%",
          borderRadius: 6,
          overflow: "hidden",
          boxShadow: "0 16px 40px rgba(61,34,21,0.25)",
          background: "#1c130c",
          touchAction: "pan-y",
          userSelect: "none",
        }}
      >
        <Sprockets />

        {/* Photo window */}
        <div style={{ position: "relative", height: STRIP_HEIGHT, overflow: "hidden" }}>
          {/* Photos underneath, sepia-warmed */}
          <div style={{ position: "absolute", inset: 0, display: "flex" }}>
            {images.map((src, i) => (
              <div key={i} style={{ flex: 1, position: "relative", overflow: "hidden" }}>
                <img
                  src={src}
                  alt=""
                  draggable={false}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                    filter: "sepia(28%) saturate(0.92) contrast(0.98)",
                  }}
                />
              </div>
            ))}
          </div>

          {/* Unexposed-film cover that retracts as the tab is pulled */}
          <motion.div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              [isRight ? "right" : "left"]: 0,
              width: coverW,
              background:
                "repeating-linear-gradient(45deg, #1c130c 0 8px, #241810 8px 16px)",
              boxShadow: isRight
                ? "inset 10px 0 18px rgba(0,0,0,0.5)"
                : "inset -10px 0 18px rgba(0,0,0,0.5)",
            }}
          />

          {/* Draggable film tab — sits at the canister opening edge */}
          <motion.div
            drag="x"
            dragConstraints={
              isRight ? { left: 0, right: frameW } : { left: -frameW, right: 0 }
            }
            dragElastic={0.04}
            dragMomentum={false}
            style={{
              x,
              position: "absolute",
              top: 0,
              bottom: 0,
              [isRight ? "left" : "right"]: 0,
              width: 56,
              cursor: "grab",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: `linear-gradient(${isRight ? "90deg" : "270deg"}, rgba(138,112,48,0.0), ${COLORS.gold})`,
              touchAction: "none",
            }}
            whileTap={{ cursor: "grabbing" }}
          >
            <span
              style={{
                fontFamily: "'TT Interphases', sans-serif",
                fontSize: "0.6rem",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "#FFF8EE",
                writingMode: "vertical-rl",
                transform: isRight ? "none" : "rotate(180deg)",
                fontWeight: 500,
              }}
            >
              {tabLabel}
            </span>
          </motion.div>
        </div>

        <Sprockets />
      </div>
    </div>
  );
}

export function GallerySection() {
  const { lang } = useLang();
  const { ref, inView } = useReveal("-80px");

  const memoriesLabel = lang === "TH" ? "ความทรงจำของเรา" : "Our Memories";
  const preWeddingLabel = lang === "TH" ? "พรีเวดดิ้ง" : "Pre-Wedding";
  const pull = lang === "TH" ? "ดึงเลย" : "Pull me";

  return (
    <section
      style={{
        padding: "96px 24px 110px",
        position: "relative",
        overflow: "hidden",
        background: "transparent",
      }}
    >
      <WatercolorWash variant="warm" intensity={0.5} />
      <PaperTexture opacity={0.25} />
      <WatercolorFlower size={36} style={{ position: "absolute", top: 70, left: 24, opacity: 0.5, zIndex: 1 }} />
      <WatercolorFlower size={30} color="#A8B080" centerColor="#7A8A5A" style={{ position: "absolute", top: 100, right: 28, opacity: 0.45, zIndex: 1 }} />

      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 28 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.9 }}
        style={{ position: "relative", zIndex: 2, maxWidth: 520, margin: "0 auto" }}
      >
        <Divider className="mb-12" />

        {/* Roll 1 — Our Memories (tab right, drag rightward) */}
        <FilmRoll
          images={[STORY_IMAGES[0], STORY_IMAGES[1]]}
          label={memoriesLabel}
          tabLabel={pull}
          direction="right"
        />

        {/* Generous gap between rolls */}
        <div style={{ height: 72 }} />

        {/* Roll 2 — Pre-Wedding (tab left, drag leftward) */}
        <FilmRoll
          images={[STORY_IMAGES[2], STORY_IMAGES[3]]}
          label={preWeddingLabel}
          tabLabel={pull}
          direction="left"
        />
      </motion.div>
    </section>
  );
}
