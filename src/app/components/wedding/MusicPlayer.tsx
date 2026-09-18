import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion, useMotionValue, useMotionTemplate, useTransform, animate } from "motion/react";
import { LoaderCircle, Pause, Play } from "lucide-react";
import youtubeIcon from "../../../imports/youtube-icon.png";
import captions from "../../../imports/pantika.sbv?raw";
import { parseSbv, lyricAt } from "./captions.mjs";
import { useLang, useMusicState } from "./wedding-context";

export type MusicPlayerHandle = { play: () => void; open: () => void };

const YT_VIDEO_ID = (import.meta.env.VITE_YOUTUBE_VIDEO_ID as string) || "p8iVeHphD3c";
const YT_WATCH_URL = `https://www.youtube.com/watch?v=${YT_VIDEO_ID}`;
const YT_THUMB = `https://img.youtube.com/vi/${YT_VIDEO_ID}/0.jpg`;

const TITLE = "Pantika";
const SUBTITLE = "เพลงที่เรียวแต่งให้หยีตอนขอแต่งงาน";

// The couple's supplied SBV is local, so captions need no third-party request.
const LYRICS = parseSbv(captions);

const ACCENT = "#8A7030";       // olive gold
const ACCENT_DARK = "#6B5520";  // deeper gold
/* Nearly opaque: the card used to sit on a 16px backdrop blur, which smeared
   the paper grain behind it and read as a piece of app chrome dropped onto the
   invitation. Without the blur the surface has to carry legibility itself. */
const SURFACE = "rgba(253,250,245,0.97)";
const TEXT_PRIMARY = "#3A2C18";
const TEXT_MUTED = "rgba(58,44,24,0.55)";
const TEXT_DIM = "rgba(58,44,24,0.4)";

/* The orb flies between the bottom-right corner and the song section's slot.
   A tween, not a spring: the flight happens while the guest is mid-scroll, and
   a spring's overshoot on top of the page's own movement reads as a yank. One
   long ease-out is the "picked up and put down" arc DESIGN.md asks for, and it
   lands exactly once. */
const LAND_EASE = [0.22, 1, 0.36, 1] as const;
const FLIGHT = { duration: 0.62, ease: LAND_EASE };

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

/* Gold petals drifting INTO the button — a quiet "discovery" cue.
   Nine petals, 6.5–9s drift, 0.55 peak opacity, nearly a second apart: sparse
   enough that the eye follows one at a time rather than reading a swarm. Each
   one is a small gradient leaf that turns slowly as it travels. */
