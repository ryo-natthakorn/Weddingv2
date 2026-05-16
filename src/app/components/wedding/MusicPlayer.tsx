import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useLang } from "./wedding-context";

const YT_VIDEO_ID = "p8iVeHphD3c";

/* ── YouTube IFrame API types (minimal) ── */
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

export function MusicPlayer() {
  const { t } = useLang();
  const playerRef = useRef<any>(null);
  const playerDivRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [bars, setBars] = useState<number[]>(Array(20).fill(4));
  const animRef = useRef<number>();

  /* ── Init YouTube IFrame API ── */
  const initPlayer = useCallback(() => {
    if (!playerDivRef.current) return;
    if (playerRef.current) return;
    playerRef.current = new window.YT.Player(playerDivRef.current, {
      videoId: YT_VIDEO_ID,
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        iv_load_policy: 3,
        modestbranding: 1,
        rel: 0,
        origin: window.location.origin,
      },
      events: {
        onReady: () => setReady(true),
        onStateChange: (e: any) => {
          // 1 = PLAYING, 2 = PAUSED, 0 = ENDED
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

  /* ── Progress polling while playing ── */
  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => {
      if (!playerRef.current) return;
      try {
        const cur = playerRef.current.getCurrentTime?.() ?? 0;
        const dur = playerRef.current.getDuration?.() ?? 0;
        setCurrentTime(cur);
        setDuration(dur);
        setProgress(dur > 0 ? (cur / dur) * 100 : 0);
      } catch {}
    }, 500);
    return () => clearInterval(interval);
  }, [playing]);

  /* ── Equalizer bar animation ── */
  useEffect(() => {
    const animateBars = () => {
      setBars((prev) => prev.map(() => playing ? Math.random() * 28 + 4 : 4));
      animRef.current = requestAnimationFrame(animateBars);
    };
    if (playing) {
      animRef.current = requestAnimationFrame(animateBars);
    } else {
      setBars(Array(20).fill(4));
      if (animRef.current) cancelAnimationFrame(animRef.current);
    }
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [playing]);

  const togglePlay = () => {
    if (!ready || !playerRef.current) return;
    try {
      if (playing) {
        playerRef.current.pauseVideo();
      } else {
        playerRef.current.playVideo();
      }
    } catch {}
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!playerRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    try {
      const dur = playerRef.current.getDuration?.() ?? 0;
      playerRef.current.seekTo(ratio * dur, true);
      setProgress(ratio * 100);
    } catch {}
  };

  const skipBy = (sec: number) => {
    if (!playerRef.current) return;
    try {
      const cur = playerRef.current.getCurrentTime?.() ?? 0;
      playerRef.current.seekTo(cur + sec, true);
    } catch {}
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const isReady = ready;
  const accent = "#7B8C58";

  return (
    <>
      {/* Hidden YouTube player div — must be in DOM */}
      <div
        style={{ position: "fixed", left: "-9999px", top: 0, width: 2, height: 2, overflow: "hidden", pointerEvents: "none" }}
      >
        <div ref={playerDivRef} />
      </div>

      {/* ── Floating player shell — full-width outer for safe centering on mobile ── */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 2.5, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: "fixed",
          bottom: 24,
          left: 0,
          right: 0,
          zIndex: 1000,
          display: "flex",
          justifyContent: "center",
          padding: "0 16px",
          pointerEvents: "none",
        }}
      >
        <motion.div
          layout
          style={{
            pointerEvents: "auto",
            width: expanded ? "min(400px, 100%)" : "auto",
            maxWidth: "calc(100vw - 32px)",
            background: "#1E2814",
            borderRadius: 100,
            boxShadow: "0 8px 40px rgba(30,40,20,0.45), 0 2px 8px rgba(0,0,0,0.2)",
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          {/* Collapsed pill */}
          {!expanded && (
            <motion.div
              layout
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px" }}
            >
              {/* Equalizer bars */}
              <div
                style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 22, cursor: "pointer", flexShrink: 0 }}
                onClick={() => setExpanded(true)}
              >
                {bars.slice(0, 7).map((h, i) => (
                  <motion.div
                    key={i}
                    animate={{ height: h }}
                    transition={{ duration: 0.08, ease: "linear" }}
                    style={{ width: 2.5, background: playing ? accent : "rgba(255,255,255,0.28)", borderRadius: 2, minHeight: 4 }}
                  />
                ))}
              </div>

              {/* Title */}
              <button
                onClick={() => setExpanded(true)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontFamily: "'Jost', sans-serif", fontSize: "0.7rem",
                  letterSpacing: "0.1em", color: "rgba(255,255,255,0.82)",
                  whiteSpace: "nowrap", padding: 0,
                }}
              >
                {t.music_note}
              </button>

              {/* Play button */}
              <button
                onClick={togglePlay}
                disabled={!isReady}
                style={{
                  width: 30, height: 30, borderRadius: "50%",
                  background: isReady ? accent : "rgba(255,255,255,0.15)",
                  border: "none", cursor: isReady ? "pointer" : "default",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, transition: "background 0.3s",
                }}
              >
                {playing ? (
                  <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                    <rect x="1" y="0.5" width="2.5" height="8" rx="1" fill="white"/>
                    <rect x="5.5" y="0.5" width="2.5" height="8" rx="1" fill="white"/>
                  </svg>
                ) : (
                  <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                    <path d="M2 1L8 4.5L2 8V1Z" fill="white"/>
                  </svg>
                )}
              </button>
            </motion.div>
          )}

          {/* Expanded panel */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                style={{ padding: "20px 20px 16px", borderRadius: 24 }}
              >
                {/* Header row */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.58rem", letterSpacing: "0.2em", color: "rgba(255,255,255,0.45)", textTransform: "uppercase", marginBottom: 3 }}>
                      {t.music_label}
                    </p>
                    <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1rem", fontStyle: "italic", color: "#FFF8EE", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 240 }}>
                      {t.music_title}
                    </p>
                  </div>
                  <button
                    onClick={() => setExpanded(false)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.35)", fontSize: "1.2rem", lineHeight: 1, padding: "0 0 0 12px", flexShrink: 0 }}
                  >
                    ×
                  </button>
                </div>

                {/* Waveform */}
                <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 36, marginBottom: 14, justifyContent: "center" }}>
                  {bars.map((h, i) => (
                    <motion.div
                      key={i}
                      animate={{ height: h }}
                      transition={{ duration: 0.08, ease: "linear" }}
                      style={{
                        flex: 1,
                        background: playing
                          ? `rgba(123,140,88,${0.35 + (i / 20) * 0.65})`
                          : "rgba(255,255,255,0.12)",
                        borderRadius: 3,
                        minHeight: 4,
                        maxWidth: 11,
                      }}
                    />
                  ))}
                </div>

                {/* Progress bar */}
                <div
                  onClick={seek}
                  style={{ height: 3, background: "rgba(255,255,255,0.12)", borderRadius: 2, cursor: "pointer", marginBottom: 6, position: "relative" }}
                >
                  <div style={{ height: "100%", width: `${progress}%`, background: accent, borderRadius: 2, transition: "width 0.5s linear" }} />
                </div>

                {/* Time */}
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                  <span style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.58rem", color: "rgba(255,255,255,0.35)" }}>
                    {formatTime(currentTime)}
                  </span>
                  <span style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.58rem", color: "rgba(255,255,255,0.35)" }}>
                    {duration > 0 ? formatTime(duration) : "--:--"}
                  </span>
                </div>

                {/* Controls */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20 }}>
                  <button
                    onClick={() => skipBy(-10)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.5)", display: "flex", alignItems: "center" }}
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M9 3V1L5 4l4 3V5a5 5 0 1 1-5 5H2a7 7 0 1 0 7-7z" fill="currentColor"/>
                    </svg>
                  </button>

                  <button
                    onClick={togglePlay}
                    disabled={!isReady}
                    style={{
                      width: 46, height: 46, borderRadius: "50%",
                      background: isReady ? `linear-gradient(135deg, ${accent}, #5A6A40)` : "rgba(255,255,255,0.1)",
                      border: "none", cursor: isReady ? "pointer" : "default",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: isReady ? `0 4px 16px rgba(123,140,88,0.4)` : "none",
                      transition: "all 0.3s",
                    }}
                  >
                    {playing ? (
                      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                        <rect x="2" y="1" width="3.5" height="11" rx="1.5" fill="white"/>
                        <rect x="7.5" y="1" width="3.5" height="11" rx="1.5" fill="white"/>
                      </svg>
                    ) : (
                      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                        <path d="M3 1.5L12 6.5L3 11.5V1.5Z" fill="white"/>
                      </svg>
                    )}
                  </button>

                  <button
                    onClick={() => skipBy(10)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.5)", display: "flex", alignItems: "center" }}
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M9 3V1l4 3-4 3V5a5 5 0 1 0 5 5h2A7 7 0 1 1 9 3z" fill="currentColor"/>
                    </svg>
                  </button>
                </div>

                {/* YouTube attribution (required by YT ToS) */}
                <p style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.52rem", color: "rgba(255,255,255,0.2)", textAlign: "center", marginTop: 12, letterSpacing: "0.04em" }}>
                  Powered by YouTube
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </>
  );
}
