import { forwardRef, useEffect, useImperativeHandle, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useLang } from "./wedding-context";

export type MusicPlayerHandle = { play: () => void };

const YT_VIDEO_ID = (import.meta.env.VITE_YOUTUBE_VIDEO_ID as string) || "p8iVeHphD3c";
const YT_WATCH_URL = `https://www.youtube.com/watch?v=${YT_VIDEO_ID}`;
const YT_THUMB = `https://img.youtube.com/vi/${YT_VIDEO_ID}/0.jpg`;

const TITLE = "Pantika";
const SUBTITLE = "Written for her, on the day I asked forever";

/* ───────────────────────────────────────────────────────────────
   TIME-SYNCED LYRICS
   ----------------------------------------------------------------
   The YouTube Data API v3 can list caption *tracks* with an API key,
   but downloading the caption *text* needs OAuth + video ownership,
   so synced lyrics cannot be fetched client-side with a key alone.
   These hardcoded, time-stamped lines are the reliable source.

   ►► CLIENT: replace the lines below with the real lyrics of
      "Pantika" and their start times (in seconds). Leave the array
      empty ([]) to hide the lyric line entirely.
─────────────────────────────────────────────────────────────── */
type Lyric = { t: number; line: string };
// TODO: Replace with real Pantika lyrics + timestamps (seconds)
// Format: { t: 12, line: "actual lyric here" }
const LYRICS: Lyric[] = [
  { t: 0, line: "♪" },
  { t: 12, line: "In every quiet morning, I find you" },
  { t: 30, line: "A song I never knew I'd sing" },
  { t: 50, line: "Pantika, my every reason" },
  { t: 74, line: "On the day I asked forever" },
  { t: 98, line: "You said yes, and the world stood still" },
  { t: 126, line: "Now every road leads home to you" },
  { t: 158, line: "Forever starts the moment you smile" },
  { t: 196, line: "♪" },
];

const ACCENT = "#8A7030";       // olive gold
const ACCENT_DARK = "#6B5520";  // deeper gold
const SURFACE = "rgba(253,250,245,0.94)";
const TEXT_PRIMARY = "#3A2C18";
const TEXT_MUTED = "rgba(58,44,24,0.55)";
const TEXT_DIM = "rgba(58,44,24,0.4)";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

/* Gold petals drifting INTO the button — a quiet "discovery" cue.
   16 petals, 8–14px, 0.85 peak opacity, 5–7s drift — runs on mobile and
   desktop for ~30s (or until the player is engaged). */
function PetalTrail() {
  const petals = useRef(
    Array.from({ length: 16 }, (_, i) => ({
      id: i,
      dx: -(40 + Math.random() * 150),   // start to the left of the button
      dy: -(110 + Math.random() * 200),  // start above the button
      size: 8 + Math.random() * 6,       // 8–14px
      dur: 5 + Math.random() * 2,        // 5–7s
      delay: i * 0.45 + Math.random() * 0.6,
      rot: Math.random() * 360,
    })),
  ).current;

  return (
    <div style={{ position: "fixed", right: 52, bottom: 52, width: 0, height: 0, pointerEvents: "none", zIndex: 999 }} aria-hidden>
      {petals.map((p) => (
        <motion.div
          key={p.id}
          initial={{ x: p.dx, y: p.dy, opacity: 0, scale: 0.5 }}
          animate={{ x: [p.dx, 0], y: [p.dy, 0], opacity: [0, 0.85, 0], scale: [0.5, 1, 0.35] }}
          transition={{ duration: p.dur, delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position: "absolute",
            width: p.size,
            height: p.size * 1.5,
            borderRadius: "50% 50% 50% 0",
            background: "#8A7030",
            transform: `rotate(${p.rot}deg)`,
          }}
        />
      ))}
    </div>
  );
}