function PetalTrail() {
  const petals = useRef(
    Array.from({ length: 9 }, (_, i) => ({
      id: i,
      dx: -(40 + Math.random() * 150),   // start to the left of the button
      dy: -(110 + Math.random() * 200),  // start above the button
      size: 9 + Math.random() * 6,       // 9–15px
      dur: 6.5 + Math.random() * 2.5,    // 6.5–9s
      delay: i * 0.9 + Math.random() * 0.8,
      rot: Math.random() * 360,
      spin: 30 + Math.random() * 40,     // how far it turns over the drift
    })),
  ).current;

  return (
    /* This wrapper exists purely so the AnimatePresence around <PetalTrail/>
       has something to fade: without an `exit` the whole trail blinked out in
       one frame the moment the song section came into view. */
    <motion.div
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      style={{ position: "fixed", right: 52, bottom: 52, width: 0, height: 0, pointerEvents: "none", zIndex: 999 }}
      aria-hidden
    >
      {petals.map((p) => (
        <motion.div
          key={p.id}
          initial={{ x: p.dx, y: p.dy, opacity: 0, scale: 0.5, rotate: p.rot }}
          /* `rotate` has to be a motion prop, not a `transform` in the inline
             style: Framer owns the transform property once x/y/scale animate,
             so a hand-written rotate() there was silently dropped and the
             petals never turned. */
          animate={{
            x: [p.dx, 0],
            y: [p.dy, 0],
            opacity: [0, 0.55, 0],
            scale: [0.5, 1, 0.35],
            rotate: [p.rot, p.rot + p.spin],
          }}
          transition={{ duration: p.dur, delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
          style={{ position: "absolute", width: p.size, height: p.size * 1.5 }}
        >
          <svg viewBox="0 0 12 18" width="100%" height="100%" style={{ display: "block", overflow: "visible" }}>
            <defs>
              <linearGradient id={`petal-${p.id}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#D8BC74" />
                <stop offset="55%" stopColor="#C6A34E" />
                <stop offset="100%" stopColor="#8A7030" />
              </linearGradient>
            </defs>
            {/* An asymmetric leaf: full curve on one side, a softer one on the
                other, so it reads as a petal rather than a lozenge. */}
            <path
              d="M6 0.5C9.8 3.6 11.5 7.4 11.5 10.6C11.5 14.6 9 17.5 6 17.5C3 17.5 0.5 15 0.5 11.2C0.5 7.6 2.4 3.6 6 0.5Z"
              fill={`url(#petal-${p.id})`}
              opacity="0.85"
            />
            <path
              d="M6 1.6C6.6 6 6.7 11.6 6 17"
              stroke="#FDF6E6"
              strokeOpacity="0.35"
              strokeWidth="0.7"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
        </motion.div>
      ))}
    </motion.div>
  );
}

export const MusicPlayer = forwardRef<MusicPlayerHandle, { dockSlot?: HTMLElement | null }>(({ dockSlot }, ref) => {
  const { t, lang } = useLang();
  const { setMusic } = useMusicState();
  const reduceMotion = useReducedMotion();
  const playerRef = useRef<any>(null);
  const playerDivRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const readyRef = useRef(false);
  const playbackWantedRef = useRef(false);
  /* True once the guest has hit pause themselves, as opposed to playback never
     having started. */
  const userPausedRef = useRef(false);
  const pendingSeekRef = useRef<number | null>(null);

  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [expanded, setExpanded] = useState(false);
  /* `dock` is the intent (the slot is in view); `landed` is the fact (the
     flight has finished). The two are kept apart because the specs — and the
     song section — care about the moment of arrival, not the decision. */
  const [dock, setDock] = useState(false);
  const [landed, setLanded] = useState(false);
  const orbRef = useRef<HTMLDivElement>(null);
  /* The element the FLIP actually moves. It wraps both the orb and the card and
     is rendered in every state, so it can always be measured — unlike `orbRef`,
     which is attached to the collapsed branch only and is null (or a rect of
     zeroes, mid-unmount) whenever the dock decision flips while the card is
     open. Measuring that was what sent the orb flying in from the top-left
     corner of the viewport. */
  const stageRef = useRef<HTMLDivElement>(null);
  /* Where the stage was standing when the dock decision flipped: the "first"
     box of the FLIP below. */
  const flightBox = useRef<DOMRect | null>(null);
  const dockRef = useRef(false);
  /* A dock decision taken while the card was open, held until the card has
     finished closing. See the measure loop and `onExitComplete` below. */
  const pendingDockRef = useRef<boolean | null>(null);
  const measureRef = useRef<(() => void) | null>(null);
  const expandedRef = useRef(false);
  expandedRef.current = expanded;
  /* The flight is driven by one value: 1 at the departure box, 0 on arrival.
     Keeping it as a fraction rather than two pixel offsets is what lets the
     scroll correction below fade out exactly in step with the travel. */
  const flightT = useMotionValue(0);
  const flightDelta = useRef({ dx: 0, dy: 0 });
  /* Scroll travelled since the flight began. The FLIP's two boxes are
     viewport-relative but one end of the trip is in normal flow, so without
     this the orb drifts by however far the page moved during the 0.62s — and
     the page is always moving, since scrolling is what triggers the flight. */
  const scrollAdj = useMotionValue(0);
  const stageX = useTransform(flightT, (t) => t * flightDelta.current.dx);
  const stageY = useTransform(
    [flightT, scrollAdj] as const,
    ([t, adj]: number[]) => t * (flightDelta.current.dy + adj),
  );
  /* 0 on the paper, 1 in the air — drives the shadow so the orb visibly lifts
     off the page for the length of the flight and settles again on landing. */
  const lift = useMotionValue(0);
  const squash = useMotionValue(1);
  const shadowOffset = useTransform(lift, [0, 1], [8, 22]);
  const shadowBlur = useTransform(lift, [0, 1], [24, 46]);
  const shadowAlpha = useTransform(lift, [0, 1], [0.4, 0.28]);
  const orbShadow = useMotionTemplate`0 ${shadowOffset}px ${shadowBlur}px rgba(138,112,48,${shadowAlpha})`;
  const [ripple, setRipple] = useState(0);

  /* ── Dock decision — does the orb belong in the page or in the corner? ──
     Hysteresis (140px in, 60px out) so an orb sitting near the threshold does
     not flutter between the two while the guest nudges the page. */
  useEffect(() => {
    if (!dockSlot) {
      if (dockRef.current) { dockRef.current = false; setDock(false); }
      return;
    }
    let frame = 0;
    const measure = () => {
      frame = 0;
      const rect = dockSlot.getBoundingClientRect();
      const risen = rect.top < window.innerHeight - 140 && rect.bottom > 160;
      // Also undocks once the slot has scrolled off the top: an in-page orb up
      // there is a control the guest can no longer reach.
      const gone = rect.top > window.innerHeight - 60 || rect.bottom < 100;
      const next = dockRef.current ? !gone : risen;
      if (next === dockRef.current) return;
      if (expandedRef.current) {
        /* Never move house while the card is open, in either direction. The
           card closes first and the decision waits in `pendingDockRef` until
           AnimatePresence reports the exit finished — a single rAF is not
           enough, because the 300px card is still occupying the slot then and
           the flight would be measured against a layout nobody ever sees. */
        pendingDockRef.current = next;
        setExpanded(false);
        return;
      }
      flightBox.current = stageRef.current?.getBoundingClientRect() ?? null;
      dockRef.current = next;
      setDock(next);
    };
    /* Held on a ref so the card's onExitComplete can resume a deferred
       decision without re-subscribing this effect. */
    measureRef.current = measure;
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
    const observer = new ResizeObserver(schedule);
    observer.observe(dockSlot);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    schedule();
    return () => {
      cancelAnimationFrame(frame); observer.disconnect();
      measureRef.current = null;
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [dockSlot]);

  /* ── The flight itself, as a FLIP ──
     The orb is one element rendered into two different parents (the fixed
     corner container, or a portal into the slot). React moves the node; this
     measures where it used to be, puts it back there with a transform, and
     springs that transform to nothing. Shared-layout (layoutId) would do the
     same job, but it crossfades two elements across the fixed/in-flow boundary,
     and a crossfade is exactly what the client asked to be rid of. */
  useLayoutEffect(() => {
    const el = stageRef.current;
    const first = flightBox.current;
    flightBox.current = null;
    if (!el) return;
    if (!first) { setLanded(dock); return; }
    scrollAdj.set(0);
    el.style.transform = "none";
    const last = el.getBoundingClientRect();
    const dx = first.left - last.left;
    const dy = first.top - last.top;
    el.style.transform = "";
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) { setLanded(dock); return; }
    const arrive = () => {
      setLanded(dock);
      if (dock) {
        setRipple(Date.now());
        setMusic({ landedAt: Date.now() });
      }
    };
    flightDelta.current = { dx, dy };
    if (reduceMotion) { flightT.set(0); arrive(); return; }
    setLanded(false);
    flightT.set(1);
    // Bridge this one frame by hand: motion values are flushed on the next
    // animation frame, and without this the orb would flash at its new place.
    el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
    /* The departure box is pinned to whichever end of the trip does not
       scroll. Flying into the page, the orb left a fixed corner, so the start
       has to slide with the page; flying back out it left a spot in the
       document, so it slides the other way. The correction is multiplied by
       the same remaining fraction as the travel itself (see `stageY`), so it
       reaches zero on arrival instead of leaving the orb offset. */
    const startScroll = window.scrollY;
    const direction = dock ? 1 : -1;
    const onScroll = () => scrollAdj.set((window.scrollY - startScroll) * direction);
    window.addEventListener("scroll", onScroll, { passive: true });
    const settle = () => {
      window.removeEventListener("scroll", onScroll);
      scrollAdj.set(0);
    };
    const rise = animate(lift, 1, { duration: 0.16, ease: "easeOut" });
    const fly = animate(flightT, 0, {
      ...FLIGHT,
      onComplete: () => {
        settle();
        animate(lift, 0, { duration: 0.32, ease: LAND_EASE });
        animate(squash, [0.96, 1], { duration: 0.3, ease: LAND_EASE });
        arrive();
      },
    });
    return () => { rise.stop(); fly.stop(); settle(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dock]);

  const [showTrail, setShowTrail] = useState(true);

  // Entry autoplay is best-effort in the unlock gesture. Never queue it for
  // later: a slow connection must not unexpectedly start music mid-invitation.
  const startPlayback = useCallback((explicit = false) => {
    if (!readyRef.current && !explicit) return;
    if (playbackWantedRef.current) return;
    if (explicit) userPausedRef.current = false;
    playbackWantedRef.current = true;
    setBuffering(true);
    if (readyRef.current && playerRef.current) {
      try { playerRef.current.playVideo(); }
      catch { playbackWantedRef.current = false; setBuffering(false); setFailed(true); }
    }
  }, []);

  useImperativeHandle(ref, () => ({
    play: () => startPlayback(),
    /* Used by the "Our Song" section. Unlike autoplay-on-entry, this follows a
       deliberate tap partway down the page, so the card is expanded too —
       otherwise sound simply starts from a corner button with no visible
       cause. Expanding also retires the petal trail (see the effect below). */
    open: () => {
      setExpanded(true);
      startPlayback(true);
    },
  }), [startPlayback]);

  /* ── Init YouTube IFrame API ── */
  useEffect(() => {
    let disposed = false;
    let loadTimeout: ReturnType<typeof setTimeout>;
    const host = playerDivRef.current;
    const stopPending = () => {
      if (disposed) return;
      playbackWantedRef.current = false;
      setPlaying(false);
      setBuffering(false);
    };
    const onError = () => { clearTimeout(loadTimeout); stopPending(); if (!disposed) setFailed(true); };
    loadTimeout = setTimeout(onError, 12000);
    const initPlayer = () => {
      if (disposed || !host || playerRef.current) return;
      // YouTube replaces its mount node. React owns the stable outer host so
      // cleanup/remount (including StrictMode) always gets a connected node.
      const mount = document.createElement("div");
      host.replaceChildren(mount);
      try { playerRef.current = new window.YT.Player(mount, {
        videoId: YT_VIDEO_ID,
        width: 200,
        height: 200,
        playerVars: {
          autoplay: 0,
          playsinline: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
          rel: 0,
          origin: window.location.origin,
        },
        events: {
          onReady: (event: any) => {
            if (disposed) return;
            clearTimeout(loadTimeout);
            readyRef.current = true;
            setReady(true);
            setFailed(false);
            setDuration(event.target.getDuration?.() ?? 0);
            event.target.setVolume(45);
            if (playbackWantedRef.current) event.target.playVideo();
          },
          onStateChange: (e: any) => {
            if (disposed) return;
            if (e.data === 1) {
              playbackWantedRef.current = true;
              setPlaying(true);
              setBuffering(false);
              setFailed(false);
            } else if (e.data === 3) {
              setBuffering(playbackWantedRef.current);
            } else if (e.data === 2 || e.data === 0) {
              stopPending();
            }
            if (e.data === 0) {
              setProgress(0);
              setCurrentTime(0);
            }
          },
          onAutoplayBlocked: stopPending,
          onError,
        },
      }); } catch { onError(); }
    };
    const prevCallback = window.onYouTubeIframeAPIReady;
    const onApiReady = () => {
      prevCallback?.();
      initPlayer();
    };
    let tag = document.querySelector<HTMLScriptElement>('script[src="https://www.youtube.com/iframe_api"]');
    if (attempt > 0 && !window.YT?.Player) { tag?.remove(); tag = null; }
    if (window.YT?.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = onApiReady;
      if (!tag) {
        tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(tag);
      }
      tag.addEventListener("error", onError);
    }
    return () => {
      disposed = true;
      clearTimeout(loadTimeout);
      readyRef.current = false;
      setReady(false);
      tag?.removeEventListener("error", onError);
      if (window.onYouTubeIframeAPIReady === onApiReady) window.onYouTubeIframeAPIReady = prevCallback;
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch {}
        playerRef.current = null;
      }
      host?.replaceChildren();
    };
  }, [attempt]);

  useEffect(() => {
    if (!buffering) return;
    const timeout = setTimeout(() => {
      playbackWantedRef.current = false;
      try { playerRef.current?.pauseVideo(); } catch {}
      setPlaying(false);
      setBuffering(false);
      setFailed(true);
    }, 12000);
    return () => clearTimeout(timeout);
  }, [buffering, attempt]);

  const retry = () => {
    playbackWantedRef.current = false;
    readyRef.current = false;
    setReady(false); setFailed(false); setPlaying(false); setBuffering(false);
    setAttempt(value => value + 1);
  };

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

  /* ── Progress + lyric polling while playing ──
     Runs whenever the song is playing, not only while the card is open: the
     song section's notes follow the lyric cues through MusicStateContext. */
  useEffect(() => {
    if (!playing || buffering) return;
    const interval = setInterval(() => {
      if (!playerRef.current || draggingRef.current) return;
      try {
        const cur = playerRef.current.getCurrentTime?.() ?? 0;
        const dur = playerRef.current.getDuration?.() ?? 0;
        setCurrentTime(cur);
        setDuration(dur);
        setProgress(dur > 0 ? (cur / dur) * 100 : 0);
      } catch {}
    }, 500);
    return () => clearInterval(interval);
  }, [playing, buffering]);

  const togglePlay = useCallback(() => {
    if (failed) return;
    setShowTrail(false); // explicit user engagement retires the discovery cue
    try {
      if (playbackWantedRef.current) {
        playbackWantedRef.current = false;
        // Remembered so that re-opening the card does not undo a deliberate
        // pause — see openPlayer below.
        userPausedRef.current = true;
        setPlaying(false);
        setBuffering(false);
        if (readyRef.current) playerRef.current?.pauseVideo();
      } else startPlayback(true);
    } catch {}
  }, [failed, startPlayback]);

  const skipBy = (sec: number) => {
    if (!playerRef.current || !ready) return;
    try {
      const cur = playerRef.current.getCurrentTime?.() ?? 0;
      const dur = playerRef.current.getDuration?.() ?? 0;
      const next = Math.max(0, Math.min(dur, cur + sec));
      playerRef.current.seekTo(next, true);
      setCurrentTime(next);
      setProgress(dur > 0 ? next / dur * 100 : 0);
    } catch {}
  };

  /* ── Draggable progress bar ── */
  const seekToClientX = (clientX: number) => {
    const el = trackRef.current;
    if (!el || !playerRef.current || !readyRef.current) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const dur = (() => { try { return playerRef.current.getDuration?.() ?? duration; } catch { return duration; } })();
    if (dur <= 0 || rect.width <= 0) return;
    pendingSeekRef.current = ratio * dur;
    setProgress(ratio * 100);
    setCurrentTime(ratio * dur);
  };
  const onTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!readyRef.current) return;
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    seekToClientX(e.clientX);
  };
  const onTrackPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingRef.current) seekToClientX(e.clientX);
  };
  const onTrackPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    if (e.type === "pointerup" && pendingSeekRef.current !== null) {
      try { playerRef.current?.seekTo(pendingSeekRef.current, true); } catch {}
    }
    pendingSeekRef.current = null;
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
  const cue = lyricAt(LYRICS, currentTime);
  if (cue) { currentLyric = cue.line; lyricKey = cue.t; }

  /* What the rest of the page is allowed to know about the player. */
  useEffect(() => {
    setMusic({ playing, docked: dock && landed, cueAt: lyricKey });
  }, [playing, dock, landed, lyricKey, setMusic]);

  /* Tapping the orb starts the song, wherever it is standing. A tap on a play
     button means "play" — making the guest open the card and then find the
     play button inside it was a step nobody took. The one exception is a
     guest who deliberately paused: re-opening the card must not restart. */
  const openPlayer = () => {
    setShowTrail(false);
    setExpanded(true);
    if (!userPausedRef.current) startPlayback(true);
  };

  const playbackActive = playing || buffering;
  const playbackIcon = (size: number) => buffering
    ? <LoaderCircle size={size} color="white" style={{ animation: reduceMotion ? undefined : "music-loading 1s linear infinite" }} />
    : playing ? <Pause size={size} fill="white" color="white" /> : <Play size={size} fill="white" color="white" />;

  /* A dock decision taken while the card was open resumes here, once the card
     has actually left the layout — measuring any earlier reads a frame the
     guest never sees, which is what used to throw the flight off course. */
  const onCardExited = () => {
    if (pendingDockRef.current === null) return;
    pendingDockRef.current = null;
    measureRef.current?.();
  };

  const player = (
    /* The stage is the element the FLIP moves, and the only one rendered in
       every state: React re-parents this exact node between the corner and the
       slot, so it is always measurable. Column layout in both homes means the
       orb's centre never shifts sideways when the card comes and goes. */
    <motion.div
      ref={stageRef}
      style={{
        x: stageX,
        y: stageY,
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: dock ? "center" : "flex-end",
      }}
    >
      {/* One presence for both faces, `mode="wait"`: the orb is fully gone
          before the card arrives and vice-versa. Running them as two
          independent presences meant a stretch where both were on screen and
          fighting for the same space — the "glimpse of the player" on open. */}
      <AnimatePresence initial={false} mode="wait" onExitComplete={onCardExited}>
        {!expanded ? (
          /* COLLAPSED — 56px gold circle: bottom-right, or standing in the song
             section's slot once it has flown there. */
          <motion.div
            key="collapsed"
            ref={orbRef}
            initial={reduceMotion ? { opacity: 1 } : { scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { scale: 0.7, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            data-music-docked={dock && landed}
            data-music-docking={dock}
            style={{ position: "relative", width: 56, height: 56, zIndex: 2 }}
          >
            {/* Warm glow (stronger during discovery) */}
            <motion.div
              animate={reduceMotion
                ? { opacity: showTrail ? 0.7 : 0.35, scale: 1 }
                : { opacity: showTrail ? [0.5, 0.9, 0.5] : [0.25, 0.45, 0.25], scale: [1, 1.18, 1] }}
              transition={reduceMotion ? { duration: 0.3 } : { repeat: Infinity, duration: 2.6, ease: "easeInOut" }}
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
            {/* One gold ripple on landing — the only mark the arrival leaves. */}
            {!reduceMotion && ripple > 0 && (
              <motion.span
                key={ripple}
                aria-hidden
                initial={{ opacity: 0.5, scale: 0.85 }}
                animate={{ opacity: 0, scale: 1.9 }}
                transition={{ duration: 0.7, ease: LAND_EASE }}
                style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `1.5px solid ${ACCENT}`, pointerEvents: "none" }}
              />
            )}
            <motion.button
              onClick={openPlayer}
              aria-label="Open music player"
              style={{
                scaleY: squash,
                boxShadow: orbShadow,
                position: "relative",
                width: 56, height: 56, borderRadius: "50%",
                background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DARK})`,
                border: "none",
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              {playbackIcon(18)}
            </motion.button>
          </motion.div>
        ) : (
          /* EXPANDED — 300px card. It grows from wherever the orb is standing:
             in the page inside the dock slot (pushing the footer down), or up
             out of the bottom-right corner. No backdrop blur either way. */
          <motion.div
            key="expanded"
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.88, y: dock ? -10 : 28 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            /* The exit carries its own short tween: with `mode="wait"` the orb
               cannot come back until this finishes, and a spring's tail would
               make closing the card feel like it stuck. */
            exit={reduceMotion
              ? { opacity: 0 }
              : { opacity: 0, scale: 0.9, y: dock ? -10 : 28, transition: { duration: 0.2, ease: LAND_EASE } }}
            transition={reduceMotion
              ? { duration: 0 }
              : { type: "spring", stiffness: 260, damping: 26, restDelta: 0.5 }}
            style={{
              transformOrigin: dock ? "top center" : "bottom right",
              width: dock ? "min(300px, 100%)" : "min(300px, calc(100vw - 32px))",
              margin: dock ? "0 auto" : undefined,
              background: SURFACE,
              borderRadius: 20,
              boxShadow: "0 16px 50px rgba(61,34,21,0.22)",
              border: "1px solid rgba(138,112,48,0.18)",
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
                <p style={{ fontFamily: "'TT Interphases', 'Noto Sans Thai', sans-serif", fontSize: "0.95rem", fontWeight: 600, color: TEXT_PRIMARY, lineHeight: 1.2 }}>
                  {TITLE}
                </p>
                <p style={{ fontFamily: "'TT Interphases', 'Noto Sans Thai', sans-serif", fontSize: "0.65rem", fontStyle: "italic", color: TEXT_MUTED, lineHeight: 1.35, marginTop: 2 }}>
                  {SUBTITLE}
                </p>
              </div>
              <button
                onClick={() => setExpanded(false)}
                aria-label="Close"
                style={{ background: "none", border: "none", cursor: "pointer", color: TEXT_DIM, fontSize: "1.2rem", lineHeight: 1, width: 32, height: 32, margin: "-6px -8px 0 0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
              >
                ×
              </button>
            </div>

            <p role="status" style={{ color: TEXT_PRIMARY, fontSize: "0.8rem", marginTop: 12 }}>
              {failed ? (lang === "TH" ? "โหลดเพลงไม่สำเร็จ ลองใหม่หรือฟังบน YouTube" : "Unable to load. Retry or listen on YouTube.") : !ready ? (lang === "TH" ? "กำลังโหลดเพลง" : "Loading song") : buffering ? (lang === "TH" ? "กำลังเริ่มเล่น" : "Starting playback") : ""}
            </p>
            {failed && <button type="button" onClick={retry} style={{ color: ACCENT, background: "transparent", border: `1px solid ${ACCENT}`, padding: "8px 16px", minHeight: 44, borderRadius: 6, cursor: "pointer" }}>{lang === "TH" ? "ลองใหม่" : "Retry"}</button>}

            {/* Lyric line — one at a time, gold, fading */}
            {LYRICS.length > 0 && (
              <div data-song-lyrics style={{ height: 72, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", margin: "14px 0 4px" }}>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={lyricKey}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                    style={{ fontFamily: "'TT Interphases', 'Noto Sans Thai', sans-serif", fontSize: "14px", color: ACCENT, lineHeight: 1.6, whiteSpace: "pre-line" }}
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
              role="slider"
              aria-label="Song progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress)}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "ArrowLeft") { e.preventDefault(); skipBy(-10); }
                if (e.key === "ArrowRight") { e.preventDefault(); skipBy(10); }
              }}
              style={{ height: 4, background: "rgba(138,112,48,0.15)", borderRadius: 4, cursor: "pointer", position: "relative", marginTop: 12, touchAction: "none" }}
            >
              <div style={{ height: "100%", width: `${progress}%`, background: `linear-gradient(to right, ${ACCENT}, ${ACCENT_DARK})`, borderRadius: 4 }} />
              <div style={{ position: "absolute", left: `${progress}%`, top: "50%", transform: "translate(-50%, -50%)", width: 11, height: 11, borderRadius: "50%", background: ACCENT, boxShadow: "0 1px 4px rgba(138,112,48,0.5)" }} />
            </div>

            {/* Time */}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, marginBottom: 8 }}>
              <span style={{ fontFamily: "'TT Interphases', 'Noto Sans Thai', sans-serif", fontSize: "0.6rem", color: TEXT_MUTED, letterSpacing: "0.05em" }}>{formatTime(currentTime)}</span>
              <span style={{ fontFamily: "'TT Interphases', 'Noto Sans Thai', sans-serif", fontSize: "0.6rem", color: TEXT_MUTED, letterSpacing: "0.05em" }}>{duration > 0 ? formatTime(duration) : "--:--"}</span>
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
                disabled={failed}
                aria-label={playbackActive ? "Pause" : "Play"}
                aria-busy={buffering}
                style={{ width: 48, height: 48, borderRadius: "50%", background: ready ? `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DARK})` : "rgba(138,112,48,0.2)", border: "none", cursor: ready ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: ready ? "0 4px 16px rgba(138,112,48,0.4)" : "none" }}
              >
                {playbackIcon(18)}
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
                fontFamily: "'TT Interphases', 'Noto Sans Thai', sans-serif",
                fontSize: "0.72rem",
                letterSpacing: "0.08em",
                boxSizing: "border-box",
              }}
            >
              <img src={youtubeIcon} alt="" aria-hidden style={{ width: 40, height: 34, objectFit: "contain", flexShrink: 0 }} />
              {t.music_youtube}
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  return (
    <>
      <style>{`@keyframes music-loading { to { transform: rotate(360deg); } }`}</style>
      {/* Hidden YouTube player div — must stay in the DOM */}
      <div style={{ position: "fixed", left: "-9999px", top: 0, width: 2, height: 2, overflow: "hidden", pointerEvents: "none" }}>
        <div ref={playerDivRef} />
      </div>

      {/* Discovery cue — gold petals drifting into the button */}
      <AnimatePresence>{showTrail && !expanded && !dock && !reduceMotion && <PetalTrail />}</AnimatePresence>

      {/* The player itself lives in exactly one place at a time: portalled into
          the song section's slot when docked, in the fixed corner otherwise.
          Moving the node is what the FLIP above animates. */}
      {dock && dockSlot
        ? createPortal(player, dockSlot)
        : (
          <div style={{ position: "fixed", right: 24, bottom: 24, zIndex: 1000, display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            {player}
          </div>
        )}
    </>
  );
});

MusicPlayer.displayName = "MusicPlayer";
