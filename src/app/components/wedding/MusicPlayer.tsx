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

  const togglePlay = useCallback(() => {
    if (!ready || !playerRef.current) return;
    try {
      if (playing) {
        playerRef.current.pauseVideo();
      } else {
        playerRef.current.playVideo();
      }
    } catch {}
  }, [ready, playing]);

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

  /* Earth-tone palette to match watercolor theme */
  const ACCENT = "#8A7030";       // olive gold
  const ACCENT_DARK = "#6B5520";  // deeper gold
  const SURFACE = "rgba(253,250,245,0.92)";
  const TEXT_PRIMARY = "#3A2C18";
  const TEXT_MUTED = "rgba(58,44,24,0.55)";
  const TEXT_DIM = "rgba(58,44,24,0.4)";

  return (
    <>
      {/* Hidden YouTube player div — must be in DOM */}
      <div
        style={{ position: "fixed", left: "-9999px", top: 0, width: 2, height: 2, overflow: "hidden", pointerEvents: "none" }}
      >
        <div ref={playerDivRef} />
      </div>

      {/* Floating player shell */}
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
            width: expanded ? "min(360px, 100%)" : "auto",
            maxWidth: "calc(100vw - 32px)",
            background: SURFACE,
            borderRadius: expanded ? 20 : 100,
            boxShadow: "0 10px 40px rgba(61,34,21,0.15), 0 2px 8px rgba(61,34,21,0.08)",
            overflow: "hidden",
            border: `1px solid rgba(138,112,48,0.18)`,
            backdropFilter: "blur(16px)",
          }}
        >
          {/* Collapsed pill — minimal, clean */}
          {!expanded && (
            <motion.div
              layout
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 8px 8px 16px" }}
            >
              {/* Animated note icon */}
              <motion.div
                animate={playing ? { rotate: [0, -8, 8, 0] } : { rotate: 0 }}
                transition={playing ? { duration: 2, repeat: Infinity, ease: "easeInOut" } : { duration: 0.3 }}
                onClick={() => setExpanded(true)}
                style={{ cursor: "pointer", display: "flex", alignItems: "center", color: ACCENT }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 12.5V4l7-1.5v8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="4.5" cy="12.5" r="1.5" stroke="currentColor" strokeWidth="1.4"/>
                  <circle cx="11.5" cy="10.5" r="1.5" stroke="currentColor" strokeWidth="1.4"/>
                </svg>
              </motion.div>

              {/* Title — only when collapsed */}
              <button
                onClick={() => setExpanded(true)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: "0.86rem", fontStyle: "italic",
                  color: TEXT_PRIMARY,
                  whiteSpace: "nowrap", padding: 0,
                  letterSpacing: "0.02em",
                }}
              >
                {t.music_title}
              </button>

              {/* Play button — golden circle */}
              <button
                onClick={togglePlay}
                disabled={!ready}
                aria-label={playing ? "Pause" : "Play"}
                style={{
                  width: 34, height: 34, borderRadius: "50%",
                  background: ready
                    ? `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DARK})`
                    : "rgba(138,112,48,0.2)",
                  border: "none",
                  cursor: ready ? "pointer" : "default",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                  boxShadow: ready ? "0 3px 12px rgba(138,112,48,0.35)" : "none",
                  transition: "background 0.3s, box-shadow 0.3s",
                }}
              >
                {playing ? (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <rect x="1.5" y="1" width="2.5" height="8" rx="1" fill="white"/>
                    <rect x="6" y="1" width="2.5" height="8" rx="1" fill="white"/>
                  </svg>
                ) : (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2.5 1L9 5L2.5 9V1Z" fill="white"/>
                  </svg>
                )}
              </button>
            </motion.div>
          )}

          {/* Expanded panel — cleaner layout */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                style={{ padding: "20px 22px 18px" }}
              >
                {/* Header */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{
                      fontFamily: "'Jost', sans-serif",
                      fontSize: "0.58rem",
                      letterSpacing: "0.22em",
                      color: TEXT_MUTED,
                      textTransform: "uppercase",
                      marginBottom: 4,
                    }}>
                      {t.music_label}
                    </p>
                    <p style={{
                      fontFamily: "'Cormorant Garamond', serif",
                      fontSize: "1.1rem",
                      fontStyle: "italic",
                      fontWeight: 500,
                      color: TEXT_PRIMARY,
                      lineHeight: 1.2,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}>
                      {t.music_title}
                    </p>
                  </div>
                  <button
                    onClick={() => setExpanded(false)}
                    aria-label="Collapse"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: TEXT_DIM,
                      fontSize: "1.2rem",
                      lineHeight: 1,
                      padding: "0 0 0 12px",
                      flexShrink: 0,
                    }}
                  >
                    ×
                  </button>
                </div>

                {/* Progress bar — clean, no waveform clutter */}
                <div
                  onClick={seek}
                  style={{
                    height: 4,
                    background: "rgba(138,112,48,0.15)",
                    borderRadius: 4,
                    cursor: "pointer",
                    marginBottom: 8,
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <div style={{
                    height: "100%",
                    width: `${progress}%`,
                    background: `linear-gradient(to right, ${ACCENT}, ${ACCENT_DARK})`,
                    borderRadius: 4,
                    transition: "width 0.5s linear",
                  }} />
                  {/* Tiny dot at progress head */}
                  {progress > 0 && (
                    <div style={{
                      position: "absolute",
                      left: `${progress}%`,
                      top: "50%",
                      transform: "translate(-50%, -50%)",
                      width: 10, height: 10,
                      borderRadius: "50%",
                      background: ACCENT,
                      boxShadow: "0 1px 4px rgba(138,112,48,0.4)",
                    }} />
                  )}
                </div>

                {/* Time */}
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
                  <span style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.6rem", color: TEXT_MUTED, letterSpacing: "0.05em" }}>
                    {formatTime(currentTime)}
                  </span>
                  <span style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.6rem", color: TEXT_MUTED, letterSpacing: "0.05em" }}>
                    {duration > 0 ? formatTime(duration) : "--:--"}
                  </span>
                </div>

                {/* Controls — clean centered row */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 24 }}>
                  <button
                    onClick={() => skipBy(-10)}
                    aria-label="Back 10s"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: TEXT_MUTED,
                      display: "flex",
                      alignItems: "center",
                      padding: 4,
                      transition: "color 0.2s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = TEXT_PRIMARY; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = TEXT_MUTED; }}
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M9 3V1L5 4l4 3V5a5 5 0 1 1-5 5H2a7 7 0 1 0 7-7z" fill="currentColor"/>
                    </svg>
                  </button>

                  <button
                    onClick={togglePlay}
                    disabled={!ready}
                    aria-label={playing ? "Pause" : "Play"}
                    style={{
                      width: 48, height: 48, borderRadius: "50%",
                      background: ready
                        ? `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DARK})`
                        : "rgba(138,112,48,0.2)",
                      border: "none",
                      cursor: ready ? "pointer" : "default",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: ready ? "0 4px 16px rgba(138,112,48,0.4)" : "none",
                      transition: "all 0.3s",
                    }}
                  >
                    {playing ? (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <rect x="2.5" y="1.5" width="3.5" height="11" rx="1.5" fill="white"/>
                        <rect x="8" y="1.5" width="3.5" height="11" rx="1.5" fill="white"/>
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M3.5 2L13 7L3.5 12V2Z" fill="white"/>
                      </svg>
                    )}
                  </button>

                  <button
                    onClick={() => skipBy(10)}
                    aria-label="Forward 10s"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: TEXT_MUTED,
                      display: "flex",
                      alignItems: "center",
                      padding: 4,
                      transition: "color 0.2s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = TEXT_PRIMARY; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = TEXT_MUTED; }}
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M9 3V1l4 3-4 3V5a5 5 0 1 0 5 5h2A7 7 0 1 1 9 3z" fill="currentColor"/>
                    </svg>
                  </button>
                </div>

                {/* YouTube attribution */}
                <p style={{
                  fontFamily: "'Jost', sans-serif",
                  fontSize: "0.5rem",
                  color: TEXT_DIM,
                  textAlign: "center",
                  marginTop: 14,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}>
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