export const MusicPlayer = forwardRef<MusicPlayerHandle>((_, ref) => {
  const { t } = useLang();
  const playerRef = useRef<any>(null);
  const playerDivRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const autoplayWantedRef = useRef(false);

  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [showTrail, setShowTrail] = useState(true);

  /* Autoplay entry point — exposed to WeddingInvitation, which calls it the
     moment the invitation fades in after the guest slides to open. */
  useImperativeHandle(ref, () => ({
    play: () => {
      if (playerRef.current && ready) {
        try { playerRef.current.playVideo(); } catch {}
      } else {
        autoplayWantedRef.current = true; // play as soon as the API is ready
      }
    },
  }), [ready]);

  /* ── Init YouTube IFrame API ── */
  const initPlayer = useCallback(() => {
    if (!playerDivRef.current || playerRef.current) return;
    playerRef.current = new window.YT.Player(playerDivRef.current, {
      videoId: YT_VIDEO_ID,
      playerVars: {
        autoplay: 0,            // discovery is the petal trail, not autoplay
        playsinline: 1,         // iOS: play inline (not fullscreen) so autoplay can work
        controls: 0,
        disablekb: 1,
        fs: 0,
        iv_load_policy: 3,
        modestbranding: 1,
        rel: 0,
        origin: window.location.origin,
      },
      events: {
        onReady: () => {
          setReady(true);
          try { setDuration(playerRef.current.getDuration?.() ?? 0); } catch {}
          // If autoplay was requested before the API finished loading, go now.
          if (autoplayWantedRef.current) {
            autoplayWantedRef.current = false;
            try { playerRef.current.playVideo(); } catch {}
          }
        },
        onStateChange: (e: any) => {
          setPlaying(e.data === 1);
          if (e.data === 0) {
            setPlaying(false);
            setProgress(0);
            setCurrentTime(0);
          }
        },
      },
    });
  }, []);

  useEffect(() => {
    if (window.YT && window.YT.Player) {
      initPlayer();
      return;
    }
    const prevCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (prevCallback) prevCallback();
      initPlayer();
    };
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
    return () => {
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch {}
        playerRef.current = null;
      }
    };
  }, [initPlayer]);

  /* ── The discovery cue retires after 30s, or once the player is engaged.
     It deliberately does NOT stop on autoplay alone — autoplay fires before
     the guest has had a chance to notice the drifting petals. ── */
  useEffect(() => {
    const id = setTimeout(() => setShowTrail(false), 30000);
    return () => clearTimeout(id);
  }, []);
  useEffect(() => {
    if (expanded) setShowTrail(false);
  }, [expanded]);

  /* ── Progress + lyric polling while playing ── */
  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => {
      if (!playerRef.current || draggingRef.current) return;
      try {
        const cur = playerRef.current.getCurrentTime?.() ?? 0;
        const dur = playerRef.current.getDuration?.() ?? 0;
        setCurrentTime(cur);
        setDuration(dur);
        setProgress(dur > 0 ? (cur / dur) * 100 : 0);
      } catch {}
    }, 300);
    return () => clearInterval(interval);
  }, [playing]);

  const togglePlay = useCallback(() => {
    if (!ready || !playerRef.current) return;
    setShowTrail(false); // explicit user engagement retires the discovery cue
    try {
      if (playing) playerRef.current.pauseVideo();
      else playerRef.current.playVideo();
    } catch {}
  }, [ready, playing]);

  const skipBy = (sec: number) => {
    if (!playerRef.current) return;
    try {
      const cur = playerRef.current.getCurrentTime?.() ?? 0;
      playerRef.current.seekTo(Math.max(0, cur + sec), true);
    } catch {}
  };

  /* ── Draggable progress bar ── */
  const seekToClientX = (clientX: number) => {
    const el = trackRef.current;
    if (!el || !playerRef.current) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const dur = (() => { try { return playerRef.current.getDuration?.() ?? duration; } catch { return duration; } })();
    try { playerRef.current.seekTo(ratio * dur, true); } catch {}
    setProgress(ratio * 100);
    setCurrentTime(ratio * dur);
  };
  const onTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    seekToClientX(e.clientX);
  };
  const onTrackPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingRef.current) seekToClientX(e.clientX);
  };
  const onTrackPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
  };

  const formatTime = (s: number) => {
    if (!s || !isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  /* Current lyric line from playback time */
  let currentLyric = "";
  let lyricKey = -1;
  for (let i = 0; i < LYRICS.length; i++) {
    if (currentTime >= LYRICS[i].t) { currentLyric = LYRICS[i].line; lyricKey = i; }
    else break;
  }

  const PlayPauseIcon = ({ size = 14 }: { size?: number }) =>
    playing ? (
      <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
        <rect x="2.5" y="1.5" width="3.5" height="11" rx="1.5" fill="white" />
        <rect x="8" y="1.5" width="3.5" height="11" rx="1.5" fill="white" />
      </svg>
    ) : (
      <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
        <path d="M3.5 2L13 7L3.5 12V2Z" fill="white" />
      </svg>
    );

  return (
    <>
      {/* Hidden YouTube player div — must stay in the DOM */}
      <div style={{ position: "fixed", left: "-9999px", top: 0, width: 2, height: 2, overflow: "hidden", pointerEvents: "none" }}>
        <div ref={playerDivRef} />
      </div>

      {/* Discovery cue — gold petals drifting into the button */}
      <AnimatePresence>{showTrail && !expanded && <PetalTrail />}</AnimatePresence>

      {/* COLLAPSED — 56px gold circle, bottom-right */}
      <AnimatePresence>
        {!expanded && (
          <motion.div
            key="collapsed"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            style={{ position: "fixed", bottom: 24, right: 24, zIndex: 1000, width: 56, height: 56 }}
          >
            {/* Warm glow (stronger during discovery) */}
            <motion.div
              animate={{ opacity: showTrail ? [0.5, 0.9, 0.5] : [0.25, 0.45, 0.25], scale: [1, 1.18, 1] }}
              transition={{ repeat: Infinity, duration: 2.6, ease: "easeInOut" }}
              style={{ position: "absolute", inset: -10, borderRadius: "50%", background: "radial-gradient(circle, rgba(138,112,48,0.45) 0%, transparent 70%)", pointerEvents: "none" }}
            />
            {/* Pulse ring while playing — pure CSS keyframe (smooth, no jitter) */}
            {playing && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  border: `1.5px solid ${ACCENT}`,
                  animation: "pulse-ring 2.2s ease-in-out infinite",
                  pointerEvents: "none",
                }}
              />
            )}
            <button
              onClick={() => setExpanded(true)}
              aria-label="Open music player"
              style={{
                position: "relative",
                width: 56, height: 56, borderRadius: "50%",
                background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DARK})`,
                border: "none",
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 8px 24px rgba(138,112,48,0.4)",
              }}
            >
              <PlayPauseIcon size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EXPANDED — 300px card, bottom-right, spring slide-up */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, y: 40, scale: 0.9, transformOrigin: "bottom right" }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            style={{
              position: "fixed",
              bottom: 24,
              right: 24,
              zIndex: 1000,
              width: "min(280px, calc(100vw - 32px))",
              background: SURFACE,
              borderRadius: 20,
              boxShadow: "0 16px 50px rgba(61,34,21,0.22)",
              border: "1px solid rgba(138,112,48,0.18)",
              backdropFilter: "blur(16px)",
              overflow: "hidden",
              padding: "13px 14px 14px",
            }}
          >
            {/* Header: thumbnail + title/subtitle + close */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <img
                src={YT_THUMB}
                alt={TITLE}
                style={{ width: 42, height: 42, borderRadius: 10, objectFit: "cover", flexShrink: 0, boxShadow: "0 2px 8px rgba(61,34,21,0.2)" }}
              />
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ fontFamily: "'TT Interphases', sans-serif", fontSize: "0.95rem", fontWeight: 600, color: TEXT_PRIMARY, lineHeight: 1.2 }}>
                  {TITLE}
                </p>
                <p style={{ fontFamily: "'TT Interphases', sans-serif", fontSize: "0.65rem", fontStyle: "italic", color: TEXT_MUTED, lineHeight: 1.35, marginTop: 2 }}>
                  {SUBTITLE}
                </p>
              </div>
              <button
                onClick={() => setExpanded(false)}
                aria-label="Close"
                style={{ background: "none", border: "none", cursor: "pointer", color: TEXT_DIM, fontSize: "1.2rem", lineHeight: 1, padding: "0 0 0 6px", flexShrink: 0 }}
              >
                ×
              </button>
            </div>

            {/* Lyric line — one at a time, gold, fading */}
            {LYRICS.length > 0 && (
              <div style={{ minHeight: 34, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", margin: "14px 0 4px" }}>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={lyricKey}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.5 }}
                    style={{ fontFamily: "'TT Interphases', sans-serif", fontSize: "0.82rem", fontStyle: "italic", color: ACCENT, lineHeight: 1.4 }}
                  >
                    {currentLyric}
                  </motion.p>
                </AnimatePresence>
              </div>
            )}

            {/* Progress — 4px draggable, gold fill */}
            <div
              ref={trackRef}
              onPointerDown={onTrackPointerDown}
              onPointerMove={onTrackPointerMove}
              onPointerUp={onTrackPointerUp}
              onPointerCancel={onTrackPointerUp}
              style={{ height: 4, background: "rgba(138,112,48,0.15)", borderRadius: 4, cursor: "pointer", position: "relative", marginTop: 12, touchAction: "none" }}
            >
              <div style={{ height: "100%", width: `${progress}%`, background: `linear-gradient(to right, ${ACCENT}, ${ACCENT_DARK})`, borderRadius: 4 }} />
              <div style={{ position: "absolute", left: `${progress}%`, top: "50%", transform: "translate(-50%, -50%)", width: 11, height: 11, borderRadius: "50%", background: ACCENT, boxShadow: "0 1px 4px rgba(138,112,48,0.5)" }} />
            </div>

            {/* Time */}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, marginBottom: 8 }}>
              <span style={{ fontFamily: "'TT Interphases', sans-serif", fontSize: "0.6rem", color: TEXT_MUTED, letterSpacing: "0.05em" }}>{formatTime(currentTime)}</span>
              <span style={{ fontFamily: "'TT Interphases', sans-serif", fontSize: "0.6rem", color: TEXT_MUTED, letterSpacing: "0.05em" }}>{duration > 0 ? formatTime(duration) : "--:--"}</span>
            </div>

            {/* Controls: back 10 · play/pause · forward 10 */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 22 }}>
              <button onClick={() => skipBy(-10)} aria-label="Back 10 seconds" style={{ background: "none", border: "none", cursor: "pointer", color: TEXT_MUTED, display: "flex", padding: 4 }}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M9 3V1L5 4l4 3V5a5 5 0 1 1-5 5H2a7 7 0 1 0 7-7z" fill="currentColor" />
                </svg>
              </button>
              <button
                onClick={togglePlay}
                disabled={!ready}
                aria-label={playing ? "Pause" : "Play"}
                style={{ width: 48, height: 48, borderRadius: "50%", background: ready ? `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DARK})` : "rgba(138,112,48,0.2)", border: "none", cursor: ready ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: ready ? "0 4px 16px rgba(138,112,48,0.4)" : "none" }}
              >
                <PlayPauseIcon size={14} />
              </button>
              <button onClick={() => skipBy(10)} aria-label="Forward 10 seconds" style={{ background: "none", border: "none", cursor: "pointer", color: TEXT_MUTED, display: "flex", padding: 4 }}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M9 3V1l4 3-4 3V5a5 5 0 1 0 5 5h2A7 7 0 1 1 9 3z" fill="currentColor" />
                </svg>
              </button>
            </div>

            {/* Prominent YouTube pill — full width of the card interior */}
            <a
              href={YT_WATCH_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                width: "100%",
                marginTop: 16,
                padding: "10px 0",
                borderRadius: 100,
                border: `1px solid ${ACCENT}`,
                background: "transparent",
                color: ACCENT,
                textDecoration: "none",
                fontFamily: "'TT Interphases', sans-serif",
                fontSize: "0.72rem",
                letterSpacing: "0.08em",
                boxSizing: "border-box",
              }}
            >
              {t.music_youtube}
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});

MusicPlayer.displayName = "MusicPlayer";
